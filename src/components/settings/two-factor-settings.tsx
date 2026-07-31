"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield } from "lucide-react";

export function TwoFactorSettings() {
  const [enabled, setEnabled] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [step, setStep] = useState<"idle" | "setup" | "verify">("idle");
  const [otpauth, setOtpauth] = useState("");
  const [token, setToken] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/settings/account")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setEnabled(Boolean(d.data.user?.twoFactorEnabled));
      })
      .finally(() => setLoadingStatus(false));
  }, []);

  async function setup() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup" }),
      });
      const d = await res.json();
      if (res.ok) {
        setOtpauth(d.data.otpauth);
        setStep("verify");
      } else {
        setMessage(d.error || "Could not start 2FA setup");
      }
    } finally {
      setBusy(false);
    }
  }

  async function enable() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enable", token }),
      });
      const d = await res.json();
      if (res.ok) {
        setBackupCodes(d.data.backupCodes ?? []);
        setMessage("Two-factor authentication enabled.");
        setEnabled(true);
        setStep("idle");
        setToken("");
      } else {
        setMessage(d.error || "Failed to enable 2FA");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-slate-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#0B8A83]" /> Two-factor authentication
            </CardTitle>
            <CardDescription className="mt-1">
              Protect organizer accounts that manage guest lists and gate admission.
            </CardDescription>
          </div>
          {!loadingStatus && (
            <Badge
              className={
                enabled
                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-100"
              }
            >
              {enabled ? "Enabled" : "Off"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <p className="text-sm text-[#0B8A83] bg-[#0B8A83]/8 p-3 rounded-xl">{message}</p>
        )}

        {loadingStatus ? (
          <p className="text-sm text-slate-500 inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking status…
          </p>
        ) : step === "idle" && !enabled ? (
          <Button onClick={() => void setup()} disabled={busy} className="bg-[#0B8A83]">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enable 2FA"}
          </Button>
        ) : null}

        {step === "idle" && enabled ? (
          <p className="text-sm text-slate-600">
            Authenticator codes are required at sign-in. Keep your backup codes somewhere safe.
          </p>
        ) : null}

        {step === "verify" && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Add this account in your authenticator app, then enter the 6-digit code.
            </p>
            <code className="block text-xs bg-slate-100 p-2.5 rounded-lg break-all">{otpauth}</code>
            <div className="space-y-1.5">
              <Label htmlFor="2fa-token">Verification code</Label>
              <Input
                id="2fa-token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void enable()} disabled={busy || token.length < 6} className="bg-[#0B8A83]">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & enable"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setStep("idle");
                  setToken("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {backupCodes.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Backup codes (save these now)</p>
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((c) => (
                <code key={c} className="text-xs bg-slate-100 p-2 rounded text-center">
                  {c}
                </code>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
