import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RBAC_ROLES } from "@/lib/rbac";

const securityFeatures = [
  { title: "Centralized RBAC", status: "Active", desc: `Roles: ${RBAC_ROLES.join(", ")} — permissions enforced via @/lib/rbac` },
  { title: "Admin Panel Protection", status: "Active", desc: "Middleware + layout guard for SUPER_ADMIN and ADMIN only" },
  { title: "JWT Session Sync", status: "Active", desc: "Role changes and force-logout apply without stale sessions" },
  { title: "Login Diagnostics", status: "Active", desc: "Structured dev logs; safe user-facing error messages" },
  { title: "Admin Verification API", status: "Active", desc: "GET /api/admin/auth/verify?email=… for production diagnostics" },
  { title: "Audit Logging", status: "Active", desc: "Admin user actions, role changes, and force-logout logged" },
  { title: "Password Security", status: "Active", desc: "bcrypt (12 rounds) via centralized hashPassword helper" },
  { title: "Startup Health Checks", status: "Active", desc: "Database, env vars, and admin account validated on boot" },
  { title: "Rate Limiting", status: "Phase 2", desc: "API rate limiting middleware" },
  { title: "MFA at Login", status: "Future", desc: "2FA setup exists; enforcement at login planned" },
];

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Security</h1>
      <div className="space-y-4">
        {securityFeatures.map((feature) => (
          <Card key={feature.title}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{feature.title}</CardTitle>
                <span className={`text-sm font-medium ${feature.status === "Active" ? "text-green-600" : feature.status === "Future" ? "text-slate-500" : "text-yellow-600"}`}>
                  {feature.status}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">{feature.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
