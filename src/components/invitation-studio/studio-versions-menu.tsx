"use client";

import { useState } from "react";
import { History, BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StudioSnapshot } from "@/lib/invitation-studio/studio-history";

interface StudioVersionsMenuProps {
  versions: StudioSnapshot[];
  onSaveVersion: (label: string) => void;
  onRestoreVersion: (id: string) => void;
}

export function StudioVersionsMenu({
  versions,
  onSaveVersion,
  onRestoreVersion,
}: StudioVersionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");

  return (
    <div className="relative">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setOpen((o) => !o)}
        aria-label="Version history"
        title="Version history"
      >
        <History className="h-4 w-4" />
      </Button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close versions"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
            <p className="text-xs font-semibold text-slate-800">Named revisions</p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Saved in this browser session — restore anytime before you leave.
            </p>
            <div className="mt-2 flex gap-1.5">
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. After gold theme"
                className="h-8 text-xs"
              />
              <Button
                type="button"
                size="sm"
                className="shrink-0 bg-[#0B8A83] hover:bg-[#097068]"
                onClick={() => {
                  onSaveVersion(label.trim() || `Revision ${new Date().toLocaleTimeString()}`);
                  setLabel("");
                }}
              >
                <BookmarkPlus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {versions.length === 0 ? (
              <p className="mt-3 text-[11px] text-slate-400">No saved revisions yet.</p>
            ) : (
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                {versions.map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      className="flex w-full flex-col rounded-lg px-2 py-1.5 text-left hover:bg-slate-50"
                      onClick={() => {
                        onRestoreVersion(v.id);
                        setOpen(false);
                      }}
                    >
                      <span className="truncate text-xs font-medium text-slate-800">{v.label}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(v.at).toLocaleString()}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
