-- Digital business cards (SQLite-safe, additive)

CREATE TABLE IF NOT EXISTS "digital_business_cards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "title" TEXT,
    "company" TEXT,
    "bio" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "socials" JSON NOT NULL DEFAULT '{}',
    "themeId" TEXT NOT NULL DEFAULT 'elegant-frost',
    "avatarUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT 1,
    "nfcEnabled" BOOLEAN NOT NULL DEFAULT 1,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'TRIAL',
    "subscriptionExpiresAt" DATETIME,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "digital_business_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "digital_business_cards_slug_key" ON "digital_business_cards"("slug");
CREATE INDEX IF NOT EXISTS "digital_business_cards_userId_idx" ON "digital_business_cards"("userId");
CREATE INDEX IF NOT EXISTS "digital_business_cards_subscriptionStatus_idx" ON "digital_business_cards"("subscriptionStatus");
