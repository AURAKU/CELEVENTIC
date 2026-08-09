"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Copy,
  Download,
  Gift,
  Link2,
  Loader2,
  QrCode,
  RefreshCw,
  Search,
  Settings2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginationBar } from "@/components/ui/pagination";
import { EventPicker } from "@/components/dashboard/event-picker";
import { useEventContext } from "@/hooks/use-event-context";
import { formatMinor, toMinorUnits, MoneyError } from "@/lib/gifts/money";
import { GIFT_TYPE_LABELS } from "@/lib/gifts/gift-copy";
import { GIFT_PAYMENT_METHODS } from "@/lib/gifts/gift-providers";

/**
 * Organiser gift wallet.
 *
 * This is the only surface where gift totals and contributor identities are
 * ever shown. Access is enforced server-side by the MANAGE_FINANCES event
 * permission; the UI simply reflects what the API is willing to return.
 */

interface GiftTransaction {
  id: string;
  reference: string;
  status: string;
  giftTypeLabel: string;
  amountFormatted: string;
  amountMinor: number;
  netAmountMinor: number;
  feeMinor: number;
  currency: string;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  guestMessage: string | null;
  isAnonymous: boolean;
  method: string | null;
  createdAt: string;
  paidAt: string | null;
  reconciledAt: string | null;
  organiserNote: string | null;
  refundedAt: string | null;
  hasReceipt: boolean;
}

interface GiftSummary {
  giftCount: number;
  grossMinor: number;
  netMinor: number;
  feesMinor: number;
  averageMinor: number;
  pendingCount: number;
  failedCount: number;
  refundedMinor: number;
  refundedCount: number;
  lastGiftAt: string | null;
}

interface CampaignState {
  id: string;
  publicToken: string;
  status: string;
  giftType: string;
  qrMode: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  ctaLabel: string;
  thankYouTitle: string | null;
  thankYouMessage: string | null;
  currency: string;
  suggestedAmountsMinor: number[];
  minAmountMinor: number;
  maxAmountMinor: number | null;
  allowCustomAmount: boolean;
  allowGuestMessage: boolean;
  requireGuestName: boolean;
  requireGuestContact: boolean;
  allowAnonymous: boolean;
  showOnInvitation: boolean;
  showOnCompanion: boolean;
  themeSource: string;
}

interface Links {
  giftUrl: string;
  qrImageUrl: string;
  qrDownloadUrl: string;
}

