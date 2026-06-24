/** Slice a list for client-side pagination. */
export function paginateList<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), pages);
  const start = (safePage - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    total,
    pages,
    page: safePage,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + limit, total),
  };
}
