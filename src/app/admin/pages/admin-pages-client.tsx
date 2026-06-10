"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AdminToolbar } from "@/components/admin/admin-toolbar";

const DEFAULT_PAGES = [
  { slug: "landing", title: "Landing Page", content: "Hero, features, pricing, and CTA sections." },
  { slug: "about", title: "About", content: "Celeventic is the Intelligent Event Operating System by AGI." },
  { slug: "faq", title: "FAQ", content: "Frequently asked questions about events, tickets, and payments." },
  { slug: "contact", title: "Contact", content: "support@celeventic.com" },
  { slug: "terms", title: "Terms of Service", content: "Terms and conditions for using Celeventic." },
  { slug: "privacy", title: "Privacy Policy", content: "How we handle your data." },
  { slug: "refund", title: "Refund Policy", content: "Refund rules for tickets and packages." },
];

export function AdminPagesClient() {
  const [pages, setPages] = useState(DEFAULT_PAGES);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  async function save(slug: string) {
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: `pages.${slug}`, value: { content: draft } }),
    });
    setPages((prev) => prev.map((p) => (p.slug === slug ? { ...p, content: draft } : p)));
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      <AdminToolbar
        title="Page Management"
        subtitle="Edit static page content stored in admin settings."
      />
      <div className="grid sm:grid-cols-2 gap-4">
        {pages.map((page) => (
          <Card key={page.slug}>
            <CardHeader><CardTitle className="text-base">{page.title}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {editing === page.slug ? (
                <>
                  <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={5} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => save(page.slug)}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-600 line-clamp-3">{page.content}</p>
                  <Button size="sm" variant="outline" onClick={() => { setEditing(page.slug); setDraft(page.content); }}>
                    Edit Content
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
