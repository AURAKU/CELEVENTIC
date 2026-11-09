export function SignupProgress({
  current,
  total,
  labels,
}: {
  current: number;
  total: number;
  labels: string[];
}) {
  return (
    <ol className="mb-6 flex items-center justify-center gap-2 sm:gap-3" aria-label="Signup progress">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={n} className="flex items-center gap-2 sm:gap-3">
            {i > 0 ? (
              <span
                className={`hidden sm:block h-px w-8 ${done || active ? "bg-brand-400" : "bg-slate-200"}`}
                aria-hidden
              />
            ) : null}
            <span className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  active
                    ? "bg-brand-600 text-white"
                    : done
                      ? "bg-brand-100 text-brand-800"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {n}
              </span>
              <span
                className={`hidden sm:inline text-xs font-medium ${
                  active ? "text-slate-900" : "text-slate-500"
                }`}
              >
                {labels[i]}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
