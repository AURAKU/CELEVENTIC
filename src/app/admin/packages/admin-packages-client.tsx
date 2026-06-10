"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { formatCurrency } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";

interface PackageRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  guestLimit: number;
  invitationLimit: number;
  ticketLimit: number;
  smsCredits: number;
  whatsappCredits: number;
  isActive: boolean;
  sortOrder: number;
}

const emptyForm = {
  name: "", description: "", price: "0", guestLimit: "100",
  invitationLimit: "50", ticketLimit: "500", smsCredits: "0", whatsappCredits: "0",
};

export function AdminPackagesClient({ initial }: { initial: PackageRow[] }) {
  const [packages, setPackages] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PackageRow | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function reload() {
    const res = await fetch("/api/admin/packages");
    const d = await res.json();
    if (d.success) setPackages(d.data);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      guestLimit: parseInt(form.guestLimit),
      invitationLimit: parseInt(form.invitationLimit),
      ticketLimit: parseInt(form.ticketLimit),
      smsCredits: parseInt(form.smsCredits),
      whatsappCredits: parseInt(form.whatsappCredits),
    };

    const res = editing
      ? await fetch("/api/admin/packages", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editing.id, ...payload }) })
      : await fetch("/api/admin/packages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

    if (res.ok) {
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      reload();
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete or deactivate package "${name}"?`)) return;
    await fetch(`/api/admin/packages?id=${id}`, { method: "DELETE" });
    reload();
  }

  function startEdit(pkg: PackageRow) {
    setEditing(pkg);
    setShowForm(true);
    setForm({
      name: pkg.name,
      description: pkg.description ?? "",
      price: String(pkg.price),
      guestLimit: String(pkg.guestLimit),
      invitationLimit: String(pkg.invitationLimit),
      ticketLimit: String(pkg.ticketLimit),
      smsCredits: String(pkg.smsCredits),
      whatsappCredits: String(pkg.whatsappCredits),
    });
  }

  async function toggleActive(pkg: PackageRow) {
    await fetch("/api/admin/packages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pkg.id, isActive: !pkg.isActive }),
    });
    reload();
  }

  return (
    <div className="space-y-6">
      <AdminToolbar
        title="Event Packages"
        subtitle="Manage pricing tiers, guest limits, and messaging credits."
        count={packages.length}
        onRefresh={reload}
        onAdd={() => { setShowForm(true); setEditing(null); setForm(emptyForm); }}
        addLabel="Add Package"
      />

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">{editing ? "Edit Package" : "New Package"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={save} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div><Label>Price (GHS)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
              <div><Label>Guest Limit</Label><Input type="number" value={form.guestLimit} onChange={(e) => setForm({ ...form, guestLimit: e.target.value })} /></div>
              <div><Label>Invitation Limit</Label><Input type="number" value={form.invitationLimit} onChange={(e) => setForm({ ...form, invitationLimit: e.target.value })} /></div>
              <div><Label>Ticket Limit</Label><Input type="number" value={form.ticketLimit} onChange={(e) => setForm({ ...form, ticketLimit: e.target.value })} /></div>
              <div><Label>SMS Credits</Label><Input type="number" value={form.smsCredits} onChange={(e) => setForm({ ...form, smsCredits: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
              <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
                <Button type="submit">{editing ? "Save Changes" : "Create Package"}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {packages.map((pkg) => (
          <Card key={pkg.id} className={!pkg.isActive ? "opacity-60" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{pkg.name}</CardTitle>
                <Badge variant={pkg.isActive ? "success" : "destructive"}>{pkg.isActive ? "Active" : "Inactive"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p className="text-2xl font-bold">{Number(pkg.price) === 0 ? "Free" : formatCurrency(pkg.price)}</p>
              <p className="text-slate-500">{pkg.guestLimit} guests · {pkg.invitationLimit} invites</p>
              <p className="text-slate-500">{pkg.smsCredits} SMS · {pkg.whatsappCredits} WhatsApp</p>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => startEdit(pkg)}><Pencil className="h-3 w-3" /></Button>
                <Button size="sm" variant="outline" onClick={() => toggleActive(pkg)}>{pkg.isActive ? "Deactivate" : "Activate"}</Button>
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(pkg.id, pkg.name)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
