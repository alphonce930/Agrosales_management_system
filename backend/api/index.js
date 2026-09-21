import app from "../app.js";
import dotenv from "dotenv";
import { initializeDatabase } from "../config/db.js";
import { seedBootstrapUsers } from "../config/bootstrapUsers.js";
import { initializeRedis } from "../config/redis.js";

dotenv.config();

const databaseBootstrap = initializeDatabase().then((ready) => {
  if (!ready) throw new Error("Database is unavailable.");
  return seedBootstrapUsers();
});

// Reuse the module-level client for warm serverless invocations. Do not make
// Redis availability a deployment-startup dependency.
const redisBootstrap = initializeRedis();

export default async function handler(req, res) {
  await databaseBootstrap;
  await redisBootstrap;
  return app(req, res);
}
