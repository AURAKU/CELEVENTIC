"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { PaginationBar } from "@/components/ui/pagination";
import { formatDate } from "@/lib/utils";
import { usePagination } from "@/hooks/use-pagination";
import { ADMIN_TABLE_LIMIT } from "@/lib/pagination";
import { Pencil, Trash2, Mail } from "lucide-react";

interface UserRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  createdAt: string;
  _count: { events: number };
}

export function AdminUsersClient({ initial }: { initial: UserRow[] }) {
  const { page, setPage, resetPage, appendToParams } = usePagination(ADMIN_TABLE_LIMIT);
  const [users, setUsers] = useState(initial);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(initial.length);
  const [pages, setPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "ORGANIZER", phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [messaging, setMessaging] = useState<UserRow | null>(null);
  const [messageForm, setMessageForm] = useState({ subject: "", body: "" });
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" });

  const load = useCallback(async () => {
    const params = appendToParams(new URLSearchParams());
    if (search) params.set("search", search);
    const res = await fetch(`/api/admin/users?${params}`);
    const d = await res.json();
    if (d.success) {
      setUsers(d.data.users);
      setTotal(d.data.total);
      setPages(d.data.pages ?? Math.ceil(d.data.total / ADMIN_TABLE_LIMIT));
    }
  }, [search, appendToParams]);

  useEffect(() => {
    resetPage();
  }, [search, resetPage]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    if (res.ok) {
      setShowForm(false);
      setForm({ name: "", email: "", password: "", role: "ORGANIZER", phone: "" });
      load();
    } else setError(d.error);
    setLoading(false);
  }

  async function updateUser(id: string, data: Record<string, string>) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    if (res.ok) {
      setEditing(null);
      load();
    }
  }

  async function deleteUser(id: string, name: string) {
    if (!confirm(`Remove or suspend user "${name}"?`)) return;
    const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
    const d = await res.json();
    if (!res.ok) setError(d.error || "Delete failed");
    load();
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messaging) return;
    setLoading(true);
    const res = await fetch("/api/admin/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: messaging.id,
        subject: messageForm.subject,
        body: messageForm.body,
      }),
    });
    const d = await res.json();
    setLoading(false);
    if (res.ok) {
      setMessaging(null);
      setMessageForm({ subject: "", body: "" });
    } else {
      setError(d.error || "Message failed");
    }
  }

  function openEdit(user: UserRow) {
    setEditing(user);
    setShowForm(false);
    setEditForm({ name: user.name, email: user.email ?? "", phone: user.phone ?? "" });
  }

  async function saveEditDetails() {
    if (!editing) return;
    await updateUser(editing.id, editForm);
  }

  return (
    <div className="space-y-6">
      <AdminToolbar
        title="Users"
        subtitle="Create, edit roles, suspend, or remove platform users."
        count={total}
        search={search}
        onSearchChange={setSearch}
        onRefresh={load}
        onAdd={() => { setShowForm(true); setEditing(null); }}
        addLabel="Add User"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {(showForm || editing) && (
        <Card>
          <CardContent className="p-4">
            {showForm ? (
              <form onSubmit={createUser} className="grid sm:grid-cols-2 gap-3">
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
                <div><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div>
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["ORGANIZER", "ADMIN", "VENDOR", "STAFF", "GUEST"].map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 flex gap-2">
                  <Button type="submit" disabled={loading}>Create User</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            ) : editing && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <Label>Name</Label>
                    <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select value={editing.role} onValueChange={(v) => updateUser(editing.id, { role: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["ORGANIZER", "ADMIN", "SUPER_ADMIN", "VENDOR", "STAFF", "GUEST"].map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={editing.status} onValueChange={(v) => updateUser(editing.id, { status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["ACTIVE", "SUSPENDED", "PENDING_VERIFICATION"].map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveEditDetails}>Save profile</Button>
                  <Button variant="outline" onClick={() => setEditing(null)}>Close</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {messaging && (
        <Card className="border-brand-200">
          <CardContent className="p-4">
            <form onSubmit={sendMessage} className="space-y-3">
              <p className="text-sm font-semibold">Message to {messaging.name}</p>
              <div>
                <Label>Subject</Label>
                <Input
                  value={messageForm.subject}
                  onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
                  placeholder="Account notice, update, or support"
                  required
                />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea
                  value={messageForm.body}
                  onChange={(e) => setMessageForm({ ...messageForm, body: e.target.value })}
                  rows={4}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>Send message</Button>
                <Button type="button" variant="outline" onClick={() => setMessaging(null)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-slate-500">
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Events</th>
                <th className="p-3">Joined</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-slate-50/50">
                  <td className="p-3 font-medium">{user.name}</td>
                  <td className="p-3">{user.email ?? "—"}</td>
                  <td className="p-3"><Badge variant="outline">{user.role}</Badge></td>
                  <td className="p-3">
                    <Badge variant={user.status === "ACTIVE" ? "success" : "destructive"}>{user.status}</Badge>
                  </td>
                  <td className="p-3">{user._count.events}</td>
                  <td className="p-3 text-slate-500">{formatDate(user.createdAt)}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(user)} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setMessaging(user);
                          setMessageForm({ subject: "Message from Celeventic", body: "" });
                        }}
                        title="Send message"
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteUser(user.id, user.name)} title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationBar
            page={page}
            pages={pages}
            total={total}
            limit={ADMIN_TABLE_LIMIT}
            onPageChange={setPage}
            className="p-4 border-t"
          />
        </CardContent>
      </Card>
    </div>
  );
}
