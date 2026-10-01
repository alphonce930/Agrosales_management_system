import app from "../app.js";
import dotenv from "dotenv";
import { initializeDatabase, query } from "../config/db.js";
import { seedBootstrapUsers } from "../config/bootstrapUsers.js";
import { initializeRedis } from "../config/redis.js";

dotenv.config();

const databaseBootstrap = initializeDatabase().then((ready) => {
  if (!ready) throw new Error("Database is unavailable.");
  return query(
    'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS password_reset_token TEXT NULL',
  )
    .then(() =>
      query(
        'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP WITHOUT TIME ZONE NULL',
      ),
    )
    .then(() => seedBootstrapUsers());
});

// Reuse the module-level client for warm serverless invocations. Do not make
// Redis availability a deployment-startup dependency.
const redisBootstrap = initializeRedis();

export default async function handler(req, res) {
  await databaseBootstrap;
  await redisBootstrap;
  return app(req, res);
}
