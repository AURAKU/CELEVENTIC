"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import type { SceneTransitionId } from "@/lib/experience/experience-types";
import { getSceneTransitionMotion } from "@/lib/experience/scene-transition-motion";
import { SceneErrorBoundary } from "@/components/experience-engine/scene-error-boundary";
import { cn } from "@/lib/utils";

interface ExperienceSceneProps {
  id: string;
  label?: string;
  children: ReactNode;
  className?: string;
  transition?: SceneTransitionId;
  /** When true, skip motion (preview thumbnails / reduced motion parent). */
  staticRender?: boolean;
}

export function ExperienceScene({
  id,
  label,
  children,
  className,
  transition = "fade",
  staticRender = false,
}: ExperienceSceneProps) {
  const reduced = useReducedMotion();
  const motionCfg = getSceneTransitionMotion(transition);
  const disableMotion = staticRender || reduced;

  return (
    <SceneErrorBoundary sceneId={id}>
      <section
        id={id}
        aria-label={label ?? id}
        data-experience-scene={id}
        className={cn("experience-scene relative w-full", className)}
      >
        {disableMotion ? (
          <div className="w-full">{children}</div>
        ) : (
          <motion.div
            className="w-full"
            initial={motionCfg.initial}
            whileInView={motionCfg.animate}
            viewport={{ once: true, amount: 0.2 }}
            transition={motionCfg.transition}
          >
            {children}
          </motion.div>
        )}
      </section>
    </SceneErrorBoundary>
  );
}
