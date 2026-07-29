"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Tags } from "lucide-react";
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
 * Presets seed on first load; hosts can add custom labels for seating plans.
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

  return (
    <div className="space-y-2">
      <Label className="inline-flex items-center gap-1.5">
        <Tags className="h-3.5 w-3.5" />
        Guest tags
        <span className="font-normal text-slate-500">(organizer only · seating)</span>
      </Label>

      {loading ? (
        <p className="text-xs text-slate-500">Loading tags…</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => {
            const selected = selectedIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                disabled={disabled}
                onClick={() => toggle(tag.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  selected
                    ? "border-brand-500 bg-brand-50 text-brand-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                  disabled && "opacity-60"
                )}
                aria-pressed={selected}
              >
                {tag.label}
              </button>
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
        Private labels to arrange tables — guests never see these on their invitation.
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
