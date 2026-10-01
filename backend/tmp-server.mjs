import path from "node:path";
import { fileURLToPath } from "node:url";

const backendDir = path.dirname(fileURLToPath(import.meta.url));

// Point the app at the throwaway local cluster instead of the (absent)
// localhost:5432 development database. dotenv never overrides values that are
// already present in process.env, so these win over backend/.env.
process.env.DATABASE_URL =
  process.env.LOCAL_DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5433/golden_agrochemicals";
process.env.DB_SSL = "false";
process.env.PORT = process.env.VERIFY_PORT || "5055";

// Run from the backend directory so dotenv picks up backend/.env.
process.chdir(backendDir);

await import("./server.js");
