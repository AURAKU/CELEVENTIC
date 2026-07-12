import { prisma } from "@/lib/prisma";
import { canAccessAdminPanel, isPlatformAdmin } from "@/lib/rbac";
import { authLog } from "@/lib/auth/auth-logger";
import type { UserRole, UserStatus } from "@prisma/client";

export interface AdminVerificationCheck {
  key: string;
  passed: boolean;
  message: string;
}

export interface AdminVerificationResult {
  email: string;
  exists: boolean;
  healthy: boolean;
  role: UserRole | null;
  status: UserStatus | null;
  checks: AdminVerificationCheck[];
  errors: string[];
}

export async function verifyAdminAccount(email: string): Promise<AdminVerificationResult> {
  const normalized = email.trim().toLowerCase();
  const checks: AdminVerificationCheck[] = [];
  const errors: string[] = [];

  authLog("admin_verify", { email: normalized });

  let user: {
    id: string;
    email: string | null;
    passwordHash: string | null;
    role: UserRole;
    status: UserStatus;
    isVerified: boolean;
    emailVerified: Date | null;
    organizationId: string | null;
  } | null = null;

  try {
    user = await prisma.user.findUnique({
      where: { email: normalized },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        status: true,
        isVerified: true,
        emailVerified: true,
        organizationId: true,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database query failed";
    errors.push(message);
    checks.push({ key: "database", passed: false, message });
    return { email: normalized, exists: false, healthy: false, role: null, status: null, checks, errors };
  }

  const exists = !!user;
  checks.push({
    key: "exists",
    passed: exists,
    message: exists ? "Admin account record found" : "No account with this email",
  });
  if (!user) {
    errors.push("Admin account does not exist");
    return { email: normalized, exists: false, healthy: false, role: null, status: null, checks, errors };
  }

  checks.push({
    key: "email",
    passed: !!user.email,
    message: user.email ? `Email: ${user.email}` : "Email field missing",
  });

  checks.push({
    key: "password_hash",
    passed: !!user.passwordHash,
    message: user.passwordHash ? "Password hash present" : "No password hash",
  });
  if (!user.passwordHash) errors.push("Password hash missing");

  const active = user.status === "ACTIVE";
  checks.push({
    key: "active",
    passed: active,
    message: active ? "Account is active" : `Account status: ${user.status}`,
  });
  if (!active) errors.push(`Account is ${user.status}`);

  const verified = user.isVerified || !!user.emailVerified || isPlatformAdmin(user.role);
  checks.push({
    key: "verified",
    passed: verified,
    message: verified ? "Email verified" : "Email not verified",
  });
  if (!verified) errors.push("Email not verified");

  const adminRole = canAccessAdminPanel(user.role);
  checks.push({
    key: "role",
    passed: adminRole,
    message: adminRole ? `Role ${user.role} has admin access` : `Role ${user.role} is not admin`,
  });
  if (!adminRole) errors.push(`Role is ${user.role}, expected ADMIN or SUPER_ADMIN`);

  checks.push({
    key: "organization",
    passed: true,
    message: user.organizationId
      ? `Organization assigned (${user.organizationId})`
      : "No organization required for platform admin",
  });

  checks.push({
    key: "permissions",
    passed: adminRole && active,
    message: adminRole && active ? "Platform admin permissions OK" : "Insufficient permissions",
  });

  return {
    email: normalized,
    exists: true,
    healthy: errors.length === 0,
    role: user.role,
    status: user.status,
    checks,
    errors,
  };
}

export async function countPlatformAdmins(): Promise<number> {
  return prisma.user.count({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN"] }, status: "ACTIVE" },
  });
}
