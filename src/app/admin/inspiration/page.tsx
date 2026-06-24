"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Sparkles } from "lucide-react";

export default function AdminInspirationPage() {
  const [pending, setPending] = useState<{ items: { id: string; title: string | null; platform: string; user: { name: string; email: string | null } }[]; page: number; pages: number; total: number }>({ items: [], page: 1, pages: 1, total: 0 });
  const [domains, setDomains] = useState<{ id: string; domain: string; policyType: string; reason: string | null }[]>([]);
  const [domainForm, setDomainForm] = useState({ domain: "", policyType: "BANNED", reason: "" });
  const [page, setPage] = useState(1);

  async function load() {
    const [pRes, dRes] = await Promise.all([
      fetch(`/api/admin/inspiration?page=${page}&limit=20`),
      fetch("/api/admin/inspiration?view=domains"),
    ]);
    const p = await pRes.json();
    const d = await dRes.json();
    if (p.success) setPending(p.data);
    if (d.success) setDomains(d.data);
  }

  useEffect(() => { void load(); }, [page]);

  async function review(sourceId: string, reviewStatus: "APPROVED" | "REJECTED") {
    await fetch("/api/admin/inspiration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId, reviewStatus }),
    });
    void load();
  }

  async function addDomain(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/inspiration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "domain", ...domainForm }),
    });
    setDomainForm({ domain: "", policyType: "BANNED", reason: "" });
    void load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-[#0B8A83]" /> Inspiration Engine Admin
        </h1>
        <p className="page-subtitle">Review submissions, manage domains, and monitor AGI Engine usage.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Pending Reviews</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {pending.items.length === 0 ? (
            <p className="text-slate-500 text-sm py-6 text-center">No pending reviews.</p>
          ) : pending.items.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-3 border rounded-lg">
              <div>
                <p className="font-medium text-sm">{item.title ?? "Inspiration"}</p>
                <p className="text-xs text-slate-500">{item.user.name} · {item.platform}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void review(item.id, "APPROVED")}>Approve</Button>
                <Button size="sm" variant="outline" onClick={() => void review(item.id, "REJECTED")}>Reject</Button>
              </div>
            </div>
          ))}
          <PaginationBar page={pending.page} pages={pending.pages} total={pending.total} limit={20} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> Domain Policies</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={addDomain} className="grid sm:grid-cols-4 gap-3 items-end">
            <div className="space-y-1 sm:col-span-2">
              <Label>Domain</Label>
              <Input value={domainForm.domain} onChange={(e) => setDomainForm({ ...domainForm, domain: e.target.value })} placeholder="example.com" required />
            </div>
            <div className="space-y-1">
              <Label>Policy</Label>
              <Select value={domainForm.policyType} onValueChange={(v) => setDomainForm({ ...domainForm, policyType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANNED">Banned</SelectItem>
                  <SelectItem value="ALLOWED">Allowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">Add</Button>
          </form>
          <div className="flex flex-wrap gap-2">
            {domains.map((d) => (
              <Badge key={d.id} variant={d.policyType === "BANNED" ? "destructive" : "outline"}>
                {d.domain}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
