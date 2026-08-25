"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COUNTRY_OPTIONS,
  filterCountries,
  findCountry,
  type CountryOption,
} from "@/lib/geo/countries";

interface CountrySelectProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  placeholder?: string;
}

export function CountrySelect({
  value,
  onChange,
  disabled,
  className,
  id,
  placeholder = "Search country…",
}: CountrySelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(() => {
    const known = findCountry(value);
    if (known) return known;
    const code = value?.trim().toUpperCase();
    if (code && /^[A-Z]{2}$/.test(code)) {
      return { code, name: code, flag: "🌐" } satisfies CountryOption;
    }
    return undefined;
  }, [value]);
  const options = useMemo(() => filterCountries(query), [query]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 10);
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(option: CountryOption) {
    onChange(option.code);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 text-sm shadow-sm",
          "hover:bg-white focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20",
          "disabled:cursor-not-allowed disabled:opacity-50 transition-all text-left"
        )}
      >
        <span className="inline-flex items-center gap-2 min-w-0">
          <span className="text-lg leading-none" aria-hidden>
            {selected?.flag ?? "🌐"}
          </span>
          <span className="truncate font-medium text-slate-800">
            {selected ? selected.name : "Select country"}
          </span>
          {selected && (
            <span className="shrink-0 text-xs font-semibold text-slate-400 tabular-nums">
              {selected.code}
            </span>
          )}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.14)]"
          role="listbox"
          id={listId}
        >
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm outline-none focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/15"
                aria-label="Search countries"
              />
            </div>
          </div>
          <ul className="max-h-60 overflow-y-auto p-1">
            {options.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-slate-500">No countries match</li>
            ) : (
              options.map((option) => {
                const active = option.code === selected?.code;
                return (
                  <li key={option.code}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => pick(option)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                        active ? "bg-brand-50 text-brand-900" : "hover:bg-slate-50 text-slate-800"
                      )}
                    >
                      <span className="text-lg leading-none" aria-hidden>
                        {option.flag}
                      </span>
                      <span className="flex-1 min-w-0 truncate font-medium">{option.name}</span>
                      <span className="text-xs font-semibold text-slate-400 tabular-nums">
                        {option.code}
                      </span>
                      {active && <Check className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          <p className="border-t border-slate-100 px-3 py-1.5 text-[10px] text-slate-400">
            {COUNTRY_OPTIONS.length} countries · search by name or code
          </p>
        </div>
      )}
    </div>
  );
}
