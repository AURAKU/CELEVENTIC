"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { EVENT_TYPES } from "@/lib/constants";
import { ArrowLeft, ArrowRight, Check, Heart, Flower2, Cake, Presentation, Music, Tent, Building2, Church, GraduationCap, PartyPopper, Sparkles } from "lucide-react";
import Link from "next/link";

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  WEDDING: Heart,
  FUNERAL: Flower2,
  BIRTHDAY: Cake,
  CONFERENCE: Presentation,
  CONCERT: Music,
  FESTIVAL: Tent,
  CORPORATE_EVENT: Building2,
  CHURCH_PROGRAM: Church,
  SCHOOL_EVENT: GraduationCap,
  PRIVATE_EVENT: PartyPopper,
  CUSTOM: Sparkles,
};

const STEPS = ["Event Type", "Details", "Date & Venue", "Package & Theme", "Review"];

interface PackageOption { id: string; name: string; slug: string; price: string | number }
interface ThemeOption { id: string; name: string; slug: string; category: string }
interface BlueprintPreview {
  label: string;
  terminology: Record<string, string>;
  starterFeatures: string[];
  premiumFeatures: string[];
}

export default function CreateEventPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [themes, setThemes] = useState<ThemeOption[]>([]);
  const [blueprint, setBlueprint] = useState<BlueprintPreview | null>(null);

  const [form, setForm] = useState({
    eventType: "",
    title: "",
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
    coupleNames: "",
    ceremonyType: "",
    deceasedName: "",
    conferenceTitle: "",
  });

  const loadOptions = useCallback(async (eventType: string) => {
    const res = await fetch(`/api/events/options?eventType=${eventType}`);
    const d = await res.json();
    if (d.success) {
      setPackages(d.data.packages);
      setThemes(d.data.themes);
      setBlueprint(d.data.blueprint);
    }
  }, []);

  useEffect(() => {
    if (form.eventType) loadOptions(form.eventType);
  }, [form.eventType, loadOptions]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validateStep(current: number): string | null {
    if (current === 0 && !form.eventType) return "Select an event type";
    if (current === 1) {
      if (!form.title.trim()) return "Event title is required";
      if (!form.hostName.trim()) return `${blueprint?.terminology?.host ?? "Host"} name is required`;
    }
    if (current === 2 && !form.startDate) return "Start date is required";
    return null;
  }

  function goNext() {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError("");
    setStep(step + 1);
  }

  async function handleSubmit() {
    const err = validateStep(0) || validateStep(1) || validateStep(2);
    if (err) { setError(err); return; }

    setLoading(true);
    setError("");

    const typeSpecific: Record<string, string> = {};
    if (form.coupleNames) typeSpecific.coupleNames = form.coupleNames;
    if (form.ceremonyType) typeSpecific.ceremonyType = form.ceremonyType;
    if (form.deceasedName) typeSpecific.deceasedName = form.deceasedName;
    if (form.conferenceTitle) typeSpecific.conferenceTitle = form.conferenceTitle;

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
      typeSpecific: Object.keys(typeSpecific).length ? typeSpecific : undefined,
    };

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok) {
      const { setActiveEventId } = await import("@/hooks/use-event-workspace");
      setActiveEventId(data.data.id);
      router.push(`/dashboard/events/${data.data.id}`);
    } else {
      setError(data.error || "Failed to create event");
      setLoading(false);
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100;
  const hostLabel = blueprint?.terminology?.host ?? "Host";

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
            <div className="grid sm:grid-cols-2 gap-3">
              {EVENT_TYPES.map((t) => {
                const Icon = TYPE_ICONS[t.value] ?? Sparkles;
                const selected = form.eventType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => update("eventType", t.value)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      selected ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-brand-300"
                    }`}
                  >
                    <Icon className={`h-5 w-5 mb-2 ${selected ? "text-brand-600" : "text-slate-400"}`} />
                    <p className="font-semibold text-sm">{t.label}</p>
                  </button>
                );
              })}
            </div>
          )}

          {step === 1 && (
            <>
              {blueprint && (
                <Badge variant="outline" className="mb-2">{blueprint.label} workspace</Badge>
              )}
              <div className="space-y-2">
                <Label>Event Title *</Label>
                <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="My Amazing Event" />
              </div>
              <div className="space-y-2">
                <Label>{hostLabel} Name *</Label>
                <Input value={form.hostName} onChange={(e) => update("hostName", e.target.value)} />
              </div>

              {form.eventType === "WEDDING" && (
                <>
                  <div className="space-y-2">
                    <Label>Couple Names</Label>
                    <Input value={form.coupleNames} onChange={(e) => update("coupleNames", e.target.value)} placeholder="Ama & Kofi" />
                  </div>
                  <div className="space-y-2">
                    <Label>Ceremony Type</Label>
                    <Input value={form.ceremonyType} onChange={(e) => update("ceremonyType", e.target.value)} placeholder="Traditional, White Wedding..." />
                  </div>
                </>
              )}

              {form.eventType === "FUNERAL" && (
                <div className="space-y-2">
                  <Label>Name of Deceased</Label>
                  <Input value={form.deceasedName} onChange={(e) => update("deceasedName", e.target.value)} />
                </div>
              )}

              {form.eventType === "CONFERENCE" && (
                <div className="space-y-2">
                  <Label>Conference Title</Label>
                  <Input value={form.conferenceTitle} onChange={(e) => update("conferenceTitle", e.target.value)} />
                </div>
              )}

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} />
              </div>
            </>
          )}

          {step === 2 && (
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
                <Label>Expected Guests</Label>
                <Input type="number" value={form.expectedGuests} onChange={(e) => update("expectedGuests", e.target.value)} />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm text-slate-500">
                Packages unlock features for your {blueprint?.label?.toLowerCase() ?? "event"} workspace.
              </p>
              <div className="space-y-2">
                <Label>Package</Label>
                <Select value={form.packageId} onValueChange={(v) => update("packageId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
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
                <Label>Theme ({themes.length} {blueprint?.label?.toLowerCase() ?? "event"} templates)</Label>
                <Select value={form.themeId} onValueChange={(v) => update("themeId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select theme" /></SelectTrigger>
                  <SelectContent>
                    {themes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name} — {t.category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {step === 4 && (
            <div className="space-y-3 text-sm">
              {Object.entries({
                Type: form.eventType,
                Title: form.title,
                [hostLabel]: form.hostName,
                "Start Date": form.startDate,
                Venue: form.venueName || "TBD",
                Package: packages.find((p) => p.id === form.packageId)?.name ?? "Starter (free)",
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
            <Check className="h-4 w-4" /> {loading ? "Creating..." : "Create Event Workspace"}
          </Button>
        )}
      </div>
    </div>
  );
}
