import pg from "pg";

const port = Number(process.argv[2] || 5433);
const pool = new pg.Pool({
  host: "127.0.0.1",
  port,
  user: "postgres",
  password: "postgres",
  database: "golden_agrochemicals",
  ssl: false,
});

const run = async () => {
  const version = await pool.query("SELECT version() AS v");
  console.log("DB:", version.rows[0].v.split(",")[0]);

  const tables = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
  );
  console.log("TABLES:", tables.rows.map((r) => r.table_name).join(", "));

  const cols = await pool.query(
    `SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_schema = current_schema() AND table_name = 'users'
     ORDER BY ordinal_position`,
  );
  console.log("\nusers columns:");
  console.log(
    cols.rows
      .map((c) => `  ${c.column_name} ${c.data_type} null=${c.is_nullable}`)
      .join("\n"),
  );

  const indexes = await pool.query(
    `SELECT tablename, indexname FROM pg_indexes
     WHERE schemaname = current_schema()
     ORDER BY tablename, indexname`,
  );
  console.log("\nINDEXES:");
  console.log(
    indexes.rows.map((i) => `  ${i.tablename}.${i.indexname}`).join("\n"),
  );

  const counts = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM customers) AS customers,
      (SELECT COUNT(*) FROM products) AS products,
      (SELECT COUNT(*) FROM sales) AS sales,
      (SELECT COUNT(*) FROM payments) AS payments,
      (SELECT COUNT(*) FROM receipts) AS receipts`);
  console.log("\nROW COUNTS:", JSON.stringify(counts.rows[0]));
  await pool.end();
};

run().catch((error) => {
  console.error("INSPECT FAILED:", error.message);
  process.exit(1);
});
