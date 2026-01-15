// setup-rls.js
// Run this file: node setup-rls.js

const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 300000, // 5 minutes timeout
});

const policies = [
  // Enable RLS on all tables
  `ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "connected_devices" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "daily_activity_summary" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "UserQuestionnaire" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "Meal" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "NutritionPlan" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "SubscriptionPayment" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "user_meal_plans" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "meal_plan_schedules" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "UserMealPreference" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "shopping_list" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "recommended_menus" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "recommended_meals" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "recommended_ingredients" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "ingredient_checks" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "calendar_events" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "gamification_badges" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "FoodProduct" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "UserBadge" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "UserAchievement" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "WaterIntake" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "DailyGoal" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "meal_completions" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "ai_recommendations" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "MenuReview" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "meal_templates" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "Badge" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "Achievement" ENABLE ROW LEVEL SECURITY;`,

  // User policies
  `CREATE POLICY "Users can view own profile" ON "User" FOR SELECT USING (auth.uid()::text = user_id);`,
  `CREATE POLICY "Users can update own profile" ON "User" FOR UPDATE USING (auth.uid()::text = user_id);`,
  `CREATE POLICY "Anyone can insert on signup" ON "User" FOR INSERT WITH CHECK (true);`,

  // Sessions
  `CREATE POLICY "Users can view own sessions" ON "sessions" FOR SELECT USING (auth.uid()::text = user_id);`,
  `CREATE POLICY "Users can insert own sessions" ON "sessions" FOR INSERT WITH CHECK (auth.uid()::text = user_id);`,
  `CREATE POLICY "Users can update own sessions" ON "sessions" FOR UPDATE USING (auth.uid()::text = user_id);`,
  `CREATE POLICY "Users can delete own sessions" ON "sessions" FOR DELETE USING (auth.uid()::text = user_id);`,

  // Meals
  `CREATE POLICY "Users can view own meals" ON "Meal" FOR SELECT USING (auth.uid()::text = user_id);`,
  `CREATE POLICY "Users can insert own meals" ON "Meal" FOR INSERT WITH CHECK (auth.uid()::text = user_id);`,
  `CREATE POLICY "Users can update own meals" ON "Meal" FOR UPDATE USING (auth.uid()::text = user_id);`,
  `CREATE POLICY "Users can delete own meals" ON "Meal" FOR DELETE USING (auth.uid()::text = user_id);`,

  // Simple tables
  `CREATE POLICY "Users manage own data" ON "UserQuestionnaire" FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);`,
  `CREATE POLICY "Users manage own data" ON "NutritionPlan" FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);`,
  `CREATE POLICY "Users manage own data" ON "ChatMessage" FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);`,
  `CREATE POLICY "Users manage own data" ON "WaterIntake" FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);`,
  `CREATE POLICY "Users manage own data" ON "DailyGoal" FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);`,
  `CREATE POLICY "Users manage own data" ON "UserMealPreference" FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);`,
  `CREATE POLICY "Users manage own data" ON "shopping_list" FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);`,
  `CREATE POLICY "Users manage own data" ON "ingredient_checks" FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);`,
  `CREATE POLICY "Users manage own data" ON "connected_devices" FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);`,
  `CREATE POLICY "Users manage own data" ON "daily_activity_summary" FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);`,
  `CREATE POLICY "Users manage own data" ON "calendar_events" FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);`,
  `CREATE POLICY "Users manage own data" ON "FoodProduct" FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);`,
  `CREATE POLICY "Users manage own data" ON "meal_completions" FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);`,
  `CREATE POLICY "Users manage own data" ON "ai_recommendations" FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);`,
  `CREATE POLICY "Users manage own data" ON "MenuReview" FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);`,
  `CREATE POLICY "Users manage own data" ON "user_meal_plans" FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);`,
  `CREATE POLICY "Users manage own data" ON "recommended_menus" FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);`,

  // Payments
  `CREATE POLICY "Users can view own payments" ON "SubscriptionPayment" FOR SELECT USING (auth.uid()::text = user_id);`,
  `CREATE POLICY "System can insert payments" ON "SubscriptionPayment" FOR INSERT WITH CHECK (true);`,

  // Gamification
  `CREATE POLICY "Users can view own badges" ON "gamification_badges" FOR SELECT USING (auth.uid()::text = user_id);`,
  `CREATE POLICY "System can insert badges" ON "gamification_badges" FOR INSERT WITH CHECK (true);`,
  `CREATE POLICY "Users can view own user badges" ON "UserBadge" FOR SELECT USING (auth.uid()::text = user_id);`,
  `CREATE POLICY "System can insert user badges" ON "UserBadge" FOR INSERT WITH CHECK (true);`,
  `CREATE POLICY "Users can delete own badges" ON "UserBadge" FOR DELETE USING (auth.uid()::text = user_id);`,
  `CREATE POLICY "Users can view own achievements" ON "UserAchievement" FOR SELECT USING (auth.uid()::text = user_id);`,
  `CREATE POLICY "Users can update own achievements" ON "UserAchievement" FOR UPDATE USING (auth.uid()::text = user_id);`,
  `CREATE POLICY "System can insert achievements" ON "UserAchievement" FOR INSERT WITH CHECK (true);`,

  // Meal plan schedules
  `CREATE POLICY "Users can view schedules" ON "meal_plan_schedules" FOR SELECT USING (EXISTS (SELECT 1 FROM "user_meal_plans" WHERE plan_id = "meal_plan_schedules".plan_id AND user_id = auth.uid()::text));`,
  `CREATE POLICY "Users can insert schedules" ON "meal_plan_schedules" FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM "user_meal_plans" WHERE plan_id = "meal_plan_schedules".plan_id AND user_id = auth.uid()::text));`,
  `CREATE POLICY "Users can update schedules" ON "meal_plan_schedules" FOR UPDATE USING (EXISTS (SELECT 1 FROM "user_meal_plans" WHERE plan_id = "meal_plan_schedules".plan_id AND user_id = auth.uid()::text));`,
  `CREATE POLICY "Users can delete schedules" ON "meal_plan_schedules" FOR DELETE USING (EXISTS (SELECT 1 FROM "user_meal_plans" WHERE plan_id = "meal_plan_schedules".plan_id AND user_id = auth.uid()::text));`,

  // Recommended meals
  `CREATE POLICY "Users can view meals" ON "recommended_meals" FOR SELECT USING (EXISTS (SELECT 1 FROM "recommended_menus" WHERE menu_id = "recommended_meals".menu_id AND user_id = auth.uid()::text));`,
  `CREATE POLICY "Users can insert meals" ON "recommended_meals" FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM "recommended_menus" WHERE menu_id = "recommended_meals".menu_id AND user_id = auth.uid()::text));`,
  `CREATE POLICY "Users can update meals" ON "recommended_meals" FOR UPDATE USING (EXISTS (SELECT 1 FROM "recommended_menus" WHERE menu_id = "recommended_meals".menu_id AND user_id = auth.uid()::text));`,
  `CREATE POLICY "Users can delete meals" ON "recommended_meals" FOR DELETE USING (EXISTS (SELECT 1 FROM "recommended_menus" WHERE menu_id = "recommended_meals".menu_id AND user_id = auth.uid()::text));`,

  // Recommended ingredients
  `CREATE POLICY "Users can view ingredients" ON "recommended_ingredients" FOR SELECT USING (EXISTS (SELECT 1 FROM "recommended_meals" rm JOIN "recommended_menus" rmenu ON rm.menu_id = rmenu.menu_id WHERE rm.meal_id = "recommended_ingredients".meal_id AND rmenu.user_id = auth.uid()::text));`,
  `CREATE POLICY "Users can insert ingredients" ON "recommended_ingredients" FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM "recommended_meals" rm JOIN "recommended_menus" rmenu ON rm.menu_id = rmenu.menu_id WHERE rm.meal_id = "recommended_ingredients".meal_id AND rmenu.user_id = auth.uid()::text));`,
  `CREATE POLICY "Users can update ingredients" ON "recommended_ingredients" FOR UPDATE USING (EXISTS (SELECT 1 FROM "recommended_meals" rm JOIN "recommended_menus" rmenu ON rm.menu_id = rmenu.menu_id WHERE rm.meal_id = "recommended_ingredients".meal_id AND rmenu.user_id = auth.uid()::text));`,
  `CREATE POLICY "Users can delete ingredients" ON "recommended_ingredients" FOR DELETE USING (EXISTS (SELECT 1 FROM "recommended_meals" rm JOIN "recommended_menus" rmenu ON rm.menu_id = rmenu.menu_id WHERE rm.meal_id = "recommended_ingredients".meal_id AND rmenu.user_id = auth.uid()::text));`,

  // Public tables
  `CREATE POLICY "Anyone can view templates" ON "meal_templates" FOR SELECT USING (is_active = true);`,
  `CREATE POLICY "Anyone can view badges" ON "Badge" FOR SELECT USING (true);`,
  `CREATE POLICY "Anyone can view achievements" ON "Achievement" FOR SELECT USING (true);`,
];

