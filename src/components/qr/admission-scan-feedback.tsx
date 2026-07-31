"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, PartyPopper, MapPin, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type AdmissionFeedbackStatus =
  | "valid"
  | "invalid"
  | "expired"
  | "already_checked_in"
  | "not_found"
  | "wrong_event"
  | "wrong_pass"
  | "revoked"
  | "refunded"
  | "cancelled";

export interface AdmissionFeedbackResult {
  status: AdmissionFeedbackStatus;
  guest?: { id?: string; name: string } | null;
  ticket?: { name: string } | null;
  event?: { title: string } | null;
  selectedEventTitle?: string | null;
  qrType?: string;
  admittedAt?: string | null;
  offline?: boolean;
  feedback?: string | null;
}

interface AdmissionScanFeedbackProps {
  result: AdmissionFeedbackResult;
  statusLabel: string;
  resetting?: boolean;
  onResetGuest?: (guestId: string) => void;
  /** When true, show as a blocking organiser prompt overlay. */
  asPrompt?: boolean;
  onDismissPrompt?: () => void;
}

function styles(status: AdmissionFeedbackStatus) {
  if (status === "valid") return "border-emerald-300 bg-gradient-to-b from-emerald-50 to-white";
  if (status === "already_checked_in") return "border-amber-300 bg-gradient-to-b from-amber-50 to-white";
  if (status === "wrong_event" || status === "wrong_pass") {
    return "border-rose-300 bg-gradient-to-b from-rose-50 to-white";
  }
  return "border-red-200 bg-gradient-to-b from-red-50 to-white";
}

function promptTitle(status: AdmissionFeedbackStatus): string {
  switch (status) {
    case "valid":
      return "Guest admitted";
    case "already_checked_in":
      return "Already admitted";
    case "wrong_event":
      return "Wrong event";
    case "wrong_pass":
      return "Not an admission pass";
    case "expired":
      return "Pass expired";
    case "not_found":
      return "Pass not found";
    case "revoked":
    case "cancelled":
    case "refunded":
      return "Admission denied";
    default:
      return "Scan failed";
  }
}

