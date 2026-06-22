"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { EVENT_TYPES } from "@/lib/constants";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import Link from "next/link";

const STEPS = ["Basic Info", "Date & Venue", "Details", "Package & Theme", "Review"];

interface PackageOption { id: string; name: string; slug: string; price: string | number }
interface ThemeOption { id: string; name: string; slug: string; category: string }

export default function CreateEventPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [themes, setThemes] = useState<ThemeOption[]>([]);

  useEffect(() => {
    fetch("/api/events/options")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setPackages(d.data.packages);
          setThemes(d.data.themes);
        }
      });
  }, []);
  const [form, setForm] = useState({
    title: "",
    eventType: "",
    hostName: "",
    description: "",
    startDate: "",
    endDate: "",
    venueName: "",
    landmark: "",
    mapsLink: "",
    contactPhone: "",
    dressCode: "",
    expectedGuests: "",
    pricingType: "FREE",
    packageId: "",
    themeId: "",
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validateStep(current: number): string | null {
    if (current === 0) {
      if (!form.title.trim()) return "Event title is required";
      if (!form.eventType) return "Event type is required";
      if (!form.hostName.trim()) return "Host name is required";
    }
    if (current === 1 && !form.startDate) return "Start date is required";
    return null;
  }

  function goNext() {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError("");
    setStep(step + 1);
  }

  async function handleSubmit() {
    const err = validateStep(0) || validateStep(1);
    if (err) { setError(err); return; }

    setLoading(true);
    setError("");

    const payload = {
      title: form.title.trim(),
      eventType: form.eventType,
      hostName: form.hostName.trim(),
      description: form.description || undefined,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      venueName: form.venueName || undefined,
      landmark: form.landmark || undefined,
      mapsLink: form.mapsLink || undefined,
      contactPhone: form.contactPhone || undefined,
      dressCode: form.dressCode || undefined,
      expectedGuests: form.expectedGuests ? parseInt(form.expectedGuests) : undefined,
      pricingType: form.pricingType,
      packageId: form.packageId || undefined,
      themeId: form.themeId || undefined,
    };

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok) {
      router.push(`/dashboard/events/${data.data.id}`);
    } else {
      setError(data.error || "Failed to create event");
      setLoading(false);
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/events"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create Event</h1>
          <p className="text-slate-500 text-sm">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
        </div>
      </div>

      <Progress value={progress} className="h-2" />

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label>Event Title *</Label>
                <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="My Amazing Event" />
              </div>
              <div className="space-y-2">
                <Label>Event Type *</Label>
                <Select value={form.eventType} onValueChange={(v) => update("eventType", v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Host Name *</Label>
                <Input value={form.hostName} onChange={(e) => update("hostName", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={4} />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date & Time *</Label>
                  <Input type="datetime-local" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>End Date & Time</Label>
                  <Input type="datetime-local" value={form.endDate} onChange={(e) => update("endDate", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Venue Name</Label>
                <Input value={form.venueName} onChange={(e) => update("venueName", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Landmark</Label>
                <Input value={form.landmark} onChange={(e) => update("landmark", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Google Maps Link</Label>
                <Input value={form.mapsLink} onChange={(e) => update("mapsLink", e.target.value)} placeholder="https://maps.google.com/..." />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input value={form.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Dress Code</Label>
                <Input value={form.dressCode} onChange={(e) => update("dressCode", e.target.value)} placeholder="Formal, Casual, Traditional..." />
              </div>
              <div className="space-y-2">
                <Label>Expected Guests</Label>
                <Input type="number" value={form.expectedGuests} onChange={(e) => update("expectedGuests", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Event Pricing</Label>
                <Select value={form.pricingType} onValueChange={(v) => update("pricingType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FREE">Free Event</SelectItem>
                    <SelectItem value="PAID">Paid Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label>Package</Label>
                <Select value={form.packageId} onValueChange={(v) => update("packageId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select package (optional)" /></SelectTrigger>
                  <SelectContent>
                    {packages.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {Number(p.price) === 0 ? "(Free)" : `(₵${p.price})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select value={form.themeId} onValueChange={(v) => update("themeId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select theme (optional)" /></SelectTrigger>
                  <SelectContent>
                    {themes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {step === 4 && (
            <div className="space-y-3 text-sm">
              {Object.entries({
                Title: form.title,
                Type: form.eventType,
                Host: form.hostName,
                "Start Date": form.startDate,
                Venue: form.venueName || "TBD",
                Guests: form.expectedGuests || "TBD",
                Pricing: form.pricingType,
              }).map(([key, val]) => (
                <div key={key} className="flex justify-between py-2 border-b">
                  <span className="text-slate-500">{key}</span>
                  <span className="font-medium">{val}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={goNext}>
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading}>
            <Check className="h-4 w-4" /> {loading ? "Creating..." : "Create Event"}
          </Button>
        )}
      </div>
    </div>
  );
}
