import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
dotenv.config({ path: "backend/.env", quiet: true });

const safeExec = async (file, args) => {
  try {
    const { stdout } = await execFileAsync(file, args, { windowsHide: true });
    return stdout.trim();
  } catch (error) {
    return `<error: ${error.message.split("\n")[0]}>`;
  }
};

const probePostgres = async () => {
  const services = await safeExec("powershell", [
    "-NoProfile",
    "-Command",
    "Get-Service | Select-Object -ExpandProperty Name",
  ]);
  const postgresServices = String(services)
    .split(/\r?\n/)
    .filter((name) => /postgres|pgsql/i.test(name));
  console.log("POSTGRES_SERVICES:", postgresServices.join(", ") || "(none)");

  const roots = [
    "C:/Program Files",
    "C:/Program Files (x86)",
    "C:/PostgreSQL",
    "C:/tools",
    "C:/Users/TNGC",
    "C:/Users/TNGC/AppData/Local",
  ];
  const found = [];
  const depthLimit = 3;
  const walk = (dir, depth) => {
    if (depth > depthLimit) return;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const name = entry.name.toLowerCase();
      if (name.includes("postgres") || name === "pgsql" || name === "pg") {
        found.push(path.join(dir, entry.name));
        continue;
      }
      if (depth < depthLimit) walk(path.join(dir, entry.name), depth + 1);
    }
  };
  for (const root of roots) if (fs.existsSync(root)) walk(root, 1);
  console.log("POSTGRES_DIRS:", found.join(", ") || "(none)");
};

const probeRedis = async () => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.log("REDIS: not configured");
    return;
  }
  try {
    const response = await fetch(`${url}/ping`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.text();
    console.log(`REDIS: status=${response.status} body=${body}`);
  } catch (error) {
    console.log("REDIS: unreachable", error.message);
  }
};

await probePostgres();
await probeRedis();
