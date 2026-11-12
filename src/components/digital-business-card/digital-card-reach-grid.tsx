"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowUpRight, Check, ChevronDown, Copy, EyeOff, Lock, QrCode, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DigitalCardBrandMark } from "@/components/digital-business-card/digital-card-brand-mark";
import {
  DigitalCardSmartLink,
  openInstalledReachApp,
} from "@/components/digital-business-card/digital-card-smart-link";
import { DigitalCardLocationDrop } from "@/components/digital-business-card/digital-card-location-drop";
import { DigitalCardMeetingDrop } from "@/components/digital-business-card/digital-card-meeting-drop";
import {
  arrangeChatChoices,
  bankAccountDisplayRows,
  formatBankAccountCopy,
  groupReachByBrand,
  isPayNetwork,
  isQrShareNetwork,
  parseBankAccount,
  phoneGroupBrandMarkId,
  reachAccountPreview,
  reachBrandMarkId,
  reachGroupCopy,
  usesChatLinkKinds,
  type DigitalCardReachGroup,
  type DigitalCardReachItem,
} from "@/lib/digital-business-card/socials";
import type { DigitalCardTheme } from "@/lib/digital-business-card/themes";
import { CELECARD_REACH_MUTED, celecardReachPlate } from "@/lib/digital-business-card/type-voice";
import { guestReachEventKind } from "@/lib/celeyou-share/guest-actions";
import { trackCeleYouGuestEvent } from "@/lib/celeyou-share/events";

function trackGuestReach(item: DigitalCardReachItem, slug?: string, preview?: boolean) {
  if (!slug || preview) return;
  const kind = guestReachEventKind(item);
  if (kind) trackCeleYouGuestEvent(slug, kind);
}

function isLocationGroup(group: DigitalCardReachGroup) {
  return group.brand === "location";
}

function isMeetingGroup(group: DigitalCardReachGroup) {
  return group.brand === "meeting";
}

function HiddenReachGlyph({
  item,
  className,
}: {
  item: DigitalCardReachItem;
  className?: string;
}) {
  if (item.visibility === "CODE_PROTECTED") return <EyeOff className={className} aria-hidden />;
  return <Lock className={className} aria-hidden />;
}

