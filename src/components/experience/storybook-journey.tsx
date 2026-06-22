"use client";

import { motion } from "framer-motion";
import type { JourneyChapter } from "@/lib/experience/experience-types";

interface StorybookJourneyProps {
  chapters: JourneyChapter[];
  accentColor?: string;
}

export function StorybookJourney({ chapters, accentColor = "#0B8A83" }: StorybookJourneyProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Our Story</p>
        <h2 className="font-display text-xl font-bold text-[#0F172A] mt-1">A journey in chapters</h2>
      </div>
      {chapters.map((chapter, i) => (
        <motion.article
          key={chapter.id}
          className="rounded-2xl border bg-white/90 backdrop-blur p-6 shadow-sm inv-journey-step"
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, delay: i * 0.08 }}
        >
          <p className="text-[10px] uppercase tracking-[0.25em] font-semibold mb-2" style={{ color: accentColor }}>
            Chapter {i + 1}
          </p>
          <h3 className="font-display text-lg font-bold text-[#0F172A]">{chapter.title}</h3>
          {chapter.body && (
            <p className="mt-3 text-slate-600 text-sm leading-relaxed whitespace-pre-line">{chapter.body}</p>
          )}
        </motion.article>
      ))}
    </div>
  );
}
