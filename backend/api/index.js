import app from "../app.js";
import dotenv from "dotenv";
import { initializeDatabase } from "../config/db.js";
import { seedBootstrapUsers } from "../config/bootstrapUsers.js";

dotenv.config();

const databaseBootstrap = initializeDatabase().then((ready) => {
  if (!ready) throw new Error("Database is unavailable.");
  return seedBootstrapUsers();
});

export default async function handler(req, res) {
  await databaseBootstrap;
  return app(req, res);
}
