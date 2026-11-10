-- Additive CeleCard catalog + concierge orders for local SQLite.
-- Do not run against production without authorization.

ALTER TABLE celecard_lifecycle_policy ADD COLUMN planPrices TEXT;
ALTER TABLE celecard_lifecycle_policy ADD COLUMN conciergePriceGhs INTEGER DEFAULT 199;
ALTER TABLE celecard_lifecycle_policy ADD COLUMN conciergeBundledPlanId TEXT;

CREATE TABLE IF NOT EXISTS smartcard_concierge_orders (
  id TEXT PRIMARY KEY NOT NULL,
  status TEXT NOT NULL DEFAULT 'INTAKE',
  customerUserId TEXT,
  customerEmail TEXT NOT NULL,
  customerName TEXT NOT NULL,
  customerPhone TEXT,
  brief TEXT NOT NULL,
  displayName TEXT NOT NULL,
  title TEXT,
  company TEXT,
  themePreference TEXT,
  planId TEXT,
  includeSubscription INTEGER NOT NULL DEFAULT 1,
  designFeeGhs INTEGER NOT NULL,
  subscriptionFeeGhs INTEGER NOT NULL DEFAULT 0,
  totalGhs INTEGER NOT NULL,
  paymentId TEXT,
  paymentReference TEXT,
  cardId TEXT,
  assignedAdminId TEXT,
  deliveredAt DATETIME,
  notes TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS smartcard_concierge_orders_status_createdAt_idx
  ON smartcard_concierge_orders(status, createdAt);
CREATE INDEX IF NOT EXISTS smartcard_concierge_orders_customerEmail_idx
  ON smartcard_concierge_orders(customerEmail);
CREATE INDEX IF NOT EXISTS smartcard_concierge_orders_customerUserId_idx
  ON smartcard_concierge_orders(customerUserId);
