"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Send } from "lucide-react";
import { GUEST_TIERS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { EventPicker } from "@/components/dashboard/event-picker";
import { useEventContext } from "@/hooks/use-event-context";

export default function CampaignsPage() {
  return (
    <Suspense fallback={<p className="text-slate-500 py-12 text-center">Loading campaigns…</p>}>
      <CampaignsContent />
    </Suspense>
  );
}

function CampaignsContent() {
  const searchParams = useSearchParams();
  const channelParam = searchParams.get("channel");
  const { events, eventId, setEventId, loading: eventsLoading } = useEventContext();
  const [form, setForm] = useState({
    name: "",
    channel: "WHATSAPP" as "WHATSAPP" | "SMS" | "EMAIL",
    message: "Hello {{guest_name}}, you are invited to our event! RSVP here: [link]",
    recipients: "",
  });
  const [preview, setPreview] = useState<{ estimatedCost: number; recipientCount: number } | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (channelParam === "EMAIL" || channelParam === "SMS" || channelParam === "WHATSAPP") {
      setForm((f) => ({ ...f, channel: channelParam }));
    }
  }, [channelParam]);

  async function handlePreview() {
    const recipientList = form.recipients.split("\n").filter(Boolean);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "preview",
        channel: form.channel,
        message: form.message,
        recipientCount: recipientList.length,
      }),
    });
    const data = await res.json();
    if (res.ok) setPreview(data.data);
    else setError(data.error);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!eventId) {
      setError("Please select an event");
      return;
    }

    const recipientList = form.recipients.split("\n").filter(Boolean).map((line) => {
      const [name, contact] = line.split(",").map((s) => s.trim());
      return { name, contact: contact || name };
    });

    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        name: form.name,
        channel: form.channel,
        message: form.message,
        recipients: recipientList,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setSuccess(`Campaign created with ${recipientList.length} recipients!`);
      setForm({ ...form, name: "", recipients: "" });
    } else {
      setError(data.error || "Campaign creation failed");
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Communication Hub</h1>
        <p className="page-subtitle">Send bulk invitations via WhatsApp, SMS, or Email.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <EventPicker events={events} value={eventId} onChange={setEventId} loading={eventsLoading} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-brand-600" /> New Campaign
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Campaign Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required disabled={!eventId} />
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v as typeof form.channel })} disabled={!eventId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Message (use {"{{guest_name}}"} for personalization)</Label>
              <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} disabled={!eventId} />
            </div>
            <div className="space-y-2">
              <Label>Recipients (one per line: Name, Contact)</Label>
              <Textarea
                value={form.recipients}
                onChange={(e) => setForm({ ...form, recipients: e.target.value })}
                placeholder="John Doe, +233201234567&#10;Jane Smith, jane@email.com"
                rows={5}
                disabled={!eventId}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={handlePreview} disabled={!eventId} className="min-h-[44px] touch-manipulation">
                Preview Cost
              </Button>
              <Button type="submit" disabled={!eventId} className="min-h-[44px] touch-manipulation">
                <Send className="h-4 w-4" /> Create Campaign
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {preview && (
        <Card className="bg-brand-50 border-brand-200">
          <CardContent className="p-4 text-sm">
            <p>Recipients: <strong>{preview.recipientCount}</strong></p>
            <p>Estimated Cost: <strong>{formatCurrency(preview.estimatedCost)}</strong></p>
            <p className="page-subtitle">Tiers: {GUEST_TIERS.join(", ")} guests</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