interface WithdrawalRow {
  id: string;
  amountMinor: number;
  currency: string;
  status: string;
  payoutMethod: string;
  payoutKind: string;
  payoutPhoneMasked: string | null;
  bankAccountMasked: string | null;
  accountName: string | null;
  evidenceReference: string | null;
  failureReason: string | null;
  requestedAt: string;
  paidAt: string | null;
  requestedBy: { id: string; name: string | null; email: string | null } | null;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "outline"> = {
  SUCCESS: "success",
  PENDING: "warning",
  PROCESSING: "warning",
  FAILED: "destructive",
  ABANDONED: "destructive",
  REFUNDED: "destructive",
  REVERSED: "destructive",
  DISPUTED: "destructive",
};

const METHOD_LABELS = new Map(GIFT_PAYMENT_METHODS.map((m) => [m.id, m.shortLabel]));

export function GiftWalletClient() {
  const { events, eventId, setEventId, loading: eventsLoading } = useEventContext();
  const [tab, setTab] = useState<
    "overview" | "transactions" | "pending" | "refunds" | "withdrawals" | "settings"
  >("overview");

  const [campaign, setCampaign] = useState<CampaignState | null>(null);
  const [links, setLinks] = useState<Links | null>(null);
  const [canRefund, setCanRefund] = useState(false);
  const [canApproveWithdrawals, setCanApproveWithdrawals] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [actorId, setActorId] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<GiftTransaction[]>([]);
  const [summary, setSummary] = useState<GiftSummary | null>(null);
  const [walletBalanceMinor, setWalletBalanceMinor] = useState(0);
  const [availableMinor, setAvailableMinor] = useState(0);
  const [reservedMinor, setReservedMinor] = useState(0);
  const [withdrawnMinor, setWithdrawnMinor] = useState(0);
  const [currency, setCurrency] = useState("GHS");
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [wdPage, setWdPage] = useState(1);
  const [wdPages, setWdPages] = useState(1);

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("ALL");
  const [method, setMethod] = useState("ALL");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadCampaign = useCallback(async () => {
    if (!eventId) return;
    const res = await fetch(`/api/gifts/admin/campaign?eventId=${eventId}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not load gift settings");
      return;
    }
    setCampaign(data.data.campaign);
    setLinks(data.data.links);
    setCanRefund(Boolean(data.data.permissions?.canRefund));
  }, [eventId]);

  const loadTransactions = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      eventId,
      page: String(page),
      status,
      method,
      ...(search.trim() ? { search: search.trim() } : {}),
    });
    const res = await fetch(`/api/gifts/admin/transactions?${params}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not load gifts");
      return;
    }
    setTransactions(data.data.transactions.items);
    setPages(data.data.transactions.pages);
    setTotal(data.data.transactions.total);
    setSummary(data.data.summary);
    setWalletBalanceMinor(data.data.wallet.balanceMinor);
    setAvailableMinor(data.data.wallet.availableMinor ?? data.data.wallet.balanceMinor);
    setReservedMinor(data.data.wallet.reservedMinor ?? 0);
    setWithdrawnMinor(data.data.wallet.lifetimeWithdrawnMinor ?? 0);
    setCurrency(data.data.wallet.currency);
    setCanRefund(Boolean(data.data.permissions?.canRefund));
  }, [eventId, page, status, method, search]);

  const loadWithdrawals = useCallback(async () => {
    if (!eventId) return;
    const params = new URLSearchParams({ eventId, page: String(wdPage) });
    const res = await fetch(`/api/gifts/admin/withdrawals?${params}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not load withdrawals");
      return;
    }
    setWithdrawals(data.data.withdrawals.items);
    setWdPages(data.data.withdrawals.pages);
    setAvailableMinor(data.data.wallet.availableMinor);
    setReservedMinor(data.data.wallet.reservedMinor);
    setWithdrawnMinor(data.data.wallet.withdrawnMinor);
    setWalletBalanceMinor(data.data.wallet.balanceMinor);
    setCanApproveWithdrawals(Boolean(data.data.permissions?.canApproveWithdrawals));
    setIsPlatformAdmin(Boolean(data.data.permissions?.isPlatformAdmin));
    setActorId(data.data.permissions?.actorId ?? null);
  }, [eventId, wdPage]);

  useEffect(() => {
    if (eventId) void loadCampaign();
  }, [eventId, loadCampaign]);

  useEffect(() => {
    if (eventId) void loadTransactions();
  }, [eventId, loadTransactions]);

  useEffect(() => {
    if (eventId && (tab === "withdrawals" || tab === "overview")) void loadWithdrawals();
  }, [eventId, tab, loadWithdrawals]);

  useEffect(() => {
    setPage(1);
  }, [eventId, status, method, search]);

  useEffect(() => {
    if (tab === "pending") setStatus("PENDING");
    else if (tab === "refunds") setStatus("REFUNDED");
    else if (tab === "transactions" || tab === "overview") setStatus("ALL");
  }, [tab]);

  async function act(id: string, body: Record<string, unknown>, successMessage: string) {
    setBusy(id);
    setError("");
    setNotice("");
    const res = await fetch(`/api/gifts/admin/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, ...body }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setError(data.error ?? "That action did not complete");
      return;
    }
    setNotice(successMessage);
    await loadTransactions();
  }

  async function saveCampaign(patch: Record<string, unknown>) {
    if (!eventId) return;
    setBusy("campaign");
    setError("");
    setNotice("");
    const res = await fetch("/api/gifts/admin/campaign", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, ...patch }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setError(data.error ?? "Could not save gift settings");
      return;
    }
    setCampaign(data.data.campaign);
    setLinks(data.data.links);
    setNotice("Gift settings saved.");
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Gift Wallet</h1>
          <p className="page-subtitle">
            Cash gifts sent by your guests. Only you and your finance team can see this.
          </p>
        </div>
        {eventId && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void loadTransactions()}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <a href={`/api/gifts/admin/export?eventId=${eventId}&status=${status}`} download>
              <Button variant="outline" size="sm" type="button">
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </a>
          </div>
        )}
      </header>

      <Card>
        <CardContent className="p-4">
          <EventPicker
            events={events}
            value={eventId}
            onChange={setEventId}
            loading={eventsLoading}
          />
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-emerald-600">{notice}</p>}

      {!eventId ? (
        <Card>
          <CardContent className="p-10 text-center text-slate-500">
            Choose an event to see its gift wallet.
          </CardContent>
        </Card>
      ) : (
        <>
          <SummaryCards
            summary={summary}
            currency={currency}
            walletBalanceMinor={walletBalanceMinor}
            availableMinor={availableMinor}
            reservedMinor={reservedMinor}
            withdrawnMinor={withdrawnMinor}
          />

          {links && campaign && (
            <GiftLinkCard
              links={links}
              campaign={campaign}
              onToggleStatus={() =>
                void saveCampaign({ status: campaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE" })
              }
              busy={busy === "campaign"}
            />
          )}

          <div className="flex flex-wrap gap-2 border-b">
            {(
              [
                ["overview", "Overview"],
                ["transactions", "Gifts"],
                ["pending", "Pending"],
                ["refunds", "Refunds"],
                ["withdrawals", "Withdrawals"],
                ["settings", "Campaign Settings"],
              ] as const
            ).map(([id, label]) => (
              <TabButton key={id} active={tab === id} onClick={() => setTab(id)}>
                {id === "settings" ? <Settings2 className="mr-1.5 inline h-3.5 w-3.5" /> : null}
                {label}
              </TabButton>
            ))}
          </div>

          {tab === "withdrawals" ? (
            <WithdrawalsPanel
              eventId={eventId}
              currency={currency}
              availableMinor={availableMinor}
              withdrawals={withdrawals}
              page={wdPage}
              pages={wdPages}
              canApprove={canApproveWithdrawals}
              isPlatformAdmin={isPlatformAdmin}
              actorId={actorId}
              busy={busy}
              onPage={setWdPage}
              onRefresh={() => void loadWithdrawals()}
              onBusy={setBusy}
              onError={setError}
              onNotice={setNotice}
            />
          ) : tab === "settings" ? (
            campaign && (
              <SettingsPanel campaign={campaign} onSave={saveCampaign} busy={busy === "campaign"} />
            )
          ) : (
            <TransactionsPanel
              transactions={transactions}
              loading={loading}
              page={page}
              pages={pages}
              total={total}
              status={status}
              method={method}
              search={search}
              canRefund={canRefund}
              busy={busy}
              onPage={setPage}
              onStatus={setStatus}
              onMethod={setMethod}
              onSearch={setSearch}
              onAction={act}
            />
          )}
        </>
      )}
    </div>
  );
}

