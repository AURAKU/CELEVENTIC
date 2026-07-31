"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Palette, Type, Grid3X3 } from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";

interface Asset {
  id: string;
  name: string;
  type: string;
  category: string | null;
  url: string;
  isPremium: boolean;
}

interface Palette {
  id: string;
  name: string;
  slug: string;
  colors: string[];
  category: string | null;
}

interface Font {
  id: string;
  name: string;
  family: string;
  category: string | null;
}

const PAGE_SIZE = 24;

export default function AssetLibraryPage() {
  const { page, setPage, resetPage, appendToParams } = usePagination(PAGE_SIZE);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [palettes, setPalettes] = useState<Palette[]>([]);
  const [fonts, setFonts] = useState<Font[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [assetType, setAssetType] = useState("all");
  const [tab, setTab] = useState<"assets" | "palettes" | "fonts">("assets");

  const applyPayload = useCallback((data: unknown, setter: (rows: never[]) => void) => {
    if (Array.isArray(data)) {
      setter(data as never[]);
      setTotal(data.length);
      setPages(1);
      return;
    }
    const payload = data as { items?: never[]; total?: number; pages?: number };
    setter((payload.items ?? []) as never[]);
    setTotal(payload.total ?? 0);
    setPages(payload.pages ?? 1);
  }, []);

  useEffect(() => {
    const params = appendToParams(new URLSearchParams());
    if (tab === "assets") {
      if (assetType !== "all") params.set("type", assetType);
      fetch(`/api/design-templates/assets?${params}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) applyPayload(d.data, setAssets as (rows: never[]) => void);
        });
    } else if (tab === "palettes") {
      params.set("resource", "palettes");
      fetch(`/api/design-templates/assets?${params}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) applyPayload(d.data, setPalettes as (rows: never[]) => void);
        });
    } else {
      params.set("resource", "fonts");
      fetch(`/api/design-templates/assets?${params}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) applyPayload(d.data, setFonts as (rows: never[]) => void);
        });
    }
  }, [tab, assetType, appendToParams, applyPayload]);

  function changeTab(next: "assets" | "palettes" | "fonts") {
    setTab(next);
    resetPage();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/design-studio">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="page-heading">Asset Library</h1>
          <p className="page-subtitle">Backgrounds, patterns, frames, fonts, and color palettes</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "assets" as const, label: "Assets", icon: Grid3X3 },
            { id: "palettes" as const, label: "Palettes", icon: Palette },
            { id: "fonts" as const, label: "Fonts", icon: Type },
          ] as const
        ).map((t) => (
          <Button key={t.id} variant={tab === t.id ? "default" : "outline"} size="sm" onClick={() => changeTab(t.id)}>
            <t.icon className="h-4 w-4" /> {t.label}
          </Button>
        ))}
      </div>

      {tab === "assets" && (
        <>
          <Select
            value={assetType}
            onValueChange={(value) => {
              setAssetType(value);
              resetPage();
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {[
                "BACKGROUND",
                "PATTERN",
                "FRAME",
                "KENTE",
                "ADINKRA",
                "FLORAL",
                "QR_FRAME",
                "TICKET_SHAPE",
                "ICON",
                "DIVIDER",
              ].map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {assets.map((a) => (
              <Card key={a.id} className="card-glow">
                <CardContent className="p-4 space-y-2">
                  <div className="h-20 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-400 border border-dashed">
                    {a.type}
                  </div>
                  <p className="font-medium text-sm">{a.name}</p>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-xs">
                      {a.type}
                    </Badge>
                    {a.isPremium && (
                      <Badge variant="secondary" className="text-xs">
                        Premium
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === "palettes" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {palettes.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 space-y-3">
                <p className="font-semibold">{p.name}</p>
                <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
                  {(p.colors as string[]).map((c, i) => (
                    <div key={i} className="flex-1" style={{ background: c }} title={c} />
                  ))}
                </div>
                {p.category && (
                  <Badge variant="outline" className="text-xs">
                    {p.category}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "fonts" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {fonts.map((f) => (
            <Card key={f.id}>
              <CardContent className="p-4">
                <p className="font-semibold" style={{ fontFamily: f.family }}>
                  {f.name}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {f.family} · {f.category}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PaginationBar page={page} pages={pages} total={total} limit={PAGE_SIZE} onPageChange={setPage} />
    </div>
  );
}
