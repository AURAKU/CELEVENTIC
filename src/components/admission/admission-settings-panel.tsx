"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Loader2, Save, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ResolvedAdmissionSettings } from "@/lib/admission/admission-settings";

interface AdmissionSettingsPanelProps {
  eventId: string;
  onSaved?: (settings: ResolvedAdmissionSettings) => void;
  className?: string;
}

type Draft = Partial<ResolvedAdmissionSettings>;

interface ToggleSpec {
  key: keyof ResolvedAdmissionSettings;
  label: string;
  hint: string;
}

const TOGGLE_GROUPS: { title: string; toggles: ToggleSpec[] }[] = [
  {
    title: "Admission",
    toggles: [
      {
        key: "qrAdmissionEnabled",
        label: "QR admission",
        hint: "Issues an entry pass for every invitation and shows it to guests.",
      },
      {
        key: "qrRequiredForEntry",
        label: "QR required for entry",
        hint: "Guests without a pass are sent to the host desk.",
      },
      {
        key: "manualCodeEnabled",
        label: "Manual admission code",
        hint: "Lets staff admit by typing the code when a QR won't scan.",
      },
      {
        key: "offlineAdmissionEnabled",
        label: "Offline admission",
        hint: "Gate devices can cache the guest list and admit without signal.",
      },
    ],
  },
  {
    title: "What the pass shows",
    toggles: [
      { key: "displayPassOnInvitation", label: "Show pass on the invitation", hint: "" },
      { key: "allowPassDownload", label: "Allow download (PNG / SVG)", hint: "" },
      { key: "allowPassPrint", label: "Allow print / PDF", hint: "" },
      { key: "showPartySizeOnPass", label: "Show party size", hint: "" },
      { key: "showTableOnPass", label: "Show table", hint: "" },
      { key: "showSeatOnPass", label: "Show seat", hint: "" },
      {
        key: "hideSeatingUntilAdmitted",
        label: "Hide seating until admitted",
        hint: "Table and seat stay hidden until the party is scanned in.",
      },
    ],
  },
  {
    title: "Arrival & gate",
    toggles: [
      {
        key: "allowPartialArrival",
        label: "Allow partial arrival",
        hint: "Admit part of a party now and the rest later.",
      },
      { key: "allowSeparateArrival", label: "Allow separate arrival", hint: "" },
      { key: "allowReEntry", label: "Allow re-entry", hint: "" },
      {
        key: "requireScannerConfirmation",
        label: "Confirm before admitting",
        hint: "Operator reviews the party before the count moves.",
      },
      {
        key: "fastAdmissionMode",
        label: "Fast admission mode",
        hint: "Skips confirmation for high-volume gates.",
      },
      { key: "requireOperatorAuth", label: "Require operator sign-in", hint: "" },
    ],
  },
];

const NUMBER_FIELDS: { key: keyof ResolvedAdmissionSettings; label: string; min: number; max: number }[] = [
  { key: "validityLeadHours", label: "Entry opens (hours before)", min: 0, max: 720 },
  { key: "validityTrailHours", label: "Entry closes (hours after)", min: 0, max: 720 },
  { key: "offlinePackageTtlMinutes", label: "Offline list expiry (minutes)", min: 5, max: 10080 },
  { key: "reEntryWindowMinutes", label: "Re-entry window (minutes)", min: 0, max: 1440 },
  { key: "manualCodeAttemptLimit", label: "Code attempts allowed", min: 1, max: 200 },
  { key: "manualCodeAttemptWindowSeconds", label: "…per (seconds)", min: 10, max: 3600 },
];

