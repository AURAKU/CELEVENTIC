"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Loader2 } from "lucide-react";

const INFO_PAGES = [
  { slug: "about", title: "About", publicPath: "/legal/about" },
  { slug: "faq", title: "FAQ", publicPath: "/legal/faq" },
  { slug: "contact", title: "Contact", publicPath: "/legal/contact", note: "Phone, email, and hours are managed in Contact Settings and sync here when empty." },
] as const;

type PageSlug = (typeof INFO_PAGES)[number]["slug"];

export function AdminPagesClient() {
  const [locale, setLocale] = useState<"en" | "fr">("en");
  const [pages, setPages] = useState<Record<PageSlug, string>>({ about: "", faq: "", contact: "" });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PageSlug | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadPages = useCallback(async () => {
    setLoading(true);
    const next: Record<PageSlug, string> = { about: "", faq: "", contact: "" };
    await Promise.all(
      INFO_PAGES.map(async (page) => {
        const res = await fetch(`/api/cms/pages/${page.slug}?locale=${locale}`);
        const data = await res.json();
        if (data.success) next[page.slug] = data.data.content ?? "";
      })
    );
    setPages(next);
    setLoading(false);
  }, [locale]);

  useEffect(() => {
    void loadPages();
  }, [loadPages]);

  async function save(slug: PageSlug) {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: `pages.${slug}.${locale}`, value: { content: draft } }),
    });
    setSaving(false);
    if (res.ok) {
      setPages((prev) => ({ ...prev, [slug]: draft }));
      setEditing(null);
      setMessage(`${slug} saved (${locale.toUpperCase()}).`);
    } else {
      setMessage("Save failed. Try again.");
    }
  }

  return (
    <div className="space-y-6">
      <AdminToolbar
        title="Page Management"
        subtitle="Edit About, FAQ, and Contact content. Legal policies are managed in Legal Center."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={locale} onValueChange={(v) => setLocale(v as "en" | "fr")}>
          <TabsList>
            <TabsTrigger value="en">English</TabsTrigger>
            <TabsTrigger value="fr">Français</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/legal">Legal Center →</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/contact">Contact Settings →</Link>
        </Button>
      </div>

      {message && <p className="text-sm text-brand-700 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">{message}</p>}

      {loading ? (
        <p className="text-slate-500 flex items-center gap-2 py-12 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading pages…
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {INFO_PAGES.map((page) => (
            <Card key={page.slug}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  {page.title}
                  <Link href={page.publicPath} target="_blank" className="text-brand-600 hover:text-brand-700">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {"note" in page && page.note && (
                  <p className="text-xs text-slate-500">{page.note}</p>
                )}
                {editing === page.slug ? (
                  <>
                    <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={8} />
                    <div className="flex gap-2">
                      <Button size="sm" disabled={saving} onClick={() => void save(page.slug)}>
                        {saving ? "Saving…" : "Save"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-slate-600 line-clamp-6 whitespace-pre-wrap">{pages[page.slug] || "No content yet."}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(page.slug);
                        setDraft(pages[page.slug]);
                      }}
                    >
                      Edit Content
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
