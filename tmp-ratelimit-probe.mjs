import dotenv from "dotenv";

dotenv.config({ path: "backend/.env", quiet: true });

const KEYS = [
  "IP_RATE_LIMIT",
  "IP_RATE_WINDOW",
  "LOGIN_RATE_LIMIT",
  "LOGIN_RATE_WINDOW",
  "PREAUTH_LOGIN_RATE_LIMIT",
  "PREAUTH_LOGIN_WINDOW",
  "API_RATE_LIMIT_MAX",
  "API_RATE_LIMIT_WINDOW_SECONDS",
  "MAX_LOGIN_ATTEMPTS_PER_DEVICE",
  "DEVICE_LOCKOUT_SECONDS",
  "LOGIN_ATTEMPT_WINDOW_SECONDS",
  "REGISTER_RATE_LIMIT",
  "REGISTER_RATE_WINDOW",
];

console.log("--- configured rate limits (non-secret) ---");
for (const key of KEYS) {
  console.log(`${key}=${process.env[key] ?? "(unset)"}`);
}

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redisCommand = async (command) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  return response.json();
};

const scan = async (pattern) => {
  const found = [];
  let cursor = "0";
  do {
    const { result } = await redisCommand([
      "SCAN",
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      "200",
    ]);
    cursor = result[0];
    found.push(...result[1]);
  } while (cursor !== "0");
  return found;
};

console.log("\n--- live redis counters ---");
for (const pattern of [
  "auth:login:*",
  "auth:device:*",
  "auth:register:*",
  "api:*",
  "*ratelimit*",
]) {
  const keys = await scan(pattern);
  console.log(`${pattern} -> ${keys.length} key(s)`);
  for (const key of keys.slice(0, 20)) {
    const value = await redisCommand(["GET", key]);
    const ttl = await redisCommand(["TTL", key]);
    console.log(`   ${key} = ${JSON.stringify(value.result)} ttl=${ttl.result}`);
  }
}
