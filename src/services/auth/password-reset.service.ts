import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import {
  buildPasswordResetUrl,
  emailFromPasswordResetIdentifier,
  hashPasswordResetToken,
  isPasswordResetIdentifier,
  newPasswordResetToken,
  normalizeResetEmail,
  passwordMeetsResetPolicy,
  passwordResetIdentifier,
  passwordResetTokenIsUsable,
} from "@/lib/auth/password-reset";
import { communicationService } from "@/services/communications/communication.service";

const STATUS_MAY_RESET = new Set(["ACTIVE", "PENDING_VERIFICATION"]);

export async function requestPasswordReset(email: string, origin: string): Promise<void> {
  const normalized = normalizeResetEmail(email);
  if (!normalized) return;

  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true, email: true, name: true, status: true },
  });

  if (!user?.email || !STATUS_MAY_RESET.has(user.status)) {
    return;
  }

  const identifier = passwordResetIdentifier(user.email);
  await prisma.verificationToken.deleteMany({ where: { identifier } });

  const issued = newPasswordResetToken();
  await prisma.verificationToken.create({
    data: {
      identifier,
      token: issued.tokenHash,
      expires: issued.expiresAt,
    },
  });

  const resetUrl = buildPasswordResetUrl(origin, issued.token);
  const greeting = user.name?.trim() || "there";
  try {
    await communicationService.sendTransactionalEmail({
      to: user.email,
      subject: "Reset your Celeventic password",
      templateType: "password-reset",
      body: [
        `Hi ${greeting},`,
        "",
        "Use this link to choose a new password. It expires in one hour.",
        "",
        resetUrl,
        "",
        "If you did not ask for this, you can ignore the message. Your password stays the same.",
      ].join("\n"),
    });
  } catch (error) {
    console.error("[password-reset.email]", user.id, error instanceof Error ? error.message : error);
  }
}

export async function consumePasswordReset(token: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!passwordMeetsResetPolicy(password)) {
    return { ok: false, error: "Password must be at least 8 characters" };
  }

  const raw = token.trim();
  if (!raw) {
    return { ok: false, error: "This reset link is invalid or has expired" };
  }

  const tokenHash = hashPasswordResetToken(raw);
  const row = await prisma.verificationToken.findUnique({ where: { token: tokenHash } });
  if (!row || !isPasswordResetIdentifier(row.identifier) || !passwordResetTokenIsUsable(row)) {
    return { ok: false, error: "This reset link is invalid or has expired" };
  }

  const email = emailFromPasswordResetIdentifier(row.identifier);
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, status: true },
  });
  if (!user || !STATUS_MAY_RESET.has(user.status)) {
    await prisma.verificationToken.deleteMany({ where: { identifier: row.identifier } });
    return { ok: false, error: "This reset link is invalid or has expired" };
  }

  const passwordHash = await hashPassword(password.trim());
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, sessionInvalidatedAt: new Date() },
    }),
    prisma.verificationToken.deleteMany({ where: { identifier: row.identifier } }),
  ]);
  return { ok: true };
}
