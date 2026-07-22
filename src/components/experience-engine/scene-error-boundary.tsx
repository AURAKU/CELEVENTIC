"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface SceneErrorBoundaryProps {
  sceneId?: string;
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  message?: string;
}

/**
 * Scene-level isolation — one failed scene must not crash the invitation.
 */
export class SceneErrorBoundary extends Component<SceneErrorBoundaryProps, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[ExperienceEngine] Scene "${this.props.sceneId ?? "unknown"}" failed:`,
        error,
        info.componentStack
      );
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) return this.props.fallback;
      return (
        <div
          className="flex min-h-[8rem] w-full items-center justify-center px-4 py-8 text-center text-sm opacity-70"
          role="status"
          data-scene-error={this.props.sceneId ?? "unknown"}
        >
          This section couldn&apos;t load. The rest of your invitation is still available.
        </div>
      );
    }
    return this.props.children;
  }
}
