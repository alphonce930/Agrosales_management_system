import fs from "node:fs";
import path from "node:path";

const pkgPath = "backend/node_modules/@upstash/ratelimit/package.json";
const distDir = "backend/node_modules/@upstash/ratelimit/dist";

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
console.log("version:", pkg.version);

const files = fs.readdirSync(distDir);
console.log("dist files:", files.join(", "));

const dts = files.filter((f) => f.endsWith(".d.ts"));
for (const file of dts) {
  const content = fs.readFileSync(path.join(distDir, file), "utf8");
  const interfaceMatch = content.match(
    /interface RateLimitResponse\s*\{[\s\S]*?\n\}/,
  );
  if (interfaceMatch) {
    console.log(`\n--- ${file} RateLimitResponse ---`);
    console.log(interfaceMatch[0]);
  }
}

// Show the runtime shape too, straight from the built source.
for (const file of files.filter((f) => f.endsWith(".js"))) {
  const content = fs.readFileSync(path.join(distDir, file), "utf8");
  for (const token of ["success", "allowed", "remaining", "pending"]) {
    const count = (content.match(new RegExp(`\\b${token}\\s*:`, "g")) || []).length;
    if (count) console.log(`${file}: "${token}:" occurrences = ${count}`);
  }
}
