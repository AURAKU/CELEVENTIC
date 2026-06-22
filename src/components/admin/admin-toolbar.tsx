"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, RefreshCw } from "lucide-react";

interface AdminToolbarProps {
  title: string;
  subtitle?: string;
  count?: number;
  search?: string;
  onSearchChange?: (v: string) => void;
  onRefresh?: () => void;
  onAdd?: () => void;
  addLabel?: string;
  children?: React.ReactNode;
}

export function AdminToolbar({
  title,
  subtitle,
  count,
  search,
  onSearchChange,
  onRefresh,
  onAdd,
  addLabel = "Add New",
  children,
}: AdminToolbarProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
          {count !== undefined && <p className="text-xs text-slate-500 mt-1">{count} total records</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          )}
          {onAdd && (
            <Button size="sm" onClick={onAdd}>
              <Plus className="h-4 w-4" /> {addLabel}
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        {onSearchChange && (
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search..."
              value={search ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
