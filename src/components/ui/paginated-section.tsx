"use client";

import type { ReactNode } from "react";
import { PaginationBar } from "@/components/ui/pagination";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { DEFAULT_LIMIT } from "@/lib/pagination";
import { cn } from "@/lib/utils";

type PaginatedSectionProps<T> = {
  items: T[];
  limit?: number;
  className?: string;
  listClassName?: string;
  empty?: ReactNode;
  renderItem: (item: T, index: number) => ReactNode;
  keyFor?: (item: T, index: number) => string;
  showSummary?: boolean;
};

/**
 * Drop-in paginated list for dashboard/admin/public surfaces.
 * Mobile-first: full-width stack + touch-friendly pagination bar.
 */
export function PaginatedSection<T>({
  items,
  limit = DEFAULT_LIMIT,
  className,
  listClassName,
  empty,
  renderItem,
  keyFor,
  showSummary = true,
}: PaginatedSectionProps<T>) {
  const { page, pages, total, items: pageItems, setPage } = useClientPagination(items, limit);

  if (items.length === 0) {
    return empty ? <>{empty}</> : null;
  }

  return (
    <div className={cn("space-y-3 min-w-0", className)}>
      <div className={cn("space-y-3 min-w-0", listClassName)}>
        {pageItems.map((item, index) => (
          <div key={keyFor ? keyFor(item, index) : index} className="min-w-0">
            {renderItem(item, index)}
          </div>
        ))}
      </div>
      <PaginationBar
        page={page}
        pages={pages}
        total={total}
        limit={limit}
        onPageChange={setPage}
        showSummary={showSummary}
      />
    </div>
  );
}
