"use client";

import { useEffect, useId } from "react";
import {
  CheckCircle2,
  Minus,
  PartyPopper,
  Plus,
  ShieldAlert,
  Users,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AdmissionDecision } from "@/lib/admission/pass-decision";
import { formatAdmissionCode } from "@/lib/admission/pass-code";

export interface AdmissionScanPromptPartyMember {
  id: string;
  name: string;
  plusOnes: number;
  admitted: boolean;
}

export interface AdmissionScanPromptProps {
  open: boolean;
  decision: AdmissionDecision;
  displayName?: string | null;
  passCode?: string | null;
  partySize: number;
  admittedCount: number;
  party?: AdmissionScanPromptPartyMember[];
  seatingLabel?: string | null;
  offline?: boolean;
  /** Multi-guest: operator is choosing how many to admit. */
  awaitingQuantity?: boolean;
  arrivingNow: number;
  onArrivingNowChange: (n: number) => void;
  selectedMembers: string[];
  onSelectedMembersChange: (ids: string[]) => void;
  busy?: boolean;
  onAdmit: (quantity?: number) => void;
  onAdmitAllRemaining?: () => void;
  onDismiss: () => void;
  /** Optional confirm for single-guest paths that still need an explicit tap. */
  awaitingConfirm?: boolean;
  onConfirmAdmit?: () => void;
  /** Vendor/team passes use the same prompt with clearer labels. */
  passKind?: "guest_pass" | "vendor_team_pass";
  accessZones?: string[];
}

function headlineFor(
  decision: AdmissionDecision,
  awaitingQuantity: boolean,
  isVendor: boolean
): string {
  if (awaitingQuantity) {
    return isVendor ? "How many team members are arriving?" : "Choose how many to admit";
  }
  switch (decision.outcome) {
    case "ADMIT":
    case "PARTIAL_ADMIT":
      if (isVendor) {
        return decision.admitQuantity > 1
          ? `${decision.admitQuantity} team members admitted`
          : "Team member admitted";
      }
      return decision.admitQuantity > 1
        ? `${decision.admitQuantity} guests admitted`
        : "Guest admitted";
    case "RE_ENTRY":
      return "Welcome back";
    case "ALREADY_ADMITTED":
      return isVendor ? "Team capacity reached" : "Already admitted";
    case "REVIEW":
      return isVendor ? "Vendor / team pass" : "Needs review";
    case "DENY":
    default:
      return decision.tone === "amber" ? "Attention required" : "Admission denied";
  }
}

function subcopyFor(
  decision: AdmissionDecision,
  awaitingQuantity: boolean,
  remaining: number,
  isVendor: boolean
): string {
  if (awaitingQuantity) {
    return remaining === 1
      ? isVendor
        ? "1 team entry remains on this pass."
        : "1 place is still open on this invitation."
      : isVendor
        ? `${remaining} team entries remain. Select how many members are arriving now.`
        : `${remaining} places are still open on this invitation. Select how many guests are arriving now.`;
  }
  return decision.message;
}

/**
 * Full-screen gate prompt so organisers cannot miss the scan outcome.
 * Handles success, failure, already-admitted, and multi-guest quantity choice.
 */
