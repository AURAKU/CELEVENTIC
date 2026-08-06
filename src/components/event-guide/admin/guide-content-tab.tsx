"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { GuideProgrammeItem } from "@/lib/event-guide/types";
import type { GuideAction } from "./event-guide-builder";
import type { GuideBuilderState } from "./guide-builder-types";

const SOURCE_COPY = {
  guide: "Edited here",
  invitation: "Inherited from your invitation",
  empty: "Nothing yet",
} as const;

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
  const [importText, setImportText] = useState("");
  const [importOpen, setImportOpen] = useState(false);

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
          {programme.length === 0 ? (
            <p className="text-sm text-slate-500">
              No running order yet. Add items below, or paste one you already have.
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
              <Button variant="outline" onClick={() => setImportOpen((open) => !open)}>
                Paste a programme
              </Button>
            </div>
          ) : null}

          {importOpen && canEdit ? (
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="text-sm font-medium">Paste your running order</p>
              <p className="mt-1 text-xs text-slate-500">
                One item per line. We understand &ldquo;2:00 PM — Ceremony — in the garden&rdquo;,
                &ldquo;Ceremony at 2:00 PM&rdquo; and &ldquo;14:00 Ceremony&rdquo;. Nothing goes live
                until you publish.
              </p>
              <Textarea
                className="mt-2"
                rows={6}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={"2:00 PM — Guests seated\n2:30 PM — Ceremony begins\n4:00 PM — Cocktails"}
              />
              <Button
                className="mt-2"
                disabled={busy || !importText.trim()}
                onClick={async () => {
                  const data = await run("import_programme", { text: importText });
                  if (data?.programme) {
                    setProgramme(data.programme as GuideProgrammeItem[]);
                    setImportText("");
                    setImportOpen(false);
                  }
                }}
              >
                Import for review
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
        <Button
          disabled={busy}
          onClick={() =>
            void run("save_content", {
              programme: programme.filter((item) => item.title.trim()),
              menu: { body: menuBody, url: menuUrl || null, sections: state.content.menu.sections },
              attachments: state.content.attachments,
            })
          }
        >
          Save content
        </Button>
      ) : null}
    </div>
  );
}
