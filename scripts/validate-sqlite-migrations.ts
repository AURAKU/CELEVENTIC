#!/usr/bin/env tsx
/**
 * Scan Prisma SQL migrations for SQLite-incompatible constructs.
 *
 * Focus: ALTER TABLE ADD COLUMN with non-constant DEFAULT expressions
 * (SQLite error: "Cannot add a column with non-constant default").
 *
 * CREATE TABLE ... DEFAULT CURRENT_TIMESTAMP is allowed and not flagged.
 */

import fs from "node:fs";
import path from "node:path";

type Finding = {
  migration: string;
  filePath: string;
  line: number;
  statement: string;
  reason: string;
  recommendation: string;
};

const ROOT = path.resolve(process.cwd(), "prisma/migrations");

const BANNED_GLOBAL: Array<{ re: RegExp; reason: string; recommendation: string }> = [
  {
    re: /\bCREATE\s+TYPE\b/i,
    reason: "PostgreSQL CREATE TYPE is not supported by SQLite",
    recommendation: "Store enum values as TEXT and use Prisma enum mapping",
  },
  {
    re: /\bALTER\s+TYPE\b/i,
    reason: "PostgreSQL ALTER TYPE is not supported by SQLite",
    recommendation: "Avoid ALTER TYPE; use TEXT-backed values",
  },
  {
    re: /\bAS\s+ENUM\b/i,
    reason: "PostgreSQL ENUM syntax is not supported by SQLite",
    recommendation: "Use TEXT columns with application-level enum values",
  },
  {
    re: /\bJSONB\b/i,
    reason: "JSONB is PostgreSQL-specific",
    recommendation: "Use JSON or TEXT for SQLite",
  },
  {
    re: /\bBIGSERIAL\b|\bSERIAL\b/i,
    reason: "SERIAL/BIGSERIAL are PostgreSQL-specific",
    recommendation: "Use INTEGER PRIMARY KEY AUTOINCREMENT or TEXT cuid ids",
  },
  {
    re: /\bALTER\s+COLUMN\b/i,
    reason: "ALTER COLUMN is not supported by SQLite",
    recommendation: "Rebuild the table (RedefineTable) instead of ALTER COLUMN",
  },
];

const NON_CONSTANT_DEFAULT = /\bDEFAULT\s+(CURRENT_TIMESTAMP|\([^)]*\)|datetime\s*\(|strftime\s*\(|lower\s*\(|hex\s*\(|randomblob\s*\(|uuid\s*\()/i;

function splitStatements(sql: string): Array<{ text: string; startLine: number }> {
  const lines = sql.split(/\r?\n/);
  const statements: Array<{ text: string; startLine: number }> = [];
  let buffer: string[] = [];
  let startLine = 1;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    const trimmed = line.trim();
    if (!buffer.length && (trimmed.startsWith("--") || trimmed === "")) {
      continue;
    }
    if (!buffer.length) startLine = i + 1;
    buffer.push(line);
    if (line.includes(";")) {
      const text = buffer.join("\n").trim();
      if (text) statements.push({ text, startLine });
      buffer = [];
    }
  }
  if (buffer.length) {
    statements.push({ text: buffer.join("\n").trim(), startLine });
  }
  return statements;
}

function isAlterAddColumn(statement: string): boolean {
  return /ALTER\s+TABLE[\s\S]+ADD\s+COLUMN/i.test(statement);
}

function validateFile(filePath: string): Finding[] {
  const migration = path.basename(path.dirname(filePath));
  const sql = fs.readFileSync(filePath, "utf8");
  const findings: Finding[] = [];
  const statements = splitStatements(sql);

  for (const stmt of statements) {
    const compact = stmt.text.replace(/\s+/g, " ").trim();
    for (const rule of BANNED_GLOBAL) {
      if (rule.re.test(stmt.text)) {
        findings.push({
          migration,
          filePath,
          line: stmt.startLine,
          statement: compact.slice(0, 180),
          reason: rule.reason,
          recommendation: rule.recommendation,
        });
      }
    }

    if (isAlterAddColumn(stmt.text) && NON_CONSTANT_DEFAULT.test(stmt.text)) {
      findings.push({
        migration,
        filePath,
        line: stmt.startLine,
        statement: compact.slice(0, 180),
        reason:
          "SQLite forbids non-constant DEFAULT expressions on ALTER TABLE ADD COLUMN",
        recommendation:
          "Add the column nullable (no non-constant default), backfill with UPDATE, then rebuild the table if NOT NULL is required",
      });
    }
  }

  return findings;
}

function main() {
  if (!fs.existsSync(ROOT)) {
    console.error(`Missing migrations directory: ${ROOT}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(ROOT, entry.name, "migration.sql"))
    .filter((file) => fs.existsSync(file))
    .sort();

  const findings = files.flatMap(validateFile);

  if (!findings.length) {
    console.log(`OK: scanned ${files.length} migration file(s); no SQLite incompatibilities detected.`);
    process.exit(0);
  }

  console.error(`FAILED: ${findings.length} SQLite migration issue(s) found:\n`);
  for (const finding of findings) {
    console.error(`Migration: ${finding.migration}`);
    console.error(`File:      ${finding.filePath}`);
    console.error(`Line:      ${finding.line}`);
    console.error(`Statement: ${finding.statement}`);
    console.error(`Reason:    ${finding.reason}`);
    console.error(`Fix:       ${finding.recommendation}`);
    console.error("");
  }
  process.exit(1);
}

main();
