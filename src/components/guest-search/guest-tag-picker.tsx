"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Tags, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface GuestTagOption {
  id: string;
  label: string;
  slug?: string;
  isPreset?: boolean;
}

interface GuestTagPickerProps {
  eventId: string;
  selectedIds: string[];
  onChange: (tagIds: string[]) => void;
  disabled?: boolean;
}

/**
 * Organizer-only multi-select for private guest relationship tags.
 * Presets seed on first load; hosts can add custom labels and delete any tag
 * from the event catalog without guests ever seeing them.
 */
export function GuestTagPicker({
  eventId,
  selectedIds,
  onChange,
  disabled,
}: GuestTagPickerProps) {
  const [tags, setTags] = useState<GuestTagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadTags = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/guest-tags`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not load tags.");
        return;
      }
      setTags((json.data?.tags as GuestTagOption[]) ?? []);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  function toggle(tagId: string) {
    if (disabled) return;
    if (selectedIds.includes(tagId)) {
      onChange(selectedIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedIds, tagId]);
    }
  }

  async function addCustom() {
    const label = customLabel.trim();
    if (label.length < 2 || disabled) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/guest-tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not add that tag.");
        return;
      }
      const created = json.data?.tag as GuestTagOption | undefined;
      if (created) {
        setTags((prev) =>
          prev.some((tag) => tag.id === created.id) ? prev : [...prev, created]
        );
        if (!selectedIds.includes(created.id)) {
          onChange([...selectedIds, created.id]);
        }
        setCustomLabel("");
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setAdding(false);
    }
  }

  async function removeFromCatalog(tag: GuestTagOption) {
    if (disabled || deletingId) return;
    const ok = window.confirm(
      `Remove “${tag.label}” from this event’s tag list? It will also be cleared from any guests who have it.`
    );
    if (!ok) return;

    setDeletingId(tag.id);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/guest-tags/${tag.id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not delete that tag.");
        return;
      }
      setTags((prev) => prev.filter((row) => row.id !== tag.id));
      if (selectedIds.includes(tag.id)) {
        onChange(selectedIds.filter((id) => id !== tag.id));
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-2">
      <Label className="inline-flex items-center gap-1.5">
        <Tags className="h-3.5 w-3.5" />
        Guest tags
        <span className="font-normal text-slate-500">(organizer only · seating)</span>
      </Label>

      {loading ? (
        <p className="text-xs text-slate-500">Loading tags…</p>
      ) : tags.length === 0 ? (
        <p className="text-xs text-slate-500">No tags yet — add one below.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => {
            const selected = selectedIds.includes(tag.id);
            const busy = deletingId === tag.id;
            return (
              <div
                key={tag.id}
                className={cn(
                  "inline-flex max-w-full items-center gap-0.5 rounded-full border pl-2.5 pr-1 py-0.5 text-xs transition-colors",
                  selected
                    ? "border-brand-500 bg-brand-50 text-brand-800"
                    : "border-slate-200 bg-white text-slate-600",
                  disabled && "opacity-60"
                )}
              >
                <button
                  type="button"
                  disabled={disabled || busy}
                  onClick={() => toggle(tag.id)}
                  className="truncate py-0.5 text-left hover:underline disabled:no-underline"
                  aria-pressed={selected}
                  title={selected ? "Remove from this guest" : "Assign to this guest"}
                >
                  {tag.label}
                </button>
                <button
                  type="button"
                  disabled={disabled || busy}
                  onClick={() => void removeFromCatalog(tag)}
                  className={cn(
                    "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                    "text-slate-400 hover:bg-red-50 hover:text-red-600",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-500",
                    busy && "opacity-50"
                  )}
                  aria-label={`Delete tag ${tag.label}`}
                  title="Delete tag from this event"
                >
                  <X className="h-3 w-3" strokeWidth={2.5} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          placeholder="Add custom tag…"
          disabled={disabled || adding}
          maxLength={80}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void addCustom();
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void addCustom()}
          disabled={disabled || adding || customLabel.trim().length < 2}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500">
        Tap a label to assign it to this guest. Use × to delete a tag from the event. Guests never see these on their invitation.
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
