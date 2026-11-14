"use client";

type Point = { day: string; views: number; actions: number };

export function DigitalCardAnalyticsChart({ points }: { points: Point[] }) {
  if (!points.length) {
    return <p className="text-xs text-slate-500">No trend in this window yet.</p>;
  }
  const width = 320;
  const height = 72;
  const max = Math.max(1, ...points.map((point) => point.views + point.actions));
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const viewsPath = points
    .map((point, index) => {
      const x = index * step;
      const y = height - (point.views / max) * (height - 6) - 3;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const actionsPath = points
    .map((point, index) => {
      const x = index * step;
      const y = height - (point.actions / max) * (height - 6) - 3;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <figure className="mt-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full" role="img" aria-label="Engagement trend">
        <path d={viewsPath} fill="none" stroke="#0B8A83" strokeWidth="2" strokeLinecap="round" />
        <path d={actionsPath} fill="none" stroke="#c4a574" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <figcaption className="mt-1 flex gap-3 text-[10px] text-slate-500">
        <span>Teal is profile opens.</span>
        <span>Gold is published actions.</span>
      </figcaption>
    </figure>
  );
}
