import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const securityFeatures = [
  { title: "Role-Based Access Control", status: "Active", desc: "6 roles with protected routes" },
  { title: "Audit Logging", status: "Active", desc: "All admin actions logged" },
  { title: "Payment Webhook Validation", status: "Active", desc: "Signature verification on webhooks" },
  { title: "Secure QR Tokens", status: "Active", desc: "Cryptographic tokens per guest/ticket" },
  { title: "Rate Limiting", status: "Phase 2", desc: "API rate limiting middleware" },
  { title: "Encrypted API Settings", status: "Phase 2", desc: "AES encryption for sensitive keys" },
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
                <span className={`text-sm font-medium ${feature.status === "Active" ? "text-green-600" : "text-yellow-600"}`}>
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
