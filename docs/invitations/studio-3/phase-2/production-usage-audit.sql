-- CELEVENTIC — Invitation Experience 3.0
-- Phase 2 Workstream B: PRODUCTION TEMPLATE USAGE AUDIT
--
-- Mode: READ-ONLY
-- Dialect: SQLite (prisma provider = sqlite)
-- Authorization: REQUIRED before execution against production
-- Do NOT run UPDATE / DELETE / INSERT / DROP / ALTER
-- Prefer aggregates; do not SELECT guest PII beyond counts

PRAGMA query_only = ON;

-- ─────────────────────────────────────────────────────────────
-- 1) Catalog SKU usage via invitation_orders
-- ─────────────────────────────────────────────────────────────
SELECT
  o.templateSlug AS catalog_sku,
  COUNT(*) AS order_count,
  SUM(CASE WHEN o.archivedAt IS NULL THEN 1 ELSE 0 END) AS active_or_unarchived_orders,
  SUM(CASE WHEN o.archivedAt IS NOT NULL THEN 1 ELSE 0 END) AS archived_orders,
  SUM(CASE WHEN o.invitationId IS NOT NULL THEN 1 ELSE 0 END) AS orders_linked_to_invitation,
  SUM(CASE WHEN o.eventId IS NOT NULL THEN 1 ELSE 0 END) AS orders_linked_to_event
FROM invitation_orders o
GROUP BY o.templateSlug
ORDER BY order_count DESC;

-- Layout implied by order.designConfig.layout (when present)
SELECT
  COALESCE(json_extract(o.designConfig, '$.layout'), '(null)') AS layout,
  COUNT(*) AS order_rows
FROM invitation_orders o
GROUP BY 1
ORDER BY order_rows DESC;

-- layoutVersion distribution on orders (expect mostly null → treat as v1)
SELECT
  COALESCE(CAST(json_extract(o.designConfig, '$.layoutVersion') AS TEXT), '(null)') AS layout_version,
  COUNT(*) AS order_rows
FROM invitation_orders o
GROUP BY 1
ORDER BY order_rows DESC;

-- ─────────────────────────────────────────────────────────────
-- 2) Live / historical invitations by designConfig.layout
-- ─────────────────────────────────────────────────────────────
SELECT
  COALESCE(json_extract(i.designConfig, '$.layout'), '(null)') AS layout,
  i.status,
  COUNT(*) AS invite_count,
  SUM(CASE WHEN i.archivedAt IS NULL THEN 1 ELSE 0 END) AS not_soft_archived,
  SUM(CASE WHEN i.archivedAt IS NOT NULL THEN 1 ELSE 0 END) AS soft_archived
FROM invitations i
WHERE i.designConfig IS NOT NULL
GROUP BY 1, 2
ORDER BY invite_count DESC;

SELECT
  COALESCE(CAST(json_extract(i.designConfig, '$.layoutVersion') AS TEXT), '(null)') AS layout_version,
  COUNT(*) AS invite_rows
FROM invitations i
WHERE i.designConfig IS NOT NULL
GROUP BY 1
ORDER BY invite_rows DESC;

-- Invitations with guests / passes (usage strength signal — counts only)
SELECT
  COALESCE(json_extract(i.designConfig, '$.layout'), '(null)') AS layout,
  COUNT(DISTINCT i.id) AS invitations_with_guests
FROM invitations i
INNER JOIN guests g ON g.invitationId = i.id
GROUP BY 1
ORDER BY invitations_with_guests DESC;

SELECT
  COALESCE(json_extract(i.designConfig, '$.layout'), '(null)') AS layout,
  COUNT(DISTINCT i.id) AS invitations_with_guest_passes
FROM invitations i
INNER JOIN guest_passes gp ON gp.invitationId = i.id
GROUP BY 1
ORDER BY invitations_with_guest_passes DESC;

-- ─────────────────────────────────────────────────────────────
-- 3) Event linkage (status mix) for invitations that have layouts
-- ─────────────────────────────────────────────────────────────
SELECT
  COALESCE(json_extract(i.designConfig, '$.layout'), '(null)') AS layout,
  e.status AS event_status,
  COUNT(*) AS rows
FROM invitations i
INNER JOIN events e ON e.id = i.eventId
WHERE i.designConfig IS NOT NULL
GROUP BY 1, 2
ORDER BY rows DESC;

-- ─────────────────────────────────────────────────────────────
-- 4) Catalog template registry overlay (no PII)
-- ─────────────────────────────────────────────────────────────
SELECT
  t.slug AS catalog_sku,
  t.layoutSlug,
  t.category,
  t.isActive,
  COUNT(o.id) AS order_count
FROM invitation_catalog_templates t
LEFT JOIN invitation_orders o ON o.templateSlug = t.slug
GROUP BY t.slug, t.layoutSlug, t.category, t.isActive
ORDER BY order_count DESC, t.slug ASC;

-- ─────────────────────────────────────────────────────────────
-- 5) Analytics references (if table populated)
-- ─────────────────────────────────────────────────────────────
SELECT
  COALESCE(templateSlug, '(null)') AS catalog_sku,
  COUNT(*) AS analytics_events
FROM invitation_analytics_events
GROUP BY 1
ORDER BY analytics_events DESC;

-- ─────────────────────────────────────────────────────────────
-- 6) EventTemplate (legacy theme) usage — separate from catalog layouts
-- ─────────────────────────────────────────────────────────────
SELECT
  et.slug AS event_template_slug,
  et.category,
  COUNT(DISTINCT e.id) AS events_using_theme,
  COUNT(DISTINCT i.id) AS invitations_pointing_at_template
FROM event_templates et
LEFT JOIN events e ON e.themeId = et.id
LEFT JOIN invitations i ON i.templateId = et.id
GROUP BY et.slug, et.category
ORDER BY events_using_theme DESC, invitations_pointing_at_template DESC;

-- ─────────────────────────────────────────────────────────────
-- Classification helper views (aggregate only)
-- A layout is PROTECTED if ANY of: orders, invites, guests, passes, analytics
-- reference it. Absence in ONE query is not sufficient for ELIGIBLE.
-- ─────────────────────────────────────────────────────────────
