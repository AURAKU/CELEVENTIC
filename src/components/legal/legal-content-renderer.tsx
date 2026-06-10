"use client";

export function LegalContentRenderer({ content }: { content: string }) {
  const blocks = content.split(/\n\n+/).filter(Boolean);

  return (
    <div className="space-y-5 text-slate-700 leading-relaxed">
      {blocks.map((block, i) => {
        if (block.startsWith("## ")) {
          return (
            <h2 key={i} className="text-lg font-semibold text-slate-900 mt-8 first:mt-0">
              {block.replace(/^## /, "")}
            </h2>
          );
        }
        if (block.startsWith("| ")) {
          const rows = block.split("\n").filter((r) => r.trim() && !r.match(/^\|[-| ]+\|$/));
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
                          <Tag key={ci} className="p-2 text-left">{cell}</Tag>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line">{block}</p>
        );
      })}
    </div>
  );
}
