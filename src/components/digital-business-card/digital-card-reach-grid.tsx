"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { createPortal } from "react-dom";
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
  brandReachLabel,
  phoneGroupBrandMarkId,
  reachAccountPreview,
  reachBrandMarkId,
  reachGroupCopy,
  usesChatLinkKinds,
  type DigitalCardReachGroup,
  type DigitalCardReachItem,
} from "@/lib/digital-business-card/socials";
import type { DigitalCardTheme } from "@/lib/digital-business-card/themes";
import { CELECARD_REACH_INK, CELECARD_REACH_MUTED, celecardCtaOnPaper, celecardReachPlate } from "@/lib/digital-business-card/type-voice";
import { guestReachEventKind } from "@/lib/celeyou-share/guest-actions";
import { trackCeleYouGuestEvent } from "@/lib/celeyou-share/events";
import { copyText } from "@/lib/clipboard";
import { isVerifiedPayAppHref } from "@/lib/digital-business-card/wallet-quality";

async function writeClipboard(value: string) {
  return copyText(value);
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

const REACH_BRAND_KEYS: Record<string, string> = {
  email: "celeyou.reach_mail",
  phone: "celeyou.reach_call",
  website: "celeyou.reach_website",
  location: "celeyou.reach_location",
  other: "celeyou.reach_pages",
  meeting: "celeyou.reach_meetings",
};

function localizeReachTitle(t: Translate, brand: string, fallback: string) {
  const key = REACH_BRAND_KEYS[brand];
  return key ? t(key) : fallback;
}

function localizeReachHint(t: Translate, item: DigitalCardReachItem, hint: string | null) {
  if (item.locked) {
    return item.visibility === "CODE_PROTECTED" ? t("celeyou.needs_code") : t("celeyou.needs_request");
  }
  if (item.kindTag === "personal") return t("celeyou.kind_personal");
  if (item.kindTag === "business") return t("celeyou.kind_business");
  if (item.linkKind === "number") return t("celeyou.kind_chat");
  if (item.linkKind === "username") return t("celeyou.kind_username");
  if (item.linkKind === "group") return t("celeyou.kind_group");
  if (item.linkKind === "channel") return t("celeyou.kind_channel");
  if (hint && hint === brandReachLabel(item.brand)) {
    return localizeReachTitle(t, item.brand, hint);
  }
  return hint;
}

function localizeGroupCopy(t: Translate, group: DigitalCardReachGroup) {
  const copy = reachGroupCopy(group);
  if (group.items.length === 1) {
    return {
      title: copy.title,
      subtitle: localizeReachHint(t, group.items[0], copy.subtitle),
    };
  }
  const title = localizeReachTitle(t, group.brand, copy.title);
  if (usesChatLinkKinds(group.brand)) {
    const counts = { number: 0, username: 0, group: 0, channel: 0 };
    for (const item of group.items) {
      if (item.linkKind) counts[item.linkKind] += 1;
    }
    const parts: string[] = [];
    if (counts.number) parts.push(counts.number === 1 ? t("celeyou.kind_chat") : t("celeyou.kind_chats"));
    if (counts.username) parts.push(counts.username === 1 ? t("celeyou.kind_username") : t("celeyou.kind_usernames"));
    if (counts.group) parts.push(counts.group === 1 ? t("celeyou.kind_group") : t("celeyou.kind_groups"));
    if (counts.channel) parts.push(counts.channel === 1 ? t("celeyou.kind_channel") : t("celeyou.kind_channels"));
    if (parts.length) return { title, subtitle: parts.join(", ") };
  }
  const unitKey =
    group.brand === "email"
      ? "celeyou.n_addresses"
      : group.brand === "phone"
        ? "celeyou.n_numbers"
        : group.brand === "website"
          ? "celeyou.n_sites"
          : group.brand === "location"
            ? "celeyou.n_places"
            : group.brand === "other"
              ? "celeyou.n_pages"
              : group.brand === "meeting"
                ? "celeyou.n_times"
                : isPayNetwork(group.brand)
                  ? "celeyou.n_wallets"
                  : "celeyou.n_profiles";
  return { title, subtitle: t(unitKey, { count: group.items.length }) };
}

function chatSectionLabel(t: Translate, id: string, count: number) {
  if (id === "number") return count === 1 ? t("celeyou.kind_chat") : t("celeyou.kind_chats");
  if (id === "username") return count === 1 ? t("celeyou.kind_username") : t("celeyou.kind_usernames");
  if (id === "group") return count === 1 ? t("celeyou.kind_group") : t("celeyou.kind_groups");
  if (id === "channel") return count === 1 ? t("celeyou.kind_channel") : t("celeyou.kind_channels");
  if (id === "more") return t("celeyou.kind_more");
  return null;
}

function bankFieldKey(label: string) {
  if (label === "Bank name") return "celeyou.field_bank_name";
  if (label === "Account name") return "celeyou.field_account_name";
  if (label === "Account number") return "celeyou.field_account_number";
  if (label === "Account type") return "celeyou.field_account_type";
  return "";
}

function bankTypeValue(t: Translate, value: string) {
  const key =
    value === "Savings"
      ? "celeyou.bank_type_savings"
      : value === "Current"
        ? "celeyou.bank_type_current"
        : value === "Checking"
          ? "celeyou.bank_type_checking"
          : value === "Business"
            ? "celeyou.bank_type_business"
            : value === "Other"
              ? "celeyou.bank_type_other"
              : "";
  return key ? t(key) : value;
}

function GuestOverlay({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

function trackGuestReach(item: DigitalCardReachItem, slug?: string, preview?: boolean) {
  if (!slug || preview) return;
  const kind = guestReachEventKind(item);
  if (kind) trackCeleYouGuestEvent(slug, kind, { brand: item.brand, outcome: "attempted" });
}

function isLocationGroup(group: DigitalCardReachGroup) {
  return group.brand === "location";
}

function isMeetingGroup(group: DigitalCardReachGroup) {
  return group.brand === "meeting";
}

function ReachTitleText({ text }: { text: string }) {
  const at = text.lastIndexOf("@");
  if (at > 0 && at < text.length - 1 && !/\s/.test(text)) {
    return (
      <>
        {text.slice(0, at + 1)}
        <wbr />
        {text.slice(at + 1)}
      </>
    );
  }
  return text;
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
  const { t } = useLocale();
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
            aria-label={t("celeyou.profiles_nav")}
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
                className={cn(
                  compact ? undefined : "celecard-dock-item",
                  group.items.every((item) => item.locked) ? "is-locked" : null
                )}
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
                    ? t("celeyou.see_place")
                    : usesChatLinkKinds(openDock.brand)
                      ? t("celeyou.choose_chat", { title: reachGroupCopy(openDock).title })
                      : t("celeyou.choose_profile")}
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
                <DigitalCardMeetingDrop
                  items={openDock.items}
                  theme={theme}
                  compact={compact}
                  preview={compact}
                  slug={slug}
                  ownerName={ownerName}
                />
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
        <div className={compact ? "grid gap-2" : "celecard-stack"}>
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
  const { t } = useLocale();
  const sections = usesChatLinkKinds(group.brand) ? arrangeChatChoices(group.items) : [{ id: "all", label: null, items: group.items }];
  return (
    <div role="menu" className={cn("grid", compact ? "gap-1 p-1.5" : "gap-1.5 p-2")}>
      {sections.map((section) => (
        <div key={section.id} className="grid gap-1">
          {section.label ? (
            <p className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "#44403c" }}>
              {chatSectionLabel(t, section.id, section.items.length) || section.label}
            </p>
          ) : null}
          {section.items.map((item) => {
        const choice = reachAccountPreview(item);
        const title = choice.title;
        const hint = localizeReachHint(t, item, choice.hint);
        return (
          <ReachTarget
            key={item.id}
            item={item}
            preview={preview}
            trackSlug={trackSlug}
            onOpenQr={onOpenQr}
            onOpenAccess={onOpenAccess}
            aria-label={hint ? `${title} ${hint}` : title}
            className={cn(
              "celecard-reach-choice rounded-2xl px-2 py-2 transition hover:bg-black/[0.04]",
              compact ? "is-compact" : "is-live",
              item.locked ? "is-locked" : null
            )}
          >
            <span className="relative shrink-0">
              <DigitalCardBrandMark
                id={reachBrandMarkId(item)}
                className={compact ? "h-9 w-9 rounded-[11px]" : "h-9 w-9 rounded-[11px] sm:h-10 sm:w-10 sm:rounded-[12px]"}
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
            <span className="celecard-reach-copy">
              <span className={cn("celecard-reach-title", compact ? "text-[12px]" : null)}>
                <ReachTitleText text={title} />
              </span>
              {hint ? (
                <span
                  className={cn(
                    "celecard-reach-hint",
                    item.kindTag || item.linkKind
                      ? "uppercase tracking-[0.14em]"
                      : null
                  )}
                  style={{ color: "#44403c" }}
                >
                  {hint}
                </span>
              ) : null}
            </span>
            {item.locked ? (
              <HiddenReachGlyph item={item} className={compact ? "h-3.5 w-3.5 opacity-45" : "h-4 w-4 opacity-45"} />
            ) : item.qrUrl ? (
              <QrCode className={compact ? "h-3.5 w-3.5 opacity-45" : "h-4 w-4 opacity-45"} aria-hidden />
            ) : isPayNetwork(item.brand) ? (
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
  const { t } = useLocale();
  const copy = localizeGroupCopy(t, group);
  const one = group.items.length === 1;
  const allLocked = group.items.every((item) => item.locked);
  const placeLocked = isLocationGroup(group) && allLocked;
  const expands = !one || (isLocationGroup(group) && !placeLocked);
  const mark = (
    <span className="relative inline-flex">
      <DigitalCardBrandMark
        id={group.brand === "phone" ? phoneGroupBrandMarkId(group.items) : group.brand}
        className={compact ? "h-10 w-10 rounded-[12px]" : "h-11 w-11 rounded-[13px] sm:h-12 sm:w-12 sm:rounded-[14px]"}
      />
      {allLocked ? (
        <span
          className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-white text-stone-700 shadow ring-1 ring-black/10"
          aria-hidden
        >
          <HiddenReachGlyph item={group.items[0]} className="h-2.5 w-2.5" />
        </span>
      ) : one ? null : (
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
        aria-label={
          item.locked
            ? t("celeyou.unhide_aria", { title: item.title })
            : `${item.title}${item.subtitle ? ` ${localizeReachHint(t, item, item.subtitle)}` : ""}`
        }
        className="celecard-dock-tap transition duration-200 hover:-translate-y-1 hover:scale-105"
      >
        {mark}
        <span className="celecard-dock-caption">{copy.title}</span>
      </ReachTarget>
    );
  }

  return (
    <button
      type="button"
      aria-expanded={open}
      aria-haspopup="menu"
      aria-controls={menuId}
      aria-label={`${copy.title}. ${copy.subtitle ?? t("celeyou.choose_profile")}`}
      onClick={onToggle}
      className={cn(
        "celecard-dock-tap transition duration-200 hover:-translate-y-1 hover:scale-105",
        open ? "scale-105" : ""
      )}
    >
      {mark}
      <span className="celecard-dock-caption">{copy.title}</span>
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
  const { t } = useLocale();
  const menuId = useId();
  const copy = localizeGroupCopy(t, group);
  const placeLocked = isLocationGroup(group) && group.items.every((item) => item.locked);
  if (isMeetingGroup(group)) {
    return (
      <div className="grid gap-1.5">
        <div
          className={cn(
            "celecard-reach-row group relative overflow-hidden border backdrop-blur",
            compact ? "is-compact" : "is-live"
          )}
          style={plate}
        >
          <span className="celecard-reach-accent" style={{ background: theme.accent }} aria-hidden />
          <DigitalCardBrandMark id={group.brand} className="celecard-reach-mark" />
          <span className="celecard-reach-copy">
            <span className="celecard-reach-title">
              <ReachTitleText text={copy.title} />
            </span>
            {copy.subtitle ? (
              <span className="celecard-reach-hint" style={{ color: CELECARD_REACH_MUTED }}>
                {copy.subtitle}
              </span>
            ) : null}
          </span>
        </div>
        <div
          className="overflow-hidden rounded-[1.35rem] border shadow-[0_12px_28px_rgba(0,0,0,0.12)]"
          style={plate}
        >
          <DigitalCardMeetingDrop
            items={group.items}
            theme={theme}
            compact={compact}
            preview={compact}
            slug={slug}
            ownerName={ownerName}
          />
        </div>
      </div>
    );
  }
  const single =
    group.items.length === 1 &&
    (!isLocationGroup(group) || placeLocked) &&
    !isMeetingGroup(group);
  const rowClass = cn(
    "celecard-reach-row group relative overflow-hidden border backdrop-blur",
    compact ? "is-compact" : "is-live",
    single ? "is-go" : null,
    single && group.items[0]?.locked ? "is-locked" : null
  );

  const inner = (
    <>
      <span className="celecard-reach-accent" style={{ background: theme.accent }} aria-hidden />
      <DigitalCardBrandMark
        id={group.brand === "phone" ? phoneGroupBrandMarkId(group.items) : group.brand}
        className="celecard-reach-mark"
      />
      <span className="celecard-reach-copy">
        <span className="celecard-reach-title">
          <ReachTitleText text={copy.title} />
        </span>
        {copy.subtitle ? (
          <span className="celecard-reach-hint" style={{ color: CELECARD_REACH_MUTED }}>
            {copy.subtitle}
          </span>
        ) : null}
      </span>
      <span
        className={cn("celecard-reach-go", open && !single ? "is-open" : null)}
        style={{ background: "#fffef8", color: CELECARD_REACH_INK }}
        aria-hidden
      >
        {single ? (
          group.items[0]?.locked ? (
            <HiddenReachGlyph item={group.items[0]} className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          ) : group.items[0]?.qrUrl ? (
            <QrCode className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          ) : group.items[0]?.brand === "bank" ? (
            <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          ) : (
            <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          )
        ) : (
          <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
                      {t("celeyou.reach_location")}
                    </p>
                    <p className={cn("mt-0.5 font-medium", compact ? "text-[11px]" : "text-[12px]")} style={{ color: CELECARD_REACH_MUTED }}>
                      {t("celeyou.see_place")}
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
                <DigitalCardMeetingDrop
                  items={group.items}
                  theme={theme}
                  compact={compact}
                  preview={compact}
                  slug={slug}
                  ownerName={ownerName}
                />
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
  const { t } = useLocale();
  if (item.locked && onOpenAccess) {
    return (
      <button
        type="button"
        className={className}
        style={style}
        aria-label={ariaLabel || t("celeyou.unhide_aria", { title: item.title })}
        onClick={() => onOpenAccess(item)}
      >
        {children}
      </button>
    );
  }
  const scanSheet =
    isPayNetwork(item.brand) || (item.qrUrl && isQrShareNetwork(item.brand));
  if (scanSheet && onOpenQr) {
    return (
      <button
        type="button"
        className={className}
        style={style}
        aria-label={ariaLabel}
        onClick={() => {
          trackGuestReach(item, trackSlug, preview);
          if (isVerifiedPayAppHref(item.href)) {
            openInstalledReachApp(item, preview);
          }
          onOpenQr(item);
        }}
      >
        {children}
      </button>
    );
  }
  if (isPayNetwork(item.brand) && !isVerifiedPayAppHref(item.href)) {
    return (
      <button type="button" className={className} style={style} aria-label={ariaLabel}>
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
  const { t } = useLocale();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyTimer = useRef<number | null>(null);
  const bank = item.brand === "bank" ? parseBankAccount(item.copyValue) : null;
  const bankRows = bank ? bankAccountDisplayRows(bank) : [];
  const qrShare = isQrShareNetwork(item.brand);
  const allValue = bank
    ? formatBankAccountCopy(bank)
    : item.copyValue || item.subtitle || item.title;

  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    },
    []
  );

  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    document.body.dataset.celecardSheet = "true";
    return () => {
      html.style.overflow = prev;
      delete document.body.dataset.celecardSheet;
    };
  }, []);

  async function copyValue(key: string, value: string) {
    if (!value) return;
    const ok = await writeClipboard(value);
    if (!ok) return;
    setCopiedKey(key);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopiedKey(null), 1600);
  }

  useEffect(() => {
    if (preview || !trackSlug) return;
    trackCeleYouGuestEvent(trackSlug, "payment_open", { brand: item.brand, outcome: "attempted" });
  }, [item.brand, preview, trackSlug]);

  return (
    <GuestOverlay>
    <div className="celecard-guest-overlay fixed inset-0 z-[200] grid place-items-center bg-black/70 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]" role="dialog" aria-modal aria-labelledby="celecard-pay-title">
      <button type="button" className="absolute inset-0" aria-label={t("celeyou.close")} onClick={onClose} />
      <div
        className="celecard-sheet relative z-10 w-full max-w-sm max-h-[min(92dvh,40rem)] overflow-y-auto overflow-x-hidden rounded-[1.6rem] border p-4 shadow-2xl"
        style={{ background: "rgba(255,251,245,0.98)", borderColor: theme.border, color: "#1c1917" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <DigitalCardBrandMark id={item.brand} className="h-10 w-10 rounded-[12px]" />
            <div>
              <p id="celecard-pay-title" className="text-[15px] font-semibold tracking-tight">{item.title}</p>
              <p className="text-[12px] opacity-55">
                {bank
                  ? item.subtitle || t("celeyou.bank_account")
                  : qrShare
                    ? t("celeyou.qr_app_hint")
                    : item.subtitle || item.copyValue || t("celeyou.scan_to_pay")}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full bg-black/5" aria-label={t("celeyou.close")}>
            <X className="h-4 w-4" />
          </button>
        </div>
        {!bankRows.length && isPayNetwork(item.brand) ? (
          <p className="mt-3 text-[13px] font-medium leading-relaxed opacity-80">
            {t("celeyou.momo_howto")}
          </p>
        ) : null}
        {bankRows.length ? (
          <dl className="celecard-copy-list mt-4 grid gap-0 rounded-2xl bg-white px-2 py-1.5">
            {bankRows.map((row) => {
              const copied = copiedKey === row.label;
              return (
                <div key={row.label} className="celecard-copy-row">
                  <div className="min-w-0 flex-1">
                    <dt className="celecard-copy-label">{bankFieldKey(row.label) ? t(bankFieldKey(row.label)) : row.label}</dt>
                    <dd className="celecard-copy-value">{row.label === "Account type" ? bankTypeValue(t, row.value) : row.value}</dd>
                  </div>
                  <button
                    type="button"
                    className="celecard-copy-hit"
                    data-copied={copied ? "true" : "false"}
                    aria-label={t("celeyou.copy_named", { label: bankFieldKey(row.label) ? t(bankFieldKey(row.label)) : row.label })}
                    onClick={() => void copyValue(row.label, row.value)}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              );
            })}
          </dl>
        ) : null}
        {item.qrUrl ? (
          <div className="mt-4 overflow-hidden rounded-2xl bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.qrUrl}
              alt={`${item.title} ${qrShare ? t("celeyou.add_qr") : t("celeyou.receive_qr")}`}
              className="mx-auto h-52 w-52 object-contain"
            />
          </div>
        ) : null}
        <p className="sr-only" aria-live="polite">
          {copiedKey === "all"
            ? t("celeyou.copied_all_live")
            : copiedKey
              ? t("celeyou.copied_named", { label: copiedKey })
              : ""}
        </p>
        <div className="mt-3 grid gap-2">
          {allValue ? (
            <button
              type="button"
              onClick={() => void copyValue("all", allValue)}
              className="celecard-copy-all inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold"
              data-copied={copiedKey === "all" ? "true" : "false"}
              style={{ background: CELECARD_REACH_INK, color: "#fffef8" }}
            >
              {copiedKey === "all" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedKey === "all" ? t("celeyou.copied_all") : bankRows.length ? t("celeyou.copy_all") : t("celeyou.copy_details")}
            </button>
          ) : null}
          {item.href && isVerifiedPayAppHref(item.href) ? (
            <DigitalCardSmartLink
              item={item}
              preview={preview}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold"
              style={celecardCtaOnPaper("#0B8A83", "#fffef8")}
              onActivate={() => trackGuestReach(item, trackSlug, preview)}
            >
              {t("celeyou.open_title", { title: item.title })}
              <ArrowUpRight className="h-4 w-4" />
            </DigitalCardSmartLink>
          ) : null}
        </div>
      </div>
    </div>
    </GuestOverlay>
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
  const { t } = useLocale();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const needsCode = item.visibility === "CODE_PROTECTED";

  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    document.body.dataset.celecardSheet = "true";
    return () => {
      html.style.overflow = prev;
      delete document.body.dataset.celecardSheet;
    };
  }, []);

  async function unlock() {
    setBusy(true);
    setError(null);
    if (preview || !slug) {
      setBusy(false);
      setError(t("celeyou.ask_cardholder"));
      return;
    }
    const res = await fetch(`/api/digital-business-cards/public/${encodeURIComponent(slug)}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, itemKey: item.id }),
    });
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(t("celeyou.unlock_failed"));
      return;
    }
    window.location.reload();
  }

  async function requestAccess() {
    setBusy(true);
    setError(null);
    if (preview || !slug) {
      setBusy(false);
      setError(t("celeyou.ask_cardholder"));
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
      setError(t("celeyou.network_error"));
      return;
    }
    setStatus(t("celeyou.request_sent"));
  }

  return (
    <GuestOverlay>
    <div className="celecard-guest-overlay fixed inset-0 z-[200] grid place-items-center bg-black/70 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]" role="dialog" aria-modal>
      <button type="button" className="absolute inset-0" aria-label={t("celeyou.close")} onClick={onClose} />
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
                {needsCode ? t("celeyou.access_help") : t("celeyou.request_access_help")}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full bg-black/5" aria-label={t("celeyou.close")}>
            <X className="h-4 w-4" />
          </button>
        </div>
        {needsCode ? (
          <form
            className="mt-4 grid gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!code.trim()) {
                setError(t("celeyou.empty_code"));
                codeRef.current?.focus();
                return;
              }
              void unlock();
            }}
          >
            <input
              ref={codeRef}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                if (error) setError(null);
              }}
              maxLength={8}
              autoFocus
              autoComplete="one-time-code"
              placeholder={t("celeyou.access_code")}
              aria-invalid={error ? true : undefined}
              className="h-11 min-h-11 rounded-xl border px-3 tracking-[0.24em]"
            />
            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold"
              style={celecardCtaOnPaper("#0B8A83", "#fffef8")}
            >
              {busy ? t("celeyou.unlocking") : t("celeyou.unlock")}
            </button>
          </form>
        ) : (
          <div className="mt-4 grid gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("celeyou.your_name")} className="h-11 rounded-xl border px-3" />
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={t("celeyou.email_or_phone")}
              className="h-11 rounded-xl border px-3"
            />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("celeyou.optional_message")}
              rows={2}
              className="rounded-xl border px-3 py-2"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void requestAccess()}
              className="inline-flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold"
              style={celecardCtaOnPaper("#0B8A83", "#fffef8")}
            >
              {t("celeyou.send_request")}
            </button>
          </div>
        )}
        {status ? <p className="mt-3 text-sm text-teal-800">{status}</p> : null}
        {error ? <p className="mt-3 text-sm text-amber-800">{error}</p> : null}
      </div>
    </div>
    </GuestOverlay>
  );
}
