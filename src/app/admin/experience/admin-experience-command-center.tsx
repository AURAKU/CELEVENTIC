"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminInvitationExperienceControls } from "@/app/admin/invitation-templates/admin-invitation-experience-controls";
import { OPENING_EXPERIENCES } from "@/lib/experience/opening-experiences";
import { AUDIO_EXPERIENCE_CATALOG, AUDIO_CATEGORY_GROUPS } from "@/lib/music/audio-experience-catalog";
import { REVEAL_EFFECTS_REGISTRY, SHOWCASE_REVEAL_EFFECTS } from "@/lib/experience/reveal-effects-registry";
import { TYPOGRAPHY_PACKS } from "@/lib/experience/typography-engine";
import { BACKGROUND_PACKS } from "@/lib/experience/background-engine";
import { BUTTON_STYLE_OPTIONS } from "@/lib/invitation-studio/studio-types";
import { SLIDESHOW_STYLE_OPTIONS } from "@/lib/invitation/slideshow-styles";
import { EXPERIENCE_COLLECTIONS } from "@/lib/experience/experience-engine-v2";
import { CATALOG_TEMPLATES, getUniqueLayoutCount } from "@/lib/invitation-mvp/catalogue";
import { formatCurrency } from "@/lib/utils";
import {
  Sparkles, Music, Palette, Layers, Type, ImageIcon, Wand2, Users, Mail, BarChart3,
} from "lucide-react";

interface AdminExperienceCommandCenterProps {
  stats: {
    totalUsers: number;
    totalInvitations: number;
    totalRevenue: number;
    totalEvents: number;
  };
}

export function AdminExperienceCommandCenter({ stats }: AdminExperienceCommandCenterProps) {
  const templateCount = getUniqueLayoutCount();

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl sidebar-gradient p-6 sm:p-8 text-white shadow-[0_12px_40px_rgba(15,23,42,0.4)] border border-white/10">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-gold-400" />
            <span className="text-sm font-medium text-white/70">Experience Engine V2</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Experience Command Center</h1>
          <p className="text-white/60 mt-1">Manage templates, audio, reveals, typography, backgrounds, feature flags, and media limits.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card><CardContent className="pt-5 text-center"><p className="text-3xl font-bold">{templateCount}</p><p className="text-xs text-slate-500 flex items-center justify-center gap-1"><Palette className="h-3 w-3" /> Templates</p></CardContent></Card>
        <Card><CardContent className="pt-5 text-center"><p className="text-3xl font-bold">{AUDIO_EXPERIENCE_CATALOG.length}</p><p className="text-xs text-slate-500 flex items-center justify-center gap-1"><Music className="h-3 w-3" /> Audio Tracks</p></CardContent></Card>
        <Card><CardContent className="pt-5 text-center"><p className="text-3xl font-bold">{stats.totalUsers.toLocaleString()}</p><p className="text-xs text-slate-500 flex items-center justify-center gap-1"><Users className="h-3 w-3" /> Users</p></CardContent></Card>
        <Card><CardContent className="pt-5 text-center"><p className="text-3xl font-bold">{stats.totalInvitations.toLocaleString()}</p><p className="text-xs text-slate-500 flex items-center justify-center gap-1"><Mail className="h-3 w-3" /> Invitations</p></CardContent></Card>
        <Card><CardContent className="pt-5 text-center"><p className="text-3xl font-bold">{OPENING_EXPERIENCES.length - 1}</p><p className="text-xs text-slate-500 flex items-center justify-center gap-1"><Wand2 className="h-3 w-3" /> Reveal Effects</p></CardContent></Card>
        <Card><CardContent className="pt-5 text-center"><p className="text-3xl font-bold text-[#0B8A83]">{formatCurrency(stats.totalRevenue)}</p><p className="text-xs text-slate-500 flex items-center justify-center gap-1"><BarChart3 className="h-3 w-3" /> Revenue</p></CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Reveal Effects Registry</CardTitle>
            <Badge variant="secondary">{REVEAL_EFFECTS_REGISTRY.length} total</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {SHOWCASE_REVEAL_EFFECTS.map((effect) => (
                <div key={effect.id} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${effect.accent}22`, color: effect.accent }}>{effect.icon}</span>
                  <div className="min-w-0"><p className="font-medium truncate">{effect.label}</p><p className="text-xs text-slate-500 truncate">{effect.description}</p></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              { href: "/admin/invitation-templates", label: "Manage Templates", icon: Palette },
              { href: "/admin/music", label: "Audio Library", icon: Music },
              { href: "/admin/analytics", label: "View Analytics", icon: BarChart3 },
              { href: "/experience", label: "Preview Showcase", icon: Sparkles },
            ].map((link) => (
              <Button key={link.href} variant="outline" className="w-full justify-start" asChild>
                <Link href={link.href}><link.icon className="h-4 w-4 mr-2" />{link.label}</Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Type className="h-4 w-4" /> Typography Packs</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{TYPOGRAPHY_PACKS.length}</p><p className="text-xs text-slate-500 mt-1">{TYPOGRAPHY_PACKS.slice(0, 3).map((p) => p.label).join(", ")}…</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Background Packs</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{BACKGROUND_PACKS.length}</p><p className="text-xs text-slate-500 mt-1">Static, video, particles, aurora…</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Layers className="h-4 w-4" /> Button Styles</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{BUTTON_STYLE_OPTIONS.length}</p><p className="text-xs text-slate-500 mt-1">Gold, glass, neon, wax seal…</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Layers className="h-4 w-4" /> Collections</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{Object.keys(EXPERIENCE_COLLECTIONS).length}</p><p className="text-xs text-slate-500 mt-1">Luxury, neon, funeral, kente…</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Audio Categories</CardTitle>
          <Badge variant="secondary">{AUDIO_CATEGORY_GROUPS.length} categories</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {AUDIO_CATEGORY_GROUPS.map((cat) => (
              <div key={cat.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{cat.label}</p>
                <p className="text-xs text-slate-500">{cat.moods.join(" · ")}</p>
                <p className="text-xs text-brand-600 mt-1">{AUDIO_EXPERIENCE_CATALOG.filter((t) => t.category === cat.id).length} tracks</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Slideshow Styles</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {SLIDESHOW_STYLE_OPTIONS.map((s) => (
              <Badge key={s.id} variant="outline">{s.label}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <AdminInvitationExperienceControls />
    </div>
  );
}
