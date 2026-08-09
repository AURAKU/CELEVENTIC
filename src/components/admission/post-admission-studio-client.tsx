"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  ClipboardPaste,
  ExternalLink,
  Gift,
  Loader2,
  Save,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/page-loader";
import { cn } from "@/lib/utils";

type StudioFeature = {
  key: string;
  label: string;
  enabled: boolean;
  postAdmissionOnly?: boolean;
};

type StudioPayload = {
  event: { id: string; title: string; eventType: string };
  invitation: {
    id: string;
    uniqueLink: string;
    name: string | null;
    postAdmissionEnabled: boolean;
  } | null;
  message?: string;
  features?: StudioFeature[];
  menu?: { menuBody: string; menuUrl: string };
  programmeOutline?: string;
  theme?: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    fontHeading: string;
    fontBody: string;
    identitySlug: string;
    heroImageUrl: string | null;
  };
  gift?: { giftUrl: string; title: string; teaser: string | null } | null;
  companionPreviewPath?: string;
  giftsStudioPath?: string;
  invitationStudioPath?: string;
  qrAdmissionPath?: string;
};

const FEATURE_HINTS: Record<string, string> = {
  POST_ADMISSION_PORTAL: "Unlocks the guest Event Companion after gate admission.",
  SEATING_REVEAL: "Shows table and seat after check-in.",
  LIVE_PROGRAMME: "Shows the order of the day on the companion.",
  EVENT_MENU: "Shows the dining menu section.",
  GIFT_WALLET:
    "Cash gifts on Event Companion and Event Guide (when placement is on). Off by default.",
  MEMORY_VAULT: "Photo & video uploads from guests.",
  GUEST_HELP: "Help / contact actions for admitted guests.",
  ANNOUNCEMENTS: "Host announcements on the companion.",
  EVENT_SERVICES: "Vendor / service shortcuts for guests.",
};

