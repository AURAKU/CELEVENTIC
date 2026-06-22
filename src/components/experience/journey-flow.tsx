"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { JourneyChapter } from "@/lib/experience/experience-types";

interface JourneyFlowProps {
  chapters: JourneyChapter[];
  children: (chapter: JourneyChapter, index: number) => React.ReactNode;
}

export function JourneyFlow({ chapters, children }: JourneyFlowProps) {
  const [step, setStep] = useState(0);
  const chapter = chapters[step];
  const transitionClass = "inv-journey-step";

  return (
    <div className="min-h-[60vh] flex flex-col">
      <div className="flex items-center justify-between px-2 mb-4">
        <p className="text-xs text-slate-500">
          Chapter {step + 1} of {chapters.length}
        </p>
        <p className="text-sm font-semibold text-[#0F172A]">{chapter.title}</p>
      </div>

      <div className={`flex-1 ${transitionClass}`} key={chapter.id}>
        {children(chapter, step)}
      </div>

      <div className="flex gap-2 mt-6 sticky bottom-4 z-30">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <Button
          type="button"
          className="flex-1 bg-[#0B8A83]"
          disabled={step >= chapters.length - 1}
          onClick={() => setStep((s) => s + 1)}
        >
          Continue <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
