"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { InvitationFeatureFlags } from "@/lib/invitation/admin-feature-flags";
import type { InvitationMediaLimits } from "@/lib/invitation/media-limits";

export function AdminInvitationExperienceControls() {
  const [flags, setFlags] = useState<InvitationFeatureFlags | null>(null);
  const [limits, setLimits] = useState<InvitationMediaLimits | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/feature-flags").then((r) => r.json()),
      fetch("/api/admin/invitation-media-settings").then((r) => r.json()),
    ]).then(([f, l]) => {
      if (f.success) setFlags(f.data);
      if (l.success) setLimits(l.data);
    });
  }, []);

  async function saveAll() {
    if (!flags || !limits) return;
    setSaving(true);
    setMessage("");
    await Promise.all([
      fetch("/api/admin/feature-flags", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(flags) }),
      fetch("/api/admin/invitation-media-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(limits) }),
    ]);
    setSaving(false);
    setMessage("Experience settings saved.");
  }

  if (!flags || !limits) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Invitation Experience Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(Object.keys(flags) as (keyof InvitationFeatureFlags)[]).map((key) => (
            <label key={key} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
              <span className="capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
              <Switch checked={flags[key]} onCheckedChange={(v) => setFlags({ ...flags, [key]: v })} />
            </label>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div><Label className="text-xs">Min photos</Label><Input type="number" value={limits.minPhotos} onChange={(e) => setLimits({ ...limits, minPhotos: +e.target.value })} /></div>
          <div><Label className="text-xs">Max photos</Label><Input type="number" value={limits.maxPhotos} onChange={(e) => setLimits({ ...limits, maxPhotos: +e.target.value })} /></div>
          <div><Label className="text-xs">Min videos</Label><Input type="number" value={limits.minVideos} onChange={(e) => setLimits({ ...limits, minVideos: +e.target.value })} /></div>
          <div><Label className="text-xs">Max videos</Label><Input type="number" value={limits.maxVideos} onChange={(e) => setLimits({ ...limits, maxVideos: +e.target.value })} /></div>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm"><Switch checked={limits.allowVideoBackground} onCheckedChange={(v) => setLimits({ ...limits, allowVideoBackground: v })} /> Video backgrounds</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={limits.allowSlideshowVideo} onCheckedChange={(v) => setLimits({ ...limits, allowSlideshowVideo: v })} /> Slideshow video mode</label>
        </div>
        <Button onClick={() => void saveAll()} disabled={saving}>{saving ? "Saving…" : "Save experience settings"}</Button>
        {message && <p className="text-sm text-brand-700">{message}</p>}
      </CardContent>
    </Card>
  );
}
