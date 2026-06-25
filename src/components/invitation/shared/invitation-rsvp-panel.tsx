"use client";

import { useState } from "react";
import { Check, X, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/components/i18n/locale-provider";
import type { ButtonStyle } from "@/lib/invitation-studio/studio-types";
import { styledInvitationButton } from "@/lib/invitation/invitation-button-styles";

interface InvitationRsvpPanelProps {
  invitationId: string;
  guestId?: string;
  guestName?: string;
  accentColor?: string;
  textColor?: string;
  variant?: "light" | "dark";
  buttonStyle?: ButtonStyle | string;
  label?: string;
}

export function InvitationRsvpPanel({
  invitationId,
  guestId,
  guestName: initialGuestName,
  accentColor = "#0D9488",
  variant = "light",
  buttonStyle,
  label,
}: InvitationRsvpPanelProps) {
  const { t } = useLocale();
  const [rsvpStatus, setRsvpStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [guestName, setGuestName] = useState(initialGuestName ?? "");
  const [email, setEmail] = useState("");

  async function handleRsvp(response: "ACCEPTED" | "DECLINED" | "MAYBE") {
    setError("");
    setLoading(true);
    const payload = guestId
      ? { guestId, response }
      : { invitationId, guestName: guestName.trim(), email: email.trim() || undefined, response };

    if (!guestId && !guestName.trim()) {
      setError(t("rsvp.name_required"));
      setLoading(false);
      return;
    }

    const res = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setRsvpStatus(response);
    else setError(data.error || t("rsvp.submit_failed"));
    setLoading(false);
  }

  const btnClass = buttonStyle
    ? styledInvitationButton(buttonStyle, variant, "px-4")
    : variant === "dark"
      ? "border-white/30 text-white hover:bg-white/10"
      : "";

  if (rsvpStatus) {
    return (
      <div
        className="text-center p-4 rounded-lg font-medium inv-fade-in"
        style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
      >
        {t("rsvp.title")}: {rsvpStatus.replace(/_/g, " ")} — {t("rsvp.thank_you")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!guestId && (
        <div className="space-y-2">
          <Input
            placeholder={t("rsvp.your_name")}
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className={variant === "dark" ? "bg-white/10 border-white/20 text-white placeholder:text-white/50" : ""}
          />
          <Input
            type="email"
            placeholder={t("rsvp.your_email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={variant === "dark" ? "bg-white/10 border-white/20 text-white placeholder:text-white/50" : ""}
          />
        </div>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className={btnClass} onClick={() => handleRsvp("ACCEPTED")} disabled={loading}>
          <Check className="h-4 w-4 mr-1" /> {t("rsvp.accept")}
        </Button>
        <Button size="sm" variant="outline" className={btnClass} onClick={() => handleRsvp("DECLINED")} disabled={loading}>
          <X className="h-4 w-4 mr-1" /> {t("rsvp.decline")}
        </Button>
        <Button size="sm" variant="outline" className={btnClass} onClick={() => handleRsvp("MAYBE")} disabled={loading}>
          <HelpCircle className="h-4 w-4 mr-1" /> {t("rsvp.maybe")}
        </Button>
      </div>
    </div>
  );
}
