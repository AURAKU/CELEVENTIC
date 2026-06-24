"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, TrendingUp, TrendingDown, DollarSign, Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { EventPicker } from "@/components/dashboard/event-picker";
import { useEventContext } from "@/hooks/use-event-context";
import { PaginationBar } from "@/components/ui/pagination";
import { paginateList } from "@/lib/pagination-client";

interface WalletData {
  wallet: {
    balance: string;
    revenue: string;
    expenses: string;
    transactions: { type: string; amount: string; description: string | null; source?: string; isLocked?: boolean; creator?: { name: string } | null }[];
    eventExpenses?: { category: string; amount: string; description: string | null }[];
  };
  contributions: { total: number; count: number };
  profitLoss: { revenue: number; expenses: number; balance: number; netProfit: number; contributionTotal: number };
}

export default function WalletPage() {
  const { events, eventId, setEventId, loading: eventsLoading } = useEventContext();
  const [data, setData] = useState<WalletData | null>(null);
  const [expense, setExpense] = useState({ category: "", amount: "", description: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const TX_PER_PAGE = 10;

  async function loadWallet() {
    if (!eventId) return;
    setLoading(true);
    const res = await fetch(`/api/wallet?eventId=${eventId}`);
    const d = await res.json();
    if (res.ok) setData(d.data);
    else setError(d.error);
    setLoading(false);
  }

  useEffect(() => {
    if (eventId) loadWallet();
  }, [eventId]);

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, category: expense.category, amount: parseFloat(expense.amount), description: expense.description }),
    });
    const d = await res.json();
    if (res.ok) {
      setData(d.data);
      setExpense({ category: "", amount: "", description: "" });
    } else {
      setError(d.error || "Failed to record expense");
    }
  }

  const pl = data?.profitLoss;
  const txSlice = useMemo(
    () => paginateList(data?.wallet?.transactions ?? [], txPage, TX_PER_PAGE),
    [data?.wallet?.transactions, txPage]
  );

  useEffect(() => {
    setTxPage(1);
  }, [eventId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Event Wallet</h1>
          <p className="page-subtitle">Track revenue, expenses, contributions, and profit/loss.</p>
        </div>
        {eventId && (
          <a href={`/api/wallet/export?eventId=${eventId}`} download className="inline-flex">
            <Button variant="outline" size="sm" type="button" className="min-h-[44px] touch-manipulation">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </a>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <EventPicker events={events} value={eventId} onChange={setEventId} loading={eventsLoading} />
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading && eventId && <p className="text-center text-slate-500">Loading wallet...</p>}

      {data?.wallet && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6 text-center"><Wallet className="h-6 w-6 text-brand-600 mx-auto mb-2" /><p className="text-2xl font-bold">{formatCurrency(data.wallet.balance)}</p><p className="text-xs text-slate-500">Balance</p></CardContent></Card>
            <Card><CardContent className="p-6 text-center"><TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-2" /><p className="text-2xl font-bold">{formatCurrency(data.wallet.revenue)}</p><p className="text-xs text-slate-500">Revenue</p></CardContent></Card>
            <Card><CardContent className="p-6 text-center"><TrendingDown className="h-6 w-6 text-red-500 mx-auto mb-2" /><p className="text-2xl font-bold">{formatCurrency(data.wallet.expenses)}</p><p className="text-xs text-slate-500">Expenses</p></CardContent></Card>
            <Card><CardContent className="p-6 text-center"><DollarSign className={`h-6 w-6 mx-auto mb-2 ${(pl?.netProfit ?? 0) >= 0 ? "text-green-600" : "text-red-500"}`} /><p className="text-2xl font-bold">{formatCurrency(pl?.netProfit ?? 0)}</p><p className="text-xs text-slate-500">Net Profit/Loss</p></CardContent></Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Record Expense</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={addExpense} className="space-y-3">
                  <div className="space-y-1"><Label>Category</Label><Input value={expense.category} onChange={(e) => setExpense({ ...expense, category: e.target.value })} required disabled={!eventId} placeholder="Venue, Catering, Decor..." /></div>
                  <div className="space-y-1"><Label>Amount (GHS)</Label><Input type="number" value={expense.amount} onChange={(e) => setExpense({ ...expense, amount: e.target.value })} required disabled={!eventId} /></div>
                  <div className="space-y-1"><Label>Description</Label><Input value={expense.description} onChange={(e) => setExpense({ ...expense, description: e.target.value })} disabled={!eventId} /></div>
                  <Button type="submit" className="w-full" disabled={!eventId}>Add Expense</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Recent Transactions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {data.wallet.transactions.length === 0 ? (
                  <p className="text-center text-slate-500 py-4">No transactions yet.</p>
                ) : (
                  <>
                    {txSlice.items.map((t, i) => (
                  <div key={i} className="flex justify-between text-sm py-2 border-b gap-2">
                    <div className="min-w-0">
                      <span className="break-words">{t.description ?? t.type}</span>
                      <p className="text-xs text-slate-400">{t.source}{t.creator?.name ? ` · ${t.creator.name}` : ""}{t.isLocked ? " · locked" : ""}</p>
                    </div>
                    <span className={`shrink-0 ${Number(t.amount) < 0 ? "text-red-600" : "text-green-600"}`}>{formatCurrency(t.amount)}</span>
                  </div>
                    ))}
                    <PaginationBar
                      page={txSlice.page}
                      pages={txSlice.pages}
                      total={txSlice.total}
                      limit={TX_PER_PAGE}
                      onPageChange={setTxPage}
                      showSummary={txSlice.pages > 1}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4 text-sm flex flex-wrap gap-4">
              <span>Contributions: <strong>{formatCurrency(data.contributions.total)}</strong> from {data.contributions.count} donors</span>
              {pl && <span>Budget position: <strong className={pl.netProfit >= 0 ? "text-green-600" : "text-red-600"}>{formatCurrency(pl.netProfit)}</strong></span>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