function SummaryCards({
  summary,
  currency,
  walletBalanceMinor,
  availableMinor = 0,
  reservedMinor = 0,
  withdrawnMinor = 0,
}: {
  summary: GiftSummary | null;
  currency: string;
  walletBalanceMinor: number;
  availableMinor?: number;
  reservedMinor?: number;
  withdrawnMinor?: number;
}) {
  const cards = [
    {
      label: "Available to withdraw",
      value: formatMinor(availableMinor, currency),
      icon: Wallet,
      tone: "text-brand-600",
    },
    {
      label: "Gross gifts",
      value: formatMinor(summary?.grossMinor ?? 0, currency),
      icon: Gift,
      tone: "text-emerald-600",
    },
    {
      label: "Provider fees",
      value: formatMinor(summary?.feesMinor ?? 0, currency),
      icon: Wallet,
      tone: "text-slate-600",
    },
    {
      label: "Wallet balance",
      value: formatMinor(walletBalanceMinor, currency),
      icon: Wallet,
      tone: "text-emerald-600",
    },
    {
      label: "Reserved",
      value: formatMinor(reservedMinor, currency),
      icon: Wallet,
      tone: "text-amber-600",
    },
    {
      label: "Withdrawn",
      value: formatMinor(withdrawnMinor, currency),
      icon: Wallet,
      tone: "text-slate-600",
    },
    {
      label: "Successful gifts",
      value: String(summary?.giftCount ?? 0),
      icon: Gift,
      tone: "text-emerald-600",
    },
    {
      label: "Refunded",
      value: formatMinor(summary?.refundedMinor ?? 0, currency),
      icon: Gift,
      tone: "text-red-600",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-6 text-center">
            <card.icon className={`mx-auto mb-2 h-6 w-6 ${card.tone}`} />
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-slate-500">{card.label}</p>
          </CardContent>
        </Card>
      ))}
      {summary && (summary.pendingCount > 0 || summary.refundedCount > 0) && (
        <Card className="sm:col-span-2 lg:col-span-4">
          <CardContent className="flex flex-wrap gap-6 p-4 text-sm">
            {summary.pendingCount > 0 && (
              <span>
                Awaiting confirmation: <strong>{summary.pendingCount}</strong>
              </span>
            )}
            {summary.refundedCount > 0 && (
              <span>
                Refunded: <strong>{formatMinor(summary.refundedMinor, currency)}</strong> across{" "}
                {summary.refundedCount}
              </span>
            )}
            {summary.feesMinor > 0 && (
              <span>
                Processing fees: <strong>{formatMinor(summary.feesMinor, currency)}</strong>
              </span>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GiftLinkCard({
  links,
  campaign,
  onToggleStatus,
  busy,
}: {
  links: Links;
  campaign: CampaignState;
  onToggleStatus: () => void;
  busy: boolean;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">Your gift link &amp; QR</CardTitle>
        <Badge variant={campaign.status === "ACTIVE" ? "success" : "warning"}>
          {campaign.status === "ACTIVE" ? "Live" : campaign.status}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-[auto_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={links.qrImageUrl}
          alt="Gift QR code"
          width={160}
          height={160}
          className="h-40 w-40 rounded-lg border bg-white p-2"
        />
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2 text-sm">
            <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">{links.giftUrl}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(links.giftUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              <Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy link"}
            </Button>
            <a href={links.qrDownloadUrl} download>
              <Button variant="outline" size="sm" type="button">
                <QrCode className="h-4 w-4" /> Download QR
              </Button>
            </a>
            <Button variant="outline" size="sm" onClick={onToggleStatus} disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : campaign.status === "ACTIVE" ? (
                "Pause gifting"
              ) : (
                "Start gifting"
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Print this QR for Event Guide signs or share it from Event Companion. Guests never see
            totals or other guests&apos; gifts. The digital invitation does not show a gift section.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionsPanel({
  transactions,
  loading,
  page,
  pages,
  total,
  status,
  method,
  search,
  canRefund,
  busy,
  onPage,
  onStatus,
  onMethod,
  onSearch,
  onAction,
}: {
  transactions: GiftTransaction[];
  loading: boolean;
  page: number;
  pages: number;
  total: number;
  status: string;
  method: string;
  search: string;
  canRefund: boolean;
  busy: string | null;
  onPage: (page: number) => void;
  onStatus: (value: string) => void;
  onMethod: (value: string) => void;
  onSearch: (value: string) => void;
  onAction: (id: string, body: Record<string, unknown>, message: string) => Promise<void>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Gift transactions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search name, reference, email"
              className="pl-9"
            />
          </div>
          <select
            value={status}
            onChange={(e) => onStatus(e.target.value)}
            className="h-10 rounded-md border border-slate-200 px-3 text-sm"
            aria-label="Filter by status"
          >
            <option value="ALL">All statuses</option>
            <option value="SUCCESS">Confirmed</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="FAILED">Failed</option>
            <option value="ABANDONED">Abandoned</option>
            <option value="REFUNDED">Refunded</option>
            <option value="DISPUTED">Disputed</option>
          </select>
          <select
            value={method}
            onChange={(e) => onMethod(e.target.value)}
            className="h-10 rounded-md border border-slate-200 px-3 text-sm"
            aria-label="Filter by payment method"
          >
            <option value="ALL">All methods</option>
            {GIFT_PAYMENT_METHODS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="py-10 text-center text-slate-500">Loading gifts…</p>
        ) : transactions.length === 0 ? (
          <p className="py-10 text-center text-slate-500">
            No gifts yet. Share your gift link or QR to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                canRefund={canRefund}
                busy={busy === tx.id}
                onAction={onAction}
              />
            ))}
          </div>
        )}

        <PaginationBar
          page={page}
          pages={pages}
          total={total}
          limit={20}
          onPageChange={onPage}
        />
      </CardContent>
    </Card>
  );
}

function TransactionRow({
  tx,
  canRefund,
  busy,
  onAction,
}: {
  tx: GiftTransaction;
  canRefund: boolean;
  busy: boolean;
  onAction: (id: string, body: Record<string, unknown>, message: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState(tx.organiserNote ?? "");

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">
            {tx.guestName}
            {tx.isAnonymous && <span className="ml-2 text-xs text-slate-400">anonymous</span>}
          </p>
          <p className="text-xs text-slate-500">
            {new Date(tx.createdAt).toLocaleString("en-GB", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            {tx.method && ` · ${METHOD_LABELS.get(tx.method as never) ?? tx.method}`}
            {` · ${tx.giftTypeLabel}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-semibold">{tx.amountFormatted}</span>
          <Badge variant={STATUS_VARIANT[tx.status] ?? "outline"}>{tx.status}</Badge>
          <Button variant="outline" size="sm" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Hide" : "View"}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 border-t pt-4 text-sm">
          <dl className="grid gap-2 sm:grid-cols-2">
            <Detail label="Reference">{tx.reference}</Detail>
            <Detail label="Net after fees">
              {formatMinor(tx.netAmountMinor, tx.currency)}
            </Detail>
            {tx.guestEmail && <Detail label="Email">{tx.guestEmail}</Detail>}
            {tx.guestPhone && <Detail label="Phone">{tx.guestPhone}</Detail>}
            {tx.paidAt && (
              <Detail label="Paid at">
                {new Date(tx.paidAt).toLocaleString("en-GB")}
              </Detail>
            )}
            {tx.reconciledAt && (
              <Detail label="Reconciled">
                {new Date(tx.reconciledAt).toLocaleDateString("en-GB")}
              </Detail>
            )}
          </dl>

          {tx.guestMessage && (
            <p className="rounded-md bg-slate-50 px-3 py-2 italic">
              &ldquo;{tx.guestMessage}&rdquo;
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor={`note-${tx.id}`} className="text-xs">
              Private note
            </Label>
            <div className="flex gap-2">
              <Input
                id={`note-${tx.id}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Only your team sees this"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void onAction(tx.id, { action: "note", note }, "Note saved.")}
              >
                Save
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() =>
                void onAction(tx.id, { action: "reconcile" }, "Marked as reconciled.")
              }
            >
              Mark reconciled
            </Button>
            {tx.status !== "SUCCESS" && (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() =>
                  void onAction(tx.id, { action: "reverify" }, "Re-checked with the provider.")
                }
              >
                Re-verify
              </Button>
            )}
            {canRefund && tx.status === "SUCCESS" && (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => {
                  const reason = window.prompt("Why are you refunding this gift?");
                  if (!reason || reason.trim().length < 3) return;
                  void onAction(tx.id, { action: "refund", reason }, "Refund requested.");
                }}
              >
                Refund
              </Button>
            )}
            {busy && <Loader2 className="h-4 w-4 animate-spin self-center text-slate-400" />}
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsPanel({
  campaign,
  onSave,
  busy,
}: {
  campaign: CampaignState;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
  busy: boolean;
}) {
  const [form, setForm] = useState({
    title: campaign.title,
    subtitle: campaign.subtitle ?? "",
    description: campaign.description ?? "",
    ctaLabel: campaign.ctaLabel,
    thankYouTitle: campaign.thankYouTitle ?? "",
    thankYouMessage: campaign.thankYouMessage ?? "",
    giftType: campaign.giftType,
    qrMode: campaign.qrMode,
    allowCustomAmount: campaign.allowCustomAmount,
    allowGuestMessage: campaign.allowGuestMessage,
    allowAnonymous: campaign.allowAnonymous,
    requireGuestName: campaign.requireGuestName,
    requireGuestContact: campaign.requireGuestContact,
    showOnInvitation: campaign.showOnInvitation,
    showOnCompanion: campaign.showOnCompanion !== false,
    themeSource: campaign.themeSource,
  });

  const [amountsText, setAmountsText] = useState(
    campaign.suggestedAmountsMinor
      .map((v) => formatMinor(v, campaign.currency, { withSymbol: false }))
      .join(", ")
  );
  const [minText, setMinText] = useState(
    formatMinor(campaign.minAmountMinor, campaign.currency, { withSymbol: false })
  );
  const [amountsError, setAmountsError] = useState("");

  const parsedAmounts = useMemo(() => {
    try {
      const values = amountsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => toMinorUnits(s, campaign.currency));
      setAmountsError("");
      return values;
    } catch (err) {
      setAmountsError(err instanceof MoneyError ? err.message : "Check your amounts");
      return null;
    }
  }, [amountsText, campaign.currency]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Gift settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Gift type</Label>
            <select
              value={form.giftType}
              onChange={(e) => setForm({ ...form, giftType: e.target.value })}
              className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
            >
              {Object.entries(GIFT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>QR mode</Label>
            <select
              value={form.qrMode}
              onChange={(e) => setForm({ ...form, qrMode: e.target.value })}
              className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
            >
              <option value="EVENT_GIFT_QR">One shared gift QR</option>
              <option value="PERSONALISED_GIFT_QR">Personalised per guest</option>
            </select>
          </div>
        </div>

        <TextField
          label="Heading"
          value={form.title}
          onChange={(v) => setForm({ ...form, title: v })}
        />
        <TextField
          label="Subheading"
          value={form.subtitle}
          onChange={(v) => setForm({ ...form, subtitle: v })}
        />
        <TextField
          label="Description"
          value={form.description}
          onChange={(v) => setForm({ ...form, description: v })}
          multiline
        />
        <TextField
          label="Button label"
          value={form.ctaLabel}
          onChange={(v) => setForm({ ...form, ctaLabel: v })}
        />
        <TextField
          label="Thank-you heading"
          value={form.thankYouTitle}
          onChange={(v) => setForm({ ...form, thankYouTitle: v })}
        />
        <TextField
          label="Thank-you message"
          value={form.thankYouMessage}
          onChange={(v) => setForm({ ...form, thankYouMessage: v })}
          multiline
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Suggested amounts ({campaign.currency}, comma separated)</Label>
            <Input value={amountsText} onChange={(e) => setAmountsText(e.target.value)} />
            {amountsError && <p className="text-xs text-red-600">{amountsError}</p>}
          </div>
          <div className="space-y-1">
            <Label>Minimum gift ({campaign.currency})</Label>
            <Input value={minText} onChange={(e) => setMinText(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle
            label="Let guests enter their own amount"
            checked={form.allowCustomAmount}
            onChange={(v) => setForm({ ...form, allowCustomAmount: v })}
          />
          <Toggle
            label="Let guests leave a note"
            checked={form.allowGuestMessage}
            onChange={(v) => setForm({ ...form, allowGuestMessage: v })}
          />
          <Toggle
            label="Allow anonymous gifts"
            checked={form.allowAnonymous}
            onChange={(v) => setForm({ ...form, allowAnonymous: v })}
          />
          <Toggle
            label="Require a name"
            checked={form.requireGuestName}
            onChange={(v) => setForm({ ...form, requireGuestName: v })}
          />
          <Toggle
            label="Require email or phone"
            checked={form.requireGuestContact}
            onChange={(v) => setForm({ ...form, requireGuestContact: v })}
          />
          <Toggle
            label="Inherit invitation theme"
            checked={form.themeSource === "INVITATION"}
            onChange={(v) => setForm({ ...form, themeSource: v ? "INVITATION" : "PRESET" })}
          />
          <Toggle
            label="Show gift on Event Guide"
            checked={form.showOnInvitation}
            onChange={(v) => setForm({ ...form, showOnInvitation: v })}
          />
          <Toggle
            label="Show gift on Event Companion"
            checked={form.showOnCompanion}
            onChange={(v) => setForm({ ...form, showOnCompanion: v })}
          />
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          Guests only see gifts when <strong>Gift the Couple</strong> is turned on in Event Companion
          studio and this campaign is <strong>Live</strong>. Digital invitations never show a gift
          section — only Event Guide and Event Companion.
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Guests never see how much has been gifted, who else has given, or how many gifts there
          are. That privacy is enforced on the server and cannot be switched off.
        </div>

        <Button
          disabled={busy || parsedAmounts === null}
          onClick={() => {
            let minAmountMinor: number | undefined;
            try {
              minAmountMinor = toMinorUnits(minText, campaign.currency);
            } catch {
              minAmountMinor = undefined;
            }
            void onSave({
              ...form,
              ...(parsedAmounts ? { suggestedAmountsMinor: parsedAmounts } : {}),
              ...(minAmountMinor ? { minAmountMinor } : {}),
            });
          }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save gift settings"}
        </Button>
      </CardContent>
    </Card>
  );
}

function WithdrawalsPanel({
  eventId,
  currency,
  availableMinor,
  withdrawals,
  page,
  pages,
  canApprove,
  isPlatformAdmin,
  actorId,
  busy,
  onPage,
  onRefresh,
  onBusy,
  onError,
  onNotice,
}: {
  eventId: string;
  currency: string;
  availableMinor: number;
  withdrawals: WithdrawalRow[];
  page: number;
  pages: number;
  canApprove: boolean;
  isPlatformAdmin: boolean;
  actorId: string | null;
  busy: string | null;
  onPage: (page: number) => void;
  onRefresh: () => void;
  onBusy: (id: string | null) => void;
  onError: (msg: string) => void;
  onNotice: (msg: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState("MTN_MOMO");
  const [accountName, setAccountName] = useState("");
  const [evidence, setEvidence] = useState("");

  async function requestWithdrawal() {
    onBusy("wd-request");
    onError("");
    onNotice("");
    let amountMinor: number;
    try {
      amountMinor = toMinorUnits(amount, currency);
    } catch (err) {
      onBusy(null);
      onError(err instanceof MoneyError ? err.message : "Invalid amount");
      return;
    }
    const res = await fetch("/api/gifts/admin/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        amountMinor,
        payoutMethod: method,
        payoutPhone: method === "GHANA_BANK" ? undefined : phone,
        bankAccountNumber: method === "GHANA_BANK" ? phone : undefined,
        accountName: accountName || undefined,
      }),
    });
    const data = await res.json();
    onBusy(null);
    if (!res.ok) {
      onError(data.error ?? "Could not request withdrawal");
      return;
    }
    onNotice("Withdrawal requested. Available balance is reserved pending review.");
    setAmount("");
    onRefresh();
  }

  async function act(id: string, action: string, extra: Record<string, unknown> = {}) {
    onBusy(id);
    onError("");
    const res = await fetch(`/api/gifts/admin/withdrawals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, action, ...extra }),
    });
    const data = await res.json();
    onBusy(null);
    if (!res.ok) {
      onError(data.error ?? "Withdrawal action failed");
      return;
    }
    onNotice(`Withdrawal ${action.replace("_", " ")} completed.`);
    onRefresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request withdrawal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            Available funds become eligible for withdrawal after successful payment
            verification and the configured settlement period. Payouts are recorded as{" "}
            <strong>manual payouts</strong> until a provider transfer is confirmed —
            Celeventic never claims an automatic Paystack transfer unless one is verified.
          </p>
          <p className="text-sm">
            Available now: <strong>{formatMinor(availableMinor, currency)}</strong>
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Amount ({currency})</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="200.00" />
            </div>
            <div className="space-y-1">
              <Label>Destination</Label>
              <select
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="MTN_MOMO">MTN Mobile Money</option>
                <option value="TELECEL_CASH">Telecel Cash</option>
                <option value="AIRTELTIGO_MONEY">AirtelTigo / AT Money</option>
                <option value="GHANA_BANK">Ghana bank account</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>{method === "GHANA_BANK" ? "Account number" : "Mobile money number"}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Account name</Label>
              <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} />
            </div>
          </div>
          <Button disabled={busy === "wd-request"} onClick={() => void requestWithdrawal()}>
            {busy === "wd-request" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request withdrawal"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Withdrawal history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {withdrawals.length === 0 ? (
            <p className="text-sm text-slate-500">No withdrawals yet.</p>
          ) : (
            withdrawals.map((row) => {
              const isRequester = actorId && row.requestedBy?.id === actorId;
              const mayReview = canApprove && (isPlatformAdmin || !isRequester);
              return (
                <div
                  key={row.id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold">
                      {formatMinor(row.amountMinor, row.currency)} · {row.status}
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.payoutMethod} · {row.payoutKind} ·{" "}
                      {row.payoutPhoneMasked || row.bankAccountMasked || "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {row.status === "REQUESTED" && mayReview ? (
                      <>
                        <Button size="sm" variant="outline" disabled={busy === row.id} onClick={() => void act(row.id, "approve")}>
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy === row.id} onClick={() => void act(row.id, "reject", { reason: "Rejected by reviewer" })}>
                          Reject
                        </Button>
                      </>
                    ) : null}
                    {row.status === "APPROVED" && mayReview ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          className="h-8 w-40"
                          placeholder="Evidence ref"
                          value={evidence}
                          onChange={(e) => setEvidence(e.target.value)}
                        />
                        <Button
                          size="sm"
                          disabled={busy === row.id}
                          onClick={() =>
                            void act(row.id, "mark_paid", { evidenceReference: evidence || `manual-${row.id}` })
                          }
                        >
                          Mark paid (manual)
                        </Button>
                      </div>
                    ) : null}
                    {row.status === "REQUESTED" && isRequester ? (
                      <Button size="sm" variant="outline" disabled={busy === row.id} onClick={() => void act(row.id, "cancel")}>
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
          <PaginationBar
            page={page}
            pages={pages}
            total={withdrawals.length}
            limit={25}
            onPageChange={onPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4"
      />
      {label}
    </label>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "border-brand-600 text-brand-600"
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="break-all">{children}</dd>
    </div>
  );
}
