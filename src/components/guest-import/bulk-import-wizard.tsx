"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
  Tags,
  Upload,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PartyAllowanceField } from "@/components/guest-search/party-allowance-field";
import { cn } from "@/lib/utils";
import { TEMPLATE_COLUMN_GUIDE } from "@/lib/guest-import/template";
import { ColumnMappingPanel } from "./column-mapping-panel";
import { ImportPreviewTable } from "./import-preview-table";
import type { BatchProgress, ColumnSuggestionView, ImportBatchView } from "./types";

/**
 * Bulk Guest Import wizard.
 *
 * Four honest steps, paste or upload, match columns, review, generate, with
 * the review step doing the heavy lifting. The organiser can always see what
 * *will* happen before it does, and nothing guest-facing exists until they
 * press the confirm button on step three.
 */

type Step = "source" | "map" | "review" | "generate";

const POLL_INTERVAL_FAST_MS = 800;
const POLL_INTERVAL_MS = 1500;
const POLL_ERROR_BACKOFF_MS = 2500;

interface Props {
  eventId: string;
  eventTitle?: string;
}

interface ImportSettings {
  defaultPartySize: number;
  issueEntryPass: boolean;
  enablePlaceCard: boolean;
  applySeating: boolean;
  seatingPlanId: string | null;
  normalizeGhanaPhones: boolean;
  publishImmediately: boolean;
  duplicatePolicy: "REVIEW" | "SKIP" | "CREATE_ANYWAY";
  defaultTagIds: string[];
  message: string;
}

interface TagOption {
  id: string;
  label: string;
}

interface SeatingPlanOption {
  id: string;
  label: string;
  planType?: string;
}

const DEFAULT_SETTINGS: ImportSettings = {
  defaultPartySize: 1,
  issueEntryPass: true,
  enablePlaceCard: true,
  applySeating: false,
  seatingPlanId: null,
  normalizeGhanaPhones: true,
  publishImmediately: true,
  duplicatePolicy: "REVIEW",
  defaultTagIds: [],
  message: "",
};

