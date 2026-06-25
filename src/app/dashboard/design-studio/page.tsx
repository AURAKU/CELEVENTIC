"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Layout, Upload, Wand2, Store, ArrowRight, Palette } from "lucide-react";
import { EventPicker } from "@/components/dashboard/event-picker";
import { useEventContext } from "@/hooks/use-event-context";

const paths = [
  { id: "template", title: "Use Template", desc: "Pick from curated wedding, funeral, corporate & ticket designs", icon: Layout, href: "/dashboard/design-studio/templates", color: "bg-brand-50 text-brand-700" },
  { id: "ai", title: "Celeventic Template Intelligence", desc: "Describe your vision — Celeventic builds layout, colors, fonts & wording", icon: Wand2, href: "/dashboard/design-studio/ai", color: "bg-purple-50 text-purple-700" },
  { id: "inspiration", title: "Upload Inspiration", desc: "Upload image, PDF or video — build inspired, similar or upgraded designs", icon: Upload, href: "/dashboard/inspiration", color: "bg-amber-50 text-amber-700" },
  { id: "blank", title: "Start Blank", desc: "Open the drag-and-drop builder with an empty canvas", icon: Palette, href: "/dashboard/design-studio/builder/new", color: "bg-slate-100 text-slate-700" },
];

export default function DesignStudioPage() {
  const { events, eventId, setEventId, loading } = useEventContext();

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="page-heading flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-brand-600" /> Design Studio
        </h1>
        <p className="page-subtitle">
          Create invitations, flyers, tickets, business cards & social posts — no designer needed.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <EventPicker events={events} value={eventId} onChange={setEventId} loading={loading} label="Select Event (optional — links designs to your event)" />
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        {paths.map((p) => (
          <Link key={p.id} href={eventId ? `${p.href}?eventId=${eventId}` : p.href}>
            <Card className="card-glow hover:shadow-[0_12px_40px_rgba(11,138,131,0.12)] h-full cursor-pointer">
              <CardContent className="p-6">
                <div className={`inline-flex p-3 rounded-xl mb-4 ${p.color}`}>
                  <p.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg">{p.title}</h3>
                <p className="text-sm page-subtitle">{p.desc}</p>
                <span className="inline-flex items-center gap-1 text-sm text-brand-600 mt-4 font-medium">
                  Get started <ArrowRight className="h-4 w-4" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Store className="h-4 w-4" /> Template Marketplace</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 mb-4">Browse premium & free templates from Celeventic designers.</p>
            <Button asChild variant="outline"><Link href="/dashboard/design-studio/marketplace">Browse Marketplace</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Quick Links</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline"><Link href="/dashboard/invitations">Invitation Studio</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/dashboard/flyers">Flyer Studio</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/dashboard/inspiration">Inspiration Engine</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/dashboard/design-studio/assets">Asset Library</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/dashboard/design-studio/generated">Generated Designs</Link></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
