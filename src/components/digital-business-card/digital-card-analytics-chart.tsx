"use client";

type Point = { day: string; views: number; actions: number };

const VIEW_COLOR = "#0B8A83";
const ACTION_COLOR = "#B8893D";
const GRID = "#E2E8F0";
const AXIS = "#94A3B8";

function niceMax(value: number): number {
  const n = Math.max(1, Math.ceil(value));
  if (n <= 4) return n;
  const exp = 10 ** Math.floor(Math.log10(n));
  const fraction = n / exp;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * exp;
}

function formatDayLabel(day: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return day;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatWeekday(day: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return "";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

function pickXTicks(points: Point[]): number[] {
  if (points.length <= 1) return [0];
  if (points.length <= 4) return points.map((_, index) => index);
  const mid = Math.floor((points.length - 1) / 2);
  return Array.from(new Set([0, mid, points.length - 1]));
}

function linePath(
  points: Point[],
  key: "views" | "actions",
  xAt: (index: number) => number,
  yAt: (value: number) => number
): string {
  return points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command}${xAt(index).toFixed(1)} ${yAt(point[key]).toFixed(1)}`;
    })
    .join(" ");
}

function areaPath(
  points: Point[],
  key: "views" | "actions",
  xAt: (index: number) => number,
  yAt: (value: number) => number,
  baseline: number
): string {
  if (!points.length) return "";
  const top = linePath(points, key, xAt, yAt).replace(/^M/, "L");
  const firstX = xAt(0).toFixed(1);
  const lastX = xAt(points.length - 1).toFixed(1);
  return `M${firstX} ${baseline} ${top} L${lastX} ${baseline} Z`;
}

export function DigitalCardAnalyticsChart({ points }: { points: Point[] }) {
  if (!points.length) {
    return <p className="text-xs text-slate-500">No trend in this window yet.</p>;
  }

  const width = 360;
  const height = 168;
  const pad = { top: 14, right: 12, bottom: 28, left: 34 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const peakValue = Math.max(0, ...points.map((point) => Math.max(point.views, point.actions)));
  const yMax = niceMax(peakValue);
  const yTicks = [0, yMax / 2, yMax].map((value) => Math.round(value));
  const xTicks = pickXTicks(points);
  const step = points.length > 1 ? plotW / (points.length - 1) : 0;
  const xAt = (index: number) => pad.left + index * step;
  const yAt = (value: number) => pad.top + plotH - (value / yMax) * plotH;

  const totalViews = points.reduce((sum, point) => sum + point.views, 0);
  const totalActions = points.reduce((sum, point) => sum + point.actions, 0);
  type BusyDay = Point & { score: number };
  const busiest = points.reduce<BusyDay>(
    (best, point) => {
      const score = point.views + point.actions;
      if (score > best.score) return { day: point.day, score, views: point.views, actions: point.actions };
      return best;
    },
    { day: points[0].day, score: -1, views: 0, actions: 0 }
  );
  const useBars = points.length <= 14;
  const aria = `Engagement trend for ${points.length} days. ${totalViews} profile opens and ${totalActions} published actions. Busiest day ${formatDayLabel(busiest.day)}.`;

  return (
    <figure className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: VIEW_COLOR }} aria-hidden />
          Profile opens
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: ACTION_COLOR }} aria-hidden />
          Published actions
        </span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-[11.5rem] w-full" role="img" aria-label={aria}>
        {yTicks.map((tick) => {
          const y = yAt(tick);
          return (
            <g key={`y-${tick}`}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke={GRID} strokeWidth="1" />
              <text x={pad.left - 6} y={y + 3} textAnchor="end" fontSize="9" fill={AXIS}>
                {tick}
              </text>
            </g>
          );
        })}

        {useBars
          ? points.map((point, index) => {
              const groupWidth = Math.max(8, plotW / points.length);
              const barWidth = Math.max(3, groupWidth * 0.32);
              const gap = Math.max(1, barWidth * 0.35);
              const cx = pad.left + (index + 0.5) * groupWidth;
              const viewsH = (point.views / yMax) * plotH;
              const actionsH = (point.actions / yMax) * plotH;
              return (
                <g key={point.day}>
                  <rect
                    x={cx - barWidth - gap / 2}
                    y={pad.top + plotH - viewsH}
                    width={barWidth}
                    height={Math.max(point.views > 0 ? 2 : 0, viewsH)}
                    rx="1.5"
                    fill={VIEW_COLOR}
                    opacity="0.9"
                  />
                  <rect
                    x={cx + gap / 2}
                    y={pad.top + plotH - actionsH}
                    width={barWidth}
                    height={Math.max(point.actions > 0 ? 2 : 0, actionsH)}
                    rx="1.5"
                    fill={ACTION_COLOR}
                    opacity="0.9"
                  />
                </g>
              );
            })
          : (
            <>
              <path
                d={areaPath(points, "views", xAt, yAt, pad.top + plotH)}
                fill={VIEW_COLOR}
                opacity="0.12"
              />
              <path
                d={areaPath(points, "actions", xAt, yAt, pad.top + plotH)}
                fill={ACTION_COLOR}
                opacity="0.12"
              />
              <path
                d={linePath(points, "views", xAt, yAt)}
                fill="none"
                stroke={VIEW_COLOR}
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={linePath(points, "actions", xAt, yAt)}
                fill="none"
                stroke={ACTION_COLOR}
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {points.map((point, index) =>
                point.views > 0 || point.actions > 0 ? (
                  <g key={`${point.day}-dots`}>
                    {point.views > 0 ? (
                      <circle cx={xAt(index)} cy={yAt(point.views)} r="2.4" fill={VIEW_COLOR} />
                    ) : null}
                    {point.actions > 0 ? (
                      <circle cx={xAt(index)} cy={yAt(point.actions)} r="2.4" fill={ACTION_COLOR} />
                    ) : null}
                  </g>
                ) : null
              )}
            </>
          )}

        {xTicks.map((index) => {
          const point = points[index];
          if (!point) return null;
          const x = useBars
            ? pad.left + (index + 0.5) * (plotW / points.length)
            : xAt(index);
          return (
            <g key={`x-${point.day}`}>
              <line
                x1={x}
                x2={x}
                y1={pad.top + plotH}
                y2={pad.top + plotH + 4}
                stroke={AXIS}
                strokeWidth="1"
              />
              <text x={x} y={height - 8} textAnchor="middle" fontSize="9" fill={AXIS}>
                {formatDayLabel(point.day)}
              </text>
            </g>
          );
        })}
      </svg>

      <figcaption className="space-y-1 text-[11px] leading-snug text-slate-500">
        <p className="flex flex-wrap gap-x-2 gap-y-0.5">
          <span className="font-medium tabular-nums text-slate-700">{totalViews} opens</span>
          <span aria-hidden>·</span>
          <span className="font-medium tabular-nums text-slate-700">{totalActions} actions</span>
          <span className="text-slate-400">in this window</span>
        </p>
        {busiest.score > 0 ? (
          <p>
            Busiest day{" "}
            <span className="font-medium text-slate-700">
              {formatWeekday(busiest.day)} {formatDayLabel(busiest.day)}
            </span>
            {" — "}
            {busiest.views} open{busiest.views === 1 ? "" : "s"}, {busiest.actions} action
            {busiest.actions === 1 ? "" : "s"}
          </p>
        ) : (
          <p>No opens or actions on any day in this window yet.</p>
        )}
      </figcaption>
    </figure>
  );
}
