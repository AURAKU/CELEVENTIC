"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Wand2 } from "lucide-react";
import { AGI_COPY } from "@/lib/agi-engine/branding";
import { AgiBadge } from "@/components/agi-engine/agi-badge";
import type { AiCreatorOutput } from "@/services/invitation-os/ai-invitation-creator.service";

interface AiCreatorPanelProps {
  orderId: string;
  eventType: string;
  onApply: (content: AiCreatorOutput) => void;
}

export function AiCreatorPanel({ orderId, eventType, onApply }: AiCreatorPanelProps) {
  const [names, setNames] = useState("");
  const [venue, setVenue] = useState("");
  const [style, setStyle] = useState("luxury");
  const [story, setStory] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<AiCreatorOutput | null>(null);

  async function generate() {
    if (!names.trim()) return;
    setLoading(true);
    const res = await fetch("/api/invitation-os/ai-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        eventType,
        names,
        venue,
        style,
        story,
        language: "both",
      }),
    });
    const d = await res.json();
    setLoading(false);
    if (d.success) setPreview(d.data);
  }

  return (
    <Card className="border-[#D4A63A]/30 bg-gradient-to-br from-[#FAF8F4] to-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#D4A63A]" />
          Celeventic Experience Engine
        </CardTitle>
        <p className="text-xs text-slate-500">{AGI_COPY.designed} — story, RSVP, WhatsApp & more</p>
        <AgiBadge variant="inline" label={AGI_COPY.enhanced} />
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs">Names / Couple / Honoree</Label>
          <Input value={names} onChange={(e) => setNames(e.target.value)} placeholder="Ama & Kwame" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Venue</Label>
            <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Accra" />
          </div>
          <div>
            <Label className="text-xs">Style</Label>
            <Input value={style} onChange={(e) => setStyle(e.target.value)} placeholder="Luxury, Kente..." />
          </div>
        </div>
        <div>
          <Label className="text-xs">Your story (optional)</Label>
          <Textarea rows={2} value={story} onChange={(e) => setStory(e.target.value)} placeholder="How you met, what this day means..." />
        </div>
        <Button onClick={generate} disabled={loading || !names.trim()} className="w-full bg-[#0B8A83]">
          <Wand2 className="h-4 w-4" />
          {loading ? AGI_COPY.crafting : AGI_COPY.generating}
        </Button>

        {preview && (
          <div className="rounded-xl border bg-white p-4 space-y-2 text-sm max-h-64 overflow-y-auto">
            <p className="font-semibold text-[#0F172A]">{preview.eventTitle}</p>
            <p className="text-slate-600 text-xs whitespace-pre-line line-clamp-4">{preview.story}</p>
            <p className="text-xs text-slate-400 border-t pt-2">WhatsApp: {preview.whatsappShareText.slice(0, 80)}...</p>
            <Button size="sm" className="w-full mt-2" onClick={() => onApply(preview)}>
              Apply to My Invitation
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
