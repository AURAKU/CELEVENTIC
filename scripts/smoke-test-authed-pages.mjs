/**
 * Authenticated page load test — verifies dashboard/admin pages return 200 when logged in.
 * Run: node scripts/smoke-test-authed-pages.mjs
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const DASHBOARD_ROUTES = [
  "/dashboard",
  "/dashboard/events",
  "/dashboard/guests",
  "/dashboard/tickets",
  "/dashboard/seating",
  "/dashboard/flyers",
  "/dashboard/discovery",
  "/dashboard/messages",
  "/dashboard/campaigns",
  "/dashboard/funeral",
  "/dashboard/design-studio",
  "/dashboard/design-studio/templates",
  "/dashboard/invitations",
  "/dashboard/inspiration",
  "/dashboard/wallet",
  "/dashboard/contributions",
  "/dashboard/memory",
  "/dashboard/qr-admission",
  "/dashboard/settings",
  "/dashboard/vendor-portal",
  "/dashboard/ai-planner",
  "/dashboard/privacy-center",
];

const ADMIN_ROUTES = [
  "/admin",
  "/admin/users",
  "/admin/vendors",
  "/admin/events",
  "/admin/integrations",
  "/admin/music",
  "/admin/pages",
  "/admin/inspiration",
  "/admin/payments",
  "/admin/audit-logs",
  "/admin/templates",
  "/admin/invitation-templates",
  "/admin/packages",
  "/admin/contact",
  "/admin/legal",
  "/admin/invitation-orders",
  "/admin/analytics",
  "/admin/commerce",
  "/admin/modules",
  "/admin/qr-branding",
  "/admin/translations",
  "/admin/revisions",
  "/admin/reviews",
  "/admin/services",
  "/admin/security",
];

const PUBLIC_EXTRA = [
  "/templates",
  "/invitations/templates/royal-emerald-wedding",
  "/invitations/templates/midnight-velvet-reception",
  "/invitations/templates/corporate-prestige-summit",
  "/contact",
];

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
  const allCookies = [...cookies, ...setCookies].map((c) => c.split(";")[0]).join("; ");

  const sessionRes = await fetch(`${BASE}/api/auth/session`, {
    headers: { Cookie: allCookies },
  });
  const session = await sessionRes.json();

  return { cookies: allCookies, session };
}

async function check(path, cookies, label) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      redirect: "manual",
      headers: cookies ? { Cookie: cookies } : {},
    });
    const ok = res.status >= 200 && res.status < 400;
    const body = ok ? "" : (await res.text()).slice(0, 120);
    return { path, status: res.status, ok, label, hint: body };
  } catch (e) {
    return { path, status: 0, ok: false, label, hint: e.message };
  }
}

async function main() {
  console.log(`\nAuthenticated page test — ${BASE}\n`);
  let failed = 0;

  console.log("--- Public extra routes ---");
  for (const path of PUBLIC_EXTRA) {
    const r = await check(path);
    if (!r.ok) failed++;
    console.log(`  [${r.ok ? "OK" : "FAIL"}] ${path} → ${r.status}${r.hint ? ` (${r.hint.replace(/\s+/g, " ")})` : ""}`);
  }

  console.log("\n--- Organizer dashboard (logged in) ---");
  const org = await login("organizer@celeventic.com", "Organizer@123");
  if (!org.session?.user?.id) {
    console.log("  [FAIL] Could not login organizer");
    process.exit(1);
  }
  for (const path of DASHBOARD_ROUTES) {
    const r = await check(path, org.cookies, "org");
    if (!r.ok) failed++;
    console.log(`  [${r.ok ? "OK" : "FAIL"}] ${path} → ${r.status}${!r.ok && r.hint ? ` (${r.hint.replace(/\s+/g, " ")})` : ""}`);
  }

  console.log("\n--- Admin pages (logged in) ---");
  const admin = await login("admin@celeventic.com", "Admin@123");
  if (!admin.session?.user?.id) {
    console.log("  [FAIL] Could not login admin");
    process.exit(1);
  }
  for (const path of ADMIN_ROUTES) {
    const r = await check(path, admin.cookies, "admin");
    if (!r.ok) failed++;
    console.log(`  [${r.ok ? "OK" : "FAIL"}] ${path} → ${r.status}${!r.ok && r.hint ? ` (${r.hint.replace(/\s+/g, " ")})` : ""}`);
  }

  console.log(`\n${failed === 0 ? "All authenticated pages passed." : `${failed} page(s) failed.`}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