async function setupRLS() {
  const client = await pool.connect();

  try {
    console.log("🚀 Starting RLS setup...\n");

    for (let i = 0; i < policies.length; i++) {
      const policy = policies[i];
      const num = i + 1;
      const total = policies.length;

      try {
        await client.query(policy);
        console.log(`✅ [${num}/${total}] Success`);
      } catch (error) {
        // Ignore "already exists" errors
        if (error.message.includes("already exists")) {
          console.log(`⚠️  [${num}/${total}] Already exists (skipped)`);
        } else {
          console.error(`❌ [${num}/${total}] Error:`, error.message);
          console.error("Query:", policy.substring(0, 100) + "...");
        }
      }
    }

    console.log("\n✅ RLS setup complete!");
    console.log("\n📊 Verification:");

    // Verify
    const rlsCount = await client.query(`
      SELECT COUNT(*) 
      FROM pg_tables 
      WHERE schemaname = 'public' AND rowsecurity = true
    `);
    console.log(`Tables with RLS enabled: ${rlsCount.rows[0].count}`);

    const policyCount = await client.query(`
      SELECT COUNT(*) 
      FROM pg_policies 
      WHERE schemaname = 'public'
    `);
    console.log(`Total policies created: ${policyCount.rows[0].count}`);
  } catch (error) {
    console.error("❌ Fatal error:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

setupRLS();
