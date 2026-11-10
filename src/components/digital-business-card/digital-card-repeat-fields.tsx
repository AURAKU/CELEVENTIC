"use client";

import { useRef, type CSSProperties } from "react";
import { ImagePlus, Phone, Plus, Smartphone, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CHAT_LINK_KINDS,
  CONTACT_KIND_TAGS,
  DIGITAL_CARD_REACH_MAX,
  alignedContactTags,
  detectChatLinkKind,
  isQrShareNetwork,
  phoneBrandMarkId,
  type ChatLinkKind,
  type ContactKindTag,
} from "@/lib/digital-business-card/socials";
import { DigitalCardBrandMark } from "@/components/digital-business-card/digital-card-brand-mark";
import {
  DigitalCardReachNotice,
  reachReviewInputStyle,
  useVisibleReachReview,
} from "@/components/digital-business-card/digital-card-reach-notice";

function ReviewedReachInput({
  brand,
  value,
  type,
  placeholder,
  inputClassName,
  inputStyle,
  onChange,
}: {
  brand: string;
  value: string;
  type: string;
  placeholder?: string;
  inputClassName?: string;
  inputStyle?: CSSProperties;
  onChange: (value: string) => void;
}) {
  const review = useVisibleReachReview(brand, value);
  return (
    <div className="space-y-1.5 min-w-0 flex-1">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={review.invalid}
        className={cn("min-w-0 w-full", inputClassName)}
        style={{ ...inputStyle, ...reachReviewInputStyle(review.invalid) }}
      />
      <DigitalCardReachNotice message={review.message} />
    </div>
  );
}

