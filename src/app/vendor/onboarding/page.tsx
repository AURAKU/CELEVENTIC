"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Store, CheckCircle2 } from "lucide-react";

const STEPS = [
  "Business name",
  "Logo & cover",
  "Category",
  "Services",
  "Portfolio",
  "Pricing",
  "Availability",
  "Location",
  "Contact",
  "Verification & social",
];

export default function VendorOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    category: "Photographers",
    description: "",
    bio: "",
    city: "",
    region: "",
    country: "Ghana",
    phone: "",
    whatsapp: "",
    profileImage: "",
    coverImage: "",
    instagram: "",
    website: "",
    services: [{ name: "", description: "", priceFrom: "" }],
  });

  useEffect(() => {
    fetch("/api/vendor/onboarding")
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.completed) router.replace("/dashboard/vendor-portal");
        if (d.data?.step) setStep(Math.min(d.data.step + 1, STEPS.length));
        if (d.data?.progress) setProgress(d.data.progress);
        if (d.data?.vendor) {
          const v = d.data.vendor;
          setForm((f) => ({
            ...f,
            businessName: v.businessName ?? f.businessName,
            category: v.category ?? f.category,
            description: v.description ?? f.description,
            bio: v.bio ?? f.bio,
            city: v.city ?? f.city,
            region: v.region ?? f.region,
            phone: v.phone ?? f.phone,
            whatsapp: v.whatsapp ?? f.whatsapp,
            profileImage: v.profileImage ?? f.profileImage,
            coverImage: v.coverImage ?? f.coverImage,
          }));
        }
      });
  }, [router]);

  async function saveStep(complete = false) {
    setLoading(true);
    const socialLinks = [
      form.instagram
        ? {
            platform: "instagram",
            url: form.instagram.startsWith("http")
              ? form.instagram
              : `https://instagram.com/${form.instagram}`,
          }
        : null,
      form.website
        ? {
            platform: "website",
            url: form.website.startsWith("http") ? form.website : `https://${form.website}`,
          }
        : null,
    ].filter(Boolean);

    const res = await fetch("/api/vendor/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step,
        businessName: form.businessName,
        category: form.category,
        description: form.description,
        bio: form.bio,
        city: form.city,
        region: form.region,
        country: form.country,
        phone: form.phone,
        whatsapp: form.whatsapp,
        profileImage: form.profileImage,
        coverImage: form.coverImage,
        services: form.services
          .filter((s) => s.name)
          .map((s) => ({
            name: s.name,
            description: s.description,
            priceFrom: s.priceFrom ? Number(s.priceFrom) : undefined,
          })),
        socialLinks,
        complete,
      }),
    });
    setLoading(false);
    const d = await res.json();
    if (!res.ok) return;
    setProgress(Math.round((step / STEPS.length) * 100));
    if (complete) {
      router.push("/dashboard/vendor-portal");
    } else if (step < STEPS.length) {
      setStep(step + 1);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 text-[#0B8A83] font-semibold">
            <Store className="h-6 w-6" />
            Vendor Onboarding
          </div>
          <h1 className="text-3xl font-bold">Build your vendor profile</h1>
          <p className="text-slate-500">
            Step {step} of {STEPS.length}: {STEPS[step - 1]}
          </p>
          <Progress value={progress || (step / STEPS.length) * 100} className="h-2" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step - 1]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 1 && (
              <div className="space-y-2">
                <Label>Business name</Label>
                <Input
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  required
                />
              </div>
            )}

            {step === 2 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Logo URL</Label>
                  <Input
                    value={form.profileImage}
                    onChange={(e) => setForm({ ...form, profileImage: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cover image URL</Label>
                  <Input
                    value={form.coverImage}
                    onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                {form.services.map((s, i) => (
                  <div key={i} className="grid gap-2 p-3 border rounded-lg">
                    <Input
                      placeholder="Service name"
                      value={s.name}
                      onChange={(e) => {
                        const services = [...form.services];
                        services[i] = { ...s, name: e.target.value };
                        setForm({ ...form, services });
                      }}
                    />
                    <Input
                      placeholder="Description"
                      value={s.description}
                      onChange={(e) => {
                        const services = [...form.services];
                        services[i] = { ...s, description: e.target.value };
                        setForm({ ...form, services });
                      }}
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setForm({ ...form, services: [...form.services, { name: "", description: "", priceFrom: "" }] })
                  }
                >
                  Add service
                </Button>
              </div>
            )}

            {step === 5 && (
              <Textarea
                placeholder="Describe past events, awards, portfolio highlights..."
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={5}
              />
            )}

            {step === 6 && (
              <div className="space-y-2">
                <Label>Starting price (optional)</Label>
                <Input
                  value={form.services[0]?.priceFrom ?? ""}
                  onChange={(e) => {
                    const services = [...form.services];
                    services[0] = { ...services[0], priceFrom: e.target.value };
                    setForm({ ...form, services });
                  }}
                  placeholder="e.g. 500"
                />
              </div>
            )}

            {step === 7 && (
              <p className="text-sm text-slate-500">
                Availability calendar connects to your vendor portal after onboarding. Mark this step complete to continue.
              </p>
            )}

            {step === 8 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                <Input placeholder="Region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
              </div>
            )}

            {step === 9 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <Input placeholder="WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
              </div>
            )}

            {step === 10 && (
              <div className="space-y-4">
                <Input placeholder="Instagram" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
                <Input placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                <Textarea
                  placeholder="Business description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={step === 1 || loading}
                onClick={() => setStep(step - 1)}
              >
                Back
              </Button>
              {step < STEPS.length ? (
                <Button onClick={() => saveStep()} disabled={loading}>
                  {loading ? "Saving..." : "Continue"}
                </Button>
              ) : (
                <Button onClick={() => saveStep(true)} disabled={loading}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete & go to dashboard
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
