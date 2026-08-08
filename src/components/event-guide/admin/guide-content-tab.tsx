"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CircleAlert, Eye, PenLine, RotateCcw } from "lucide-react";
import { GuideProgramme } from "@/components/event-guide/guide-programme";
import { GuideMenuPanel } from "@/components/event-guide/guide-menu";
import {
  parseProgrammeScript,
  programmeItemsToScript,
} from "@/lib/event-guide/programme-script";
import { guideFontStyles } from "@/lib/event-guide/theme";
import type { GuideAction } from "./event-guide-builder";
import type { GuideBuilderState } from "./guide-builder-types";

const SOURCE_COPY = {
  guide: "Edited here",
  invitation: "Inherited from your invitation",
  empty: "Nothing yet",
} as const;

const SOURCE_HINT = {
  guide: "This guide keeps its own programme. Editing it here does not touch your invitation.",
  invitation:
    "This is your invitation's programme, written out below. Edit it and save to take it over here — your invitation stays as it is.",
  empty: "Type or paste the running order below. It is a document, not a form.",
} as const;

const SCRIPT_PLACEHOLDER = [
  "1:00 PM - Guest arrival",
  "  Welcome drinks are served on the lawn.",
  "",
  "CEREMONY",
  "2:00 PM - Exchange of vows",
  "  Officiated by Rev. Mensah.",
  "",
  "  Guests are asked to stay seated until the recessional.",
  "",
  "OPENING HYMN",
  "Captain of Israel's host",
  "  Captain of Israel's host, and Guide",
  "  Of all who seek the land above,",
  "",
  "4:30 PM - Reception & dinner",
].join("\n");

/**
 * Programme and menu editors.
 *
 * The programme is written as one script — the way an organizer already has it
 * in a WhatsApp message or a Word file — and arranged for guests as they type.
 * There is no row-by-row form to fill in: the document is the source of truth,
 * and the preview beside it is the guest's page, not an approximation of it.
 *
 * The inheritance badge matters: an organizer needs to know at a glance whether
 * they are looking at their invitation's programme (which will keep updating)
 * or a copy they have taken over here.
 */