export function DigitalCardRepeatFields({
  values,
  tags,
  onChange,
  onTaggedChange,
  placeholder,
  type = "text",
  addLabel,
  inputClassName,
  inputStyle,
  addStyle,
  showKindTags = false,
  showChatKinds = false,
  chatKinds,
  onChatKindsChange,
  tagAccent,
  tagInk = "#fffef8",
  brand,
  qrUrls,
  onQrUrlsChange,
  onUploadFile,
}: {
  values: string[];
  tags?: Array<ContactKindTag | "">;
  onChange?: (next: string[]) => void;
  onTaggedChange?: (next: { values: string[]; tags: Array<ContactKindTag | ""> }) => void;
  placeholder?: string;
  type?: string;
  addLabel: string;
  inputClassName?: string;
  inputStyle?: CSSProperties;
  addStyle?: CSSProperties;
  showKindTags?: boolean;
  showChatKinds?: boolean;
  chatKinds?: Array<ChatLinkKind | "">;
  onChatKindsChange?: (next: Array<ChatLinkKind | "">) => void;
  tagAccent?: string;
  tagInk?: string;
  brand?: string;
  qrUrls?: Array<string | null>;
  onQrUrlsChange?: (next: Array<string | null>) => void;
  onUploadFile?: (file: File) => Promise<string | null>;
}) {
  const slots = values.length ? values : [""];
  const kindTags = alignedContactTags(slots, tags);
  const linkKinds: Array<ChatLinkKind | ""> = slots.map((_, index) => chatKinds?.[index] ?? "");
  const qrs = slots.map((_, index) => qrUrls?.[index] ?? null);
  const fileRefs = useRef<Array<HTMLInputElement | null>>([]);
  const accent = tagAccent || "#0B8A83";
  const shareQr = Boolean(brand && isQrShareNetwork(brand) && onQrUrlsChange);

  function emit(
    nextValues: string[],
    nextTags: Array<ContactKindTag | "">,
    nextChat: Array<ChatLinkKind | ""> = linkKinds,
    nextQrs: Array<string | null> = qrs
  ) {
    onChange?.(nextValues);
    onTaggedChange?.({ values: nextValues, tags: nextTags });
    onChatKindsChange?.(nextChat);
    onQrUrlsChange?.(nextQrs);
  }

  function setAt(index: number, value: string) {
    const next = [...slots];
    next[index] = value;
    const nextChat = [...linkKinds];
    if (showChatKinds && brand) nextChat[index] = detectChatLinkKind(brand, value);
    emit(next, kindTags, nextChat);
  }

  function setTagAt(index: number, tag: ContactKindTag) {
    const next = [...kindTags];
    next[index] = next[index] === tag ? "" : tag;
    emit(slots, next, linkKinds);
  }

  function setChatKindAt(index: number, kind: ChatLinkKind) {
    const next = [...linkKinds];
    next[index] = kind;
    emit(slots, kindTags, next);
  }

  function removeAt(index: number) {
    const nextValues = slots.filter((_, i) => i !== index);
    const nextTags = kindTags.filter((_, i) => i !== index);
    const nextChat = linkKinds.filter((_, i) => i !== index);
    const nextQrs = qrs.filter((_, i) => i !== index);
    emit(
      nextValues.length ? nextValues : [""],
      nextTags.length ? nextTags : [""],
      nextChat.length ? nextChat : [""],
      nextQrs.length ? nextQrs : [null]
    );
  }

  function add() {
    if (slots.length >= DIGITAL_CARD_REACH_MAX) return;
    emit([...slots, ""], [...kindTags, ""], [...linkKinds, ""], [...qrs, null]);
  }

  function setQr(index: number, url: string | null) {
    const nextQrs = [...qrs];
    nextQrs[index] = url;
    emit(slots, kindTags, linkKinds, nextQrs);
  }

  async function onFile(index: number, file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    if (onUploadFile) {
      const url = await onUploadFile(file);
      if (url) setQr(index, url);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setQr(index, reader.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-2">
      {slots.map((value, index) => (
        <div key={index} className="space-y-1.5">
          <div className="flex items-start gap-2">
            {brand === "phone" ? (
              <DigitalCardBrandMark
                id={phoneBrandMarkId(kindTags[index])}
                className="mt-0.5 h-9 w-9 rounded-[10px]"
                color={accent}
              />
            ) : null}
            {brand ? (
              <ReviewedReachInput
                brand={brand}
                value={value}
                type={type}
                placeholder={placeholder}
                inputClassName={inputClassName}
                inputStyle={inputStyle}
                onChange={(next) => setAt(index, next)}
              />
            ) : (
              <input
                type={type}
                value={value}
                onChange={(e) => setAt(index, e.target.value)}
                placeholder={placeholder}
                className={cn("min-w-0 flex-1", inputClassName)}
                style={inputStyle}
              />
            )}
            {slots.length > 1 ? (
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
                aria-label="Remove"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          {shareQr ? (
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <input
                  ref={(node) => {
                    fileRefs.current[index] = node;
                  }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    void onFile(index, e.target.files?.[0]);
                    e.currentTarget.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRefs.current[index]?.click()}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em]"
                  style={addStyle}
                >
                  <ImagePlus className="h-3.5 w-3.5 shrink-0" />
                  {qrs[index] ? "Replace QR" : "Add share QR"}
                </button>
                {qrs[index] ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrs[index] ?? ""} alt="" className="h-8 w-8 rounded-md border bg-white object-cover" />
                    <button
                      type="button"
                      onClick={() => setQr(index, null)}
                      className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                    >
                      Remove QR
                    </button>
                  </>
                ) : null}
              </div>
              {qrs[index] ? null : (
                <p className="text-[10px] leading-snug text-slate-500">
                  Optional. Guests open the app if it is on their phone, or scan this QR.
                </p>
              )}
            </div>
          ) : null}
          {showChatKinds ? (
            <div className="flex flex-wrap gap-1.5 pl-0.5">
              {CHAT_LINK_KINDS.map((option) => {
                const selected = linkKinds[index] === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setChatKindAt(index, option.id)}
                    className="rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition"
                    style={
                      selected
                        ? {
                            background: accent,
                            borderColor: accent,
                            color: tagInk,
                          }
                        : {
                            background: "transparent",
                            borderColor: accent,
                            color: accent,
                            opacity: 0.78,
                          }
                    }
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          ) : null}
          {showKindTags ? (
            <div className={cn("flex flex-wrap gap-1.5", brand === "phone" ? "pl-11" : "pl-0.5")}>
              {CONTACT_KIND_TAGS.map((option) => {
                const selected = kindTags[index] === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setTagAt(index, option.id)}
                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition"
                    style={
                      selected
                        ? {
                            background: accent,
                            borderColor: accent,
                            color: tagInk,
                          }
                        : {
                            background: "transparent",
                            borderColor: accent,
                            color: accent,
                            opacity: 0.78,
                          }
                    }
                  >
                    {brand === "phone" && option.id === "personal" ? <Smartphone className="h-3 w-3" aria-hidden /> : null}
                    {brand === "phone" && option.id === "business" ? <Phone className="h-3 w-3" aria-hidden /> : null}
                    {option.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ))}
      {slots.length < DIGITAL_CARD_REACH_MAX ? (
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={addStyle}
        >
          <Plus className="h-3.5 w-3.5" />
          {addLabel}
        </button>
      ) : null}
    </div>
  );
}
