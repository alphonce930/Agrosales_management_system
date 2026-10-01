import dotenv from "dotenv";
import fs from "node:fs";

dotenv.config({ path: "backend/.env", quiet: true });

const raw = process.env.DATABASE_URL || "";
if (!raw) {
  console.log("DATABASE_URL not set");
} else {
  try {
    const url = new URL(raw);
    console.log("DB_HOST:", url.hostname);
    console.log("DB_PORT:", url.port || "5432");
    console.log("DB_NAME:", url.pathname.replace(/^\//, ""));
    console.log("DB_USER:", url.username);
    console.log("DB_SSL_PARAM:", url.searchParams.get("sslmode") || "none");
    console.log("DB_IS_LOCAL:", ["localhost", "127.0.0.1", "::1", "host.docker.internal"].includes(url.hostname));
  } catch (error) {
    console.log("DATABASE_URL could not be parsed:", error.message);
  }
}

console.log("DB_SSL env:", process.env.DB_SSL || "(unset)");
console.log("ALLOW_MEMORY_DB:", process.env.ALLOW_MEMORY_DB || "(unset)");
console.log("NODE_ENV:", process.env.NODE_ENV || "(unset)");
console.log(
  "FRONTEND_URL:",
  process.env.FRONTEND_URL || "(unset)",
);
console.log(
  "UPSTASH configured:",
  Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
);

const backendEnvExample = fs.existsSync("backend/.env.example");
console.log("backend/.env.example exists:", backendEnvExample);

for (const candidate of [
  "C:/Program Files/PostgreSQL",
  "C:/Program Files (x86)/PostgreSQL",
]) {
  console.log(`SQL_DIR ${candidate}:`, fs.existsSync(candidate));
}