export function GuideContentTab({
  state,
  run,
  busy,
}: {
  state: GuideBuilderState;
  run: GuideAction;
  busy: boolean;
}) {
  const canEdit = state.permissions.canManage;

  // An inherited or pre-script programme opens as the script that would have
  // produced it, so the organizer edits words rather than starting again.
  const savedScript = useMemo(
    () => state.content.programmeScript || programmeItemsToScript(state.content.programme),
    [state.content.programmeScript, state.content.programme]
  );

  const [script, setScript] = useState(savedScript);
  const [menuBody, setMenuBody] = useState(state.content.menu.body);
  const [menuUrl, setMenuUrl] = useState(state.content.menu.url ?? "");

  // Parsed on every keystroke: the preview is the same pipeline the server
  // stores with, so nothing changes shape between here and the guest's phone.
  const parsed = useMemo(() => parseProgrammeScript(script), [script]);
  const scriptHasText = script.trim().length > 0;
  const unreadable = scriptHasText && parsed.items.length === 0;
  const unsaved = script.trim() !== savedScript.trim();

  const theme = state.preview.theme;
  const fonts = useMemo(() => guideFontStyles(theme.fonts), [theme.fonts]);

  const entryCount = parsed.items.length - parsed.sectionCount;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="stack-mobile">
          <div className="min-w-0">
            <CardTitle className="text-base">Programme</CardTitle>
            <CardDescription className="mt-1 text-xs">
              {SOURCE_HINT[state.content.programmeSource]}
            </CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0">
            {SOURCE_COPY[state.content.programmeSource]}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <section data-testid="programme-script" className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="programme-script-input"
                  className="flex items-center gap-2 text-sm font-semibold text-slate-800"
                >
                  <PenLine aria-hidden className="h-4 w-4 text-brand-600" />
                  Your programme script
                </label>
                {canEdit && scriptHasText ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setScript(savedScript)}
                    disabled={!unsaved}
                  >
                    <RotateCcw className="mr-1 h-3.5 w-3.5" /> Revert
                  </Button>
                ) : null}
              </div>

              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Type it or paste it — from WhatsApp, Word, anywhere, in any language. One item per
                line. Indent a line, or write a sentence, and it becomes detail under the item
                above it. A line like <span className="font-medium text-slate-600">CEREMONY</span>{" "}
                becomes a heading, and a hymn keeps its verses. Nothing you paste is left out.
              </p>

              <Textarea
                id="programme-script-input"
                data-testid="programme-script-input"
                className="mt-2 min-h-[22rem] resize-y bg-white font-mono text-[0.82rem] leading-[1.8] tracking-tight text-slate-800"
                spellCheck={false}
                dir="auto"
                value={script}
                disabled={!canEdit}
                onChange={(e) => setScript(e.target.value)}
                placeholder={SCRIPT_PLACEHOLDER}
                aria-describedby="programme-script-markup"
              />

              {/*
                The override, in one line, directly under the box it applies to.
                An organizer who disagrees with what the preview did needs to
                find the fix without leaving the field they are typing in.
              */}
              <p
                id="programme-script-markup"
                data-testid="programme-script-markup-hint"
                className="mt-1.5 text-[0.7rem] leading-relaxed text-slate-500"
              >
                Not what you meant? Start a line with{" "}
                <code className="rounded bg-slate-100 px-1 font-mono text-slate-700">#</code> to
                force a heading, or{" "}
                <code className="rounded bg-slate-100 px-1 font-mono text-slate-700">&gt;</code>{" "}
                (or an indent) to tuck it under the line above.
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-slate-500">
                <span aria-live="polite">
                  {parsed.items.length === 0
                    ? "Nothing read yet"
                    : `${entryCount} ${entryCount === 1 ? "entry" : "entries"}${
                        parsed.sectionCount > 0
                          ? ` · ${parsed.sectionCount} ${
                              parsed.sectionCount === 1 ? "heading" : "headings"
                            }`
                          : ""
                      }`}
                </span>
                <span aria-hidden>·</span>
                <span className="tabular-nums">{script.length.toLocaleString()} characters</span>
              </div>

              {unreadable ? (
                <p
                  role="alert"
                  className="mt-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900"
                >
                  <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    We could not read a programme from that. Put one item on each line, like
                    &ldquo;2:00 PM - Ceremony begins&rdquo;.
                  </span>
                </p>
              ) : null}
              {parsed.truncated ? (
                <p className="mt-2 text-xs text-amber-800">
                  That script is longer than a guide will carry. We kept the first 150 entries.
                </p>
              ) : null}
              {parsed.shortened ? (
                <p className="mt-2 text-xs text-amber-800">
                  A very long line was shortened to fit. Check it in the preview.
                </p>
              ) : null}
              {parsed.strippedMarkup ? (
                <p className="mt-2 text-xs text-slate-500">
                  Formatting from the copied document was removed. Every letter, accent and emoji
                  you pasted is kept as written.
                </p>
              ) : null}
            </section>

            <section className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Eye aria-hidden className="h-4 w-4 text-brand-600" />
                What guests will see
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Live, in your guide&rsquo;s own colours and type. Guests see nothing until you
                publish.
              </p>

              <div
                data-testid="programme-live-preview"
                className="mt-2 max-h-[32rem] overflow-y-auto rounded-2xl border border-slate-200 p-4 shadow-inner sm:p-5"
                style={
                  {
                    "--guide-primary": theme.colors.primary,
                    "--guide-secondary": theme.colors.secondary,
                    "--guide-label": theme.labelColor ?? theme.colors.secondary,
                    "--guide-paper": theme.paperWash,
                    "--guide-hairline": theme.accentWash,
                    background: theme.colors.background,
                    color: theme.colors.text,
                    fontFamily: fonts.body,
                  } as CSSProperties
                }
              >
                {parsed.items.length > 0 ? (
                  <GuideProgramme items={parsed.items} attachments={[]} fonts={fonts} />
                ) : (
                  <p className="py-10 text-center text-sm opacity-70">
                    Your running order will appear here as you write it.
                  </p>
                )}
              </div>
            </section>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="stack-mobile">
          <CardTitle className="text-base">Menu</CardTitle>
          <Badge variant="outline" className="shrink-0">
            {SOURCE_COPY[state.content.menuSource]}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="min-w-0">
              <label
                htmlFor="guide-menu-body"
                className="flex items-center gap-2 text-sm font-semibold text-slate-800"
              >
                <PenLine aria-hidden className="h-4 w-4 text-brand-600" />
                What is being served
              </label>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Type it or paste it, exactly as the caterer sent it. A line like{" "}
                <span className="font-medium text-slate-600">STARTERS</span>,{" "}
                <span className="font-medium text-slate-600">*Starters*</span> or{" "}
                <span className="font-medium text-slate-600">Starters:</span> becomes a course, and
                the dishes under it become its list. Nothing you paste is left off the menu.
              </p>
              <Textarea
                id="guide-menu-body"
                data-testid="guide-menu-input"
                className="mt-2 min-h-[16rem] resize-y bg-white font-mono text-[0.82rem] leading-[1.8] text-slate-800"
                dir="auto"
                spellCheck={false}
                value={menuBody}
                disabled={!canEdit}
                onChange={(e) => setMenuBody(e.target.value)}
                placeholder={"STARTERS\nGroundnut soup\nKelewele\n\nMAIN DISHES\nJollof rice with grilled chicken"}
              />
            </section>

            <section className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Eye aria-hidden className="h-4 w-4 text-brand-600" />
                What guests will see
              </p>
              <p className="mt-1 text-xs text-slate-500">
                The same menu card your guests get, in your guide&rsquo;s own colours and type.
              </p>
              <div
                data-testid="menu-live-preview"
                className="mt-2 max-h-[26rem] overflow-y-auto rounded-2xl border border-slate-200 p-4 shadow-inner sm:p-5"
                style={
                  {
                    "--guide-accent": theme.colors.accent,
                    "--guide-primary": theme.colors.primary,
                    "--guide-secondary": theme.colors.secondary,
                    "--guide-label": theme.labelColor ?? theme.colors.secondary,
                    "--guide-paper": theme.paperWash,
                    "--guide-hairline": theme.accentWash,
                    background: theme.colors.background,
                    color: theme.colors.text,
                    fontFamily: fonts.body,
                  } as CSSProperties
                }
              >
                <GuideMenuPanel
                  menu={{ body: menuBody, sections: state.content.menu.sections, url: null }}
                  attachments={[]}
                  fonts={fonts}
                />
              </div>
            </section>
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="guide-menu-url">
              Link to a full menu (optional)
            </label>
            <Input
              id="guide-menu-url"
              className="mt-1"
              value={menuUrl}
              disabled={!canEdit}
              onChange={(e) => setMenuUrl(e.target.value)}
              placeholder="https://…"
            />
            <p className="mt-1 text-xs text-slate-500">
              Guests still read the menu above on the page. A link is an extra, not a replacement.
            </p>
          </div>
        </CardContent>
      </Card>

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={busy}
            onClick={async () => {
              await run("save_content", {
                programmeScript: script,
                menu: {
                  body: menuBody,
                  url: menuUrl || null,
                  sections: state.content.menu.sections,
                },
                attachments: state.content.attachments,
              });
            }}
          >
            Save content
          </Button>
          {unsaved ? (
            <span className="text-sm text-amber-800">
              You have programme changes that are not saved yet.
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
