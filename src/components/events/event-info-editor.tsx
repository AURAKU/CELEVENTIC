"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormDraftStatusBar } from "@/components/forms/form-draft-status-bar";
import { isBlankFormDraft, readFormDraft, useFormDraft } from "@/hooks/use-form-draft";
import { Pencil, Check, Loader2 } from "lucide-react";

export type EventInfoDraftFields = {
  title: string;
  hostName: string;
  description: string;
  venueName: string;
  landmark: string;
  mapsLink: string;
  contactPhone: string;
  dressCode: string;
  expectedGuests: string;
  startDate: string;
  endDate: string;
};

const EMPTY: EventInfoDraftFields = {
  title: "",
  hostName: "",
  description: "",
  venueName: "",
  landmark: "",
  mapsLink: "",
  contactPhone: "",
  dressCode: "",
  expectedGuests: "",
  startDate: "",
  endDate: "",
};

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface EventInfoEditorProps {
  eventId: string;
  initial: {
    title: string;
    hostName: string;
    description?: string | null;
    venueName?: string | null;
    landmark?: string | null;
    mapsLink?: string | null;
    contactPhone?: string | null;
    dressCode?: string | null;
    expectedGuests?: number | null;
    startDate: string;
    endDate?: string | null;
  };
}

/**
 * Inline edit for event info (Recent Events → Edit → Event info & hub).
 * Local draft autosave so admins/organizers don't lose typed changes.
 */
export function EventInfoEditor({ eventId, initial }: EventInfoEditorProps) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const userId = session?.user?.id;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [restoredFromDraft, setRestoredFromDraft] = useState(false);
  const [form, setForm] = useState<EventInfoDraftFields>(EMPTY);

  const baselineFromServer = useCallback((): EventInfoDraftFields => ({
    title: initial.title ?? "",
    hostName: initial.hostName ?? "",
    description: initial.description ?? "",
    venueName: initial.venueName ?? "",
    landmark: initial.landmark ?? "",
    mapsLink: initial.mapsLink ?? "",
    contactPhone: initial.contactPhone ?? "",
    dressCode: initial.dressCode ?? "",
    expectedGuests: initial.expectedGuests != null ? String(initial.expectedGuests) : "",
    startDate: toLocalInput(initial.startDate),
    endDate: toLocalInput(initial.endDate),
  }), [initial]);

  const draft = useFormDraft<EventInfoDraftFields>({
    formId: "event-info-edit",
    userId,
    eventId,
    value: form,
    enabled: hydrated && open,
    restoreOnMount: false,
    debounceMs: 400,
    isEmpty: (v) => isBlankFormDraft(v),
  });

  useEffect(() => {
    if (sessionStatus === "loading") return;
    const server = baselineFromServer();
    const saved = readFormDraft<EventInfoDraftFields>({
      formId: "event-info-edit",
      userId,
      eventId,
    });
    if (saved && !isBlankFormDraft(saved) && JSON.stringify(saved) !== JSON.stringify(server)) {
      setForm(saved);
      setRestoredFromDraft(true);
      setOpen(true);
    } else {
      setForm(server);
      setRestoredFromDraft(false);
    }
    setHydrated(true);
  }, [eventId, userId, sessionStatus, baselineFromServer]);

  function update(field: keyof EventInfoDraftFields, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleClearDraft() {
    draft.clearDraft();
    setRestoredFromDraft(false);
    setForm(baselineFromServer());
  }

  async function handleSave() {
    if (!form.title.trim() || !form.hostName.trim()) {
      setError("Title and host name are required");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title.trim(),
        hostName: form.hostName.trim(),
        description: form.description || undefined,
        venueName: form.venueName || undefined,
        landmark: form.landmark || undefined,
        mapsLink: form.mapsLink || undefined,
        contactPhone: form.contactPhone || undefined,
        dressCode: form.dressCode || undefined,
        expectedGuests: form.expectedGuests ? parseInt(form.expectedGuests, 10) : undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Failed to update event");
      return;
    }
    draft.clearDraft();
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" />
        Edit event info
      </Button>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">Edit event info</p>
          <p className="text-xs text-slate-500 mt-0.5">Changes autosave as a local draft until you save.</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>

      <FormDraftStatusBar
        status={draft.status}
        hasDraft={draft.hasDraft}
        wasRestored={restoredFromDraft}
        lastSavedAt={draft.lastSavedAt}
        onClear={handleClearDraft}
      />

      {error && (
        <p className="text-sm text-red-600 rounded-lg bg-red-50 border border-red-200 px-3 py-2">{error}</p>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Title *</Label>
          <Input value={form.title} onChange={(e) => update("title", e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Host name *</Label>
          <Input value={form.hostName} onChange={(e) => update("hostName", e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Description</Label>
          <Textarea rows={3} value={form.description} onChange={(e) => update("description", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Start</Label>
          <Input type="datetime-local" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>End</Label>
          <Input type="datetime-local" value={form.endDate} onChange={(e) => update("endDate", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Venue</Label>
          <Input value={form.venueName} onChange={(e) => update("venueName", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Expected guests</Label>
          <Input type="number" value={form.expectedGuests} onChange={(e) => update("expectedGuests", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Landmark</Label>
          <Input value={form.landmark} onChange={(e) => update("landmark", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Maps link</Label>
          <Input value={form.mapsLink} onChange={(e) => update("mapsLink", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Contact phone</Label>
          <Input value={form.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Dress code</Label>
          <Input value={form.dressCode} onChange={(e) => update("dressCode", e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="button" onClick={() => void handleSave()} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={handleClearDraft}>
          Reset to saved
        </Button>
      </div>
    </div>
  );
}
