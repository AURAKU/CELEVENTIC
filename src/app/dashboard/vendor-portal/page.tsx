"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Store, MessageSquare, Upload, ExternalLink } from "lucide-react";

export default function VendorPortalPage() {
  const [vendor, setVendor] = useState<{ id: string; slug: string; businessName: string; plan?: { name: string } } | null>(null);
  const [usage, setUsage] = useState<{ limits: Record<string, number>; usage: Record<string, number> } | null>(null);
  const [leads, setLeads] = useState<{ id: string; contactName?: string; status: string; eventType?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

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

  async function uploadMedia(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/vendor-os/media/upload", { method: "POST", body: form });
    if (res.ok) {
      const me = await fetch("/api/vendor-os/me").then((r) => r.json());
      if (me.success?.data) setUsage(me.data.usage);
    }
    setUploading(false);
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
        <Button variant="outline" asChild>
          <Link href={`/vendors/${vendor.slug}`} target="_blank"><ExternalLink className="h-4 w-4" /> View Public Profile</Link>
        </Button>
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
          <Input type="file" accept="image/*,video/*" onChange={uploadMedia} disabled={uploading} />
          <p className="text-xs text-slate-500 mt-2">{uploading ? "Uploading..." : "Images up to 10MB · Videos up to 25MB"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Leads Inbox</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {leads.length === 0 ? (
            <p className="text-slate-500 text-sm">No leads yet. Share your profile to get enquiries.</p>
          ) : leads.map((l) => (
            <div key={l.id} className="flex justify-between items-center p-3 rounded-lg border text-sm">
              <div>
                <p className="font-medium">{l.contactName ?? "Organizer"}</p>
                <p className="text-xs text-slate-500">{l.eventType ?? "Event enquiry"}</p>
              </div>
              <Badge variant="outline">{l.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
