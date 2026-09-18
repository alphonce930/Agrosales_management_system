import app from "./app.js";
import dotenv from "dotenv";
import { initializeDatabase, query } from "./config/db.js";
import { seedBootstrapUsers } from "./config/bootstrapUsers.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

const ensureColumn = async (table, column, definition) => {
  const rows = await query(
    `SELECT COUNT(*) AS column_count
     FROM information_schema.columns
     WHERE table_schema = current_schema() AND table_name = $1 AND column_name = $2`,
    [table, column],
  );

  if (!Number(rows[0]?.column_count ?? 0)) {
    await query(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`);
    console.log(`Added ${table}.${column} for database compatibility.`);
  }
};

const ensureIndex = async (table, index, columns) => {
  const rows = await query(
    `SELECT COUNT(*) AS index_count
     FROM pg_indexes
     WHERE schemaname = current_schema() AND tablename = $1 AND indexname = $2`,
    [table, index],
  );

  if (!Number(rows[0]?.index_count ?? 0)) {
    await query(
      `CREATE INDEX IF NOT EXISTS "${index}" ON "${table}" (${columns})`,
    );
    console.log(`Added ${index} index for database compatibility.`);
  }
};

const bootstrap = async () => {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
      throw new Error(
        "JWT_SECRET must be set to a random value of at least 16 characters.",
      );
    }

    const databaseReady = await initializeDatabase();
    if (databaseReady || process.env.ALLOW_MEMORY_DB === "true") {
      await ensureColumn("users", "google_id", "TEXT NULL");
      await ensureColumn("users", "profile_picture", "TEXT NULL");
      await ensureColumn(
        "users",
        "auth_provider",
        "TEXT NOT NULL DEFAULT 'local'",
      );
      await query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'users_auth_provider_check'
          ) THEN
            ALTER TABLE "users"
              ADD CONSTRAINT users_auth_provider_check
              CHECK (auth_provider IN ('local','google'));
          END IF;
        END $$;
      `);
      await query('ALTER TABLE "users" ALTER COLUMN role TYPE TEXT');
      await query('ALTER TABLE "users" ALTER COLUMN status TYPE TEXT');
      await query(
        'ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS initial_amount NUMERIC(12,2) NOT NULL DEFAULT 0',
      );
      await query(
        'ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS created_by INTEGER NULL',
      );
      await ensureIndex("customers", "idx_customers_created_by", "created_by");
      await ensureColumn("receipts", "notes", "TEXT NULL");
      await query(
        'ALTER TABLE "products" ADD COLUMN IF NOT EXISTS pieces_per_box INTEGER NOT NULL DEFAULT 1',
      );
      await query(
        "ALTER TABLE \"sale_items\" ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'single'",
      );
      await query(
        'ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS base_quantity INTEGER NOT NULL DEFAULT 0',
      );
      await query(
        "UPDATE sale_items SET base_quantity = quantity WHERE base_quantity = 0",
      );
      await query(`
        UPDATE customers c
        SET created_by = (
          SELECT log.user_id
          FROM activity_logs log
          WHERE log.entity_type = 'customer' AND log.entity_id = c.id AND log.user_id IS NOT NULL
          ORDER BY log.created_at ASC
          LIMIT 1
        )
        WHERE c.created_by IS NULL
      `);
      await seedBootstrapUsers();
    } else {
      console.warn(
        "Starting without a database. API requests will return 503 until PostgreSQL is available.",
      );
    }

    app.listen(PORT, () => {
      console.log(`Golden Agrochemicals backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
};

bootstrap();