export function AdmissionScanPrompt({
  open,
  decision,
  displayName,
  passCode,
  partySize,
  admittedCount,
  party = [],
  seatingLabel,
  offline,
  awaitingQuantity = false,
  arrivingNow,
  onArrivingNowChange,
  selectedMembers,
  onSelectedMembersChange,
  busy,
  onAdmit,
  onAdmitAllRemaining,
  onDismiss,
  awaitingConfirm,
  onConfirmAdmit,
  passKind = "guest_pass",
  accessZones,
}: AdmissionScanPromptProps) {
  const titleId = useId();
  const isVendor = passKind === "vendor_team_pass";
  const remaining = Math.max(0, partySize - admittedCount);
  const selectedHeads = party
    .filter((m) => selectedMembers.includes(m.id))
    .reduce((sum, m) => sum + 1 + Math.max(0, m.plusOnes), 0);
  const namedUnadmitted = party.filter((m) => !m.admitted).length;
  const admitLabel = selectedMembers.length ? selectedHeads : arrivingNow;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !awaitingQuantity && !awaitingConfirm) onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, awaitingQuantity, awaitingConfirm, onDismiss]);

  if (!open) return null;

  const toneBorder =
    decision.tone === "green"
      ? "border-emerald-300"
      : decision.tone === "amber"
        ? "border-amber-300"
        : "border-rose-300";
  const toneBg =
    decision.tone === "green"
      ? "from-emerald-50 to-white"
      : decision.tone === "amber"
        ? "from-amber-50 to-white"
        : "from-rose-50 to-white";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/55 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget && !awaitingQuantity && !awaitingConfirm) onDismiss();
      }}
    >
      <div
        className={cn(
          "w-full max-w-lg overflow-hidden rounded-2xl border-2 bg-gradient-to-b shadow-2xl",
          toneBorder,
          toneBg
        )}
      >
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              {awaitingQuantity ? (
                <Users className="h-9 w-9 text-slate-700" aria-hidden />
              ) : decision.tone === "green" ? (
                decision.outcome === "RE_ENTRY" || decision.admitQuantity > 0 ? (
                  <PartyPopper className="h-9 w-9 text-emerald-600" aria-hidden />
                ) : (
                  <CheckCircle2 className="h-9 w-9 text-emerald-600" aria-hidden />
                )
              ) : decision.tone === "amber" ? (
                <ShieldAlert className="h-9 w-9 text-amber-600" aria-hidden />
              ) : (
                <XCircle className="h-9 w-9 text-rose-600" aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p
                id={titleId}
                className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight"
              >
                {headlineFor(decision, awaitingQuantity, isVendor)}
              </p>
              <p className="mt-1 text-sm sm:text-base text-slate-700 leading-relaxed">
                {subcopyFor(decision, awaitingQuantity, remaining, isVendor)}
              </p>
              {(displayName || passCode || partySize > 0) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {isVendor && (
                    <Badge className="bg-teal-700 text-white hover:bg-teal-700">
                      Vendor / Team Pass
                    </Badge>
                  )}
                  {displayName && (
                    <Badge variant="outline" className="text-sm font-semibold">
                      {displayName}
                    </Badge>
                  )}
                  {passCode && (
                    <Badge variant="outline" className="font-mono">
                      {formatAdmissionCode(passCode)}
                    </Badge>
                  )}
                  {partySize > 0 && (
                    <Badge variant="secondary">
                      {admittedCount} of {partySize} admitted
                      {remaining > 0 && !awaitingQuantity ? ` · ${remaining} left` : ""}
                    </Badge>
                  )}
                  {accessZones && accessZones.length > 0 && (
                    <Badge variant="outline">Access: {accessZones.join(" · ")}</Badge>
                  )}
                  {seatingLabel && <Badge variant="outline">{seatingLabel}</Badge>}
                  {offline && <Badge variant="secondary">Queued offline</Badge>}
                </div>
              )}
            </div>
          </div>

          {awaitingQuantity && (
            <div className="space-y-4 rounded-xl border border-black/10 bg-white/80 p-4">
              <fieldset>
                <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  How many are arriving now?
                </legend>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-label="One fewer guest"
                    disabled={arrivingNow <= 1 || selectedMembers.length > 0 || busy}
                    onClick={() => onArrivingNowChange(Math.max(1, arrivingNow - 1))}
                  >
                    <Minus className="h-4 w-4" aria-hidden />
                  </Button>
                  <output
                    aria-live="polite"
                    className="min-w-[4rem] rounded-lg border border-slate-200 bg-white px-4 py-2 text-center text-3xl font-bold tabular-nums text-slate-900"
                  >
                    {admitLabel}
                  </output>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-label="One more guest"
                    disabled={arrivingNow >= remaining || selectedMembers.length > 0 || busy}
                    onClick={() => onArrivingNowChange(Math.min(remaining, arrivingNow + 1))}
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                  </Button>
                  <span className="text-sm text-slate-600">of {remaining} still to arrive</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {Array.from({ length: Math.min(remaining, 10) }, (_, i) => i + 1).map((n) => (
                    <Button
                      key={n}
                      type="button"
                      size="sm"
                      variant={!selectedMembers.length && arrivingNow === n ? "default" : "outline"}
                      disabled={selectedMembers.length > 0 || busy}
                      onClick={() => onArrivingNowChange(n)}
                      className="min-w-[2.5rem] px-2"
                    >
                      {n}
                    </Button>
                  ))}
                </div>
              </fieldset>

              {namedUnadmitted > 0 && party.length > 1 && (
                <fieldset>
                  <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Or tick who has arrived
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {party.map((member) => (
                      <label
                        key={member.id}
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs",
                          member.admitted
                            ? "cursor-not-allowed border-emerald-200 bg-emerald-50 text-emerald-700"
                            : selectedMembers.includes(member.id)
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-300 bg-white text-slate-700"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          disabled={member.admitted || busy}
                          checked={selectedMembers.includes(member.id)}
                          onChange={(e) =>
                            onSelectedMembersChange(
                              e.target.checked
                                ? [...selectedMembers, member.id]
                                : selectedMembers.filter((id) => id !== member.id)
                            )
                          }
                        />
                        {member.name}
                        {member.plusOnes > 0 && ` +${member.plusOnes}`}
                        {member.admitted && " ✓"}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  className="min-w-[8rem]"
                  disabled={busy || admitLabel < 1}
                  onClick={() => onAdmit(selectedMembers.length ? undefined : arrivingNow)}
                >
                  Admit {admitLabel}
                </Button>
                {remaining > 1 && !selectedMembers.length && onAdmitAllRemaining && (
                  <Button variant="outline" disabled={busy} onClick={onAdmitAllRemaining}>
                    Admit all {remaining}
                  </Button>
                )}
                <Button variant="ghost" disabled={busy} onClick={onDismiss}>
                  Cancel scan
                </Button>
              </div>
            </div>
          )}

          {!awaitingQuantity && awaitingConfirm && onConfirmAdmit && (
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={onConfirmAdmit}>
                Confirm admit {remaining > 0 ? remaining : ""}
              </Button>
              <Button variant="ghost" disabled={busy} onClick={onDismiss}>
                Cancel
              </Button>
            </div>
          )}

          {!awaitingQuantity && !awaitingConfirm && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                className="min-w-[8rem]"
                variant={decision.tone === "green" ? "default" : "outline"}
                onClick={onDismiss}
              >
                {decision.tone === "green" ? "Scan next guest" : "Dismiss"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