function stageIsDark(stageBackground: string) {
  const match = stageBackground.match(/#([0-9a-fA-F]{6})/);
  if (!match) return true;
  const hex = match[1];
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}

function plateStyle(theme: DigitalCardTheme, darkStage: boolean) {
  return celecardReachPlate(theme, darkStage);
}

export function DigitalCardReachGrid({
  items,
  theme,
  compact,
  slug,
  ownerName,
}: {
  items: DigitalCardReachItem[];
  theme: DigitalCardTheme;
  compact?: boolean;
  slug?: string;
  ownerName?: string;
}) {
  const groups = groupReachByBrand(items);
  const dock = groups.filter((group) => group.surface === "dock");
  const stack = groups.filter((group) => group.surface === "stack");
  const trackSlug = compact ? undefined : slug;
  const [openId, setOpenId] = useState<string | null>(null);
  const [qrItem, setQrItem] = useState<DigitalCardReachItem | null>(null);
  const [accessItem, setAccessItem] = useState<DigitalCardReachItem | null>(null);
  const dockMenuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const darkStage = stageIsDark(theme.stageBackground);
  const plate = plateStyle(theme, darkStage);
  const openDock = dock.find((group) => group.id === openId);

  useEffect(() => {
    function onPointer(event: MouseEvent | PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpenId(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenId(null);
        setQrItem(null);
        setAccessItem(null);
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!groups.length) return null;

  function toggle(id: string) {
    setOpenId((current) => (current === id ? null : id));
  }

  return (
    <div ref={rootRef} className={cn("flex flex-col", compact ? "gap-3" : "gap-4")}>
      {dock.length ? (
        <div className={cn("grid", compact ? "gap-2" : "gap-2.5")}>
          <nav
            aria-label="Profiles"
            className={cn(
              "flex items-center gap-2 px-1 sm:gap-2.5",
              compact
                ? "flex-wrap justify-center"
                : "celecard-dock-row flex-nowrap justify-start overflow-x-auto pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible sm:[mask-image:none]"
            )}
          >
            {dock.map((group, index) => (
              <span
                key={group.id}
                className={compact ? undefined : "celecard-dock-item"}
                style={compact ? undefined : ({ "--celecard-i": index } as CSSProperties)}
              >
                <DockTap
                  group={group}
                  theme={theme}
                  compact={compact}
                  open={openId === group.id}
                  menuId={dockMenuId}
                  onToggle={() => toggle(group.id)}
                  onOpenQr={setQrItem}
                  onOpenAccess={setAccessItem}
                  trackSlug={trackSlug}
                />
              </span>
            ))}
          </nav>
          {openDock ? (
            <div
              id={dockMenuId}
              className="overflow-hidden rounded-[1.35rem] border shadow-[0_12px_28px_rgba(0,0,0,0.12)]"
              style={plate}
            >
              <div className="px-3.5 pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: CELECARD_REACH_MUTED }}>
                  {reachGroupCopy(openDock).title}
                </p>
                <p className={cn("mt-0.5 font-medium", compact ? "text-[11px]" : "text-[12px]")} style={{ color: CELECARD_REACH_MUTED }}>
                  {isLocationGroup(openDock)
                    ? "See the place, then open it in maps"
                    : usesChatLinkKinds(openDock.brand)
                      ? `Choose which ${reachGroupCopy(openDock).title} to open`
                      : "Choose which profile to open"}
                </p>
              </div>
              {isLocationGroup(openDock) ? (
                <DigitalCardLocationDrop
                  items={openDock.items}
                  theme={theme}
                  compact={compact}
                  preview={compact}
                />
              ) : isMeetingGroup(openDock) ? (
                <>
                  <div className="px-3.5 pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: CELECARD_REACH_MUTED }}>Meetings</p>
                    <p className={cn("mt-0.5 font-medium", compact ? "text-[11px]" : "text-[12px]")} style={{ color: CELECARD_REACH_MUTED }}>
                      Pick a day and time. They get a message to confirm.
                    </p>
                  </div>
                  <DigitalCardMeetingDrop
                    items={openDock.items}
                    theme={theme}
                    compact={compact}
                    preview={compact}
                    slug={slug}
                    ownerName={ownerName}
                  />
                </>
              ) : (
              <ChoiceList
                group={openDock}
                compact={compact}
                preview={compact}
                onOpenQr={setQrItem}
                onOpenAccess={setAccessItem}
                accent={theme.accent}
                trackSlug={trackSlug}
              />
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {stack.length ? (
        <div className={cn("grid", compact ? "gap-2" : "celecard-stack gap-2.5")}>
          {stack.map((group) => (
            <div key={group.id} className={compact ? undefined : "celecard-stack-item"}>
              <StackTap
                group={group}
                theme={theme}
                plate={plate}
                compact={compact}
                open={openId === group.id}
                onToggle={() => toggle(group.id)}
                onOpenQr={setQrItem}
                onOpenAccess={setAccessItem}
                slug={slug}
                ownerName={ownerName}
                trackSlug={trackSlug}
              />
            </div>
          ))}
        </div>
      ) : null}
      {qrItem ? (
        <PayQrSheet item={qrItem} theme={theme} preview={compact} trackSlug={trackSlug} onClose={() => setQrItem(null)} />
      ) : null}
      {accessItem ? (
        <AccessSheet
          item={accessItem}
          slug={slug}
          theme={theme}
          preview={compact}
          onClose={() => setAccessItem(null)}
        />
      ) : null}
    </div>
  );
}

function ChoiceList({
  group,
  compact,
  preview,
  onOpenQr,
  onOpenAccess,
  accent,
  trackSlug,
}: {
  group: DigitalCardReachGroup;
  compact?: boolean;
  preview?: boolean;
  onOpenQr?: (item: DigitalCardReachItem) => void;
  onOpenAccess?: (item: DigitalCardReachItem) => void;
  accent?: string;
  trackSlug?: string;
}) {
  const sections = usesChatLinkKinds(group.brand) ? arrangeChatChoices(group.items) : [{ id: "all", label: null, items: group.items }];
  return (
    <div role="menu" className={cn("grid", compact ? "gap-1 p-1.5" : "gap-1.5 p-2")}>
      {sections.map((section) => (
        <div key={section.id} className="grid gap-1">
          {section.label ? (
            <p className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "#44403c" }}>
              {section.label}
            </p>
          ) : null}
          {section.items.map((item) => {
        const choice = reachAccountPreview(item);
        return (
          <ReachTarget
            key={item.id}
            item={item}
            preview={preview}
            trackSlug={trackSlug}
            onOpenQr={onOpenQr}
            onOpenAccess={onOpenAccess}
            aria-label={choice.hint ? `${choice.title} ${choice.hint}` : choice.title}
            className={cn(
              "flex items-center gap-2.5 rounded-2xl px-2 py-2 transition hover:bg-black/[0.04]",
              compact ? "min-h-11" : "min-h-12"
            )}
          >
            <span className="relative shrink-0">
              <DigitalCardBrandMark
                id={reachBrandMarkId(item)}
                className={compact ? "h-9 w-9 rounded-[11px]" : "h-10 w-10 rounded-[12px]"}
                color={item.brand === "phone" ? accent : undefined}
              />
              {item.brand === "phone" ? null : (
                <span
                  className="absolute -bottom-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-white text-[8px] font-bold tracking-wide text-stone-800 shadow ring-1 ring-black/10"
                  aria-hidden
                >
                  {choice.monogram}
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className={cn("block truncate font-semibold tracking-tight", compact ? "text-[12px]" : "text-[14px]")}>
                {choice.title}
              </span>
              {choice.hint ? (
                <span
                  className={cn(
                    "mt-0.5 block truncate font-medium",
                    item.kindTag || item.linkKind
                      ? "text-[9px] uppercase tracking-[0.14em]"
                      : compact
                        ? "text-[10px]"
                        : "text-[11px]"
                  )}
                  style={{ color: "#44403c" }}
                >
                  {choice.hint}
                </span>
              ) : null}
            </span>
            {item.locked ? (
              <HiddenReachGlyph item={item} className={compact ? "h-3.5 w-3.5 opacity-45" : "h-4 w-4 opacity-45"} />
            ) : item.qrUrl ? (
              <QrCode className={compact ? "h-3.5 w-3.5 opacity-45" : "h-4 w-4 opacity-45"} aria-hidden />
            ) : item.brand === "bank" ? (
              <Copy className={compact ? "h-3.5 w-3.5 opacity-45" : "h-4 w-4 opacity-45"} aria-hidden />
            ) : (
              <ArrowUpRight className={compact ? "h-3.5 w-3.5 opacity-45" : "h-4 w-4 opacity-45"} aria-hidden />
            )}
          </ReachTarget>
        );
          })}
        </div>
      ))}
    </div>
  );
}

function DockTap({
  group,
  theme,
  compact,
  open,
  menuId,
  onToggle,
  onOpenQr,
  onOpenAccess,
  trackSlug,
}: {
  group: DigitalCardReachGroup;
  theme: DigitalCardTheme;
  compact?: boolean;
  open: boolean;
  menuId: string;
  onToggle: () => void;
  onOpenQr?: (item: DigitalCardReachItem) => void;
  onOpenAccess?: (item: DigitalCardReachItem) => void;
  trackSlug?: string;
}) {
  const one = group.items.length === 1;
  const placeLocked = isLocationGroup(group) && group.items.every((item) => item.locked);
  const expands = !one || (isLocationGroup(group) && !placeLocked);
  const mark = (
    <span className="relative inline-flex">
      <DigitalCardBrandMark
        id={group.brand === "phone" ? phoneGroupBrandMarkId(group.items) : group.brand}
        className={compact ? "h-10 w-10 rounded-[12px]" : "h-11 w-11 rounded-[13px] sm:h-12 sm:w-12 sm:rounded-[14px]"}
        color={group.brand === "phone" ? theme.accent : undefined}
      />
      {one && group.items[0]?.locked ? (
        <span
          className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-white text-stone-700 shadow ring-1 ring-black/10"
          aria-hidden
        >
          <HiddenReachGlyph item={group.items[0]} className="h-2.5 w-2.5" />
        </span>
      ) : null}
      {one ? null : (
        <span
          className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold leading-none text-white shadow"
          style={{ background: theme.accent }}
          aria-hidden
        >
          {group.items.length}
        </span>
      )}
      {expands ? (
        <span
          className="pointer-events-none absolute inset-x-0 -bottom-1 mx-auto grid h-3 w-3 place-items-center rounded-full bg-white text-stone-700 shadow ring-1 ring-black/10"
          aria-hidden
        >
          <ChevronDown className="h-2.5 w-2.5" />
        </span>
      ) : null}
    </span>
  );

  if (!expands) {
    const item = group.items[0];
    return (
      <ReachTarget
        item={item}
        preview={compact}
        trackSlug={trackSlug}
        onOpenQr={onOpenQr}
        onOpenAccess={onOpenAccess}
        aria-label={`${item.title}${item.subtitle ? ` ${item.subtitle}` : ""}`}
        className="transition duration-200 hover:-translate-y-1 hover:scale-105"
      >
        {mark}
      </ReachTarget>
    );
  }

  const copy = reachGroupCopy(group);
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-haspopup="menu"
      aria-controls={menuId}
      aria-label={`${copy.title}. ${copy.subtitle ?? "Choose a profile"}`}
      onClick={onToggle}
      className={cn(
        "transition duration-200 hover:-translate-y-1 hover:scale-105",
        open ? "scale-105" : ""
      )}
    >
      {mark}
    </button>
  );
}

function StackTap({
  group,
  theme,
  plate,
  compact,
  open,
  onToggle,
  onOpenQr,
  onOpenAccess,
  slug,
  ownerName,
  trackSlug,
}: {
  group: DigitalCardReachGroup;
  theme: DigitalCardTheme;
  plate: ReturnType<typeof plateStyle>;
  compact?: boolean;
  open: boolean;
  onToggle: () => void;
  onOpenQr?: (item: DigitalCardReachItem) => void;
  onOpenAccess?: (item: DigitalCardReachItem) => void;
  slug?: string;
  ownerName?: string;
  trackSlug?: string;
}) {
  const menuId = useId();
  const copy = reachGroupCopy(group);
  const placeLocked = isLocationGroup(group) && group.items.every((item) => item.locked);
  const single =
    group.items.length === 1 &&
    (!isLocationGroup(group) || placeLocked) &&
    !isMeetingGroup(group);
  const rowClass = cn(
    "celecard-reach-row group relative flex items-center overflow-hidden border shadow-[0_16px_36px_rgba(0,0,0,0.16)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(0,0,0,0.22)]",
    compact ? "min-h-12 gap-2.5 rounded-2xl px-2.5 py-2" : "min-h-[4.35rem] gap-3.5 rounded-[1.7rem] px-3.5 py-3"
  );

  const inner = (
    <>
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: theme.accent }} aria-hidden />
      <DigitalCardBrandMark
        id={group.brand === "phone" ? phoneGroupBrandMarkId(group.items) : group.brand}
        className={compact ? "ml-1 h-9 w-9 rounded-[10px]" : "ml-1.5 h-11 w-11 rounded-[13px]"}
        color={group.brand === "phone" ? theme.accent : undefined}
      />
      <span className="min-w-0 flex-1 text-left">
        <span className={cn("block truncate font-semibold tracking-tight", compact ? "text-[12px]" : "text-[15px]")}>
          {copy.title}
        </span>
        {copy.subtitle ? (
          <span
            className={cn("mt-0.5 block truncate font-medium", compact ? "text-[10px]" : "text-[12px]")}
            style={{ color: CELECARD_REACH_MUTED }}
          >
            {copy.subtitle}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-full transition",
          compact ? "h-8 w-8" : "h-9 w-9",
          single ? "group-hover:translate-x-0.5" : open ? "rotate-180" : ""
        )}
        style={{ background: theme.accentSoft, color: theme.accent }}
        aria-hidden
      >
        {single ? (
          group.items[0]?.locked ? (
            <HiddenReachGlyph item={group.items[0]} className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          ) : group.items[0]?.qrUrl ? (
            <QrCode className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          ) : group.items[0]?.brand === "bank" ? (
            <Copy className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          ) : (
            <ArrowUpRight className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          )
        ) : (
          <ChevronDown className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        )}
      </span>
    </>
  );

  if (single) {
    return (
      <ReachTarget
        item={group.items[0]}
        preview={compact}
        trackSlug={trackSlug}
        className={rowClass}
        style={plate}
        onOpenQr={onOpenQr}
        onOpenAccess={onOpenAccess}
      >
        {inner}
      </ReachTarget>
    );
  }

  return (
    <div className="grid gap-1.5">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={onToggle}
        className={rowClass}
        style={plate}
      >
        {inner}
      </button>
      {open ? (
        <div
          id={menuId}
          className="overflow-hidden rounded-[1.35rem] border shadow-[0_12px_28px_rgba(0,0,0,0.12)]"
          style={plate}
        >
              {isLocationGroup(group) ? (
                <>
                  <div className="px-3.5 pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: CELECARD_REACH_MUTED }}>
                      Location
                    </p>
                    <p className={cn("mt-0.5 font-medium", compact ? "text-[11px]" : "text-[12px]")} style={{ color: CELECARD_REACH_MUTED }}>
                      See the place, then open it in maps
                    </p>
                  </div>
                  <DigitalCardLocationDrop
                    items={group.items}
                    theme={theme}
                    compact={compact}
                    preview={compact}
                  />
                </>
              ) : isMeetingGroup(group) ? (
                <>
                  <div className="px-3.5 pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: CELECARD_REACH_MUTED }}>
                      Meetings
                    </p>
                    <p className={cn("mt-0.5 font-medium", compact ? "text-[11px]" : "text-[12px]")} style={{ color: CELECARD_REACH_MUTED }}>
                      Pick a day and time. They get a message to confirm.
                    </p>
                  </div>
                  <DigitalCardMeetingDrop
                    items={group.items}
                    theme={theme}
                    compact={compact}
                    preview={compact}
                    slug={slug}
                    ownerName={ownerName}
                  />
                </>
              ) : (
              <ChoiceList
                group={group}
                compact={compact}
                preview={compact}
                onOpenQr={onOpenQr}
                onOpenAccess={onOpenAccess}
                accent={theme.accent}
                trackSlug={trackSlug}
              />
              )}
        </div>
      ) : null}
    </div>
  );
}

function ReachTarget({
  item,
  preview,
  className,
  style,
  children,
  onOpenQr,
  onOpenAccess,
  trackSlug,
  "aria-label": ariaLabel,
}: {
  item: DigitalCardReachItem;
  preview?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  onOpenQr?: (item: DigitalCardReachItem) => void;
  onOpenAccess?: (item: DigitalCardReachItem) => void;
  trackSlug?: string;
  "aria-label"?: string;
}) {
  if (item.locked && onOpenAccess) {
    return (
      <button type="button" className={className} style={style} aria-label={ariaLabel} onClick={() => onOpenAccess(item)}>
        {children}
      </button>
    );
  }
  const scanSheet =
    item.brand === "bank" ||
    (item.qrUrl && isPayNetwork(item.brand)) ||
    (item.qrUrl && isQrShareNetwork(item.brand));
  if (scanSheet && onOpenQr) {
    return (
      <button
        type="button"
        className={className}
        style={style}
        aria-label={ariaLabel}
        onClick={() => {
          trackGuestReach(item, trackSlug, preview);
          openInstalledReachApp(item, preview);
          onOpenQr(item);
        }}
      >
        {children}
      </button>
    );
  }
  return (
    <DigitalCardSmartLink
      item={item}
      preview={preview}
      className={className}
      style={style}
      aria-label={ariaLabel}
      onActivate={() => trackGuestReach(item, trackSlug, preview)}
    >
      {children}
    </DigitalCardSmartLink>
  );
}

function PayQrSheet({
  item,
  theme,
  preview,
  trackSlug,
  onClose,
}: {
  item: DigitalCardReachItem;
  theme: DigitalCardTheme;
  preview?: boolean;
  trackSlug?: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const bank = item.brand === "bank" ? parseBankAccount(item.copyValue) : null;
  const bankRows = bank ? bankAccountDisplayRows(bank) : [];
  const qrShare = isQrShareNetwork(item.brand);
  async function copyDetails() {
    const value = bank
      ? formatBankAccountCopy(bank)
      : item.copyValue || item.subtitle || item.title;
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/55 p-4" role="dialog" aria-modal>
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div
        className="celecard-sheet relative z-10 w-full max-w-sm overflow-hidden rounded-[1.6rem] border p-4 shadow-2xl"
        style={{ background: "rgba(255,251,245,0.98)", borderColor: theme.border, color: "#1c1917" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <DigitalCardBrandMark id={item.brand} className="h-10 w-10 rounded-[12px]" />
            <div>
              <p className="text-[15px] font-semibold tracking-tight">{item.title}</p>
              <p className="text-[12px] opacity-55">
                {bank
                  ? item.subtitle || "Bank account"
                  : qrShare
                    ? "The app opens if it is on this phone. Otherwise scan the QR."
                    : item.subtitle || item.copyValue || "Scan to pay"}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-black/5" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {bankRows.length ? (
          <dl className="mt-4 grid gap-2.5 rounded-2xl bg-white px-3.5 py-3">
            {bankRows.map((row) => (
              <div key={row.label}>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-45">{row.label}</dt>
                <dd className="mt-0.5 text-[14px] font-medium tracking-tight break-words">{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {item.qrUrl ? (
          <div className="mt-4 overflow-hidden rounded-2xl bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.qrUrl}
              alt={`${item.title} ${qrShare ? "add QR" : "receive QR"}`}
              className="mx-auto h-52 w-52 object-contain"
            />
          </div>
        ) : null}
        <div className="mt-3 grid gap-2">
          {item.copyValue || bankRows.length ? (
            <button
              type="button"
              onClick={() => void copyDetails()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold"
              style={{ background: theme.accentSoft, color: theme.accent }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy details"}
            </button>
          ) : null}
          {item.href ? (
            <DigitalCardSmartLink
              item={item}
              preview={preview}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0B8A83] text-sm font-semibold text-white"
              onActivate={() => trackGuestReach(item, trackSlug, preview)}
            >
              {qrShare ? `Open ${item.title}` : "Open wallet"}
              <ArrowUpRight className="h-4 w-4" />
            </DigitalCardSmartLink>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AccessSheet({
  item,
  slug,
  theme,
  preview,
  onClose,
}: {
  item: DigitalCardReachItem;
  slug?: string;
  theme: DigitalCardTheme;
  preview?: boolean;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const needsCode = item.visibility === "CODE_PROTECTED";

  async function unlock() {
    setBusy(true);
    setError(null);
    if (preview || !slug) {
      setBusy(false);
      setError("Guests enter the code on your live CeleYou. Save a code in Privacy, then they can unveil this.");
      return;
    }
    const res = await fetch(`/api/digital-business-cards/public/${encodeURIComponent(slug)}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(json?.error || "That code did not unlock anything");
      return;
    }
    window.location.reload();
  }

  async function requestAccess() {
    setBusy(true);
    setError(null);
    if (preview || !slug) {
      setBusy(false);
      setError("Guests on your live card send the request here. Save the card first.");
      return;
    }
    const res = await fetch(`/api/digital-business-cards/public/${encodeURIComponent(slug)}/access-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemKey: item.id,
        visitorName: name,
        visitorContact: contact,
        message: note,
      }),
    });
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(json?.error || "Could not send the request");
      return;
    }
    setStatus("Request sent. The cardholder will review it.");
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/55 p-4" role="dialog" aria-modal>
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-[1.6rem] border p-4 shadow-2xl"
        style={{ background: "rgba(255,251,245,0.98)", borderColor: theme.border, color: "#1c1917" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-full bg-black/5">
              <HiddenReachGlyph item={item} className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[15px] font-semibold tracking-tight">{item.title}</p>
              <p className="text-[12px] opacity-55">
                {needsCode
                  ? "This stays private until you enter the code they shared. Public details on this CeleYou stay open."
                  : "Request access. They decide whether to unveil this. Public details stay open."}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-black/5" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {needsCode ? (
          <form
            className="mt-4 grid gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void unlock();
            }}
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={4}
              autoFocus
              autoComplete="one-time-code"
              placeholder="4826 or NOVA"
              className="h-11 rounded-xl border px-3 tracking-[0.24em]"
            />
            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold text-white"
              style={{ background: "#0B8A83" }}
            >
              Unveil
            </button>
          </form>
        ) : (
          <div className="mt-4 grid gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="h-11 rounded-xl border px-3" />
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Email or phone"
              className="h-11 rounded-xl border px-3"
            />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional message"
              rows={2}
              className="rounded-xl border px-3 py-2"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void requestAccess()}
              className="inline-flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold text-white"
              style={{ background: "#0B8A83" }}
            >
              Send request
            </button>
          </div>
        )}
        {status ? <p className="mt-3 text-sm text-teal-800">{status}</p> : null}
        {error ? <p className="mt-3 text-sm text-amber-800">{error}</p> : null}
      </div>
    </div>
  );
}
