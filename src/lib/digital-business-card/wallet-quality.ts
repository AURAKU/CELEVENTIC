import {
  bankAccountDisplayRows,
  parseBankAccount,
  type DigitalCardPayFamilyGroup,
  type DigitalCardReachItem,
} from "@/lib/digital-business-card/socials";

/** Guest CeleYou surfaces that must not poll commerce rates. */
export function isPublicCeleYouSurfacePath(pathname: string): boolean {
  return /^\/(card|u|c|n|tap)(\/|$)/i.test(pathname.split("?")[0] ?? "");
}

/**
 * External pay actions guests may tap. Telephone and SMS are contact, never a wallet app.
 * Only http(s) payment pages count as a verified open-app action.
 */
export function isVerifiedPayAppHref(href: string | undefined | null): boolean {
  const value = href?.trim() ?? "";
  if (!value) return false;
  if (/^(tel:|sms:|mailto:)/i.test(value)) return false;
  return /^https?:\/\//i.test(value);
}

export function celeCardWalletShareText(displayName: string): string {
  const name = displayName.trim() || "this CeleYou";
  return `Pay ${name} using the available payment methods.`;
}

function momoAccountName(item: DigitalCardReachItem, number: string): string | null {
  const subtitle = item.subtitle?.trim() || "";
  if (!subtitle || subtitle === number) return null;
  return subtitle;
}

function formatPayItemCopy(familyId: string, item: DigitalCardReachItem): string | null {
  if (item.locked) return null;
  if (item.brand === "bank") {
    const rows = bankAccountDisplayRows(parseBankAccount(item.copyValue));
    if (!rows.length) return null;
    return [`Bank transfer`, ...rows.map((row) => `${row.label}: ${row.value}`)].join("\n");
  }
  if (familyId === "mobile-money") {
    const number = item.copyValue?.trim() || "";
    if (!number) return null;
    const lines = [item.title];
    const accountName = momoAccountName(item, number);
    if (accountName) lines.push(`Account name: ${accountName}`);
    lines.push(`Mobile money number: ${number}`);
    return lines.join("\n");
  }
  const details = item.copyValue?.trim();
  if (!details) return null;
  return `${item.title}\n${details}`;
}

/** Structured clipboard bundle. Only fields the cardholder published. */
export function formatWalletPaymentBundle(families: DigitalCardPayFamilyGroup[]): string {
  const blocks = families
    .flatMap((family) => family.items.map((item) => formatPayItemCopy(family.id, item)))
    .filter((block): block is string => Boolean(block));
  if (!blocks.length) return "";
  return `Payment details\n\n${blocks.join("\n\n")}`;
}

export function walletLockedGuidance(title: string): string {
  return `${title} stays locked until the cardholder shares an access code with you. Ask them for that code. CeleYou never shows it here.`;
}
