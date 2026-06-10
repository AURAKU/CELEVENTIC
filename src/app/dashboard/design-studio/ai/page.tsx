"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TemplateBuilder } from "@/components/template-engine/template-builder";
import type { TemplateSchema } from "@/types/template-engine";
import { Wand2, ArrowLeft, Sparkles } from "lucide-react";

const EXAMPLES = [
  "Create a luxury Ghanaian wedding invitation in teal and gold with floral accents, QR admission, RSVP, and premium typography.",
  "Design a funeral memorial card in classic black and white with dignified serif fonts.",
  "Make a futuristic neon concert flyer with bold typography and QR ticket.",
];

export default function AiGeneratorPage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ schema: TemplateSchema; previewDescription: string; decorativeElements: string[] } | null>(null);
  const [error, setError] = useState("");

  async function generate() {
    if (prompt.length < 10) { setError("Describe your design in at least 10 characters"); return; }
    setLoading(true);
    setError("");
    const res = await fetch("/api/design-templates/ai-generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
    const d = await res.json();
    if (res.ok) setResult(d.data);
    else setError(d.error);
    setLoading(false);
  }

  async function saveTemplate(schema: TemplateSchema) {
    const res = await fetch("/api/design-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schema }),
    });
    if (res.ok) alert("Template saved to your library!");
    else alert((await res.json()).error);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link href="/dashboard/design-studio"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wand2 className="h-6 w-6 text-purple-600" /> AI Template Generator</h1>
          <p className="text-slate-500 text-sm">Describe your design — AI builds layout JSON, colors, fonts & elements</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Describe Your Design</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} placeholder="Create a luxury Ghanaian wedding invitation..." />
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => setPrompt(ex)} className="text-xs px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 hover:bg-purple-100">
                {ex.slice(0, 50)}...
              </button>
            ))}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={generate} disabled={loading}>
            <Sparkles className="h-4 w-4" /> {loading ? "Generating..." : "Generate Template"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4 text-sm">
              <p className="font-medium">{result.previewDescription}</p>
              <p className="text-slate-600 mt-1">Elements: {result.decorativeElements.join(", ")}</p>
            </CardContent>
          </Card>
          <TemplateBuilder initialSchema={result.schema} onSave={saveTemplate} />
        </div>
      )}
    </div>
  );
}
