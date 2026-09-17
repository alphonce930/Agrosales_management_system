import test from "node:test";
import assert from "node:assert/strict";
import { normalizePostgresSql } from "../config/db.js";

test("mysql-style placeholders are converted to postgres placeholders", () => {
  const sql = "SELECT * FROM users WHERE email = ? AND username = ?";
  assert.equal(
    normalizePostgresSql(sql),
    "SELECT * FROM users WHERE email = $1 AND username = $2",
  );
});
