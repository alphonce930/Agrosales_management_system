import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve from this file's own location so it works from any directory.
const backendDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(backendDir, "..");
const databaseDir = path.join(projectRoot, ".local-pgdata");
const port = Number(process.env.LOCAL_PG_PORT || 5433);
const dbName = "golden_agrochemicals";
const credentials = {
  host: "127.0.0.1",
  port,
  user: "postgres",
  password: "postgres",
};

const server = new EmbeddedPostgres({
  databaseDir,
  user: credentials.user,
  password: credentials.password,
  port,
  persistent: true,
});

if (!fs.existsSync(path.join(databaseDir, "PG_VERSION"))) {
  console.log("Running initdb in", databaseDir);
  await server.initialise();
} else {
  console.log("Reusing existing cluster at", databaseDir);
}

await server.start();
console.log(`PostgreSQL listening on 127.0.0.1:${port}`);

const admin = new pg.Client({ ...credentials, database: "postgres" });
await admin.connect();
const existing = await admin.query(
  "SELECT 1 FROM pg_database WHERE datname = $1",
  [dbName],
);
if (!existing.rowCount) {
  await admin.query(`CREATE DATABASE "${dbName}"`);
  console.log("Created database", dbName);
} else {
  console.log("Database already exists:", dbName);
}
await admin.end();

const schemaPath = path.join(backendDir, "database", "schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf8");
const target = new pg.Client({ ...credentials, database: dbName });
await target.connect();
await target.query(schemaSql);
console.log("Applied schema.sql");
await target.end();

console.log("READY");
process.exit(0);
