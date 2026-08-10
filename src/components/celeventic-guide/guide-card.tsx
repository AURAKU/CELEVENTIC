import type { GuideRole, GuideCategory } from "@/lib/celeventic-guide/types";
import { GUIDE_CATEGORY_LABELS, GUIDE_ROLE_LABELS } from "@/lib/celeventic-guide/types";

export interface GuideCardData {
  slug: string;
  title: string;
  summary: string;
  role: GuideRole | string;
  category: GuideCategory | string;
  featured: boolean;
  posterUrl: string | null;
  hasVideo: boolean;
  stepCount: number;
}

export function GuideCard({ guide }: { guide: GuideCardData }) {
  return (
    <a
      href={`/guide/${guide.slug}`}
      className="group block rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-sm overflow-hidden transition hover:border-brand-300 hover:shadow-[0_12px_40px_rgba(11,138,131,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <div className="relative aspect-[16/10] bg-gradient-to-br from-brand-700 via-brand-600 to-slate-900 overflow-hidden">
        {guide.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={guide.posterUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
        )}
        <div className="absolute inset-x-0 bottom-0 p-3 flex gap-2">
          <span className="rounded-md bg-black/45 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            {GUIDE_ROLE_LABELS[guide.role as GuideRole] ?? guide.role}
          </span>
          {guide.featured && (
            <span className="rounded-md bg-gold-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-900">
              Featured
            </span>
          )}
        </div>
      </div>
      <div className="p-4 space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-brand-700">
          {GUIDE_CATEGORY_LABELS[guide.category as GuideCategory] ?? guide.category}
        </p>
        <h3 className="font-display text-lg font-semibold text-slate-900 leading-snug group-hover:text-brand-800">
          {guide.title}
        </h3>
        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{guide.summary}</p>
        <p className="text-xs text-slate-400 pt-1">
          {guide.stepCount} steps{guide.hasVideo ? " · video" : " · interactive"}
        </p>
      </div>
    </a>
  );
}
