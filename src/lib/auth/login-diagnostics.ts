import { prisma } from "@/lib/prisma";
import { isPlatformAdmin } from "@/lib/rbac";
import { verifyPassword } from "@/lib/auth/password";
import { authLog } from "@/lib/auth/auth-logger";
import type { UserRole, UserStatus } from "@prisma/client";

export const LoginFailureReason = {
  MISSING_CREDENTIALS: "MISSING_CREDENTIALS",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  NO_PASSWORD_HASH: "NO_PASSWORD_HASH",
  WRONG_PASSWORD: "WRONG_PASSWORD",
  ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  DATABASE_ERROR: "DATABASE_ERROR",
} as const;

export type LoginFailureReason = (typeof LoginFailureReason)[keyof typeof LoginFailureReason];

export interface CredentialUser {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  image: string | null;
  role: UserRole;
}

export type VerifyCredentialsResult =
  | { ok: true; user: CredentialUser }
  | { ok: false; reason: LoginFailureReason; internalMessage: string };

export function toSafeLoginMessage(reason: LoginFailureReason): string {
  switch (reason) {
    case LoginFailureReason.MISSING_CREDENTIALS:
      return "Email or phone and password are required.";
    case LoginFailureReason.ACCOUNT_SUSPENDED:
      return "Your account has been suspended. Contact support for help.";
    case LoginFailureReason.EMAIL_NOT_VERIFIED:
      return "Please verify your email before signing in.";
    case LoginFailureReason.DATABASE_ERROR:
      return "Sign-in is temporarily unavailable. Please try again shortly.";
    default:
      return "Invalid credentials. Please try again.";
  }
}

function requiresEmailVerification(status: UserStatus, role: UserRole, isVerified: boolean): boolean {
  if (isPlatformAdmin(role)) return false;
  return status === "PENDING_VERIFICATION" && !isVerified;
}

export async function verifyCredentials(
  identifier: string,
  password: string
): Promise<VerifyCredentialsResult> {
  if (!identifier?.trim() || !password) {
    return {
      ok: false,
      reason: LoginFailureReason.MISSING_CREDENTIALS,
      internalMessage: "Missing identifier or password",
    };
  }

  const trimmed = identifier.trim();
  const isEmail = trimmed.includes("@");
  const normalized = isEmail ? trimmed.toLowerCase() : trimmed;

  authLog("login_attempt", {
    method: "credentials",
    identifierType: isEmail ? "email" : "phone",
  });

  try {
    const user = await prisma.user.findFirst({
      where: isEmail ? { email: normalized } : { phone: normalized },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        avatarUrl: true,
        role: true,
        status: true,
        passwordHash: true,
        isVerified: true,
        emailVerified: true,
      },
    });

    if (!user) {
      authLog("login_failure", { reason: LoginFailureReason.USER_NOT_FOUND });
      return {
        ok: false,
        reason: LoginFailureReason.USER_NOT_FOUND,
        internalMessage: "User not found",
      };
    }

    if (user.status === "SUSPENDED") {
      authLog("login_failure", { reason: LoginFailureReason.ACCOUNT_SUSPENDED, userId: user.id });
      return {
        ok: false,
        reason: LoginFailureReason.ACCOUNT_SUSPENDED,
        internalMessage: `User ${user.id} suspended`,
      };
    }

    if (requiresEmailVerification(user.status, user.role, user.isVerified)) {
      authLog("login_failure", { reason: LoginFailureReason.EMAIL_NOT_VERIFIED, userId: user.id });
      return {
        ok: false,
        reason: LoginFailureReason.EMAIL_NOT_VERIFIED,
        internalMessage: `User ${user.id} unverified`,
      };
    }

    if (!user.passwordHash) {
      authLog("login_failure", { reason: LoginFailureReason.NO_PASSWORD_HASH, userId: user.id });
      return {
        ok: false,
        reason: LoginFailureReason.NO_PASSWORD_HASH,
        internalMessage: `User ${user.id} OAuth-only`,
      };
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      authLog("login_failure", { reason: LoginFailureReason.WRONG_PASSWORD, userId: user.id });
      return {
        ok: false,
        reason: LoginFailureReason.WRONG_PASSWORD,
        internalMessage: `Wrong password for ${user.id}`,
      };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    authLog("login_success", { userId: user.id, role: user.role });

    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        image: user.avatarUrl,
        role: user.role,
      },
    };
  } catch (error) {
    authLog("login_failure", {
      reason: LoginFailureReason.DATABASE_ERROR,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      ok: false,
      reason: LoginFailureReason.DATABASE_ERROR,
      internalMessage: error instanceof Error ? error.message : "Database error",
    };
  }
}
