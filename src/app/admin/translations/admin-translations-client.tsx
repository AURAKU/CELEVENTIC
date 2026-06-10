"use client";

import { useState, useEffect } from "react";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/components/i18n/locale-provider";

interface TranslationRow {
  id: string;
  namespace: string;
  key: string;
  enValue: string;
  frValue: string | null;
  editableByAdmin: boolean;
}

const NAMESPACES = ["common", "header", "footer", "invitations", "flow", "forms", "checkout", "invite", "rsvp", "email", "legal", "errors", "success", "empty", "admin"];

export function AdminTranslationsClient() {
  const { t } = useLocale();
  const [rows, setRows] = useState<TranslationRow[]>([]);
  const [namespace, setNamespace] = useState("invitations");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    load();
  }, [namespace]);

  async function load() {
    const res = await fetch(`/api/admin/i18n/translations?namespace=${namespace}`);
    const data = await res.json();
    if (data.success) setRows(data.data);
  }

  async function save(row: TranslationRow) {
    await fetch("/api/admin/i18n/translations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, enValue: row.enValue, frValue: row.frValue }),
    });
    load();
  }

  const filtered = rows.filter((r) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return r.key.toLowerCase().includes(q) || r.enValue.toLowerCase().includes(q) || (r.frValue ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <AdminToolbar
        title={t("admin.translations_title")}
        subtitle={t("admin.translations_subtitle")}
      />

      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <Label>{t("admin.namespace")}</Label>
          <select
            className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
          >
            {NAMESPACES.map((ns) => (
              <option key={ns} value={ns}>{ns}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <Label>Search</Label>
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter keys..." className="mt-1" />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((row) => (
          <Card key={row.id}>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{row.namespace}</Badge>
                <code className="text-xs text-slate-500">{row.key}</code>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>{t("admin.english")}</Label>
                  <Textarea
                    value={row.enValue}
                    rows={2}
                    onChange={(e) => setRows((prev) => prev.map((x) => x.id === row.id ? { ...x, enValue: e.target.value } : x))}
                  />
                </div>
                <div>
                  <Label>{t("admin.french")}</Label>
                  <Textarea
                    value={row.frValue ?? ""}
                    rows={2}
                    onChange={(e) => setRows((prev) => prev.map((x) => x.id === row.id ? { ...x, frValue: e.target.value } : x))}
                  />
                </div>
              </div>
              <Button size="sm" onClick={() => save(row)} disabled={!row.editableByAdmin}>
                {t("common.save")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
