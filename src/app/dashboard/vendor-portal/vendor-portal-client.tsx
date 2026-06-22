"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { VendorPortfolioUpload } from "@/components/media/vendor-portfolio-upload";
import { Store, MessageSquare, ExternalLink, Send } from "lucide-react";

export default function VendorPortalClient() {
  const searchParams = useSearchParams();
  const highlightLead = searchParams.get("lead");

  const [vendor, setVendor] = useState<{ id: string; slug: string; businessName: string; plan?: { name: string } } | null>(null);
  const [usage, setUsage] = useState<{ limits: Record<string, number>; usage: Record<string, number> } | null>(null);
  const [leads, setLeads] = useState<{ id: string; contactName?: string; status: string; eventType?: string; message?: string }[]>([]);
  const [replyLead, setReplyLead] = useState<string | null>(highlightLead);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  function loadLeads() {
    return fetch("/api/vendor-os/leads").then((r) => r.json()).then((leadsRes) => {
      if (leadsRes.success) setLeads(leadsRes.data);
    });
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/vendor-os/me").then((r) => r.json()),
      fetch("/api/vendor-os/leads").then((r) => r.json()),
    ]).then(([me, leadsRes]) => {
      if (me.success && me.data) {
        setVendor(me.data.vendor);
        setUsage(me.data.usage);
      }
      if (leadsRes.success) setLeads(leadsRes.data);
      setLoading(false);
    });
  }, []);

  async function refreshUsage() {
    const me = await fetch("/api/vendor-os/me").then((r) => r.json());
    if (me.success?.data) setUsage(me.data.usage);
  }

  async function sendReply(leadId: string) {
    if (!reply.trim()) return;
    setSending(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, body: reply.trim() }),
    });
    setSending(false);
    if (res.ok) {
      setReply("");
      setReplyLead(null);
      await loadLeads();
    }
  }

  if (loading) return <p className="text-slate-500 py-12 text-center">Loading...</p>;

  if (!vendor) {
    return (
      <div className="text-center py-16 space-y-4">
        <Store className="h-12 w-12 mx-auto text-[#0B8A83]" />
        <h1 className="text-2xl font-bold">Vendor Portal</h1>
        <p className="text-slate-500">Create your free vendor profile to start receiving leads.</p>
        <Button asChild className="bg-[#0B8A83]"><Link href="/dashboard/vendor-portal/signup">Get Started Free</Link></Button>
      </div>
    );
  }

  const imagePct = usage && usage.limits.imageLimit > 0
    ? Math.round((usage.usage.images / usage.limits.imageLimit) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{vendor.businessName}</h1>
          <p className="page-subtitle">Vendor Portal · {vendor.plan?.name ?? "Free Plan"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/messages"><MessageSquare className="h-4 w-4" /> Messages</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/vendors/${vendor.slug}`} target="_blank"><ExternalLink className="h-4 w-4" /> View Public Profile</Link>
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5 text-center">
            <MessageSquare className="h-5 w-5 mx-auto text-[#D4A63A] mb-1" />
            <p className="text-2xl font-bold">{leads.filter((l) => l.status === "NEW").length}</p>
            <p className="text-xs text-slate-500">New Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Portfolio Images</span>
              <span>{usage ? `${usage.usage.images}/${usage.limits.imageLimit}` : "—"}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#0B8A83] rounded-full transition-all" style={{ width: `${Math.min(imagePct, 100)}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Upload Portfolio</CardTitle></CardHeader>
        <CardContent>
          <VendorPortfolioUpload onUploaded={() => void refreshUsage()} />
          <p className="text-xs text-slate-500 mt-3">Images up to 10MB · Videos up to 25MB</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Leads Inbox</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {leads.length === 0 ? (
            <p className="text-slate-500 text-sm">No leads yet. Share your profile to get enquiries.</p>
          ) : leads.map((l) => (
            <div key={l.id} className={`rounded-lg border p-3 text-sm space-y-2 ${highlightLead === l.id ? "border-brand-400 bg-brand-50/30" : ""}`}>
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="font-medium">{l.contactName ?? "Organizer"}</p>
                  <p className="text-xs text-slate-500">{l.eventType ?? "Event enquiry"}</p>
                  {l.message && <p className="text-xs text-slate-600 mt-1">{l.message}</p>}
                </div>
                <Badge variant="outline">{l.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/dashboard/messages?thread=${encodeURIComponent(`lead:${l.id}`)}`}>Open thread</Link>
                </Button>
                <Button size="sm" variant="outline" onClick={() => setReplyLead(replyLead === l.id ? null : l.id)}>
                  Quick reply
                </Button>
              </div>
              {replyLead === l.id && (
                <div className="flex gap-2 pt-1">
                  <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} placeholder="Reply to organizer…" className="resize-none" />
                  <Button size="sm" onClick={() => sendReply(l.id)} disabled={sending || !reply.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
