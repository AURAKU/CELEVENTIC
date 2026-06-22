import { authenticator } from "otplib";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import { createAuditLog } from "@/lib/audit";
import { generateToken } from "@/lib/utils";

export class TwoFactorService {
  async setup(userId: string) {
    const secret = authenticator.generateSecret();
    const encryptedSecret = encrypt(secret);

    await prisma.twoFactorAuth.upsert({
      where: { userId },
      update: { secret: encryptedSecret, isEnabled: false },
      create: { userId, secret: encryptedSecret, isEnabled: false },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const otpauth = authenticator.keyuri(user?.email ?? userId, "Celeventic", secret);

    return { secret, otpauth };
  }

  async enable(userId: string, token: string) {
    const record = await prisma.twoFactorAuth.findUnique({ where: { userId } });
    if (!record) throw new Error("2FA not set up");

    const secret = decrypt(record.secret);
    const valid = authenticator.verify({ token, secret });
    if (!valid) throw new Error("Invalid verification code");

    const backupCodes = Array.from({ length: 8 }, () => generateToken(8));

    await prisma.twoFactorAuth.update({
      where: { userId },
      data: { isEnabled: true, backupCodes },
    });

    await createAuditLog({ userId, action: "TWO_FACTOR_ENABLED", entity: "user", entityId: userId });
    return { backupCodes };
  }

  async verify(userId: string, token: string): Promise<boolean> {
    const record = await prisma.twoFactorAuth.findUnique({ where: { userId } });
    if (!record?.isEnabled) return true;

    const secret = decrypt(record.secret);
    if (authenticator.verify({ token, secret })) return true;

    const codes = (record.backupCodes as string[]) ?? [];
    if (codes.includes(token)) {
      await prisma.twoFactorAuth.update({
        where: { userId },
        data: { backupCodes: codes.filter((c) => c !== token) },
      });
      return true;
    }

    return false;
  }

  async disable(userId: string, token: string) {
    const valid = await this.verify(userId, token);
    if (!valid) throw new Error("Invalid verification code");

    await prisma.twoFactorAuth.update({
      where: { userId },
      data: { isEnabled: false },
    });

    await createAuditLog({ userId, action: "TWO_FACTOR_DISABLED", entity: "user", entityId: userId });
  }
}

export const twoFactorService = new TwoFactorService();