export function BulkImportWizard({ eventId, eventTitle }: Props) {
  const [step, setStep] = useState<Step>("source");
  const [pasted, setPasted] = useState("");
  const [settings, setSettings] = useState<ImportSettings>(DEFAULT_SETTINGS);
  const [batch, setBatch] = useState<ImportBatchView | null>(null);
  const [suggestions, setSuggestions] = useState<ColumnSuggestionView[]>([]);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tags, setTags] = useState<TagOption[]>([]);
  const [seatingPlans, setSeatingPlans] = useState<SeatingPlanOption[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const optionsPayload = useCallback(
    () => ({
      defaultPartySize: settings.defaultPartySize,
      issueEntryPass: settings.issueEntryPass,
      enablePlaceCard: settings.enablePlaceCard,
      applySeating: settings.applySeating,
      seatingPlanId: settings.applySeating ? settings.seatingPlanId : null,
      normalizeGhanaPhones: settings.normalizeGhanaPhones,
      publishImmediately: settings.publishImmediately,
      duplicatePolicy: settings.duplicatePolicy,
      defaultTagIds: settings.defaultTagIds,
      message: settings.message.trim() || null,
    }),
    [settings]
  );

  useEffect(() => {
    let cancelled = false;
    async function loadHelpers() {
      try {
        const [tagRes, seatingRes] = await Promise.all([
          fetch(`/api/events/${eventId}/guest-tags`),
          fetch(`/api/events/${eventId}/seating`),
        ]);
        const tagJson = await tagRes.json().catch(() => ({}));
        const seatingJson = await seatingRes.json().catch(() => ({}));
        if (cancelled) return;
        if (tagRes.ok) {
          setTags(
            ((tagJson.data?.tags as TagOption[]) ?? []).map((tag) => ({
              id: tag.id,
              label: tag.label,
            }))
          );
        }
        if (seatingRes.ok) {
          const plans = (seatingJson.data?.plans as Array<{
            id: string;
            planType?: string;
            name?: string;
          }>) ?? [];
          const mapped = plans.map((plan) => ({
            id: plan.id,
            planType: plan.planType,
            label:
              plan.planType === "CEREMONY"
                ? "Main Ceremony"
                : plan.planType === "RECEPTION"
                  ? "Reception"
                  : plan.name || "Seating plan",
          }));
          setSeatingPlans(mapped);
          setSettings((current) => {
            if (current.seatingPlanId || mapped.length === 0) return current;
            const reception =
              mapped.find((plan) => plan.planType === "RECEPTION") ?? mapped[0]!;
            return { ...current, seatingPlanId: reception.id };
          });
        }
      } catch {
        /* helpers are optional for paste/upload */
      }
    }
    void loadHelpers();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const handleStaged = useCallback(
    (data: { batch: ImportBatchView; suggestions: ColumnSuggestionView[]; truncated?: boolean }) => {
      setBatch(data.batch);
      setSuggestions(data.suggestions ?? []);
      setStep(data.batch.detectedHeaders?.length ? "map" : "review");
      setNotice(
        data.truncated
          ? "Only the first 5,000 rows were read. Split larger lists into separate imports."
          : ""
      );
    },
    []
  );

  async function stagePaste() {
    if (!pasted.trim()) {
      setError("Paste at least one guest name.");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/guest-import/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, text: pasted, options: optionsPayload() }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not read that list.");
      return;
    }
    handleStaged(data.data);
  }

  async function stageFile(file: File) {
    setBusy(true);
    setError("");
    const form = new FormData();
    form.append("eventId", eventId);
    form.append("file", file);
    form.append("options", JSON.stringify(optionsPayload()));

    const res = await fetch("/api/guest-import/batches", { method: "POST", body: form });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not read that file.");
      return;
    }
    handleStaged(data.data);
  }

  async function applyMapping(mapping: Record<number, string>) {
    if (!batch) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/guest-import/batches/${batch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapping, options: optionsPayload() }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not apply that mapping.");
      return;
    }
    setBatch(data.data.batch);
    setSuggestions(data.data.suggestions ?? []);
    setStep("review");
  }

  const refreshBatch = useCallback(async () => {
    if (!batch) return;
    const res = await fetch(`/api/guest-import/batches/${batch.id}`);
    const data = await res.json();
    if (res.ok) {
      setProgress(data.data);
      setBatch(data.data.batch);
    }
  }, [batch]);

  async function confirm(allowUnreviewedDuplicates = false) {
    if (!batch) return;
    setBusy(true);
    setError("");
    // Persist latest organiser choices (message, tags, allowance, duplicates)
    // before generation starts — review-step edits must not be lost.
    const persist = await fetch(`/api/guest-import/batches/${batch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ options: optionsPayload() }),
    });
    if (!persist.ok) {
      const data = await persist.json().catch(() => ({}));
      setBusy(false);
      setError(data.error ?? "Could not save import settings.");
      return;
    }
    const res = await fetch(`/api/guest-import/batches/${batch.id}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowUnreviewedDuplicates }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not start the import.");
      return;
    }
    setStep("generate");
    void refreshBatch();
  }

  // Poll while generation runs. Each GET also self-heals when the jobs worker
  // is offline, so progress advances even without `npm run jobs:worker`.
  useEffect(() => {
    if (step !== "generate" || !batch) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polls = 0;

    const tick = async () => {
      try {
        const res = await fetch(`/api/guest-import/batches/${batch.id}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          timer = setTimeout(tick, POLL_ERROR_BACKOFF_MS);
          return;
        }
        setProgress(data.data);
        setBatch(data.data.batch);
        polls += 1;
        if (!data.data.finished) {
          const delay = polls < 4 ? POLL_INTERVAL_FAST_MS : POLL_INTERVAL_MS;
          timer = setTimeout(tick, delay);
        }
      } catch {
        if (!cancelled) timer = setTimeout(tick, POLL_ERROR_BACKOFF_MS);
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [step, batch?.id]);

  function reset() {
    setBatch(null);
    setSuggestions([]);
    setProgress(null);
    setPasted("");
    setStep("source");
    setError("");
    setNotice("");
  }

  return (
    <div className="space-y-6">
      <StepRail step={step} />

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{notice}</p>}

      {step === "source" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" /> Add your guests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="guest-paste">Paste names, one per line</Label>
                <Textarea
                  id="guest-paste"
                  rows={10}
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  placeholder={"Ama Serwaa\nMr & Mrs Boateng\nKofi Mensah +1\nThe Asante Family\nKwabena Osei, kwabena@example.com, 0244123456"}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-slate-500">
                  A name on its own is enough. You can also paste straight from a
                  spreadsheet, columns are detected automatically.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button onClick={stagePaste} disabled={busy || !pasted.trim()}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Preview list
                  </Button>
                  <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={busy}>
                    <Upload className="h-4 w-4" /> Upload CSV or Excel
                  </Button>
                  <Button variant="ghost" asChild>
                    <a href="/api/guest-import/template" download>
                      <Download className="h-4 w-4" /> Download template
                    </a>
                  </Button>
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void stageFile(file);
                      e.target.value = "";
                    }}
                  />
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 text-xs text-slate-600">
                  <p className="font-medium text-slate-800">
                    Template columns match Guest CRM — open in Excel, Numbers, or Google Sheets.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {TEMPLATE_COLUMN_GUIDE.map((col) => (
                      <li key={col.header}>
                        <span className="font-medium text-slate-700">{col.header}</span>
                        {col.required ? " (required)" : ""} — {col.help}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">What each guest gets</CardTitle>
              <p className="text-sm text-slate-500">
                Matches Guest CRM: personalised invitation, admission allowance, entry pass,
                place card, and optional tags for seating plans.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-[#0B8A83]/25 bg-[#0B8A83]/5 px-3 py-2.5 text-xs leading-relaxed text-slate-700">
                <p className="inline-flex items-center gap-1.5 font-semibold text-[#0B8A83]">
                  <Sparkles className="h-3.5 w-3.5" /> Smart defaults
                </p>
                <p className="mt-1">
                  Names like “Mr &amp; Mrs”, “and family”, or “+1” auto-set party size. Phone and
                  email stay optional. Duplicates are flagged before anything is created.
                </p>
              </div>

              <SettingRow
                label="Guest Entry Pass"
                hint="Unique QR and admission code — same stack used at the gate."
                checked={settings.issueEntryPass}
                onChange={(v) => setSettings((s) => ({ ...s, issueEntryPass: v }))}
              />
              <SettingRow
                label="Place card"
                hint="Personalised place card with capacity and seating reveal."
                checked={settings.enablePlaceCard}
                onChange={(v) => setSettings((s) => ({ ...s, enablePlaceCard: v }))}
              />
              <SettingRow
                label="Apply table & seat columns"
                hint="Writes seating during import when your list includes Table/Seat."
                checked={settings.applySeating}
                onChange={(v) => setSettings((s) => ({ ...s, applySeating: v }))}
              />
              {settings.applySeating && seatingPlans.length > 0 && (
                <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <Label htmlFor="import-seating-plan">Seating plan</Label>
                  <select
                    id="import-seating-plan"
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={settings.seatingPlanId ?? ""}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        seatingPlanId: e.target.value || null,
                      }))
                    }
                  >
                    {seatingPlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Dual-stage events: pick Reception or Main Ceremony for imported seats.
                  </p>
                </div>
              )}
              <SettingRow
                label="Normalise Ghana numbers"
                hint="0244… becomes +233244…"
                checked={settings.normalizeGhanaPhones}
                onChange={(v) => setSettings((s) => ({ ...s, normalizeGhanaPhones: v }))}
              />
              <SettingRow
                label="Publish immediately"
                hint="Off keeps every invitation as a draft until you publish."
                checked={settings.publishImmediately}
                onChange={(v) => setSettings((s) => ({ ...s, publishImmediately: v }))}
              />

              <div className="space-y-1.5">
                <Label htmlFor="import-duplicate-policy">Duplicate names</Label>
                <select
                  id="import-duplicate-policy"
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={settings.duplicatePolicy}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      duplicatePolicy: e.target.value as ImportSettings["duplicatePolicy"],
                    }))
                  }
                >
                  <option value="REVIEW">Flag for review (recommended)</option>
                  <option value="SKIP">Skip duplicates automatically</option>
                  <option value="CREATE_ANYWAY">Create anyway</option>
                </select>
                <p className="text-[11px] text-slate-500">
                  Protects against importing the same guest twice from WhatsApp lists or
                  spreadsheets.
                </p>
              </div>

              <PartyAllowanceField
                label="Default people admitted"
                value={settings.defaultPartySize}
                onChange={(value) => setSettings((s) => ({ ...s, defaultPartySize: value }))}
                hint="Used when a row has no party size. Couples, plus-ones and named families override it automatically."
              />

              <div className="space-y-2">
                <Label className="inline-flex items-center gap-1.5">
                  <Tags className="h-3.5 w-3.5" />
                  Apply tags to every imported guest
                  <span className="font-normal text-slate-500">(organizer only)</span>
                </Label>
                {tags.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No tags yet — add them in Guest CRM, or continue without tags.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => {
                      const selected = settings.defaultTagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() =>
                            setSettings((current) => ({
                              ...current,
                              defaultTagIds: selected
                                ? current.defaultTagIds.filter((id) => id !== tag.id)
                                : [...current.defaultTagIds, tag.id],
                            }))
                          }
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs transition-colors",
                            selected
                              ? "border-[#0B8A83] bg-[#0B8A83]/10 text-[#0B8A83]"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                          )}
                          aria-pressed={selected}
                        >
                          {tag.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="text-[11px] text-slate-500">
                  Private seating labels — guests never see these on their invitation.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "map" && batch && (
        <>
          <ColumnMappingPanel suggestions={suggestions} onApply={applyMapping} busy={busy} />
          <Button variant="ghost" onClick={() => setStep("review")}>
            Skip, the guess looks right
          </Button>
        </>
      )}

      {step === "review" && batch && (
        <div className="space-y-4">
          <SummaryStrip batch={batch} />
          <ImportPreviewTable batchId={batch.id} editable onChanged={refreshBatch} />

          {settings.message !== undefined && (
            <Card>
              <CardContent className="space-y-1.5 p-4">
                <Label htmlFor="import-message">Message on every invitation (optional)</Label>
                <Textarea
                  id="import-message"
                  rows={2}
                  value={settings.message}
                  onChange={(e) => setSettings((s) => ({ ...s, message: e.target.value }))}
                  placeholder="We would be honoured by your presence."
                />
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">
              Ready to create <strong>{batch.readyRows + batch.reviewRows}</strong> invitation
              {batch.readyRows + batch.reviewRows === 1 ? "" : "s"}
              {eventTitle ? ` for ${eventTitle}` : ""}. Nothing is sent yet.
            </p>
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" onClick={reset} disabled={busy}>
                Start over
              </Button>
              <Button onClick={() => confirm(false)} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Create invitations
              </Button>
            </div>
          </div>

          {error.includes("duplicate") && (
            <Button variant="outline" onClick={() => confirm(true)} disabled={busy}>
              Skip the remaining duplicates and continue
            </Button>
          )}
        </div>
      )}

      {step === "generate" && batch && (
        <GenerationPanel
          batch={batch}
          progress={progress}
          onReset={reset}
          onRefresh={refreshBatch}
        />
      )}
    </div>
  );
}

function SettingRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

function StepRail({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "source", label: "Add names" },
    { key: "map", label: "Match columns" },
    { key: "review", label: "Review" },
    { key: "generate", label: "Create & send" },
  ];
  const activeIndex = steps.findIndex((s) => s.key === step);

  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm">
      {steps.map((s, index) => (
        <li key={s.key} className="flex items-center gap-2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              index <= activeIndex ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"
            }`}
          >
            {index + 1}
          </span>
          <span className={index === activeIndex ? "font-medium" : "text-slate-500"}>{s.label}</span>
          {index < steps.length - 1 && <span className="text-slate-300">›</span>}
        </li>
      ))}
    </ol>
  );
}

