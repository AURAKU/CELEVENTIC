"use client";

import { useState, useEffect } from "react";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
const LEGAL_PAGES = [
  { slug: "privacy", title: "Privacy Policy" },
  { slug: "cookie", title: "Cookie Policy" },
  { slug: "terms", title: "Terms and Conditions" },
  { slug: "refund", title: "Refund Policy" },
  { slug: "revision-policy", title: "Revision Policy" },
  { slug: "intellectual-property", title: "Intellectual Property Policy" },
  { slug: "data-rights", title: "Data Rights" },
] as const;

interface DocVersion {
  id: string;
  slug: string;
  version: string;
  requiresReacceptance: boolean;
  isPublished: boolean;
  effectiveDate: string;
}

interface AcceptanceStats {
  totalUsers: number;
  termsAccepted: number;
  privacyAccepted: number;
  cookieSet: number;
}

export function AdminLegalCenterClient() {
  const [activeSlug, setActiveSlug] = useState("privacy");
  const [contentEn, setContentEn] = useState("");
  const [contentFr, setContentFr] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [requiresReacceptance, setRequiresReacceptance] = useState(false);
  const [saving, setSaving] = useState(false);
  const [versions, setVersions] = useState<DocVersion[]>([]);
  const [stats, setStats] = useState<AcceptanceStats | null>(null);

  async function load(slug: string) {
    const res = await fetch(`/api/cms/pages/${slug}?locale=en`);
    const enData = await res.json();
    const frRes = await fetch(`/api/cms/pages/${slug}?locale=fr`);
    const frData = await frRes.json();
    setContentEn(enData?.success ? enData.data.content : "");
    setContentFr(frData?.success ? frData.data.content : "");
    if (enData?.success && enData.data?.version) setVersion(enData.data.version);
  }

  async function loadMeta() {
    const res = await fetch("/api/admin/legal/documents");
    const d = await res.json();
    if (d.success) {
      setVersions(d.data.documents);
      setStats(d.data.stats);
    }
  }

  function selectPage(slug: string) {
    setActiveSlug(slug);
    load(slug);
  }

  useEffect(() => {
    load("privacy");
    loadMeta();
  }, []);

  async function publish() {
    setSaving(true);
    await fetch("/api/admin/legal/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: activeSlug,
        version,
        contentEn,
        contentFr,
        requiresReacceptance,
      }),
    });
    setSaving(false);
    loadMeta();
    load(activeSlug);
  }

  const slugVersions = versions.filter((v) => v.slug === activeSlug);

  return (
    <div className="space-y-6">
      <AdminToolbar title="Legal Center" subtitle="Version, publish, and track acceptance of legal documents" onRefresh={loadMeta} />

      {stats && (
        <div className="grid sm:grid-cols-4 gap-4">
          <Card><CardContent className="pt-5 text-center"><p className="text-2xl font-bold">{stats.totalUsers}</p><p className="text-xs text-slate-500">Users</p></CardContent></Card>
          <Card><CardContent className="pt-5 text-center"><p className="text-2xl font-bold text-emerald-600">{stats.termsAccepted}</p><p className="text-xs text-slate-500">Terms Accepted</p></CardContent></Card>
          <Card><CardContent className="pt-5 text-center"><p className="text-2xl font-bold text-emerald-600">{stats.privacyAccepted}</p><p className="text-xs text-slate-500">Privacy Accepted</p></CardContent></Card>
          <Card><CardContent className="pt-5 text-center"><p className="text-2xl font-bold">{stats.cookieSet}</p><p className="text-xs text-slate-500">Cookie Consent Set</p></CardContent></Card>
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="space-y-1">
          {LEGAL_PAGES.map((p) => (
            <button
              key={p.slug}
              type="button"
              onClick={() => selectPage(p.slug)}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-all ${
                activeSlug === p.slug ? "bg-[#0B8A83] text-white" : "hover:bg-slate-100 text-slate-700"
              }`}
            >
              {p.title}
            </button>
          ))}
          <a
            href={`/legal/${activeSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-4 text-xs text-[#0B8A83] hover:underline px-3"
          >
            Preview public page →
          </a>
        </div>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
              {LEGAL_PAGES.find((p) => p.slug === activeSlug)?.title}
              {slugVersions[0] && <Badge>Published v{slugVersions[0].version}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Version</Label>
                <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={requiresReacceptance}
                    onChange={(e) => setRequiresReacceptance(e.target.checked)}
                  />
                  Force re-acceptance on publish
                </label>
              </div>
            </div>

            <Tabs defaultValue="en">
              <TabsList><TabsTrigger value="en">English</TabsTrigger><TabsTrigger value="fr">French</TabsTrigger></TabsList>
              <TabsContent value="en" className="mt-4">
                <Textarea rows={14} value={contentEn} onChange={(e) => setContentEn(e.target.value)} placeholder="Use ## for section headings..." />
              </TabsContent>
              <TabsContent value="fr" className="mt-4">
                <Textarea rows={14} value={contentFr} onChange={(e) => setContentFr(e.target.value)} placeholder="Utilisez ## pour les titres de section..." />
              </TabsContent>
            </Tabs>

            <Button onClick={publish} disabled={saving}>
              {saving ? "Publishing..." : "Publish Version"}
            </Button>

            {slugVersions.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Version History</p>
                <div className="space-y-1">
                  {slugVersions.map((v) => (
                    <div key={v.id} className="flex justify-between text-sm">
                      <span>v{v.version}</span>
                      <span className="text-slate-400">
                        {v.requiresReacceptance && <Badge variant="warning" className="mr-2">Re-accept</Badge>}
                        {new Date(v.effectiveDate).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
