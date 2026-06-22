export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const PUBLIC_GRID_LIMIT = 12;
export const ADMIN_TABLE_LIMIT = 20;
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
  return {
    items,
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

export function paginationRange(page: number, limit: number, total: number) {
  if (total === 0) return { from: 0, to: 0 };
  return { from: (page - 1) * limit + 1, to: Math.min(page * limit, total) };
}
