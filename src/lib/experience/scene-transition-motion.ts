import type { SceneTransitionId } from "@/lib/experience/experience-types";

export function getSceneTransitionMotion(id: SceneTransitionId = "fade") {
  switch (id) {
    case "slide":
      return {
        initial: { opacity: 0, x: 80 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -80 },
        transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const },
      };
    case "curtain":
      return {
        initial: { opacity: 0, scaleY: 0, originY: 0 },
        animate: { opacity: 1, scaleY: 1 },
        exit: { opacity: 0, scaleY: 0, originY: 1 },
        transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] as const },
      };
    case "door":
      return {
        initial: { opacity: 0, rotateY: -90, transformPerspective: 800 },
        animate: { opacity: 1, rotateY: 0 },
        exit: { opacity: 0, rotateY: 90 },
        transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
      };
    case "book":
      return {
        initial: { opacity: 0, rotateY: -25, x: -40 },
        animate: { opacity: 1, rotateY: 0, x: 0 },
        exit: { opacity: 0, rotateY: 25, x: 40 },
        transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] as const },
      };
    case "sparkle":
      return {
        initial: { opacity: 0, scale: 0.85, filter: "blur(12px) brightness(1.5)" },
        animate: { opacity: 1, scale: 1, filter: "blur(0px) brightness(1)" },
        exit: { opacity: 0, scale: 1.08, filter: "blur(8px)" },
        transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
      };
    case "fade":
    default:
      return {
        initial: { opacity: 0, scale: 0.96, filter: "blur(8px)" },
        animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
        exit: { opacity: 0, scale: 1.03, filter: "blur(6px)" },
        transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] as const },
      };
  }
}
