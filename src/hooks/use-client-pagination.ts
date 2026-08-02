"use client";

import { useEffect, useMemo, useState } from "react";
import { paginateList } from "@/lib/pagination-client";
import { DEFAULT_LIMIT } from "@/lib/pagination";

/**
 * Client-side list pagination for in-memory arrays (filters, dashboards, admin cards).
 * Resets to page 1 when the list identity/length changes substantially.
 */
export function useClientPagination<T>(items: T[], limit = DEFAULT_LIMIT) {
  const [page, setPageState] = useState(1);

  const paged = useMemo(() => paginateList(items, page, limit), [items, page, limit]);

  useEffect(() => {
    if (page !== paged.page) setPageState(paged.page);
  }, [page, paged.page]);

  function setPage(next: number) {
    setPageState(Math.max(1, next));
  }

  function resetPage() {
    setPageState(1);
  }

  return {
    page: paged.page,
    pages: paged.pages,
    total: paged.total,
    limit,
    items: paged.items,
    from: paged.from,
    to: paged.to,
    setPage,
    resetPage,
  };
}
