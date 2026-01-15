// kill-idle-transactions.js
const { Pool } = require("pg");
require("dotenv").config();

async function killIdleTransactions() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    console.log("🔍 Finding idle transactions...\n");

    // Find all idle in transaction connections
    const idleTransactions = await client.query(`
      SELECT 
        pid,
        usename,
        application_name,
        state,
        state_change,
        NOW() - state_change AS idle_duration,
        query
      FROM pg_stat_activity 
      WHERE datname = current_database()
        AND pid != pg_backend_pid()
        AND state = 'idle in transaction'
      ORDER BY state_change;
    `);

    if (idleTransactions.rows.length === 0) {
      console.log("✅ No idle transactions found!");
      return;
    }

    console.log(`Found ${idleTransactions.rows.length} idle transaction(s):\n`);
    
    idleTransactions.rows.forEach((row, index) => {
      console.log(`${index + 1}. PID: ${row.pid}`);
      console.log(`   User: ${row.usename}`);
      console.log(`   App: ${row.application_name}`);
      console.log(`   Idle for: ${row.idle_duration}`);
      console.log(`   Last query: ${row.query?.substring(0, 100)}...`);
      console.log("");
    });

    console.log("🔨 Terminating idle transactions...\n");

    // Terminate each idle transaction
    for (const row of idleTransactions.rows) {
      try {
        await client.query(`SELECT pg_terminate_backend($1);`, [row.pid]);
        console.log(`✅ Terminated PID ${row.pid}`);
      } catch (err) {
        console.log(`⚠️  Could not terminate PID ${row.pid}: ${err.message}`);
      }
    }

    console.log("\n✅ Done! Idle transactions have been terminated.");
    console.log("\n💡 Now run: node meal-setup.js");

  } catch (error) {
    console.error("\n❌ Error:", error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

killIdleTransactions();