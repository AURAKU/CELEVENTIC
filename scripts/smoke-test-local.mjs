/**
 * Smoke test localhost:3000 — public pages + auth + key APIs.
 * Run: node scripts/smoke-test-local.mjs
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const PUBLIC_ROUTES = [
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/legal",
  "/legal/privacy",
  "/legal/terms",
  "/pricing",
  "/marketplace",
  "/discover",
  "/invitations",
  "/templates",
];

const PROTECTED_ROUTES = [
  "/dashboard",
  "/dashboard/messages",
  "/dashboard/vendor-portal",
  "/admin",
  "/admin/users",
  "/admin/integrations",
  "/admin/music",
];

async function checkRoute(path, expectRedirect = false) {
  try {
    const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
    const ok = expectRedirect
      ? res.status >= 300 && res.status < 400
      : res.status >= 200 && res.status < 400;
    return { path, status: res.status, ok };
  } catch (e) {
    return { path, status: 0, ok: false, error: e.message };
  }
}

async function login(identifier, password) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const cookies = csrfRes.headers.getSetCookie?.() ?? [];

  const body = new URLSearchParams({
    csrfToken,
    identifier,
    password,
    redirect: "false",
    json: "true",
  });

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookies.map((c) => c.split(";")[0]).join("; "),
    },
    body,
    redirect: "manual",
  });

  const setCookies = loginRes.headers.getSetCookie?.() ?? [];
  const sessionCookie = setCookies.find((c) => c.includes("session-token") || c.includes("next-auth"));
  const allCookies = [...cookies, ...setCookies].map((c) => c.split(";")[0]).join("; ");

  const sessionRes = await fetch(`${BASE}/api/auth/session`, {
    headers: { Cookie: allCookies },
  });
  const session = await sessionRes.json();

  return {
    loginStatus: loginRes.status,
    hasSession: !!session?.user?.id,
    role: session?.user?.role,
    cookies: allCookies,
  };
}

async function checkAuthedApi(path, cookies) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Cookie: cookies },
  });
  const data = await res.json().catch(() => ({}));
  return { path, status: res.status, ok: res.ok, success: data.success };
}

async function main() {
  console.log(`\nSmoke testing ${BASE}\n`);

  let failed = 0;

  console.log("--- Public pages ---");
  for (const path of PUBLIC_ROUTES) {
    const r = await checkRoute(path);
    const mark = r.ok ? "OK" : "FAIL";
    if (!r.ok) failed++;
    console.log(`  [${mark}] ${path} → ${r.status}${r.error ? ` (${r.error})` : ""}`);
  }

  console.log("\n--- Protected pages (expect redirect) ---");
  for (const path of PROTECTED_ROUTES) {
    const r = await checkRoute(path, true);
    const mark = r.ok ? "OK" : "FAIL";
    if (!r.ok) failed++;
    console.log(`  [${mark}] ${path} → ${r.status}`);
  }

  console.log("\n--- Auth: admin login ---");
  const admin = await login("admin@celeventic.com", "Admin@123");
  const adminOk = admin.hasSession && admin.role === "SUPER_ADMIN";
  if (!adminOk) failed++;
  console.log(`  [${adminOk ? "OK" : "FAIL"}] session=${admin.hasSession} role=${admin.role}`);

  if (adminOk) {
    console.log("\n--- Admin APIs ---");
    for (const path of ["/api/notifications", "/api/messages", "/api/admin/users?limit=5"]) {
      const r = await checkAuthedApi(path, admin.cookies);
      const mark = r.ok ? "OK" : "FAIL";
      if (!r.ok) failed++;
      console.log(`  [${mark}] ${path} → ${r.status} success=${r.success}`);
    }
  }

  console.log("\n--- Auth: organizer login ---");
  const org = await login("organizer@celeventic.com", "Organizer@123");
  const orgOk = org.hasSession;
  if (!orgOk) failed++;
  console.log(`  [${orgOk ? "OK" : "FAIL"}] session=${org.hasSession} role=${org.role}`);

  if (orgOk) {
    console.log("\n--- Organizer APIs ---");
    for (const path of ["/api/notifications", "/api/messages", "/api/vendor-os/leads"]) {
      const r = await checkAuthedApi(path, org.cookies);
      const mark = r.ok ? "OK" : "FAIL";
      if (!r.ok) failed++;
      console.log(`  [${mark}] ${path} → ${r.status} success=${r.success}`);
    }
  }

  console.log(`\n${failed === 0 ? "All checks passed." : `${failed} check(s) failed.`}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
