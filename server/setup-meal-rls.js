// setup-meal-rls-concurrent.js
const { Pool } = require("pg");
require("dotenv").config();

async function setupMealRLSConcurrent() {
  // Create separate connections for concurrent operations
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("Step 1: Creating index CONCURRENTLY (non-blocking)...");

    // This needs its own connection outside transaction
    const indexClient = await pool.connect();
    try {
      await indexClient.query("SET statement_timeout = 0;");
      await indexClient.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_meal_user_id 
        ON "Meal"(user_id);
      `);
      console.log("✅ Index created");
    } catch (err) {
      if (err.message.includes("already exists")) {
        console.log("⚠️  Index already exists");
      } else {
        console.error("Index error:", err.message);
      }
    } finally {
      indexClient.release();
    }

    console.log("\nStep 2: Enabling RLS and creating policies...");
    const rlsClient = await pool.connect();
    try {
      await rlsClient.query("SET statement_timeout = 0;");

      await rlsClient.query(`ALTER TABLE "Meal" ENABLE ROW LEVEL SECURITY;`);
      console.log("✅ RLS enabled");

      const policies = [
        `CREATE POLICY "Users can view own meals" ON "Meal" FOR SELECT USING (auth.uid()::text = user_id);`,
        `CREATE POLICY "Users can insert own meals" ON "Meal" FOR INSERT WITH CHECK (auth.uid()::text = user_id);`,
        `CREATE POLICY "Users can update own meals" ON "Meal" FOR UPDATE USING (auth.uid()::text = user_id);`,
        `CREATE POLICY "Users can delete own meals" ON "Meal" FOR DELETE USING (auth.uid()::text = user_id);`,
      ];

      for (const policy of policies) {
        await rlsClient.query(policy);
        console.log("✅ Policy created");
      }

      console.log("\n✅ Complete!");
    } finally {
      rlsClient.release();
    }
  } finally {
    await pool.end();
  }
}

setupMealRLSConcurrent().catch(console.error);
