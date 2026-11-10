"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { ImagePlus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BANK_ACCOUNT_TYPES,
  DIGITAL_CARD_PAY_FAMILIES,
  DIGITAL_CARD_REACH_MAX,
  DIGITAL_CARD_SOCIAL_NETWORKS,
  isPayWalletOpenOnDesk,
  parseBankAccount,
  serializeBankAccount,
  type BankAccount,
  type DigitalCardSocialForm,
} from "@/lib/digital-business-card/socials";
import { DigitalCardBrandMark } from "@/components/digital-business-card/digital-card-brand-mark";
import {
  DigitalCardReachNotice,
  reachReviewInputStyle,
  useVisibleReachReview,
} from "@/components/digital-business-card/digital-card-reach-notice";

const PAY_NETWORKS = DIGITAL_CARD_SOCIAL_NETWORKS.filter((network) => network.group === "pay");

export function DigitalCardPayGroup({
  socials,
  payQr,
  onAdd,
  accent,
  intro,
  className,
  gridClassName,
  children,
}: {
  socials: DigitalCardSocialForm;
  payQr: Record<string, string>;
  onAdd: (key: string) => void;
  accent?: string;
  intro?: ReactNode;
  className?: string;
  gridClassName?: string;
  children: (network: (typeof PAY_NETWORKS)[number]) => ReactNode;
}) {
  return (
    <div className={className}>
      {intro}
      <div className="space-y-5">
        {DIGITAL_CARD_PAY_FAMILIES.map((family) => {
          const networks = family.keys
            .map((key) => PAY_NETWORKS.find((network) => network.key === key))
            .filter((network): network is (typeof PAY_NETWORKS)[number] => Boolean(network));
          const open = networks.filter((network) => isPayWalletOpenOnDesk(socials[network.key], payQr, network.key));
          const hidden = networks.filter((network) => !open.some((row) => row.key === network.key));
          return (
            <div key={family.id}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{family.label}</p>
              {open.length ? (
                <div className={cn("grid gap-3", open.length > 1 ? "sm:grid-cols-2" : null, gridClassName)}>
                  {open.map((network) => (
                    <div key={network.key}>{children(network)}</div>
                  ))}
                </div>
              ) : null}
              <DigitalCardPayWalletPicker
                keys={hidden.map((network) => network.key)}
                onAdd={onAdd}
                accent={accent}
                className={open.length ? "mt-3" : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DigitalCardPayWalletPicker({
  keys,
  onAdd,
  accent,
  className,
}: {
  keys: string[];
  onAdd: (key: string) => void;
  accent?: string;
  className?: string;
}) {
  const networks = keys
    .map((key) => PAY_NETWORKS.find((network) => network.key === key))
    .filter((network): network is (typeof PAY_NETWORKS)[number] => Boolean(network));
  if (!networks.length) return null;
  return (
    <div className={className}>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {networks.map((network) => (
          <button
            key={network.key}
            type="button"
            onClick={() => onAdd(network.key)}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-black/10 bg-white/80 px-2 py-3 text-center shadow-[0_4px_12px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_8px_18px_rgba(15,23,42,0.1)]"
          >
            <DigitalCardBrandMark id={network.key} className="h-11 w-11 rounded-[13px]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] leading-tight" style={{ color: accent }}>
              {network.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BankAccountFields({
  value,
  inputClassName,
  inputStyle,
  onChange,
}: {
  value: string;
  inputClassName?: string;
  inputStyle?: CSSProperties;
  onChange: (value: string) => void;
}) {
  const account = parseBankAccount(value);
  const review = useVisibleReachReview("bank", value);
  const fieldClass = cn("min-w-0 w-full", inputClassName);
  const invalidStyle = reachReviewInputStyle(review.invalid);

  function patch(next: Partial<BankAccount>) {
    onChange(serializeBankAccount({ ...account, ...next }));
  }

  return (
    <div className="min-w-0 flex-1 space-y-2">
      <label className="block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Bank name
        </span>
        <input
          type="text"
          value={account.bankName}
          onChange={(e) => patch({ bankName: e.target.value })}
          placeholder="GCB, Ecobank, Chase"
          autoComplete="off"
          aria-invalid={review.invalid && !account.bankName}
          className={fieldClass}
          style={{ ...inputStyle, ...(review.invalid && !account.bankName ? invalidStyle : null) }}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Account name
        </span>
        <input
          type="text"
          value={account.accountName}
          onChange={(e) => patch({ accountName: e.target.value })}
          placeholder="Name on the account"
          autoComplete="off"
          aria-invalid={review.invalid && !account.accountName}
          className={fieldClass}
          style={{ ...inputStyle, ...(review.invalid && !account.accountName ? invalidStyle : null) }}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Account number
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={account.accountNumber}
          onChange={(e) => patch({ accountNumber: e.target.value })}
          placeholder="Account number"
          autoComplete="off"
          aria-invalid={review.invalid && account.accountNumber.replace(/\s/g, "").length < 4}
          className={fieldClass}
          style={{
            ...inputStyle,
            ...(review.invalid && account.accountNumber.replace(/\s/g, "").length < 4 ? invalidStyle : null),
          }}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Account type
        </span>
        <select
          value={account.accountType}
          onChange={(e) => patch({ accountType: e.target.value as BankAccount["accountType"] })}
          className={fieldClass}
          style={inputStyle}
        >
          <option value="">Choose type</option>
          {BANK_ACCOUNT_TYPES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Other information
        </span>
        <textarea
          value={account.notes}
          onChange={(e) => patch({ notes: e.target.value })}
          placeholder="Branch, SWIFT, sort code, or notes guests need"
          rows={2}
          className={cn(fieldClass, "resize-none")}
          style={inputStyle}
        />
      </label>
      <DigitalCardReachNotice message={review.message} />
    </div>
  );
}

function PayReachInput({
  brand,
  value,
  hasQr,
  placeholder,
  inputClassName,
  inputStyle,
  onChange,
}: {
  brand: string;
  value: string;
  hasQr: boolean;
  placeholder?: string;
  inputClassName?: string;
  inputStyle?: CSSProperties;
  onChange: (value: string) => void;
}) {
  const review = useVisibleReachReview(brand, value, hasQr);
  return (
    <div className="space-y-1.5 min-w-0 flex-1">
      <input
        type="text"
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

export function DigitalCardPayFields({
  values,
  qrUrls,
  onChange,
  placeholder,
  addLabel,
  inputClassName,
  inputStyle,
  addStyle,
  onUploadFile,
  brand,
  onRemoveWallet,
}: {
  values: string[];
  qrUrls: Array<string | null>;
  onChange: (values: string[], qrUrls: Array<string | null>) => void;
  placeholder?: string;
  addLabel: string;
  inputClassName?: string;
  inputStyle?: CSSProperties;
  addStyle?: CSSProperties;
  onUploadFile?: (file: File) => Promise<string | null>;
  brand: string;
  onRemoveWallet?: () => void;
}) {
  const slots = values.length ? values : [""];
  const qrs = slots.map((_, index) => qrUrls[index] ?? null);
  const fileRefs = useRef<Array<HTMLInputElement | null>>([]);
  const acceptsQr = brand !== "bank";

  function setValue(index: number, value: string) {
    const nextValues = [...slots];
    const nextQrs = [...qrs];
    nextValues[index] = value;
    onChange(nextValues, nextQrs);
  }

  function setQr(index: number, url: string | null) {
    const nextValues = [...slots];
    const nextQrs = [...qrs];
    nextQrs[index] = url;
    onChange(nextValues, nextQrs);
  }

  function removeAt(index: number) {
    const nextValues = slots.filter((_, i) => i !== index);
    const nextQrs = qrs.filter((_, i) => i !== index);
    if (!nextValues.length) {
      onRemoveWallet?.();
      onChange([], []);
      return;
    }
    onChange(nextValues, nextQrs);
  }

  function add() {
    if (slots.length >= DIGITAL_CARD_REACH_MAX) return;
    onChange([...slots, ""], [...qrs, null]);
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
            <DigitalCardBrandMark id={brand} className="mt-1 size-9 shrink-0 rounded-[10px]" />
            {brand === "bank" ? (
              <BankAccountFields
                value={value}
                inputClassName={inputClassName}
                inputStyle={inputStyle}
                onChange={(next) => setValue(index, next)}
              />
            ) : (
              <PayReachInput
                brand={brand}
                value={value}
                hasQr={Boolean(qrs[index])}
                placeholder={placeholder}
                inputClassName={inputClassName}
                inputStyle={inputStyle}
                onChange={(next) => setValue(index, next)}
              />
            )}
            {slots.length > 1 || onRemoveWallet ? (
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
                aria-label={slots.length > 1 ? "Remove" : "Remove wallet"}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          {acceptsQr ? (
          <div className="flex items-center gap-2">
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
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={addStyle}
            >
              <ImagePlus className="h-3.5 w-3.5" />
              {qrs[index] ? "Replace QR" : "Add receive QR"}
            </button>
            {qrs[index] ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrs[index] ?? ""} alt="" className="h-8 w-8 rounded-md border bg-white object-cover" />
                <button
                  type="button"
                  onClick={() => setQr(index, null)}
                  className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                >
                  Remove QR
                </button>
              </>
            ) : (
              <span className="text-[10px] text-slate-500">Optional. For MoMo, Alipay, WeChat Pay, and similar scan wallets.</span>
            )}
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

export function payQrListForBrand(payQr: Record<string, string>, brand: string, values: string[]): Array<string | null> {
  const slots = values.length ? values : [""];
  return slots.map((_, index) => payQr[`${brand}-${index}`] ?? null);
}

export function writePayQrBrand(
  payQr: Record<string, string>,
  brand: string,
  qrUrls: Array<string | null>
): Record<string, string> {
  const next = { ...payQr };
  Object.keys(next).forEach((id) => {
    if (id.startsWith(`${brand}-`)) delete next[id];
  });
  qrUrls.forEach((url, index) => {
    if (url?.trim()) next[`${brand}-${index}`] = url.trim();
  });
  return next;
}
