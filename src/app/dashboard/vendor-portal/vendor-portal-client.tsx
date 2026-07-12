"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VendorPortfolioUpload } from "@/components/media/vendor-portfolio-upload";
import { VendorProfilePhotoUpload } from "@/components/vendor-os/vendor-profile-photo-upload";
import { UploadedMedia } from "@/components/media/uploaded-media";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, MessageSquare, ExternalLink, Send, Calendar, Users, Package, Clock, Star, Receipt } from "lucide-react";

const SECTION_TO_TAB: Record<string, string> = {
  overview: "overview",
  portfolio: "portfolio",
  bookings: "bookings",
  quotes: "bookings",
  clients: "clients",
  services: "services",
  availability: "availability",
  reviews: "reviews",
};

export default function VendorPortalClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const highlightLead = searchParams.get("lead");
  const initialTab = SECTION_TO_TAB[sectionParam ?? ""] ?? "overview";
  const [activeTab, setActiveTab] = useState(initialTab);

  const [vendor, setVendor] = useState<{ id: string; slug: string; businessName: string; profileImage?: string | null; plan?: { name: string } } | null>(null);
  const [usage, setUsage] = useState<{ limits: Record<string, number>; usage: Record<string, number> } | null>(null);
  const [leads, setLeads] = useState<{ id: string; contactName?: string; status: string; eventType?: string; message?: string }[]>([]);
  const [bookings, setBookings] = useState<{ id: string; status: string; serviceName?: string; organizer?: { name: string } }[]>([]);
  const [quoteLead, setQuoteLead] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState({ title: "", amount: "", description: "" });
  const [quoteSending, setQuoteSending] = useState(false);
  const [replyLead, setReplyLead] = useState<string | null>(highlightLead);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  function loadLeads() {
    return fetch("/api/vendor-os/leads").then((r) => r.json()).then((leadsRes) => {
      if (leadsRes.success) setLeads(leadsRes.data);
    });
  }

  function loadBookings() {
    return fetch("/api/marketplace/bookings").then((r) => r.json()).then((res) => {
      if (res.success) setBookings(res.data.items);
    });
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/vendor-os/me").then((r) => r.json()),
      fetch("/api/vendor-os/leads").then((r) => r.json()),
      fetch("/api/marketplace/bookings").then((r) => r.json()),
    ]).then(([me, leadsRes, bookingsRes]) => {
      if (me.success && me.data) {
        setVendor(me.data.vendor);
        setUsage(me.data.usage);
      }
      if (leadsRes.success) setLeads(leadsRes.data);
      if (bookingsRes.success) setBookings(bookingsRes.data.items);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (sectionParam && SECTION_TO_TAB[sectionParam]) {
      setActiveTab(SECTION_TO_TAB[sectionParam]);
    }
  }, [sectionParam]);

  useEffect(() => {
    if (highlightLead) setActiveTab("bookings");
  }, [highlightLead]);

  function handleTabChange(tab: string) {
    setActiveTab(tab);
    router.replace(`/dashboard/vendor-portal?section=${tab}`, { scroll: false });
  }

  async function refreshUsage() {
    const me = await fetch("/api/vendor-os/me").then((r) => r.json());
    if (me.success?.data) setUsage(me.data.usage);
  }

  async function sendQuote(leadId: string) {
    const amount = Number(quoteForm.amount);
    if (!amount || amount <= 0) return;
    setQuoteSending(true);
    const res = await fetch("/api/marketplace/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        title: quoteForm.title || "Service quote",
        amount,
        description: quoteForm.description,
        depositPercent: 30,
      }),
    });
    setQuoteSending(false);
    if (res.ok) {
      setQuoteLead(null);
      setQuoteForm({ title: "", amount: "", description: "" });
      await loadLeads();
    }
  }

  async function markDelivered(bookingId: string) {
    await fetch(`/api/marketplace/bookings/${bookingId}/deliver`, { method: "POST" });
    await loadBookings();
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

  const leadsList = (
    <div className="space-y-3">
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
            <Button size="sm" variant="outline" onClick={() => setQuoteLead(quoteLead === l.id ? null : l.id)}>
              <Receipt className="h-3.5 w-3.5 mr-1" /> Send quote
            </Button>
          </div>
          {quoteLead === l.id && (
            <div className="border-t pt-2 space-y-2">
              <div><Label className="text-xs">Quote title</Label><Input value={quoteForm.title} onChange={(e) => setQuoteForm((f) => ({ ...f, title: e.target.value }))} placeholder="Wedding photography package" /></div>
              <div><Label className="text-xs">Amount (GHS)</Label><Input type="number" value={quoteForm.amount} onChange={(e) => setQuoteForm((f) => ({ ...f, amount: e.target.value }))} /></div>
              <Textarea value={quoteForm.description} onChange={(e) => setQuoteForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="What's included…" />
              <Button size="sm" onClick={() => void sendQuote(l.id)} disabled={quoteSending}>Send quote</Button>
            </div>
          )}
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
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          {vendor.profileImage ? (
            <UploadedMedia
              src={vendor.profileImage}
              alt=""
              className="h-14 w-14 rounded-xl border-2 border-white shadow-md object-cover shrink-0"
              width={56}
              height={56}
            />
          ) : (
            <div className="h-14 w-14 rounded-xl bg-[#0B8A83]/10 flex items-center justify-center text-xl font-bold text-[#0B8A83] shrink-0 border border-[#0B8A83]/20">
              {vendor.businessName[0]}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{vendor.businessName}</h1>
            <p className="page-subtitle">Vendor Portal · {vendor.plan?.name ?? "Free Plan"}</p>
          </div>
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

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Profile photo</CardTitle></CardHeader>
            <CardContent>
              <VendorProfilePhotoUpload
                profileImage={vendor.profileImage}
                onUpdated={(url) => setVendor((v) => (v ? { ...v, profileImage: url } : v))}
              />
              <p className="text-xs text-slate-500 mt-3">Shown on the vendor marketplace and your public profile page.</p>
            </CardContent>
          </Card>
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
            <CardHeader><CardTitle className="text-base">Quick actions</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => handleTabChange("portfolio")}>Upload portfolio</Button>
              <Button variant="outline" size="sm" onClick={() => handleTabChange("bookings")}>View bookings</Button>
              <Button variant="outline" size="sm" asChild><Link href={`/vendors/${vendor.slug}`} target="_blank">Edit public profile</Link></Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portfolio" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Upload Portfolio</CardTitle></CardHeader>
            <CardContent>
              <VendorPortfolioUpload onUploaded={() => void refreshUsage()} />
              <p className="text-xs text-slate-500 mt-3">Images up to 10MB · Videos up to 25MB</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> Active Bookings</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {bookings.length === 0 ? (
                <p className="text-slate-500 text-sm">No confirmed bookings yet. Send quotes from leads below.</p>
              ) : bookings.map((b) => (
                <div key={b.id} className="rounded-lg border p-3 text-sm flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium">{b.serviceName ?? "Booking"}</p>
                    <p className="text-xs text-slate-500">{b.organizer?.name ?? "Organizer"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{b.status}</Badge>
                    {["DEPOSIT_PAID", "CONFIRMED", "IN_PROGRESS"].includes(b.status) && (
                      <Button size="sm" variant="outline" onClick={() => void markDelivered(b.id)}>Mark delivered</Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Leads & Enquiries</CardTitle></CardHeader>
            <CardContent>{leadsList}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Clients</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">Organizers who enquired through your profile appear here and in Messages.</p>
              {leadsList}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> Services</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">Manage your service packages and pricing on your public vendor profile.</p>
              <Button asChild><Link href={`/vendors/${vendor.slug}`} target="_blank">Edit services on public profile</Link></Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Availability</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">Share your availability with organizers via Messages when they enquire. Calendar booking sync is coming soon.</p>
              <Button variant="outline" asChild><Link href="/dashboard/messages">Open Messages</Link></Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Star className="h-4 w-4" /> Reviews</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">Reviews from organizers appear on your public profile after events are completed.</p>
              <Button variant="outline" asChild><Link href={`/vendors/${vendor.slug}`} target="_blank">View public reviews</Link></Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
