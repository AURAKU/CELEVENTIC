"use client";

import { cn } from "@/lib/utils";
import type { EventLifecyclePhase, LifecycleStepId } from "@/lib/experience/lifecycle";
import { PORTAL_LIFECYCLE_STEPS } from "@/lib/experience/lifecycle";

interface ExperienceLifecycleRailProps {
  lifecyclePhase: EventLifecyclePhase;
  activeStep?: LifecycleStepId;
  accentColor?: string;
}

export function ExperienceLifecycleRail({
  lifecyclePhase,
  activeStep = "journey",
  accentColor = "#0B8A83",
}: ExperienceLifecycleRailProps) {
  const steps = PORTAL_LIFECYCLE_STEPS.filter((step) => {
    if (step.id === "event-day" && lifecyclePhase === "pre-event") return false;
    if (step.id === "post-event" && lifecyclePhase === "pre-event") return false;
    return true;
  });

  function scrollToStep(sectionId?: string) {
    if (sectionId) {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className="border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-2xl px-2 py-2">
        <div className="flex gap-1 overflow-x-auto scrollbar-thin pb-1">
          {steps.map((step, i) => {
            const isActive = step.id === activeStep;
            const isPast = steps.findIndex((s) => s.id === activeStep) > i;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => scrollToStep(step.sectionId)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide transition-colors touch-manipulation",
                  isActive
                    ? "text-white shadow-sm"
                    : isPast
                      ? "text-slate-500 bg-slate-100"
                      : "text-slate-400 hover:bg-slate-50"
                )}
                style={isActive ? { backgroundColor: accentColor } : undefined}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isActive ? "bg-white" : isPast ? "bg-[#D4A63A]" : "bg-slate-300"
                  )}
                />
                {step.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
