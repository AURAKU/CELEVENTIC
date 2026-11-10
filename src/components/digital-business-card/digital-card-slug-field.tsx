"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  constrainDigitalCardSlugInput,
  digitalCardSlugCandidates,
  slugifyDigitalCardBase,
} from "@/lib/digital-business-card/slug";

type ProposeResult = {
  requested: string;
  slug: string;
  available: boolean;
  adjusted: boolean;
};

export function DigitalCardSlugField({
  value,
  onChange,
  displayName,
  company,
  title,
  excludeId,
  publicUrl,
  copied,
  onCopy,
  followIdentity,
  onUserEdit,
}: {
  value: string;
  onChange: (slug: string) => void;
  displayName: string;
  company: string;
  title: string;
  excludeId?: string | null;
  publicUrl: string;
  copied: boolean;
  onCopy: () => void;
  followIdentity: boolean;
  onUserEdit: () => void;
}) {
  const [note, setNote] = useState<string | null>(null);
  const lastFollowed = useRef("");
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!followIdentity) return;
    if (displayName.trim().length < 2) return;
    const next = digitalCardSlugCandidates({ preferred: "", displayName, company, title })[0] || "";
    if (!next || next === lastFollowed.current) return;
    lastFollowed.current = next;
    onChange(next);
  }, [followIdentity, displayName, company, title, onChange]);

  useEffect(() => {
    const requested = slugifyDigitalCardBase(value);
    if (requested.length < 2) {
      setNote(null);
      return;
    }
    const seq = ++requestSeq.current;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        slug: followIdentity ? slugifyDigitalCardBase(displayName) || requested : requested,
        displayName,
        company,
        title,
      });
      if (excludeId) params.set("excludeId", excludeId);
      void fetch(`/api/digital-business-cards/slug?${params.toString()}`)
        .then(async (res) => {
          if (!res.ok) return null;
          const json = (await res.json()) as { data?: ProposeResult };
          return json.data ?? null;
        })
        .then((data) => {
          if (!data || seq !== requestSeq.current) return;
          if (data.adjusted && data.slug) {
            if (data.slug !== value) onChange(data.slug);
            setNote(`${data.requested} is already in use. Guests will open /card/${data.slug}.`);
            return;
          }
          setNote(null);
        })
        .catch(() => undefined);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [value, displayName, company, title, excludeId, onChange, followIdentity]);

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label htmlFor="slug">Public link slug</Label>
      <div className="flex gap-2">
        <Input
          id="slug"
          value={value}
          onChange={(e) => {
            onUserEdit();
            onChange(constrainDigitalCardSlugInput(e.target.value));
          }}
          placeholder="kojo-mensah"
          autoComplete="off"
          spellCheck={false}
        />
        {publicUrl ? (
          <Button type="button" variant="outline" onClick={onCopy} aria-label="Copy public link">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        ) : null}
      </div>
      {publicUrl ? (
        <p className="text-xs text-slate-500 break-all">{publicUrl}</p>
      ) : (
        <p className="text-xs text-slate-500">Saved as /card/your-slug</p>
      )}
      <p className="text-xs leading-relaxed text-slate-500">
        {note || "Same names stay distinct. This link is yours alone."}
      </p>
    </div>
  );
}
