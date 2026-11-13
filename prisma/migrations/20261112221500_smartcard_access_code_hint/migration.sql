-- Owner-only encrypted access-code hint. Additive. Guests never read this column.

ALTER TABLE "smartcard_access_codes" ADD COLUMN "codeHint" TEXT;