function FeedbackBody({
  result,
  statusLabel,
  resetting,
  onResetGuest,
}: Omit<AdmissionScanFeedbackProps, "asPrompt" | "onDismissPrompt">) {
  const name = result.guest?.name ?? result.ticket?.name;
  const isWelcome = result.status === "valid";
  const isWrongEvent = result.status === "wrong_event";
  const isWrongPass = result.status === "wrong_pass";

  return (
    <CardContent className="p-6 text-center space-y-3">
      {isWelcome ? (
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="space-y-3"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <PartyPopper className="h-8 w-8" />
          </div>
          <p className="text-xs uppercase tracking-[0.28em] text-emerald-700/80 font-semibold">
            Organiser notified
          </p>
          <h3 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
            {name ? `Welcome, ${name}` : "Guest admitted"}
          </h3>
          <p className="text-sm font-medium text-emerald-800">Admission recorded successfully.</p>
          {result.event?.title && (
            <p className="text-sm text-slate-600 flex items-center justify-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              Admitted to <span className="font-semibold text-slate-800">{result.event.title}</span>
            </p>
          )}
          <Badge variant="success" className="text-sm px-4 py-1">
            {statusLabel}
          </Badge>
          {result.feedback && (
            <p className="text-sm text-emerald-900/80 bg-emerald-100/70 rounded-xl px-4 py-3 leading-relaxed">
              {result.feedback}
            </p>
          )}
        </motion.div>
      ) : (
        <>
          {result.status === "already_checked_in" ? (
            <AlertTriangle className="h-12 w-12 text-amber-600 mx-auto" />
          ) : isWrongEvent || isWrongPass ? (
            <XCircle className="h-12 w-12 text-rose-500 mx-auto" />
          ) : result.status === "valid" ? (
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
          ) : (
            <XCircle className="h-12 w-12 text-red-500 mx-auto" />
          )}

          <p className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">
            Organiser alert
          </p>
          <h3 className="text-2xl font-bold text-slate-900">{promptTitle(result.status)}</h3>

          <Badge
            variant={
              result.status === "already_checked_in"
                ? "warning"
                : result.status === "valid"
                  ? "success"
                  : "destructive"
            }
            className="text-base px-4 py-1"
          >
            {statusLabel}
          </Badge>

          {name && <p className="text-lg font-semibold text-slate-900">{name}</p>}

          {result.status === "already_checked_in" && (
            <p className="text-sm font-medium text-amber-900 bg-amber-100/80 rounded-xl px-4 py-3">
              This single-entry pass was already used. No additional entry was counted.
            </p>
          )}

          {isWrongEvent && (
            <div className="rounded-xl border border-rose-200 bg-white/80 px-4 py-3 text-left space-y-1.5">
              <p className="text-sm font-semibold text-rose-900">Wrong event for this gate</p>
              {result.event?.title && (
                <p className="text-sm text-slate-700">
                  Pass belongs to: <span className="font-medium">{result.event.title}</span>
                </p>
              )}
              {result.selectedEventTitle && (
                <p className="text-sm text-slate-700">
                  This gate is set to: <span className="font-medium">{result.selectedEventTitle}</span>
                </p>
              )}
              <p className="text-xs text-slate-500 pt-1">
                Ask for a Celeventic admission pass issued specifically for this event.
              </p>
            </div>
          )}

          {isWrongPass && (
            <div className="rounded-xl border border-rose-200 bg-white/80 px-4 py-3 text-left space-y-1">
              <p className="text-sm font-semibold text-rose-900">Not an admission pass</p>
              <p className="text-sm text-slate-600">
                Invitation QRs open the guest portal. For entry, scan the Admission QR or enter the 4-digit gate code.
              </p>
            </div>
          )}

          {result.feedback && !isWrongEvent && result.status !== "already_checked_in" && (
            <p
              className={cn(
                "text-sm rounded-xl px-4 py-3 leading-relaxed",
                "text-slate-700 bg-white/70 border border-slate-100"
              )}
            >
              {result.feedback}
            </p>
          )}
          {isWrongEvent && result.feedback && (
            <p className="text-sm text-rose-900/90 bg-rose-100/70 rounded-xl px-4 py-3 leading-relaxed">
              {result.feedback}
            </p>
          )}

          {result.status === "already_checked_in" && result.admittedAt && (
            <p className="text-xs text-amber-800">
              First admitted: {new Date(result.admittedAt).toLocaleString()}
            </p>
          )}
        </>
      )}

      {result.offline && (
        <p className="text-xs text-slate-500">Recorded offline, will sync when online.</p>
      )}

      {result.guest?.id &&
        (result.status === "valid" || result.status === "already_checked_in") &&
        onResetGuest && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={resetting}
            className="gap-1.5 mt-1"
            onClick={() => onResetGuest(result.guest!.id!)}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset admission (re-entry)
          </Button>
        )}
    </CardContent>
  );
}

export function AdmissionScanFeedback({
  result,
  statusLabel,
  resetting,
  onResetGuest,
  asPrompt = false,
  onDismissPrompt,
}: AdmissionScanFeedbackProps) {
  const card = (
    <Card className={cn("border-2 overflow-hidden shadow-sm", styles(result.status), asPrompt && "max-w-lg w-full")}>
      <FeedbackBody
        result={result}
        statusLabel={statusLabel}
        resetting={resetting}
        onResetGuest={onResetGuest}
      />
      {asPrompt && onDismissPrompt && (
        <div className="px-6 pb-5">
          <Button className="w-full" onClick={onDismissPrompt}>
            {result.status === "valid" ? "Scan next guest" : "Dismiss"}
          </Button>
        </div>
      )}
    </Card>
  );

  if (!asPrompt) return card;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/55 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={promptTitle(result.status)}
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismissPrompt?.();
      }}
    >
      {card}
    </div>
  );
}
