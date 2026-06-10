"use client";

import { useState, useMemo, useEffect } from "react";
import { TemplateCard } from "@/components/invitation-mvp/template-card";
import { DesignAdvisorBanner } from "@/components/invitation-os/design-advisor-banner";
import {
  CATALOG_TEMPLATES,
  INVITATION_CATEGORIES,
  INVITATION_STYLES,
} from "@/lib/invitation-mvp/catalogue";

export function CatalogueClient() {
  const [category, setCategory] = useState("all");
  const [style, setStyle] = useState("all");
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
      if (search) {
        const q = search.toLowerCase();
        if (!t.name.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [category, style, search]);

  return (
    <div>
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
      </div>

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