function SummaryStrip({ batch }: { batch: ImportBatchView }) {
  const cells = [
    { label: "Total", value: batch.totalRows },
    { label: "Ready", value: batch.readyRows },
    { label: "Needs review", value: batch.reviewRows },
    { label: "Duplicates", value: batch.duplicateRows },
    { label: "Cannot import", value: batch.invalidRows },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {cells.map((cell) => (
        <div key={cell.label} className="rounded-xl border border-slate-200 p-3 text-center">
          <p className="text-lg font-bold">{cell.value}</p>
          <p className="text-xs text-slate-500">{cell.label}</p>
        </div>
      ))}
    </div>
  );
}

function GenerationPanel({
  batch,
  progress,
  onReset,
  onRefresh,
}: {
  batch: ImportBatchView;
  progress: BatchProgress | null;
  onReset: () => void;
  onRefresh: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState("");
  const [channels, setChannels] = useState<string[]>([]);
  const finished = progress?.finished ?? false;
  const percent = progress?.percent ?? 0;

  async function send() {
    if (channels.length === 0) return;
    setSending(true);
    const res = await fetch(`/api/guest-import/batches/${batch.id}/deliveries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send", channels }),
    });
    const data = await res.json();
    setSending(false);
    setDeliveryNote(
      res.ok
        ? `Queued ${data.data.queued} message${data.data.queued === 1 ? "" : "s"}. ${data.data.skipped} guest${data.data.skipped === 1 ? "" : "s"} had no contact details, share their links by hand. Delivery continues automatically.`
        : (data.error ?? "Could not queue delivery.")
    );
    onRefresh();
    // Kick progress polls so inline delivery drain advances without a worker.
    if (res.ok) {
      void fetch(`/api/guest-import/batches/${batch.id}/deliveries?page=1&limit=1`, {
        cache: "no-store",
      });
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {finished ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {finished ? "Invitations created" : "Creating invitations…"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={percent} />
          <p className="text-sm text-slate-600">
            {progress?.batch.generatedRows ?? 0} of {batch.totalRows} created
            {progress?.batch.failedRows ? ` · ${progress.batch.failedRows} failed` : ""}
            {progress?.batch.generatedHeads
              ? ` · ${progress.batch.generatedHeads} total seats allowed`
              : ""}
          </p>
          {!finished && (
            <p className="text-xs text-slate-500">
              {(progress?.batch.generatedRows ?? 0) === 0
                ? "Starting automatically, this usually finishes in a few seconds."
                : "Creating in the background, you can leave this page and come back."}
            </p>
          )}
          {finished && (progress?.batch.failedRows ?? 0) > 0 && (
            <p className="text-xs text-amber-700">
              Some rows could not be created. Review the list below, successful invitations are
              ready to send.
            </p>
          )}
        </CardContent>
      </Card>

      {finished && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="h-4 w-4" /> Send the invitations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {["EMAIL", "SMS", "WHATSAPP"].map((channel) => (
                <button
                  key={channel}
                  type="button"
                  onClick={() =>
                    setChannels((prev) =>
                      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
                    )
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    channels.includes(channel)
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {channel === "WHATSAPP" ? "WhatsApp" : channel === "SMS" ? "SMS" : "Email"}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Guests with no phone or email are skipped, not failed, their links stay
              ready for you to share by hand.
            </p>
            {deliveryNote && <p className="text-sm text-slate-700">{deliveryNote}</p>}
            <div className="flex gap-2">
              <Button onClick={send} disabled={sending || channels.length === 0}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Queue delivery
              </Button>
              <Button variant="ghost" onClick={onReset}>
                <RotateCcw className="h-4 w-4" /> Import another list
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-4 w-4" /> Imported rows
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ImportPreviewTable
            batchId={batch.id}
            editable={false}
            refreshKey={progress?.batch.generatedRows ?? 0}
          />
        </CardContent>
      </Card>
    </div>
  );
}
