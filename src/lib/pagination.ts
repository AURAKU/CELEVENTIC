export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  /** True when more pages exist after the current page (handy for Load more UIs). */
  hasMore: boolean;
};

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const PUBLIC_GRID_LIMIT = 12;
export const ADMIN_TABLE_LIMIT = 20;
/** Guest wishes / notification dropdown / feed-style lists */
export const FEED_LIMIT = 20;
/** Event picker / switcher bulk list */
export const PICKER_LIMIT = 200;
/** Seating chart guest roster (needs most guests; hard safety cap) */
export const SEATING_GUEST_LIMIT = 500;
/** Offline QR sync batch size (cursor batches) */
export const OFFLINE_SYNC_BATCH = 500;
export const MAX_LIMIT = 100;

export function clampPage(page: number): number {
  return Math.max(1, Number.isFinite(page) ? Math.floor(page) : DEFAULT_PAGE);
}

export function clampLimit(limit: number, max = MAX_LIMIT): number {
  return Math.min(max, Math.max(1, Number.isFinite(limit) ? Math.floor(limit) : DEFAULT_LIMIT));
}

export function parsePaginationInput(
  input?: { page?: number | string | null; limit?: number | string | null },
  defaults?: { limit?: number; maxLimit?: number }
): { page: number; limit: number; skip: number } {
  const rawPage = input?.page;
  const rawLimit = input?.limit;
  const page = clampPage(typeof rawPage === "string" ? parseInt(rawPage, 10) : (rawPage ?? DEFAULT_PAGE));
  const limit = clampLimit(
    typeof rawLimit === "string" ? parseInt(rawLimit, 10) : (rawLimit ?? defaults?.limit ?? DEFAULT_LIMIT),
    defaults?.maxLimit ?? MAX_LIMIT
  );
  return { page, limit, skip: (page - 1) * limit };
}

export function parsePaginationFromUrl(
  url: string | URL,
  defaults?: { limit?: number; maxLimit?: number }
): { page: number; limit: number; skip: number } {
  const params = typeof url === "string" ? new URL(url).searchParams : url.searchParams;
  return parsePaginationInput({ page: params.get("page"), limit: params.get("limit") }, defaults);
}

export function paginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  const pages = Math.max(1, Math.ceil(total / limit));
  return {
    items,
    total,
    page,
    limit,
    pages,
    hasMore: page < pages,
  };
}

export function paginationRange(page: number, limit: number, total: number) {
  if (total === 0) return { from: 0, to: 0 };
  return { from: (page - 1) * limit + 1, to: Math.min(page * limit, total) };
}
