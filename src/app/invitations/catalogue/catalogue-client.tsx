"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Sparkles, RefreshCw, Calendar, MapPin, Heart } from "lucide-react";
import { TemplateCard } from "@/components/invitation-mvp/template-card";
import { DesignAdvisorBanner } from "@/components/invitation-os/design-advisor-banner";
import { Button } from "@/components/ui/button";
import {
  CATALOG_TEMPLATES,
  INVITATION_CATEGORIES,
  INVITATION_STYLES,
  INVITATION_MOODS,
} from "@/lib/invitation-mvp/catalogue";

export function CatalogueClient() {
  const [category, setCategory] = useState("all");
  const [style, setStyle] = useState("all");
  const [mood, setMood] = useState("all");
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("WEDDING");

  useEffect(() => {
    fetch("/api/invitation-os/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "TEMPLATE_VIEW", templateSlug: "catalogue" }),
    }).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return CATALOG_TEMPLATES.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (style !== "all" && t.style !== style) return false;
      if (mood !== "all" && t.mood !== mood) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !t.name.toLowerCase().includes(q) &&
          !t.description.toLowerCase().includes(q) &&
          !(t.mood?.toLowerCase().includes(q))
        ) {
          return false;
        }
      }
      return true;
    });
  }, [category, style, mood, search]);

  return (
    <div>
      <div className="mb-8 rounded-2xl border border-[#0B8A83]/20 bg-gradient-to-br from-[#0B8A83]/5 via-white to-[#D4A63A]/5 p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#0B8A83] mb-2">
              Complete invitation experiences
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0F172A]">
              Handcrafted templates — free to create, switch anytime
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Every design includes RSVP, calendar save, maps, countdown, guest wishes, music, gallery, and gift QR.
              Change templates in the studio without losing your content.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { icon: Calendar, label: "Calendar" },
                { icon: MapPin, label: "Maps" },
                { icon: Heart, label: "Guest wishes" },
                { icon: RefreshCw, label: "Switch anytime" },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/80 border border-slate-200/80 text-slate-700"
                >
                  <Icon className="h-3.5 w-3.5 text-[#0B8A83]" />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <Button asChild className="bg-[#0B8A83] hover:bg-[#097068] shrink-0">
            <Link href="/invitations/create/start">
              <Sparkles className="h-4 w-4 mr-2" />
              Start free trial
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
        >
          <option value="WEDDING">Wedding</option>
          <option value="FUNERAL">Funeral</option>
          <option value="BIRTHDAY">Birthday</option>
          <option value="CORPORATE_EVENT">Corporate</option>
          <option value="CHURCH_PROGRAM">Church</option>
          <option value="PRIVATE_EVENT">Private Celebration</option>
        </select>
        <DesignAdvisorBanner eventType={eventType} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          type="search"
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 h-11 rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:border-[#0B8A83] focus:ring-2 focus:ring-[#0B8A83]/15"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
        >
          <option value="all">All Categories</option>
          {INVITATION_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
        >
          <option value="all">All Styles</option>
          {INVITATION_STYLES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
        >
          <option value="all">All Moods</option>
          {INVITATION_MOODS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <p className="text-sm text-slate-500 mb-6">
        {filtered.length} template{filtered.length !== 1 ? "s" : ""} · Preview live demos before you choose
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p>No templates match your filters.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((t) => <TemplateCard key={t.slug} template={t} />)}
        </div>
      )}
    </div>
  );
}
