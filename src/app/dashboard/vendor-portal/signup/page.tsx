"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VENDOR_TYPES } from "@/lib/vendor-os/constants";
import { Store } from "lucide-react";

export default function VendorSignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    businessName: "", ownerName: "", email: "", phone: "", whatsapp: "",
    vendorType: "individual", category: "Photographers", city: "", region: "", bio: "",
    yearsExperience: "", instagram: "", website: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const socialLinks = [
      form.instagram ? { platform: "instagram", url: form.instagram.startsWith("http") ? form.instagram : `https://instagram.com/${form.instagram}` } : null,
      form.website ? { platform: "website", url: form.website.startsWith("http") ? form.website : `https://${form.website}` } : null,
    ].filter(Boolean);

    const res = await fetch("/api/vendor-os/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : undefined,
        socialLinks,
      }),
    });
    const d = await res.json();
    setLoading(false);
    if (res.ok) {
      router.push("/dashboard/vendor-portal");
    } else {
      setError(d.error || "Signup failed");
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Store className="h-6 w-6 text-[#0B8A83]" /> Join VendorOS</h1>
        <p className="page-subtitle">List your business free. Reach event organizers across Ghana and beyond.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Business Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div><Label>Business Name *</Label><Input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} required /></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Owner / Full Name</Label><Input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} /></div>
              <div>
                <Label>Vendor Type</Label>
                <select className="w-full rounded-lg border px-3 py-2 text-sm" value={form.vendorType} onChange={(e) => setForm({ ...form, vendorType: e.target.value })}>
                  {VENDOR_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div><Label>Main Category *</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required placeholder="Photographers, Caterers, DJs..." /></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
              <div><Label>Years Experience</Label><Input type="number" value={form.yearsExperience} onChange={(e) => setForm({ ...form, yearsExperience: e.target.value })} /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Accra" /></div>
              <div><Label>Region</Label><Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="Greater Accra" /></div>
            </div>
            <div><Label>About Your Business</Label><Textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Instagram</Label><Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="@handle or URL" /></div>
              <div><Label>Website</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
            </div>
            <Button type="submit" className="w-full bg-[#0B8A83]" disabled={loading}>
              {loading ? "Creating profile..." : "Create Free Vendor Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
