-- High-entropy Tap Mode QR pairing token. Additive.
-- Short joinCode remains for typed six-character entry.
-- Existing sessions keep working through joinCodeHash.

ALTER TABLE "celeyou_proximity_sessions" ADD COLUMN "pairingToken" TEXT;
ALTER TABLE "celeyou_proximity_sessions" ADD COLUMN "pairingTokenHash" TEXT;
CREATE UNIQUE INDEX "celeyou_proximity_sessions_pairingTokenHash_key" ON "celeyou_proximity_sessions"("pairingTokenHash");