/** Organiser controls for how this event admits guests. */
export function AdmissionSettingsPanel({ eventId, onSaved, className }: AdmissionSettingsPanelProps) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<ResolvedAdmissionSettings | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessage("");
    setError("");
    fetch(`/api/events/${eventId}/admission-settings`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) {
          setSettings(json.data);
          setDraft({});
        } else {
          setError(json.error ?? "Could not load admission settings");
        }
      })
      .catch(() => !cancelled && setError("Could not load admission settings"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const value = useCallback(
    <K extends keyof ResolvedAdmissionSettings>(key: K): ResolvedAdmissionSettings[K] | undefined =>
      (draft[key] as ResolvedAdmissionSettings[K] | undefined) ?? settings?.[key],
    [draft, settings]
  );

  const save = useCallback(async () => {
    if (!Object.keys(draft).length) {
      setMessage("Nothing to save.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/events/${eventId}/admission-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Save failed");
      setSettings(json.data);
      setDraft({});
      onSaved?.(json.data);
      setMessage(
        json.backfilled
          ? `Saved, ${json.backfilled.issued} new pass(es) issued across ${json.backfilled.total} invitation(s).`
          : "Saved."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [draft, eventId, onSaved]);

  const dirty = Object.keys(draft).length > 0;

  return (
    <Card className={cn("border-slate-200", className)}>
      <CardHeader className="pb-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4" aria-hidden />
            Admission settings
          </CardTitle>
          <span className="flex items-center gap-2 text-xs text-slate-500">
            {settings?.qrAdmissionEnabled ? "QR admission on" : "QR admission off"}
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
              aria-hidden
            />
          </span>
        </button>
      </CardHeader>

      {open && (
        <CardContent className="space-y-6">
          {loading && (
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading…
            </p>
          )}

          {settings &&
            TOGGLE_GROUPS.map((group) => (
              <fieldset key={group.title} className="space-y-2">
                <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {group.title}
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.toggles.map((toggle) => (
                    <label
                      key={toggle.key}
                      className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-800">
                          {toggle.label}
                        </span>
                        {toggle.hint && (
                          <span className="block text-xs text-slate-500">{toggle.hint}</span>
                        )}
                      </span>
                      <Switch
                        checked={Boolean(value(toggle.key))}
                        onCheckedChange={(checked) =>
                          setDraft((d) => ({ ...d, [toggle.key]: checked }))
                        }
                        aria-label={toggle.label}
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}

          {settings && (
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Codes, windows & limits
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="code-length">Admission code length</Label>
                  <Select
                    value={String(value("manualCodeLength") ?? 4)}
                    onValueChange={(v) => setDraft((d) => ({ ...d, manualCodeLength: Number(v) }))}
                  >
                    <SelectTrigger id="code-length">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4 digits</SelectItem>
                      <SelectItem value="6">6 digits (large events)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="duplicate-policy">Repeat scan</Label>
                  <Select
                    value={String(value("duplicatePolicy") ?? "BLOCK")}
                    onValueChange={(v) =>
                      setDraft((d) => ({
                        ...d,
                        duplicatePolicy: v as ResolvedAdmissionSettings["duplicatePolicy"],
                      }))
                    }
                  >
                    <SelectTrigger id="duplicate-policy">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BLOCK">Block</SelectItem>
                      <SelectItem value="WARN">Warn but allow through</SelectItem>
                      <SelectItem value="ALLOW">Allow silently</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="portal-policy">Unlock guest portal</Label>
                  <Select
                    value={String(value("portalUnlockPolicy") ?? "ON_FIRST_ADMISSION")}
                    onValueChange={(v) =>
                      setDraft((d) => ({
                        ...d,
                        portalUnlockPolicy: v as ResolvedAdmissionSettings["portalUnlockPolicy"],
                      }))
                    }
                  >
                    <SelectTrigger id="portal-policy">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ON_FIRST_ADMISSION">On first arrival</SelectItem>
                      <SelectItem value="ON_FULL_ADMISSION">When the whole party is in</SelectItem>
                      <SelectItem value="MANUAL">Manually by the host</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {NUMBER_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label htmlFor={`num-${field.key}`}>{field.label}</Label>
                    <Input
                      id={`num-${field.key}`}
                      type="number"
                      min={field.min}
                      max={field.max}
                      value={String(value(field.key) ?? "")}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          [field.key]: e.target.value === "" ? null : Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pass-instructions">Instructions shown on the pass</Label>
                <Input
                  id="pass-instructions"
                  maxLength={500}
                  placeholder="Doors open at 4pm. Please have your pass ready at the gate."
                  value={String(value("passInstructions") ?? "")}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, passInstructions: e.target.value || null }))
                  }
                />
              </div>
            </fieldset>
          )}

          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
          {message && <p className="text-sm text-emerald-700">{message}</p>}

          <div className="flex items-center gap-2">
            <Button onClick={() => void save()} disabled={saving || !dirty}>
              {saving ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Save className="mr-1.5 h-4 w-4" aria-hidden />
              )}
              Save settings
            </Button>
            {dirty && (
              <Button variant="ghost" onClick={() => setDraft({})} disabled={saving}>
                Discard
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
