"use client";

import { Plus, X } from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { DIGITAL_CARD_REACH_MAX } from "@/lib/digital-business-card/socials";
import { parseOtherLink, serializeOtherLink } from "@/lib/digital-business-card/other-links";
import {
  DigitalCardReachNotice,
  reachReviewInputStyle,
  useVisibleReachReview,
} from "@/components/digital-business-card/digital-card-reach-notice";

export function DigitalCardOtherReservation({
  values,
  onChange,
  accent,
  inputClassName,
  inputStyle,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  accent?: string;
  inputClassName?: string;
  inputStyle?: CSSProperties;
}) {
  return (
    <div
      id="celecard-other-links"
      className="rounded-2xl border border-black/10 bg-white/80 p-4"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: accent || "#0B8A83" }}>
        Other links
      </p>
      <p className="mt-1 text-xs leading-relaxed text-stone-500">
        App or category not listed? Add any page, shop, booking link, or profile. Guests see the name you give it and can open it.
      </p>
      <div className="mt-3">
        <DigitalCardOtherFields
          values={values.length ? values : [""]}
          onChange={onChange}
          inputClassName={inputClassName}
          inputStyle={inputStyle}
          addStyle={{ color: accent || "#0B8A83" }}
        />
      </div>
    </div>
  );
}

export function DigitalCardOtherFields({
  values,
  onChange,
  inputClassName,
  inputStyle,
  addStyle,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  inputClassName?: string;
  inputStyle?: CSSProperties;
  addStyle?: CSSProperties;
}) {
  const slots = values.length ? values : [""];

  function setAt(index: number, patch: { label?: string; href?: string }) {
    const next = [...slots];
    const current = parseOtherLink(next[index] ?? "");
    next[index] = serializeOtherLink({
      label: patch.label ?? current.label,
      href: patch.href ?? current.href,
    });
    onChange(next);
  }

  function removeAt(index: number) {
    const next = slots.filter((_, i) => i !== index);
    onChange(next.length ? next : [""]);
  }

  function add() {
    if (slots.length >= DIGITAL_CARD_REACH_MAX) return;
    onChange([...slots, ""]);
  }

  return (
    <div className="space-y-3">
      {slots.map((value, index) => {
        const link = parseOtherLink(value);
        return (
          <OtherLinkRow
            key={index}
            label={link.label}
            href={link.href}
            packed={value}
            canRemove={slots.length > 1}
            inputClassName={inputClassName}
            inputStyle={inputStyle}
            onLabel={(label) => setAt(index, { label })}
            onHref={(href) => setAt(index, { href })}
            onRemove={() => removeAt(index)}
          />
        );
      })}
      {slots.length < DIGITAL_CARD_REACH_MAX ? (
        <button
          type="button"
          onClick={add}
          className="inline-flex max-w-full flex-nowrap items-center gap-1.5 whitespace-nowrap text-left text-[11px] font-semibold uppercase tracking-[0.08em]"
          style={addStyle}
        >
          <Plus className="h-3.5 w-3.5" />
          Add another page
        </button>
      ) : null}
    </div>
  );
}

function OtherLinkRow({
  label,
  href,
  packed,
  canRemove,
  inputClassName,
  inputStyle,
  onLabel,
  onHref,
  onRemove,
}: {
  label: string;
  href: string;
  packed: string;
  canRemove: boolean;
  inputClassName?: string;
  inputStyle?: CSSProperties;
  onLabel: (value: string) => void;
  onHref: (value: string) => void;
  onRemove: () => void;
}) {
  const review = useVisibleReachReview("other", packed);
  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <input
            type="text"
            value={label}
            onChange={(event) => onLabel(event.target.value)}
            placeholder="Name guests will see, like Calendly"
            className={cn("min-w-0 w-full", inputClassName)}
            style={inputStyle}
          />
          <input
            type="url"
            value={href}
            onChange={(event) => onHref(event.target.value)}
            placeholder="https:// any app or page link"
            aria-invalid={review.invalid}
            className={cn("min-w-0 w-full", inputClassName)}
            style={{ ...inputStyle, ...reachReviewInputStyle(review.invalid) }}
          />
        </div>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove this page"
            className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <DigitalCardReachNotice message={review.message} />
    </div>
  );
}
