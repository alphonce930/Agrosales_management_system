import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
}

await server.start();

const waitForReady = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const probe = new pg.Client({ ...credentials, database: "postgres" });
    try {
      await probe.connect();
      await probe.end();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error("PostgreSQL did not become ready in time.");
};

await waitForReady();

const admin = new pg.Client({ ...credentials, database: "postgres" });
await admin.connect();
const existing = await admin.query(
  "SELECT 1 FROM pg_database WHERE datname = $1",
  [dbName],
);
if (!existing.rowCount) {
  await admin.query(`CREATE DATABASE "${dbName}"`);
  console.log("Created database", dbName);
}
await admin.end();

const schemaSql = fs.readFileSync(
  path.join(backendDir, "database", "schema.sql"),
  "utf8",
);
const target = new pg.Client({ ...credentials, database: dbName });
await target.connect();
await target.query(schemaSql);
await target.end();

console.log(`LOCAL_POSTGRES_READY port=${port}`);

// Keep the parent process alive so the managed cluster stays up for the
// duration of the verification session.
const keepAlive = setInterval(() => {}, 1 << 30);

const shutdown = async () => {
  clearInterval(keepAlive);
  try {
    await server.stop();
  } catch {
    /* ignore */
  }
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
