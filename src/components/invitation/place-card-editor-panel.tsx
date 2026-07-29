"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatAllowanceCopy,
  PLACE_CARD_PRESETS,
  resolvePlaceCardConfig,
  type PlaceCardConfig,
} from "@/lib/invitation-features/place-card";

/**
 * Organiser controls for the Personalised Place Card.
 *
 * Writes a single `PLACE_CARD` override through the shared feature-layer API,
 * so the change reaches every already-published copy of the invitation on the
 * next guest view, no re-publish, no per-template work.
 */

interface PlaceCardEditorPanelProps {
  invitationId: string;
  /** Party allowance, used only to preview the allowance line. */
  partySize?: number;
  onSaved?: () => void;
  className?: string;
}

const RECIPIENT_TYPES: { value: PlaceCardConfig["recipientType"]; label: string }[] = [
  { value: "individual", label: "Individual" },
  { value: "couple", label: "Couple" },
  { value: "plus_one", label: "Guest plus one" },
  { value: "family", label: "Family" },
  { value: "household", label: "Household" },
  { value: "organisation", label: "Organisation" },
  { value: "reserved_table", label: "Reserved table" },
  { value: "custom", label: "Custom group" },
];

export function PlaceCardEditorPanel({
  invitationId,
  partySize = 2,
  onSaved,
  className,
}: PlaceCardEditorPanelProps) {
  const [config, setConfig] = useState<PlaceCardConfig>(() => resolvePlaceCardConfig(null));
  const [featureEnabled, setFeatureEnabled] = useState(true);
  const [order, setOrder] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/invitations/${invitationId}/features`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error ?? "Could not load place card settings");
        const feature = (json.data as { key: string; enabled: boolean; order: number; config: unknown }[]).find(
          (f) => f.key === "PLACE_CARD"
        );
        setConfig(resolvePlaceCardConfig(feature?.config));
        setFeatureEnabled(feature?.enabled ?? true);
        setOrder(feature?.order ?? null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load settings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invitationId]);

  const set = useCallback(<K extends keyof PlaceCardConfig>(key: K, value: PlaceCardConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setMessage("");
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    setConfig((prev) => resolvePlaceCardConfig({ ...prev, preset: presetId }, presetId));
    setMessage("");
  }, []);

  const allowancePreview = useMemo(
    () => formatAllowanceCopy(config.allowanceDisplayWording, partySize),
    [config.allowanceDisplayWording, partySize]
  );

  const save = useCallback(async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/invitations/${invitationId}/features`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featureKey: "PLACE_CARD",
          enabled: featureEnabled,
          ...(order != null ? { order } : {}),
          config: config as unknown as Record<string, unknown>,
          reason: "Place card updated from the invitation workspace",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not save place card");
      setMessage("Saved. Every published copy of this invitation shows it on the next view.");
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save place card");
    } finally {
      setSaving(false);
    }
  }, [config, featureEnabled, invitationId, onSaved, order]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center gap-2 p-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading place card settings…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-brand-600" aria-hidden />
          Personalised place card
        </CardTitle>
        <p className="text-xs text-slate-500">
          Shown on this invitation above the entry pass, on every template. Party allowance comes
          from the guest list, this only controls the wording and styling.
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-800">Show the place card</p>
            <p className="text-xs text-slate-500">Turn off to hide it on this invitation only.</p>
          </div>
          <Switch
            checked={featureEnabled && config.enabled}
            onCheckedChange={(v) => {
              setFeatureEnabled(v);
              set("enabled", v);
            }}
            aria-label="Show the place card"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Presets</Label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PLACE_CARD_PRESETS).map(([id, preset]) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={config.preset === id ? "default" : "outline"}
                onClick={() => applyPreset(id)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Heading">
            <Input value={config.heading} onChange={(e) => set("heading", e.target.value)} />
          </Field>
          <Field label="Salutation">
            <Input
              value={config.salutation}
              onChange={(e) => set("salutation", e.target.value)}
              placeholder="Dear"
            />
          </Field>

          <Field label="Who is named">
            <Select
              value={config.recipientDisplay}
              onValueChange={(v) => set("recipientDisplay", v as PlaceCardConfig["recipientDisplay"])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Guest name</SelectItem>
                <SelectItem value="group">Group name</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Recipient type">
            <Select
              value={config.recipientType}
              onValueChange={(v) => set("recipientType", v as PlaceCardConfig["recipientType"])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RECIPIENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Group name" hint="Shown when the card names a group or table.">
            <Input
              value={config.groupName}
              onChange={(e) => set("groupName", e.target.value)}
              placeholder="The Mensah Family"
            />
          </Field>
          <Field label="Monogram" hint="Up to 4 characters. Left blank, initials are used.">
            <Input
              value={config.monogram}
              maxLength={4}
              onChange={(e) => set("monogram", e.target.value.toUpperCase())}
            />
          </Field>

          <Field label="Theme">
            <Select value={config.theme} onValueChange={(v) => set("theme", v as PlaceCardConfig["theme"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inherit">Inherit from template</SelectItem>
                <SelectItem value="classic">Classic</SelectItem>
                <SelectItem value="elegant">Elegant</SelectItem>
                <SelectItem value="modern">Modern</SelectItem>
                <SelectItem value="festive">Festive</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Frame">
            <Select
              value={config.frameStyle}
              onValueChange={(v) => set("frameStyle", v as PlaceCardConfig["frameStyle"])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="line">Hairline</SelectItem>
                <SelectItem value="ornate">Ornate</SelectItem>
                <SelectItem value="soft">Soft</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Animation">
            <Select
              value={config.animation}
              onValueChange={(v) => set("animation", v as PlaceCardConfig["animation"])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="fade">Fade in</SelectItem>
                <SelectItem value="shimmer">Shimmer</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Visibility">
            <Select
              value={config.visibility}
              onValueChange={(v) => set("visibility", v as PlaceCardConfig["visibility"])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="when_assigned">Only when a guest is assigned</SelectItem>
                <SelectItem value="always">Always</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field
          label="Allowance wording"
          hint={`Use {n} for the party size. Preview: ${allowancePreview}`}
        >
          <Input
            value={config.allowanceDisplayWording}
            onChange={(e) => set("allowanceDisplayWording", e.target.value)}
          />
        </Field>

        <Field label="Wording" hint="Optional line under the recipient's name.">
          <Textarea
            rows={2}
            value={config.wording}
            onChange={(e) => set("wording", e.target.value)}
          />
        </Field>

        <Field label="Supporting message" hint="Optional closing note, e.g. arrival guidance.">
          <Textarea
            rows={2}
            value={config.supportingMessage}
            onChange={(e) => set("supportingMessage", e.target.value)}
          />
        </Field>

        <Field label="Section order" hint="Lower renders earlier. Leave blank to inherit.">
          <Input
            type="number"
            min={0}
            max={9999}
            value={order ?? ""}
            onChange={(e) => setOrder(e.target.value === "" ? null : Number(e.target.value))}
          />
        </Field>

        {error && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
        {message && <p className="text-sm text-emerald-700">{message}</p>}

        <Button onClick={() => void save()} disabled={saving} className="w-full sm:w-auto">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          Save place card
        </Button>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
