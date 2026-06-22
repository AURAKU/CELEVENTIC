"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";

interface RequestQuoteModalProps {
  vendorId: string;
  vendorName: string;
  onSuccess?: () => void;
}

export function RequestQuoteModal({ vendorId, vendorName, onSuccess }: RequestQuoteModalProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    eventType: "",
    eventDate: "",
    guestCount: "",
    budgetMin: "",
    budgetMax: "",
    location: "",
    message: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/vendor-os/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendorId,
        contactName: form.contactName,
        contactPhone: form.contactPhone || undefined,
        contactEmail: form.contactEmail || undefined,
        eventType: form.eventType || undefined,
        eventDate: form.eventDate || undefined,
        guestCount: form.guestCount ? Number(form.guestCount) : undefined,
        budgetMin: form.budgetMin ? Number(form.budgetMin) : undefined,
        budgetMax: form.budgetMax ? Number(form.budgetMax) : undefined,
        location: form.location || undefined,
        message: form.message || undefined,
      }),
    });
    const d = await res.json();
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      onSuccess?.();
    } else {
      setError(d.error || t("vendor.request_failed"));
    }
  }

  if (!open) {
    return (
      <Button className="bg-[#0B8A83] hover:bg-[#097068]" onClick={() => setOpen(true)}>
        <MessageSquare className="h-4 w-4" /> {t("vendor.request_quote")}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
        <h2 className="font-display text-xl font-bold">
          {t("vendor.request_quote_from", { name: vendorName })}
        </h2>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label className="text-xs">{t("vendor.your_name")}</Label>
            <Input
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">{t("vendor.your_phone")}</Label>
              <Input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">{t("vendor.your_email")}</Label>
              <Input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">{t("vendor.event_type")}</Label>
              <Input
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value })}
                placeholder={t("events.type_wedding")}
              />
            </div>
            <div>
              <Label className="text-xs">{t("vendor.event_date")}</Label>
              <Input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">{t("forms.expected_guests")}</Label>
              <Input type="number" value={form.guestCount} onChange={(e) => setForm({ ...form, guestCount: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">{t("vendor.budget_min")}</Label>
              <Input type="number" value={form.budgetMin} onChange={(e) => setForm({ ...form, budgetMin: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">{t("vendor.budget_max")}</Label>
              <Input type="number" value={form.budgetMax} onChange={(e) => setForm({ ...form, budgetMax: e.target.value })} />
            </div>
          </div>
          <div>
            <Label className="text-xs">{t("forms.venue")}</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">{t("vendor.message")}</Label>
            <Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1 bg-[#0B8A83]">
              {loading ? t("vendor.sending") : t("vendor.send_request")}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
