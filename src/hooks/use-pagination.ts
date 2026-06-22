"use client";

import { useCallback, useState } from "react";

export function usePagination(initialLimit = 20) {
  const [page, setPage] = useState(1);
  const [limit] = useState(initialLimit);

  const goToPage = useCallback((p: number) => setPage(Math.max(1, p)), []);
  const resetPage = useCallback(() => setPage(1), []);

  const appendToParams = useCallback(
    (params: URLSearchParams) => {
      params.set("page", String(page));
      params.set("limit", String(limit));
      return params;
    },
    [page, limit]
  );

  return { page, limit, setPage: goToPage, resetPage, appendToParams };
}
