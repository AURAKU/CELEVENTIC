import test from "node:test";
import assert from "node:assert/strict";
import { assertSqliteSingleWriterDeployment } from "../sqlite-runtime";

test("production SQLite refuses more than one web instance", () => {
  assert.throws(
    () =>
      assertSqliteSingleWriterDeployment({
        NODE_ENV: "production",
        DATABASE_URL: "file:./prisma/production.db",
        CELEVENTIC_WEB_INSTANCES: "2",
      }),
    /single Next.js writer/
  );
});

test("single-writer production SQLite is allowed", () => {
  assert.doesNotThrow(() =>
    assertSqliteSingleWriterDeployment({
      NODE_ENV: "production",
      DATABASE_URL: "file:./prisma/production.db",
      CELEVENTIC_WEB_INSTANCES: "1",
    })
  );
});
