"use client";

import { useEffect } from "react";

/**
 * Root error boundary — keep dependencies minimal.
 * Heavy UI imports here can break the production SSR module graph.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "system-ui, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            borderRadius: 16,
            border: "1px solid #e2e8f0",
            background: "#fff",
            padding: 32,
            textAlign: "center",
            boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.5, color: "#475569" }}>
            Celeventic hit an unexpected error. Try again, or return home.
          </p>
          <div style={{ marginTop: 24, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                border: 0,
                borderRadius: 8,
                padding: "10px 16px",
                background: "#0d9488",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            {/* Plain <a>: global-error must not import next/link (breaks SSR module graph). */}
            <button
              type="button"
              onClick={() => {
                window.location.assign("/");
              }}
              style={{
                borderRadius: 8,
                padding: "10px 16px",
                border: "1px solid #cbd5e1",
                background: "#fff",
                color: "#0f172a",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Go home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
