-- Additive CeleYou Tap-to-Connect tables. CREATE IF NOT EXISTS is safe to re-run.
-- proximityDiscoverable is added by scripts/sql/apply-celeyou-sqlite.ts so this
-- file never fails when the column already exists on production.db.

CREATE TABLE IF NOT EXISTS "celeyou_proximity_sessions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "hostUserId" TEXT NOT NULL,
  "hostCardId" TEXT NOT NULL,
  "peerUserId" TEXT,
  "peerCardId" TEXT,
  "joinCode" TEXT NOT NULL,
  "joinCodeHash" TEXT NOT NULL,
  "verifyCode" TEXT,
  "discoveryId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DISCOVERING',
  "transport" TEXT NOT NULL DEFAULT 'qr',
  "expiresAt" DATETIME NOT NULL,
  "capabilityJson" TEXT NOT NULL DEFAULT '{}',
  "cancelledAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "celeyou_proximity_sessions_hostCardId_fkey"
    FOREIGN KEY ("hostCardId") REFERENCES "digital_business_cards"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "celeyou_proximity_sessions_peerCardId_fkey"
    FOREIGN KEY ("peerCardId") REFERENCES "digital_business_cards"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "celeyou_proximity_sessions_joinCodeHash_key"
  ON "celeyou_proximity_sessions"("joinCodeHash");
CREATE UNIQUE INDEX IF NOT EXISTS "celeyou_proximity_sessions_discoveryId_key"
  ON "celeyou_proximity_sessions"("discoveryId");
CREATE INDEX IF NOT EXISTS "celeyou_proximity_sessions_hostUserId_status_idx"
  ON "celeyou_proximity_sessions"("hostUserId", "status");
CREATE INDEX IF NOT EXISTS "celeyou_proximity_sessions_peerUserId_status_idx"
  ON "celeyou_proximity_sessions"("peerUserId", "status");
CREATE INDEX IF NOT EXISTS "celeyou_proximity_sessions_hostCardId_idx"
  ON "celeyou_proximity_sessions"("hostCardId");
CREATE INDEX IF NOT EXISTS "celeyou_proximity_sessions_expiresAt_idx"
  ON "celeyou_proximity_sessions"("expiresAt");
CREATE INDEX IF NOT EXISTS "celeyou_proximity_sessions_status_expiresAt_idx"
  ON "celeyou_proximity_sessions"("status", "expiresAt");

CREATE TABLE IF NOT EXISTS "celeyou_proximity_share_tokens" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "fromCardId" TEXT NOT NULL,
  "toUserId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "redeemedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "celeyou_proximity_share_tokens_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "celeyou_proximity_sessions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "celeyou_proximity_share_tokens_tokenHash_key"
  ON "celeyou_proximity_share_tokens"("tokenHash");
CREATE INDEX IF NOT EXISTS "celeyou_proximity_share_tokens_sessionId_idx"
  ON "celeyou_proximity_share_tokens"("sessionId");
CREATE INDEX IF NOT EXISTS "celeyou_proximity_share_tokens_toUserId_idx"
  ON "celeyou_proximity_share_tokens"("toUserId");
CREATE INDEX IF NOT EXISTS "celeyou_proximity_share_tokens_expiresAt_idx"
  ON "celeyou_proximity_share_tokens"("expiresAt");

CREATE TABLE IF NOT EXISTS "celeyou_proximity_history" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "hostUserId" TEXT NOT NULL,
  "peerUserId" TEXT,
  "hostCardId" TEXT NOT NULL,
  "peerCardId" TEXT,
  "outcome" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "celeyou_proximity_history_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "celeyou_proximity_sessions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "celeyou_proximity_history_hostUserId_createdAt_idx"
  ON "celeyou_proximity_history"("hostUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "celeyou_proximity_history_peerUserId_createdAt_idx"
  ON "celeyou_proximity_history"("peerUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "celeyou_proximity_history_sessionId_idx"
  ON "celeyou_proximity_history"("sessionId");

CREATE TABLE IF NOT EXISTS "celeyou_proximity_security_events" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionId" TEXT,
  "userId" TEXT,
  "kind" TEXT NOT NULL,
  "meta" TEXT NOT NULL DEFAULT '{}',
  "ip" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "celeyou_proximity_security_events_kind_createdAt_idx"
  ON "celeyou_proximity_security_events"("kind", "createdAt");
CREATE INDEX IF NOT EXISTS "celeyou_proximity_security_events_userId_createdAt_idx"
  ON "celeyou_proximity_security_events"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "celeyou_proximity_security_events_sessionId_idx"
  ON "celeyou_proximity_security_events"("sessionId");
