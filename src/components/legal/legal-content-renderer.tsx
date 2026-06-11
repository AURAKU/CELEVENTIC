"use client";

import Link from "next/link";

function renderInline(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|`[^`]+`)/g);
  return parts.map((part, i) => {
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      if (href.startsWith("/") || href.startsWith("http")) {
        return href.startsWith("/") ? (
          <Link key={i} href={href} className="text-brand-600 font-medium hover:underline">
            {label}
          </Link>
        ) : (
          <a key={i} href={href} className="text-brand-600 font-medium hover:underline" target="_blank" rel="noopener noreferrer">
            {label}
          </a>
        );
      }
    }
    const codeMatch = part.match(/^`([^`]+)`$/);
    if (codeMatch) {
      return (
        <code key={i} className="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-mono text-slate-800">
          {codeMatch[1]}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function isTableBlock(block: string) {
  return block.trim().startsWith("|");
}

function isListBlock(block: string) {
  const lines = block.split("\n").filter(Boolean);
  return lines.length > 0 && lines.every((l) => /^[-*•]\s/.test(l.trim()) || /^\d+\.\s/.test(l.trim()));
}

export function LegalContentRenderer({ content }: { content: string }) {
  const blocks = content.split(/\n\n+/).filter(Boolean);

  return (
    <div className="space-y-5 text-slate-700 leading-relaxed">
      {blocks.map((block, i) => {
        const trimmed = block.trim();

        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={i} className="text-lg font-semibold text-slate-900 mt-8 first:mt-0 border-b border-slate-100 pb-2">
              {trimmed.replace(/^## /, "")}
            </h2>
          );
        }

        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={i} className="text-base font-semibold text-slate-800 mt-6">
              {trimmed.replace(/^### /, "")}
            </h3>
          );
        }

        if (isTableBlock(trimmed)) {
          const rows = trimmed.split("\n").filter((r) => r.trim() && !r.match(/^\|[-| :]+\|$/));
          return (
            <div key={i} className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <tbody>
                  {rows.map((row, ri) => {
                    const cells = row.split("|").filter(Boolean).map((c) => c.trim());
                    const Tag = ri === 0 ? "th" : "td";
                    return (
                      <tr key={ri} className={ri === 0 ? "bg-slate-50 font-semibold" : "border-t"}>
                        {cells.map((cell, ci) => (
                          <Tag key={ci} className="p-2.5 text-left align-top">
                            {renderInline(cell)}
                          </Tag>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }

        if (isListBlock(trimmed)) {
          const lines = trimmed.split("\n").filter(Boolean);
          const ordered = lines.every((l) => /^\d+\.\s/.test(l.trim()));
          const Tag = ordered ? "ol" : "ul";
          return (
            <Tag
              key={i}
              className={ordered ? "list-decimal pl-6 space-y-2" : "list-disc pl-6 space-y-2"}
            >
              {lines.map((line, li) => {
                const text = line.replace(/^[-*•]\s+/, "").replace(/^\d+\.\s+/, "");
                return <li key={li}>{renderInline(text)}</li>;
              })}
            </Tag>
          );
        }

        return (
          <p key={i} className="whitespace-pre-line">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}
