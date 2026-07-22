"use client";

import type { ReactNode } from "react";
import type { ExperienceSequenceDef } from "@/lib/experience-engine/types";
import { ExperienceScene } from "@/components/experience-engine/experience-scene";
import { SceneTransition } from "@/components/experience-engine/scene-transition";
import { cn } from "@/lib/utils";

interface ExperienceSequenceProps {
  sequence: ExperienceSequenceDef;
  children?: ReactNode;
  /** Render function per scene when children not provided as map. */
  renderScene?: (sceneId: string, index: number) => ReactNode;
  className?: string;
  staticRender?: boolean;
}

/**
 * Ordered scene list with shared transition language.
 * Does not replace GuestInvitationPortal sections — templates can adopt incrementally.
 */
export function ExperienceSequence({
  sequence,
  children,
  renderScene,
  className,
  staticRender = false,
}: ExperienceSequenceProps) {
  const sorted = [...sequence.scenes].sort((a, b) => a.order - b.order);

  return (
    <div
      className={cn("experience-sequence flex w-full flex-col", className)}
      data-experience-sequence={sequence.id}
    >
      {children ??
        sorted.map((scene, index) => (
          <SceneTransition key={scene.id} transition={sequence.transition} staticRender={staticRender}>
            <ExperienceScene
              id={scene.sectionId ?? scene.id}
              label={scene.label}
              transition={sequence.transition}
              staticRender={staticRender}
            >
              {renderScene?.(scene.id, index) ?? null}
            </ExperienceScene>
          </SceneTransition>
        ))}
    </div>
  );
}
