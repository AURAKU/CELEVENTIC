"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  ClipboardPaste,
  ListPlus,
  Plus,
  Trash2,
  Undo2,
  WandSparkles,
} from "lucide-react";
import {
  mergeProgrammeEntries,
  parseProgrammePaste,
  toProgrammeItems,
} from "@/lib/event-guide/programme-paste";
import type { GuideProgrammeItem } from "@/lib/event-guide/types";
import type { GuideAction } from "./event-guide-builder";
import type { GuideBuilderState } from "./guide-builder-types";

const SOURCE_COPY = {
  guide: "Edited here",
  invitation: "Inherited from your invitation",
  empty: "Nothing yet",
} as const;

const PASTE_PLACEHOLDER = [
  "1:00 PM - Guest Arrival",
  "1:30 PM - Opening Prayer",
  "CEREMONY",
  "2:00 PM - Exchange of Vows",
  "  Officiated by Rev. Mensah",
].join("\n");

/**
 * Programme and menu editors.
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
  const [programme, setProgramme] = useState<GuideProgrammeItem[]>(state.content.programme);
  const [menuBody, setMenuBody] = useState(state.content.menu.body);
  const [menuUrl, setMenuUrl] = useState(state.content.menu.url ?? "");
  const [pasteText, setPasteText] = useState("");
  const [undoSnapshot, setUndoSnapshot] = useState<GuideProgrammeItem[] | null>(null);
  const [applied, setApplied] = useState<number | null>(null);

  // Parsed on every keystroke so the organizer sees what we read before they
  // commit to it. Nothing leaves the browser until they save.
  const paste = useMemo(() => parseProgrammePaste(pasteText), [pasteText]);
  const pasteHasText = pasteText.trim().length > 0;
  const pasteUnreadable = pasteHasText && paste.entries.length === 0;

  const unsaved = useMemo(
    () => JSON.stringify(programme) !== JSON.stringify(state.content.programme),
    [programme, state.content.programme]
  );

  function update(index: number, patch: Partial<GuideProgrammeItem>) {
    setProgramme((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function move(index: number, direction: -1 | 1) {
    setProgramme((items) => {
      const target = index + direction;
      if (target < 0 || target >= items.length) return items;
      const next = [...items];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  function applyPaste(mode: "replace" | "append") {
    const incoming = toProgrammeItems(paste.entries);
    if (incoming.length === 0) return;
    setUndoSnapshot(programme);
    setProgramme((current) => mergeProgrammeEntries(current, incoming, mode));
    setApplied(incoming.length);
    setPasteText("");
  }

  function undoPaste() {
    if (!undoSnapshot) return;
    setProgramme(undoSnapshot);
    setUndoSnapshot(null);
    setApplied(null);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="stack-mobile">
          <CardTitle className="text-base">Programme</CardTitle>
          <Badge variant="outline" className="shrink-0">
            {SOURCE_COPY[state.content.programmeSource]}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {canEdit ? (
            <section
              data-testid="programme-paste"
              className="rounded-xl border border-teal-200 bg-teal-50/60 p-4"
            >
              <div className="flex items-start gap-2">
                <ClipboardPaste className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-teal-900">
                    Paste your programme and we&rsquo;ll fill it in
                  </h3>
                  <p className="mt-0.5 text-xs text-teal-800/80">
                    Drop in the running order you already have — one item per line. We read
                    &ldquo;1:00 PM - Guest Arrival&rdquo;, &ldquo;14:00 Ceremony&rdquo;,
                    &ldquo;Ceremony at 2:00 PM&rdquo;, headings like &ldquo;CEREMONY&rdquo;, and
                    indented lines as extra detail. This only fills the draft below — guests see
                    nothing until you publish.
                  </p>
                </div>
              </div>

              <label className="sr-only" htmlFor="programme-paste-input">
                Paste your programme
              </label>
              <Textarea
                id="programme-paste-input"
                className="mt-3 bg-white font-mono text-[0.8rem]"
                rows={6}
                spellCheck={false}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={PASTE_PLACEHOLDER}
              />

              {pasteUnreadable ? (
                <p
                  role="alert"
                  className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                >
                  <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    We could not read a programme from that. Put one item on each line, like
                    &ldquo;2:00 PM - Ceremony begins&rdquo;.
                  </span>
                </p>
              ) : null}

              {paste.entries.length > 0 ? (
                <div className="mt-3">
                  <p className="text-xs font-medium text-teal-900">
                    We read {paste.entries.length}{" "}
                    {paste.entries.length === 1 ? "entry" : "entries"}
                    {paste.sectionCount > 0
                      ? ` (${paste.sectionCount} read as a heading)`
                      : ""}
                    . Check it, then fill the form.
                  </p>
                  <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-teal-200 bg-white p-2">
                    {paste.entries.map((entry) => (
                      <li
                        key={entry.id}
                        className={
                          entry.isSection
                            ? "rounded px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500"
                            : "flex gap-2 rounded px-2 py-1 text-xs"
                        }
                      >
                        {entry.isSection ? (
                          entry.title
                        ) : (
                          <>
                            <span className="w-24 shrink-0 tabular-nums text-slate-500">
                              {entry.time || "—"}
                            </span>
                            <span className="min-w-0">
                              <span className="font-medium text-slate-900">{entry.title}</span>
                              {entry.description ? (
                                <span className="block text-slate-500">{entry.description}</span>
                              ) : null}
                            </span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>

                  {paste.truncated ? (
                    <p className="mt-1 text-xs text-amber-800">
                      That paste was longer than a guide can carry. We kept the first 60 entries.
                    </p>
                  ) : null}
                  {paste.strippedMarkup ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Formatting from the copied document was removed. The wording is unchanged.
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => applyPaste("replace")}>
                      <WandSparkles className="mr-1 h-4 w-4" />
                      {programme.length > 0 ? "Replace programme" : "Fill the programme"}
                    </Button>
                    {programme.length > 0 ? (
                      <Button size="sm" variant="outline" onClick={() => applyPaste("append")}>
                        <ListPlus className="mr-1 h-4 w-4" /> Add to the end
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" onClick={() => setPasteText("")}>
                      Clear
                    </Button>
                  </div>
                </div>
              ) : null}

              {applied !== null ? (
                <p
                  role="status"
                  className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900"
                >
                  <span>
                    Filled {applied} {applied === 1 ? "entry" : "entries"} into the draft below.
                    Review it, then save.
                  </span>
                  {undoSnapshot ? (
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={undoPaste}>
                      <Undo2 className="mr-1 h-3.5 w-3.5" /> Undo
                    </Button>
                  ) : null}
                </p>
              ) : null}
            </section>
          ) : null}

          {programme.length === 0 ? (
            <p className="text-sm text-slate-500">
              No running order yet. Paste one above, or add items by hand.
            </p>
          ) : null}

          {programme.map((item, index) => (
            <div key={item.id} className="rounded-lg border p-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  className="sm:w-32"
                  placeholder="2:00 PM"
                  value={item.time}
                  disabled={!canEdit}
                  onChange={(e) => update(index, { time: e.target.value })}
                />
                <Input
                  placeholder="Ceremony begins"
                  value={item.title}
                  disabled={!canEdit}
                  onChange={(e) => update(index, { title: e.target.value })}
                />
              </div>
              <Input
                className="mt-2"
                placeholder="Optional detail for guests"
                value={item.description ?? ""}
                disabled={!canEdit}
                onChange={(e) => update(index, { description: e.target.value })}
              />
              {canEdit ? (
                <div className="mt-2 flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => move(index, -1)} aria-label="Move up">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => move(index, 1)} aria-label="Move down">
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Remove item"
                    onClick={() => setProgramme((items) => items.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4 text-rose-600" />
                  </Button>
                </div>
              ) : null}
            </div>
          ))}

          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  setProgramme((items) => [
                    ...items,
                    { id: `new-${Date.now()}-${items.length}`, time: "", title: "" },
                  ])
                }
              >
                <Plus className="mr-1 h-4 w-4" /> Add item
              </Button>
            </div>
          ) : null}
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
          <Textarea
            rows={8}
            value={menuBody}
            disabled={!canEdit}
            onChange={(e) => setMenuBody(e.target.value)}
            placeholder={"Starters\nGroundnut soup\nKelewele\n\nMains\nJollof rice with grilled chicken"}
          />
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
              const saved = await run("save_content", {
                programme: programme.filter((item) => item.title.trim()),
                menu: {
                  body: menuBody,
                  url: menuUrl || null,
                  sections: state.content.menu.sections,
                },
                attachments: state.content.attachments,
              });
              if (saved) {
                setApplied(null);
                setUndoSnapshot(null);
              }
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
