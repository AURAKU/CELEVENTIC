"use client";

import { useState, useEffect } from "react";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Mail, Clock } from "lucide-react";

export function AdminContactClient() {
  const [phone, setPhone] = useState("020 961 2770");
  const [email, setEmail] = useState("Celeventic@gmail.com");
  const [hours, setHours] = useState("Mon–Sat, 9am–6pm GMT");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/contact-settings").then((r) => r.json()).then((d) => {
      if (d.success) {
        setPhone(d.data.phone);
        setEmail(d.data.email);
        setHours(d.data.hours);
      }
    });
  }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/admin/contact-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, email, hours }),
    });
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <AdminToolbar title="Contact Settings" subtitle="Public contact details shown across the platform" />

      <Card className="max-w-lg">
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label className="flex items-center gap-2"><Phone className="h-4 w-4" /> Phone</Label>
            <Input className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label className="flex items-center gap-2"><Mail className="h-4 w-4" /> Email</Label>
            <Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label className="flex items-center gap-2"><Clock className="h-4 w-4" /> Hours</Label>
            <Input className="mt-1" value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Contact Settings"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
