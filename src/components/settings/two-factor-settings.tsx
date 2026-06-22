"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield } from "lucide-react";

export function TwoFactorSettings() {
  const [step, setStep] = useState<"idle" | "setup" | "verify">("idle");
  const [otpauth, setOtpauth] = useState("");
  const [token, setToken] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  async function setup() {
    const res = await fetch("/api/auth/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setup" }),
    });
    const d = await res.json();
    if (res.ok) {
      setOtpauth(d.data.otpauth);
      setStep("verify");
    }
  }

  async function enable() {
    const res = await fetch("/api/auth/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "enable", token }),
    });
    const d = await res.json();
    if (res.ok) {
      setBackupCodes(d.data.backupCodes);
      setMessage("Two-factor authentication enabled!");
      setStep("idle");
    } else {
      setMessage(d.error || "Failed to enable 2FA");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-brand-600" /> Two-Factor Authentication</CardTitle>
        <CardDescription>Add an extra layer of security to your account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && <p className="text-sm text-brand-700 bg-brand-50 p-3 rounded-lg">{message}</p>}

        {step === "idle" && (
          <Button onClick={setup}>Enable 2FA</Button>
        )}

        {step === "verify" && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Scan this URI in your authenticator app:</p>
            <code className="block text-xs bg-slate-100 p-2 rounded break-all">{otpauth}</code>
            <div className="space-y-1">
              <Label>Verification Code</Label>
              <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="000000" maxLength={6} />
            </div>
            <Button onClick={enable}>Verify & Enable</Button>
          </div>
        )}

        {backupCodes.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Backup Codes (save these):</p>
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((c) => (
                <code key={c} className="text-xs bg-slate-100 p-2 rounded text-center">{c}</code>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