export function PostAdmissionStudioClient({ eventId }: { eventId: string }) {
  const [data, setData] = useState<StudioPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const [menuBody, setMenuBody] = useState("");
  const [menuUrl, setMenuUrl] = useState("");
  const [programmeOutline, setProgrammeOutline] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/companion-studio`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not load Event Companion studio.");
        setData(null);
        return;
      }
      const payload = json.data as StudioPayload;
      setData(payload);
      setMenuBody(payload.menu?.menuBody ?? "");
      setMenuUrl(payload.menu?.menuUrl ?? "");
      setProgrammeOutline(payload.programmeOutline ?? "");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const themeStyle = useMemo(() => {
    if (!data?.theme) return undefined;
    return {
      background: data.theme.surface || data.theme.background,
      color: data.theme.text,
      borderColor: `${data.theme.secondary}55`,
      fontFamily: data.theme.fontBody,
    } as CSSProperties;
  }, [data?.theme]);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/companion-studio`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not save changes.");
        return;
      }
      const payload = json.data as StudioPayload;
      setData(payload);
      setMenuBody(payload.menu?.menuBody ?? menuBody);
      setMenuUrl(payload.menu?.menuUrl ?? menuUrl);
      setProgrammeOutline(payload.programmeOutline ?? programmeOutline);
      setSavedAt(new Date().toLocaleTimeString());
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader label="Opening Event Companion studio…" />;

  if (!data?.invitation) {
    return (
      <Card>
        <CardContent className="space-y-3 py-8 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-brand-600" />
          <p className="font-medium text-slate-900">No invitation to attach companion content to</p>
          <p className="text-sm text-slate-500">
            {data?.message ?? "Create and publish an invitation for this event first."}
          </p>
          <Button asChild>
            <Link href={`/dashboard/invitations?eventId=${encodeURIComponent(eventId)}`}>
              Open invitations
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Post-admission studio
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Event Companion</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Edit what admitted guests see after QR / gate check-in — programme, menu, cash gifts,
            and companion sections. Saves apply to every invitation link for this event (including
            links already sent). Design fonts and colours follow your invitation template.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.companionPreviewPath && (
            <Button asChild variant="outline">
              <Link href={data.companionPreviewPath} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" /> Preview companion
              </Link>
            </Button>
          )}
          {data.qrAdmissionPath && (
            <Button asChild variant="outline">
              <Link href={data.qrAdmissionPath}>QR Admission</Link>
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {savedAt && (
        <p className="text-xs text-emerald-700">Saved · {savedAt}</p>
      )}

      {data.theme && (
        <Card className="overflow-hidden border" style={themeStyle}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.24em]"
                style={{ color: data.theme.secondary }}
              >
                Template theme
              </p>
              <p className="mt-1 text-lg font-semibold" style={{ fontFamily: data.theme.fontHeading }}>
                {data.event.title}
              </p>
              <p className="text-xs opacity-70">
                {data.theme.identitySlug} · fonts inherited from invitation design
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="h-8 w-8 rounded-full border"
                style={{ background: data.theme.primary }}
                title="Primary"
              />
              <span
                className="h-8 w-8 rounded-full border"
                style={{ background: data.theme.secondary }}
                title="Accent"
              />
              <span
                className="h-8 w-8 rounded-full border"
                style={{ background: data.theme.background }}
                title="Background"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Companion sections</CardTitle>
          <p className="text-xs text-slate-500">
            Toggle what appears for admitted guests. Portal master switch also flips{" "}
            <code className="rounded bg-slate-100 px-1">postAdmissionEnabled</code>.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data.features ?? []).map((feature) => (
            <label
              key={feature.key}
              className={cn(
                "flex cursor-pointer items-start justify-between gap-3 rounded-xl border px-3 py-3",
                feature.enabled ? "border-brand-200 bg-brand-50/40" : "border-slate-200 bg-white"
              )}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">{feature.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {FEATURE_HINTS[feature.key] ?? feature.key}
                </p>
              </div>
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300"
                checked={feature.enabled}
                disabled={saving}
                onChange={(e) =>
                  void patch({ featureKey: feature.key, enabled: e.target.checked })
                }
              />
            </label>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardPaste className="h-4 w-4" /> Programme outline
            </CardTitle>
            <p className="text-xs text-slate-500">
              Paste your order of the day. One line per item — e.g.{" "}
              <span className="font-medium">2:00 PM — Ceremony — Exchange of vows</span>. Saved into
              the invitation wedding board so the companion uses the same template style.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={programmeOutline}
              onChange={(e) => setProgrammeOutline(e.target.value)}
              rows={10}
              placeholder={"1:30 PM — Guest Arrival — Welcome drinks\n2:00 PM — Ceremony\n4:30 PM — Reception"}
              className="font-[family-name:var(--font-cormorant)] text-base leading-relaxed"
            />
            <Button
              type="button"
              disabled={saving}
              onClick={() => void patch({ programmeOutline })}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save programme
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UtensilsCrossed className="h-4 w-4" /> Menu
            </CardTitle>
            <p className="text-xs text-slate-500">
              Paste the dining menu guests should see after admission, or link an external menu PDF /
              page.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="menu-body">Menu details</Label>
              <Textarea
                id="menu-body"
                value={menuBody}
                onChange={(e) => setMenuBody(e.target.value)}
                rows={8}
                placeholder={"Starter — Garden salad\nMain — Jollof & grilled chicken\nDessert — Cake"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="menu-url">Menu link (optional)</Label>
              <Input
                id="menu-url"
                value={menuUrl}
                onChange={(e) => setMenuUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <Button
              type="button"
              disabled={saving}
              onClick={() => void patch({ menuBody, menuUrl })}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save menu
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="h-4 w-4" /> Cash gifts & contributions
          </CardTitle>
          <p className="text-xs text-slate-500">
            Companion TAKE PART uses your Event Gift Wallet campaign. Enable{" "}
            <Badge variant="outline">Gift wallet</Badge> above, then manage amounts and theme in
            Gifts.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {data.gift ? (
            <p className="text-sm text-slate-700">
              Live on companion: <span className="font-medium">{data.gift.title}</span>
              {data.gift.teaser ? ` — ${data.gift.teaser}` : ""}
            </p>
          ) : (
            <p className="text-sm text-amber-800">
              No active gift campaign for companion yet. Set one up in Gifts & Contributions.
            </p>
          )}
          {data.giftsStudioPath && (
            <Button asChild variant="outline">
              <Link href={data.giftsStudioPath}>Open gift wallet</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
