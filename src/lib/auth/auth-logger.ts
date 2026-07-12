const DEV = process.env.NODE_ENV === "development";

export type AuthLogEvent =
  | "login_attempt"
  | "login_success"
  | "login_failure"
  | "jwt_sync"
  | "jwt_invalidated"
  | "admin_verify"
  | "startup_check";

export function authLog(
  event: AuthLogEvent,
  detail: Record<string, unknown> = {}
): void {
  if (!DEV) return;
  console.info("[auth]", JSON.stringify({ ts: new Date().toISOString(), event, ...detail }));
}
