import { cn } from "@/lib/utils";

function hashName(name: string) {
  let n = 0;
  for (let i = 0; i < name.length; i += 1) n = (n * 33 + name.charCodeAt(i)) >>> 0;
  return n;
}

function companyInitials(name: string) {
  const parts = name.replace(/&/g, " ").split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function DemoCompanyMark({
  name,
  accent,
  metal,
  className,
}: {
  name: string;
  accent: string;
  metal: string;
  className?: string;
}) {
  const motif = hashName(name) % 8;
  const initials = companyInitials(name);
  return (
    <svg viewBox="0 0 48 48" className={cn("shrink-0", className)} data-house-seal="fit" aria-hidden>
      <rect width="48" height="48" rx="12" fill={metal} opacity="0.22" />
      <rect x="1" y="1" width="46" height="46" rx="11" fill="none" stroke={accent} strokeWidth="1.7" opacity="0.92" />
      {motif === 0 ? (
        <path d="M8 30c8-14 24-14 32 0" fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
      ) : null}
      {motif === 1 ? (
        <>
          <rect x="10" y="12" width="6" height="24" rx="1.4" fill={accent} opacity="0.9" />
          <rect x="21" y="18" width="6" height="18" rx="1.4" fill={accent} opacity="0.55" />
          <rect x="32" y="14" width="6" height="22" rx="1.4" fill={accent} opacity="0.75" />
        </>
      ) : null}
      {motif === 2 ? (
        <path d="M24 8 L40 24 L24 40 L8 24 Z" fill="none" stroke={accent} strokeWidth="2.2" />
      ) : null}
      {motif === 3 ? (
        <path d="M10 34 V18 Q24 8 38 18 V34" fill="none" stroke={accent} strokeWidth="2.3" strokeLinecap="round" />
      ) : null}
      {motif === 4 ? (
        <>
          <rect x="11" y="14" width="26" height="20" rx="2" fill="none" stroke={accent} strokeWidth="2" />
          <path d="M11 18 H37 M11 30 H37" stroke={accent} strokeWidth="1.4" opacity="0.7" />
        </>
      ) : null}
      {motif === 5 ? (
        <circle cx="24" cy="24" r="12" fill="none" stroke={accent} strokeWidth="2.2" />
      ) : null}
      {motif === 6 ? (
        <path d="M24 10 C18 18 18 28 24 38 C30 28 30 18 24 10 Z" fill="none" stroke={accent} strokeWidth="2.2" />
      ) : null}
      {motif === 7 ? (
        <>
          <circle cx="18" cy="18" r="3.2" fill={accent} />
          <circle cx="30" cy="18" r="3.2" fill={accent} opacity="0.55" />
          <circle cx="18" cy="30" r="3.2" fill={accent} opacity="0.55" />
          <circle cx="30" cy="30" r="3.2" fill={accent} />
        </>
      ) : null}
      <circle cx="24" cy="24" r="13.6" fill="#fff" opacity="0.96" />
      <text
        x="24"
        y="29.6"
        textAnchor="middle"
        fill={accent}
        fontSize="16.5"
        fontWeight="700"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        letterSpacing="0.02em"
      >
        {initials}
      </text>
    </svg>
  );
}

export function hasCeleCardCompanyLogo(url?: string | null): boolean {
  return Boolean(url?.trim());
}

/** Every template with a company name gets a mark beside it. */
export function celeCardShowsCompanyMark(company?: string | null): boolean {
  return Boolean(company?.trim());
}

/** Uploaded house mark, or the generated badge from the company name. */
export function CeleCardCompanyMark({
  url,
  name,
  accent,
  metal,
  className,
  allowGenerated = true,
}: {
  url?: string | null;
  name: string;
  accent: string;
  metal: string;
  className?: string;
  allowGenerated?: boolean;
}) {
  if (hasCeleCardCompanyLogo(url)) {
    return (
      <span
        className={cn("relative isolate shrink-0 overflow-hidden rounded-[20%] bg-white", className)}
        style={{ boxShadow: `inset 0 0 0 1px ${metal}`, mixBlendMode: "normal", opacity: 1 }}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url!} alt="" className="h-full w-full object-contain p-[10%]" style={{ mixBlendMode: "normal", opacity: 1 }} />
      </span>
    );
  }
  if (!allowGenerated) return null;
  return <DemoCompanyMark name={name} accent={accent} metal={metal} className={className} />;
}
