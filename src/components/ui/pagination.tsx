"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { paginationRange as rangeFromLib } from "@/lib/pagination";

function pageWindow(page: number, pages: number): (number | "...")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  if (page <= 3) return [1, 2, 3, 4, "...", pages];
  if (page >= pages - 2) return [1, "...", pages - 3, pages - 2, pages - 1, pages];
  return [1, "...", page - 1, page, page + 1, "...", pages];
}

export interface PaginationBarProps {
  page: number;
  pages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  className?: string;
  showSummary?: boolean;
}

export function PaginationBar({
  page,
  pages,
  total,
  limit,
  onPageChange,
  className,
  showSummary = true,
}: PaginationBarProps) {
  if (pages <= 1 && total <= limit) return null;

  const { from, to } = rangeFromLib(page, limit, total);
  const windowPages = pageWindow(page, pages);

  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-3 pt-4", className)}>
      {showSummary && (
        <p className="text-sm text-slate-500">
          Showing {from}–{to} of {total.toLocaleString()}
        </p>
      )}
      <nav className="flex flex-wrap items-center justify-center sm:justify-end gap-1" aria-label="Pagination">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="min-h-[44px] sm:min-h-9 touch-manipulation"
        >
          <ChevronLeft className="h-4 w-4" /> <span className="hidden xs:inline">Prev</span>
        </Button>
        {windowPages.map((p, i) =>
          p === "..." ? (
            <span key={`gap-${i}`} className="px-2 text-slate-400 select-none">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              className="min-w-10 min-h-[44px] sm:min-h-9 touch-manipulation"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Button>
          )
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          className="min-h-[44px] sm:min-h-9 touch-manipulation"
        >
          <span className="hidden xs:inline">Next</span> <ChevronRight className="h-4 w-4" />
        </Button>
      </nav>
    </div>
  );
}

export interface PaginationLinksProps {
  page: number;
  pages: number;
  total: number;
  limit: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
  className?: string;
}

export function PaginationLinks({
  page,
  pages,
  total,
  limit,
  basePath,
  searchParams = {},
  className,
}: PaginationLinksProps) {
  if (pages <= 1 && total <= limit) return null;

  const { from, to } = rangeFromLib(page, limit, total);
  const windowPages = pageWindow(page, pages);

  function hrefFor(targetPage: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    if (targetPage > 1) params.set("page", String(targetPage));
    else params.delete("page");
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-3 pt-4", className)}>
      <p className="text-sm text-slate-500">
        Showing {from}–{to} of {total.toLocaleString()}
      </p>
      <nav className="flex items-center gap-1" aria-label="Pagination">
        {page > 1 ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={hrefFor(page - 1)}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
        )}
        {windowPages.map((p, i) =>
          p === "..." ? (
            <span key={`gap-${i}`} className="px-2 text-slate-400 select-none">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              className="min-w-9"
              asChild={p !== page}
              aria-current={p === page ? "page" : undefined}
            >
              {p === page ? <span>{p}</span> : <Link href={hrefFor(p)}>{p}</Link>}
            </Button>
          )
        )}
        {page < pages ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={hrefFor(page + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </nav>
    </div>
  );
}
