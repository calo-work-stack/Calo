// fix-meal-rls.js (Simplified - No RLS disable needed)
const { Pool } = require("pg");
require("dotenv").config();

async function fixMealRLS() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 60000, // 1 minute should be enough
  });

  const client = await pool.connect();

  try {
    console.log("🔧 Starting Meal RLS fix (simplified approach)...\n");

    // Step 1: Check current status
    console.log("Step 1: Checking current RLS status...");
    const rlsStatus = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE tablename = 'Meal';
    `);
    const isRLSEnabled = rlsStatus.rows[0]?.rowsecurity;
    console.log(`Current RLS status: ${isRLSEnabled ? 'ENABLED' : 'DISABLED'}\n`);

    // Step 2: Check existing policies
    console.log("Step 2: Checking existing policies...");
    const existingPolicies = await client.query(`
      SELECT policyname, cmd
      FROM pg_policies 
      WHERE tablename = 'Meal';
    `);
    console.log(`Found ${existingPolicies.rows.length} existing policies`);
    existingPolicies.rows.forEach(row => {
      console.log(`  - ${row.policyname} (${row.cmd})`);
    });
    console.log("");

    // Step 3: Create index (works with RLS enabled)
    console.log("Step 3: Creating index on user_id...");
    try {
      // Try concurrent first (doesn't block)
      await client.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_meal_user_id 
        ON "Meal"(user_id);
      `);
      console.log("✅ Index created with CONCURRENTLY\n");
    } catch (err) {
      if (err.message.includes("already exists")) {
        console.log("✅ Index already exists\n");
      } else {
        // Fallback to regular index creation
        console.log("⚠️  CONCURRENTLY failed, trying regular creation...");
        try {
          await client.query(`
            CREATE INDEX IF NOT EXISTS idx_meal_user_id 
            ON "Meal"(user_id);
          `);
          console.log("✅ Index created\n");
        } catch (err2) {
          console.log(`⚠️  ${err2.message}\n`);
        }
      }
    }

    // Step 4: Drop old policies (works with RLS enabled)
    console.log("Step 4: Dropping old policies...");
    const policiesToDrop = [
      "Users can view own meals",
      "Users can insert own meals", 
      "Users can update own meals",
      "Users can delete own meals",
    ];

    for (const policy of policiesToDrop) {
      try {
        await client.query(`DROP POLICY IF EXISTS "${policy}" ON "Meal";`);
        console.log(`  ✅ Dropped: ${policy}`);
      } catch (err) {
        console.log(`  ℹ️  ${policy} didn't exist`);
      }
    }
    console.log("");

    // Step 5: Enable RLS if not already enabled
    if (!isRLSEnabled) {
      console.log("Step 5: Enabling RLS...");
      await client.query('ALTER TABLE "Meal" ENABLE ROW LEVEL SECURITY;');
      console.log("✅ RLS enabled\n");
    } else {
      console.log("Step 5: RLS already enabled\n");
    }

    // Step 6: Create new policies
    console.log("Step 6: Creating new policies...");
    
    try {
      await client.query(`
        CREATE POLICY "Users can view own meals" 
        ON "Meal" 
        FOR SELECT 
        USING (auth.uid()::text = user_id);
      `);
      console.log("  ✅ SELECT policy created");
    } catch (err) {
      console.log(`  ⚠️  SELECT policy: ${err.message}`);
    }

    try {
      await client.query(`
        CREATE POLICY "Users can insert own meals" 
        ON "Meal" 
        FOR INSERT 
        WITH CHECK (auth.uid()::text = user_id);
      `);
      console.log("  ✅ INSERT policy created");
    } catch (err) {
      console.log(`  ⚠️  INSERT policy: ${err.message}`);
    }

    try {
      await client.query(`
        CREATE POLICY "Users can update own meals" 
        ON "Meal" 
        FOR UPDATE 
        USING (auth.uid()::text = user_id);
      `);
      console.log("  ✅ UPDATE policy created");
    } catch (err) {
      console.log(`  ⚠️  UPDATE policy: ${err.message}`);
    }

    try {
      await client.query(`
        CREATE POLICY "Users can delete own meals" 
        ON "Meal" 
        FOR DELETE 
        USING (auth.uid()::text = user_id);
      `);
      console.log("  ✅ DELETE policy created");
    } catch (err) {
      console.log(`  ⚠️  DELETE policy: ${err.message}`);
    }
    
    console.log("");

    // Step 7: Final verification
    console.log("Step 7: Verifying final setup...");
    const finalPolicies = await client.query(`
      SELECT policyname, cmd 
      FROM pg_policies 
      WHERE tablename = 'Meal'
      ORDER BY cmd, policyname;
    `);
    
    console.log("Active policies:");
    finalPolicies.rows.forEach(row => {
      console.log(`  - ${row.policyname} (${row.cmd})`);
    });

    const finalRLS = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE tablename = 'Meal';
    `);
    console.log(`\nRLS enabled: ${finalRLS.rows[0].rowsecurity}`);

    const finalIndexes = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'Meal' AND indexname LIKE '%user_id%';
    `);
    console.log(`user_id index exists: ${finalIndexes.rows.length > 0}`);

    console.log("\n✅ All done! Meal RLS is now properly configured.");

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error("\nFull error:", error);
    console.error("\n💡 If you're still getting timeouts:");
    console.error("   Run: node kill-idle-transactions.js");
    console.error("   Then try this script again");
  } finally {
    client.release();
    await pool.end();
  }
}

fixMealRLS();