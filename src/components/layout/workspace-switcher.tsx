"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronDown, LayoutGrid } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { isAdminRole } from "@/lib/roles";
import { WORKSPACE_OPTIONS, type WorkspaceId } from "@/lib/navigation/dashboard-nav";
import type { UserRole } from "@prisma/client";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "celeventic_workspace";

export function getStoredWorkspace(): WorkspaceId {
  if (typeof window === "undefined") return "organizer";
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "vendor" || v === "funeral" || v === "admin" || v === "organizer") return v;
  return "organizer";
}

export function setStoredWorkspace(id: WorkspaceId) {
  localStorage.setItem(STORAGE_KEY, id);
  window.dispatchEvent(new CustomEvent("celeventic:workspace", { detail: id }));
}

export function WorkspaceSwitcher({ compact }: { compact?: boolean }) {
  const { t } = useLocale();
  const router = useRouter();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceId>("organizer");

  const role = session?.user?.role as UserRole | undefined;
  const isAdmin = role && isAdminRole(role);

  useEffect(() => {
    setWorkspace(getStoredWorkspace());
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<WorkspaceId>).detail;
      if (detail) setWorkspace(detail);
    };
    window.addEventListener("celeventic:workspace", handler);
    return () => window.removeEventListener("celeventic:workspace", handler);
  }, []);

  const options = WORKSPACE_OPTIONS.filter((o) => {
    if (!o.roles) return true;
    if (!role) return false;
    return o.roles.includes(role);
  });

  function select(id: WorkspaceId) {
    setStoredWorkspace(id);
    setWorkspace(id);
    setOpen(false);
    if (id === "admin") {
      router.push("/admin");
      return;
    }
    if (id === "vendor") {
      router.push("/dashboard/vendor-portal");
      return;
    }
    if (id === "funeral") {
      router.push("/dashboard/funeral");
      return;
    }
    router.push("/dashboard");
  }

  const current = options.find((o) => o.id === workspace) ?? options[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors touch-manipulation",
          compact ? "h-9 px-2.5" : "h-10 px-3"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <LayoutGrid className="h-4 w-4 text-[#0B8A83] shrink-0" />
        <span className="hidden sm:inline max-w-[120px] truncate">{t(current.labelKey)}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <ul
            role="listbox"
            className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-xl border border-slate-200 bg-white shadow-lg py-1"
          >
            {options.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={workspace === o.id}
                  onClick={() => select(o.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-slate-50",
                    workspace === o.id && "bg-brand-50 text-brand-800 font-medium"
                  )}
                >
                  {t(o.labelKey)}
                </button>
              </li>
            ))}
            {isAdmin && workspace !== "admin" && (
              <li className="border-t border-slate-100 mt-1 pt-1">
                <button
                  type="button"
                  onClick={() => select("admin")}
                  className="w-full text-left px-3 py-2 text-sm text-[#0B8A83] font-medium hover:bg-brand-50"
                >
                  {t("dashboard.admin_control_center")}
                </button>
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  );
}
