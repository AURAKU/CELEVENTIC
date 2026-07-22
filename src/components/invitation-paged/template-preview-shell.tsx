"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PremiumInviteWrapper } from "@/components/invitation-os/premium-invite-wrapper";
import { getInvitationTheme } from "@/lib/invitation-theme/theme-registry";
import { applyThemeToDesign } from "@/lib/invitation-theme/theme-compat";
import { themeToCssVars } from "@/lib/invitation-theme/theme-resolver";
import { trackInviteEvent } from "@/lib/analytics/invite-events";
import type { InvitationDesignConfig, InvitationEventData } from "@/types/invitation-design";
import type { InviteCategory, PageRenderContext } from "@/lib/invite-blueprints/blueprint-types";

interface TemplatePreviewShellProps {
  templateSlug: string;
  templateName: string;
  tier: string;
  design: InvitationDesignConfig;
  event: InvitationEventData;
  invitation: PageRenderContext["invitation"];
  category: InviteCategory;
  themeIds: string[];
  eventType: string;
}

/**
 * Preview mode = the published experience. The buyer gets the same
 * PremiumInviteWrapper pipeline a guest gets — Celeventic soft intro,
 * then opening ceremony (curtain owns tap on Kente Royale), then the invitation.
 * Theme chips re-skin the experience live; the pinned CTA carries
 * template + chosen theme into the create funnel.
 */
export function TemplatePreviewShell({
  templateSlug,
  templateName,
  tier,
  design,
  event,
  invitation,
  themeIds,
  eventType,
}: TemplatePreviewShellProps) {
  const [activeThemeId, setActiveThemeId] = useState(design.themeId ?? themeIds[0]);

  useEffect(() => {
    trackInviteEvent(
      { eventType: "TEMPLATE_PREVIEW_OPEN", templateSlug, metadata: { tier } },
      `preview-open:${templateSlug}`
    );
  }, [templateSlug, tier]);

  const activeTheme = getInvitationTheme(activeThemeId) ?? design.theme;

  const themedDesign = useMemo(
    () => (activeTheme ? applyThemeToDesign(design, activeTheme) : design),
    [design, activeTheme]
  );

  const previewEvent = useMemo(
    () => ({
      title: event.title,
      hostName: event.hostName,
      description: event.description,
      startDate: event.startDate,
      startDateRaw: event.startDateRaw ?? new Date().toISOString(),
      venueName: event.venueName,
      landmark: event.landmark,
      mapsLink: event.mapsLink,
      contactPhone: event.contactPhone,
      dressCode: event.dressCode,
      coverImageUrl: event.coverImageUrl,
    }),
    [event]
  );

  if (!activeTheme) return null;

  function switchTheme(nextId: string) {
    if (nextId === activeThemeId) return;
    trackInviteEvent({
      eventType: "THEME_SWITCH",
      templateSlug,
      metadata: { from: activeThemeId, to: nextId },
    });
    setActiveThemeId(nextId);
  }

  const useHref = `/invitations/create/start?template=${templateSlug}&package=celebration&eventType=${eventType}&theme=${activeThemeId}`;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={themeToCssVars(activeTheme)}>
      {/* Top chrome: back + name + theme chips */}
      <div
        className="relative z-[70] flex items-center gap-3 px-3 py-2"
        style={{
          background: "var(--inv-color-surface-alt)",
          color: "var(--inv-color-ink)",
          borderBottom: "1px solid color-mix(in srgb, var(--inv-color-accent) 30%, transparent)",
        }}
      >
        <Link
          href="/invitations/catalogue"
          aria-label="Back to catalogue"
          className="inline-flex items-center justify-center h-9 w-9 rounded-full"
          style={{ color: "var(--inv-color-ink)" }}
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ fontFamily: "var(--inv-font-display)" }}>
            {templateName}
          </p>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--inv-color-ink-muted)" }}>
            {tier} · live preview
          </p>
        </div>
        <div className="ml-auto flex gap-2 overflow-x-auto">
          {themeIds.map((id) => {
            const theme = getInvitationTheme(id);
            if (!theme) return null;
            const active = id === activeThemeId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => switchTheme(id)}
                aria-pressed={active}
                title={theme.name}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs whitespace-nowrap"
                style={{
                  border: active
                    ? "2px solid var(--inv-color-accent)"
                    : "1px solid color-mix(in srgb, var(--inv-color-ink) 25%, transparent)",
                  color: "var(--inv-color-ink)",
                  background: "var(--inv-color-surface)",
                }}
              >
                <span
                  aria-hidden
                  className="inline-block h-4 w-4 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${theme.color.surface} 50%, ${theme.color.accent} 50%)`,
                    border: "1px solid color-mix(in srgb, var(--inv-color-ink) 25%, transparent)",
                  }}
                />
                {theme.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Full published pipeline: soft intro → branded DNA intro → opening ceremony → invitation */}
      <div className="relative flex-1 min-h-0 [&_.invite-viewport-embedded]:h-full">
        <PremiumInviteWrapper
          invitation={invitation}
          event={previewEvent}
          design={themedDesign}
          templateSlug={templateSlug}
          embedded
          musicEnabled={false}
          skipTapGate
          skipAnalytics
          rsvpRequired
        />
      </div>

      {/* Pinned conversion CTA */}
      <div
        className="relative z-[70] px-4 py-3"
        style={{
          background: "var(--inv-color-surface-alt)",
          borderTop: "1px solid color-mix(in srgb, var(--inv-color-accent) 30%, transparent)",
        }}
      >
        <Link href={useHref} className="inv-btn inv-btn-primary w-full">
          Use this template
        </Link>
      </div>
    </div>
  );
}
