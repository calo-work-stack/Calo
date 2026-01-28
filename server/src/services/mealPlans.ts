import { prisma } from "../lib/database";
import {
  AIMealPlanResponse,
  MealPlanTemplate,
  UserMealPlanConfig,
  WeeklyMealPlan,
} from "../types/mealPlans";
import { OpenAIService } from "./openai";
import { estimateIngredientPrice } from "../utils/pricing";

// Helper function to sanitize strings
function sanitizeString(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input.trim().replace(/[<>]/g, "");
}
type MealPlanType = "WEEKLY" | "DAILY" | "THREE_DAYS";

// Helper function to validate arrays
function validateArray<T>(input: any, fallback: T[] = []): T[] {
  return Array.isArray(input) ? input : fallback;
}

function isValidMealPlanType(type: string): type is MealPlanType {
  return ["WEEKLY", "DAILY", "THREE_DAYS"].includes(type);
}
// Helper function to validate enums
function validateEnum<T>(value: any, validValues: T[], fallback: T): T {
  return validValues.includes(value) ? value : fallback;
}

export class MealPlanService {
  // Valid enum values (should match your Prisma schema)
  private static readonly VALID_MEAL_TIMINGS = [
    "BREAKFAST",
    "LUNCH",
    "DINNER",
    "SNACK",
    "MORNING_SNACK",
    "AFTERNOON_SNACK",
  ];

  private static readonly VALID_DIETARY_CATEGORIES = [
    "VEGETARIAN",
    "VEGAN",
    "KETO",
    "PALEO",
    "MEDITERRANEAN",
    "LOW_CARB",
    "HIGH_PROTEIN",
    "GLUTEN_FREE",
    "DAIRY_FREE",
    "BALANCED",
  ];

  static async createUserMealPlan(user_id: string, config: UserMealPlanConfig) {
    try {
      console.log(
        "🍽️ Creating AI-powered meal plan for user:",
        user_id,
        config
      );

      // Validate and sanitize input
      const sanitizedConfig = this.sanitizeConfig(config);

      // Get user's questionnaire data for personalization
      const questionnaire = await prisma.userQuestionnaire.findFirst({
        where: { user_id },
        orderBy: { date_completed: "desc" },
      });

      // Get user's nutrition goals
      const nutritionPlan = await prisma.nutritionPlan.findFirst({
        where: { user_id },
        orderBy: { created_at: "desc" },
      });

      // Get user's basic info
      const user = await prisma.userQuestionnaire.findFirst({
        where: { user_id: user_id },
        select: {
          age: true,
          weight_kg: true,
          height_cm: true,
        },
      });

      // Generate AI meal plan BEFORE starting transaction
      const aiMealPlan = await this.generateAIMealPlan(
        sanitizedConfig,
        questionnaire,
        nutritionPlan,
        user
      );

      // Validate AI response
      if (
        !aiMealPlan ||
        !aiMealPlan.weekly_plan ||
        !Array.isArray(aiMealPlan.weekly_plan)
      ) {
        throw new Error("Invalid AI meal plan response structure");
      }

      // Create the meal plan using transaction (now much faster)
      const result = await prisma.$transaction(
        async (tx) => {
          const mealPlan = await tx.userMealPlan.create({
            data: {
              user_id,
              name: sanitizedConfig.name,
              plan_type: sanitizedConfig.plan_type,
              meals_per_day: sanitizedConfig.meals_per_day,
              snacks_per_day: sanitizedConfig.snacks_per_day,
              rotation_frequency_days: sanitizedConfig.rotation_frequency_days,
              include_leftovers: sanitizedConfig.include_leftovers,
              fixed_meal_times: sanitizedConfig.fixed_meal_times,
              target_calories_daily: nutritionPlan?.goal_calories || 2000,
              target_protein_daily: nutritionPlan?.goal_protein_g || 150,
              target_carbs_daily: nutritionPlan?.goal_carbs_g || 250,
              target_fats_daily: nutritionPlan?.goal_fats_g || 67,
              dietary_preferences: sanitizedConfig.dietary_preferences,
              excluded_ingredients: sanitizedConfig.excluded_ingredients,
              start_date: new Date(),
              is_active: true,
            },
          });

          // Store AI-generated meal templates and create schedule
          await this.storeAIMealTemplatesAndScheduleTransaction(
            tx,
            mealPlan.plan_id,
            aiMealPlan
          );

          return mealPlan;
        },
        {
          timeout: 30000, // 30 seconds timeout
          maxWait: 35000, // 35 seconds max wait
        }
      );

      console.log("✅ AI meal plan created successfully");
      return result;
    } catch (error) {
      console.error("💥 Error creating AI meal plan:", error);
      throw new Error(
        `Failed to create meal plan: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private static sanitizeConfig(
    config: UserMealPlanConfig
  ): UserMealPlanConfig {
    const cleanedType = sanitizeString(config.plan_type);

    return {
      name: sanitizeString(config.name),

      // ✅ Validate the string against allowed values
      plan_type: isValidMealPlanType(cleanedType) ? cleanedType : "WEEKLY",

      meals_per_day: Math.max(1, Math.min(6, Math.floor(config.meals_per_day))),
      snacks_per_day: Math.max(
        0,
        Math.min(3, Math.floor(config.snacks_per_day))
      ),
      rotation_frequency_days: Math.max(
        1,
        Math.min(14, Math.floor(config.rotation_frequency_days))
      ),
      include_leftovers: Boolean(config.include_leftovers),
      fixed_meal_times: Boolean(config.fixed_meal_times),
      dietary_preferences: (
        validateArray(config.dietary_preferences) as string[]
      )
        .map(sanitizeString)
        .slice(0, 10),

      excluded_ingredients: (
        validateArray(config.excluded_ingredients) as string[]
      )
        .map(sanitizeString)
        .slice(0, 20),
    };
  }

  static async generateAIMealPlan(
    config: UserMealPlanConfig,
    questionnaire: any,
    nutritionPlan: any,
    user: any
  ): Promise<AIMealPlanResponse> {
    try {
      console.log("🤖 Generating AI meal plan...");

      // Build user profile for AI
      const userProfile = this.buildUserProfile(
        config,
        questionnaire,
        nutritionPlan,
        user
      );

      // For now, use fallback directly to avoid OpenAI issues
      console.log("🔄 Using reliable fallback meal plan generation");
      return this.generateFallbackMealPlan(config);
    } catch (error) {
      console.error("💥 Error generating AI meal plan:", error);
      console.log("🔄 Falling back to default meal plan");
      // Return fallback meal plan if AI fails
      return this.generateFallbackMealPlan(config);
    }
  }

  static validateAndStructureAIResponse(aiResponse: any): AIMealPlanResponse {
    try {
      // If response is a string, try to parse it
      if (typeof aiResponse === "string") {
        aiResponse = JSON.parse(aiResponse);
      }

      // Check if response has the expected structure
      if (!aiResponse || !aiResponse.weekly_plan) {
        throw new Error("Missing weekly_plan in AI response");
      }

      // Validate each day's meals
      const validatedWeeklyPlan = aiResponse.weekly_plan.map(
        (dayPlan: any, index: number) => {
          if (!dayPlan.meals || !Array.isArray(dayPlan.meals)) {
            throw new Error(`Day ${index} missing meals array`);
          }

          const validatedMeals = dayPlan.meals.map((meal: any) => {
            return {
              name: sanitizeString(meal.name) || `Meal ${index + 1}`,
              description: meal.description
                ? sanitizeString(meal.description)
                : null,
              meal_timing: validateEnum(
                meal.meal_timing,
                this.VALID_MEAL_TIMINGS,
                "BREAKFAST"
              ),
              dietary_category: validateEnum(
                meal.dietary_category,
                this.VALID_DIETARY_CATEGORIES,
                "BALANCED"
              ),
              prep_time_minutes: Math.max(
                5,
                Math.min(180, Number(meal.prep_time_minutes) || 30)
              ),
              difficulty_level: Math.max(
                1,
                Math.min(5, Number(meal.difficulty_level) || 2)
              ),
              calories: Math.max(
                50,
                Math.min(2000, Number(meal.calories) || 400)
              ),
              protein_g: Math.max(
                0,
                Math.min(100, Number(meal.protein_g) || 20)
              ),
              carbs_g: Math.max(0, Math.min(200, Number(meal.carbs_g) || 40)),
              fats_g: Math.max(0, Math.min(100, Number(meal.fats_g) || 15)),
              fiber_g: Math.max(0, Math.min(50, Number(meal.fiber_g) || 5)),
              sugar_g: Math.max(0, Math.min(100, Number(meal.sugar_g) || 10)),
              sodium_mg: Math.max(
                0,
                Math.min(5000, Number(meal.sodium_mg) || 500)
              ),
              ingredients: validateArray(meal.ingredients),
              instructions: validateArray(meal.instructions),
              allergens: validateArray<string>(meal.allergens),
              image_url: meal.image_url || null,
              portion_multiplier: Math.max(
                0.1,
                Math.min(3.0, Number(meal.portion_multiplier) || 1.0)
              ),
              is_optional: Boolean(meal.is_optional || false),
            };
          });

          return {
            day: sanitizeString(dayPlan.day) || `Day ${index + 1}`,
            meals: validatedMeals,
          };
        }
      );

      return {
        weekly_plan: validatedWeeklyPlan,
      };
    } catch (error) {
      console.error("Error validating AI response:", error);
      throw new Error("Invalid AI response structure");
    }
  }

  static generateFallbackMealPlan(
    config: UserMealPlanConfig
  ): AIMealPlanResponse {
    console.log("🔄 Generating fallback meal plan...");

    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const mealTimings = ["BREAKFAST", "LUNCH", "DINNER"];

    const fallbackMeals = [
      {
        name: "Scrambled Eggs with Toast",
        description: "Classic breakfast with protein and carbs",
        meal_timing: "BREAKFAST",
        dietary_category: "BALANCED",
        prep_time_minutes: 15,
        difficulty_level: 1,
        calories: 350,
        protein_g: 18,
        carbs_g: 25,
        fats_g: 18,
        fiber_g: 3,
        sugar_g: 4,
        sodium_mg: 450,
        ingredients: [
          { name: "eggs", quantity: 2, unit: "piece", category: "Protein" },
          { name: "bread", quantity: 2, unit: "slice", category: "Grains" },
          { name: "butter", quantity: 1, unit: "tbsp", category: "Fats" },
        ],
        instructions: [
          "Heat butter in pan",
          "Scramble eggs",
          "Toast bread",
          "Serve together",
        ],
        allergens: ["eggs", "gluten"],
        image_url: null,
        portion_multiplier: 1.0,
        is_optional: false,
      },
      {
        name: "Grilled Chicken Salad",
        description: "Healthy lunch with lean protein and vegetables",
        meal_timing: "LUNCH",
        dietary_category: "BALANCED",
        prep_time_minutes: 25,
        difficulty_level: 2,
        calories: 400,
        protein_g: 35,
        carbs_g: 15,
        fats_g: 20,
        fiber_g: 8,
        sugar_g: 8,
        sodium_mg: 600,
        ingredients: [
          {
            name: "chicken breast",
            quantity: 150,
            unit: "g",
            category: "Protein",
          },
          {
            name: "mixed greens",
            quantity: 100,
            unit: "g",
            category: "Vegetables",
          },
          { name: "olive oil", quantity: 2, unit: "tbsp", category: "Fats" },
        ],
        instructions: [
          "Grill chicken breast",
          "Prepare salad",
          "Add dressing",
          "Combine and serve",
        ],
        allergens: [],
        image_url: null,
        portion_multiplier: 1.0,
        is_optional: false,
      },
      {
        name: "Baked Salmon with Rice",
        description: "Nutritious dinner with omega-3 rich fish",
        meal_timing: "DINNER",
        dietary_category: "BALANCED",
        prep_time_minutes: 30,
        difficulty_level: 2,
        calories: 500,
        protein_g: 35,
        carbs_g: 45,
        fats_g: 18,
        fiber_g: 2,
        sugar_g: 2,
        sodium_mg: 400,
        ingredients: [
          {
            name: "salmon fillet",
            quantity: 150,
            unit: "g",
            category: "Protein",
          },
          { name: "brown rice", quantity: 80, unit: "g", category: "Grains" },
          {
            name: "broccoli",
            quantity: 100,
            unit: "g",
            category: "Vegetables",
          },
        ],
        instructions: [
          "Bake salmon at 400°F for 15 minutes",
          "Cook rice according to package",
          "Steam broccoli",
          "Serve together",
        ],
        allergens: ["fish"],
        image_url: null,
        portion_multiplier: 1.0,
        is_optional: false,
      },
    ];

    return {
      weekly_plan: days.map((day, dayIndex) => ({
        day,
        meals: mealTimings
          .slice(0, config.meals_per_day)
          .map((timing, mealIndex) => {
            const baseMeal =
              fallbackMeals.find((m) => m.meal_timing === timing) ||
              fallbackMeals[0];
            return {
              ...baseMeal,
              name: `${baseMeal.name} - ${day}`,
              meal_timing: timing,
              image_url: baseMeal.image_url ?? undefined,
            };
          }),
      })),
    };
  }

  static buildUserProfile(
    config: UserMealPlanConfig,
    questionnaire: any,
    nutritionPlan: any,
    user: any
  ) {
    return {
      // Nutrition goals
      target_calories_daily: nutritionPlan?.goal_calories ?? 2000,
      target_protein_daily: nutritionPlan?.goal_protein_g ?? 150,
      target_carbs_daily: nutritionPlan?.goal_carbs_g ?? 250,
      target_fats_daily: nutritionPlan?.goal_fats_g ?? 67,

      // Meal structure preferences
      meals_per_day: config.meals_per_day,
      snacks_per_day: config.snacks_per_day,
      rotation_frequency_days: config.rotation_frequency_days,
      include_leftovers: config.include_leftovers,
      fixed_meal_times: config.fixed_meal_times,

      // Dietary preferences and restrictions with safe array access
      dietary_preferences: config.dietary_preferences || [],
      excluded_ingredients: config.excluded_ingredients || [],
      allergies: validateArray(questionnaire?.allergies),

      // Lifestyle factors
      physical_activity_level:
        questionnaire?.physical_activity_level || "MODERATE",
      sport_frequency: questionnaire?.sport_frequency || "TWO_TO_THREE",
      main_goal: questionnaire?.main_goal || "GENERAL_HEALTH",

      // Food preferences from questionnaire
      dietary_preferences_questionnaire: validateArray(
        questionnaire?.dietary_preferences
      ),
      avoided_foods: validateArray(questionnaire?.avoided_foods),
      meal_texture_preference:
        questionnaire?.meal_texture_preference || "VARIED",

      // Cooking preferences
      cooking_skill_level: "intermediate",
      available_cooking_time: this.getCookingTimeFrommeal_count(
        config.meals_per_day
      ),
      kitchen_equipment: ["oven", "stovetop", "microwave"],
    };
  }

  static async storeAIMealTemplatesAndSchedule(
    plan_id: string,
    aiMealPlan: AIMealPlanResponse
  ) {
    return await prisma.$transaction(async (tx) => {
      return await this.storeAIMealTemplatesAndScheduleTransaction(
        tx,
        plan_id,
        aiMealPlan
      );
    });
  }

  static async storeAIMealTemplatesAndScheduleTransaction(
    tx: any,
    plan_id: string,
    aiMealPlan: AIMealPlanResponse
  ) {
    try {
      const templateIds: { [key: string]: string } = {};

      // 🔍 Debug: Log the structure we're getting
      console.log("🔍 AI Meal Plan Structure:");
      console.log("Weekly plan length:", aiMealPlan.weekly_plan.length);
      aiMealPlan.weekly_plan.forEach((dayPlan, index) => {
        console.log(
          `Day ${index}: day=${
            dayPlan.day
          } (type: ${typeof dayPlan.day}), meals: ${dayPlan.meals.length}`
        );
      });

      // Process each day's meals
      for (const dayPlan of aiMealPlan.weekly_plan) {
        // Fix: Convert day to number and validate
        const dayOfWeek = this.convertDayToNumber(dayPlan.day);

        console.log(`🔍 Converting day: ${dayPlan.day} -> ${dayOfWeek}`);

        if (dayOfWeek === null) {
          console.error(
            `❌ Invalid day value: ${dayPlan.day}, skipping this day`
          );
          continue;
        }

        for (const meal of dayPlan.meals) {
          const templateKey = `${meal.name}_${meal.meal_timing}`;

          // Check if template already exists in current batch
          if (!templateIds[templateKey]) {
            try {
              // Create meal template
              const template = await tx.mealTemplate.create({
                data: {
                  name: meal.name,
                  description: meal.description,
                  meal_timing: meal.meal_timing,
                  dietary_category: meal.dietary_category,
                  prep_time_minutes: meal.prep_time_minutes,
                  difficulty_level: meal.difficulty_level,
                  calories: meal.calories,
                  protein_g: meal.protein_g,
                  carbs_g: meal.carbs_g,
                  fats_g: meal.fats_g,
                  fiber_g: meal.fiber_g,
                  sugar_g: meal.sugar_g,
                  sodium_mg: meal.sodium_mg,
                  ingredients_json: meal.ingredients,
                  instructions_json: meal.instructions,
                  allergens_json: meal.allergens,
                  image_url: meal.image_url,
                },
              });

              templateIds[templateKey] = template.template_id;
              console.log(`✅ Created template: ${meal.name}`);
            } catch (templateError) {
              console.error(
                `❌ Error creating template for ${meal.name}:`,
                templateError
              );
              continue;
            }
          }

          // Create meal plan schedule entry
          if (templateIds[templateKey]) {
            try {
              await tx.mealPlanSchedule.create({
                data: {
                  plan_id: plan_id,
                  template_id: templateIds[templateKey],
                  day_of_week: dayOfWeek, // ✅ Now guaranteed to be a valid number
                  meal_timing: meal.meal_timing,
                  portion_multiplier: meal.portion_multiplier || 1.0,
                  is_optional: meal.is_optional || false,
                },
              });
              console.log(
                `✅ Created schedule entry for ${meal.name} on day ${dayOfWeek}`
              );
            } catch (scheduleError) {
              console.error(
                `❌ Error creating schedule for ${meal.name}:`,
                scheduleError
              );
            }
          }
        }
      }

      console.log("✅ All meal templates and schedules processed");
    } catch (error) {
      console.error(
        "💥 Error in storeAIMealTemplatesAndScheduleTransaction:",
        error
      );
      throw error;
    }
  }

  // Helper function to convert day names/numbers to valid day_of_week integers
  private static convertDayToNumber(day: any): number | null {
    console.log(`🔍 convertDayToNumber input: ${day} (type: ${typeof day})`);

    // Handle null/undefined
    if (day === null || day === undefined) {
      console.log("❌ Day is null/undefined");
      return null;
    }

    // If it's already a number, validate it's in range 0-6
    if (typeof day === "number") {
      if (isNaN(day)) {
        console.log("❌ Day is NaN");
        return null;
      }
      const validDay = day >= 0 && day <= 6 ? day : null;
      console.log(`✅ Number day: ${day} -> ${validDay}`);
      return validDay;
    }

    // If it's a string, try to parse it
    if (typeof day === "string") {
      // Try parsing as number first
      const numDay = parseInt(day.trim(), 10);
      if (!isNaN(numDay) && numDay >= 0 && numDay <= 6) {
        console.log(`✅ String number day: "${day}" -> ${numDay}`);
        return numDay;
      }

      // Try parsing as day name
      const dayName = day.toLowerCase().trim();
      const dayMap: { [key: string]: number } = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
        sun: 0,
        mon: 1,
        tue: 2,
        wed: 3,
        thu: 4,
        fri: 5,
        sat: 6,
        // Handle variations
        tues: 2,
        thurs: 4,
        weds: 3,
      };

      const result = dayMap[dayName] !== undefined ? dayMap[dayName] : null;
      console.log(`✅ String day name: "${day}" -> ${result}`);
      return result;
    }

    console.log(`❌ Unknown day type: ${typeof day}`);
    return null;
  }

  static async getUserMealPlan(
    user_id: string,
    plan_id?: string
  ): Promise<WeeklyMealPlan> {
    try {
      console.log("📋 Getting meal plan for user:", user_id);
      console.log("📋 Plan ID:", plan_id);

      // Get the active meal plan or specific plan
      const mealPlan = await prisma.userMealPlan.findFirst({
        where: {
          user_id,
          ...(plan_id ? { plan_id } : { is_active: true }),
        },
        include: {
          schedules: {
            include: {
              template: true,
            },
            orderBy: [
              { day_of_week: "asc" },
              { meal_timing: "asc" },
              { meal_order: "asc" },
            ],
          },
        },
      });

      if (!mealPlan) {
        console.log("⚠️ No meal plan found for user:", user_id);
        // Return empty meal plan structure instead of throwing error
        return {};
      }

      console.log(
        `📋 Found meal plan with ${mealPlan.schedules.length} schedule entries`
      );

      // If no schedules, return empty structure
      if (!mealPlan.schedules || mealPlan.schedules.length === 0) {
        console.log("⚠️ No schedules found in meal plan");
        return {};
      }

      // Organize by day and meal timing
      const weeklyPlan: WeeklyMealPlan = {};
      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];

      for (let day = 0; day < 7; day++) {
        const dayName = dayNames[day];
        weeklyPlan[dayName] = {};

        const daySchedules = mealPlan.schedules.filter(
          (s) => s.day_of_week === day
        );

        // Group by meal timing
        const timingGroups = daySchedules.reduce((acc, schedule) => {
          const timing = schedule.meal_timing;
          if (!acc[timing]) acc[timing] = [];

          // Safe JSON parsing with fallbacks
          let ingredients: string[] = [];
          let instructions: string[] = [];
          let allergens: string[] = [];

          try {
            ingredients = Array.isArray(schedule.template.ingredients_json)
              ? (schedule.template.ingredients_json as string[])
              : [];
          } catch (e) {
            console.warn("Failed to parse ingredients_json:", e);
          }

          try {
            instructions = Array.isArray(schedule.template.instructions_json)
              ? (schedule.template.instructions_json as string[])
              : [];
          } catch (e) {
            console.warn("Failed to parse instructions_json:", e);
          }

          try {
            allergens = Array.isArray(schedule.template.allergens_json)
              ? (schedule.template.allergens_json as string[])
              : [];
          } catch (e) {
            console.warn("Failed to parse allergens_json:", e);
          }

          acc[timing].push({
            template_id: schedule.template.template_id,
            name: schedule.template.name,
            description: schedule.template.description || undefined,
            meal_timing: schedule.template.meal_timing,
            dietary_category: schedule.template.dietary_category,
            prep_time_minutes: schedule.template.prep_time_minutes || undefined,
            difficulty_level: schedule.template.difficulty_level || undefined,
            calories: Math.round(
              (Number(schedule.template.calories) || 0) *
                schedule.portion_multiplier
            ),
            protein_g:
              Math.round(
                (Number(schedule.template.protein_g) || 0) *
                  schedule.portion_multiplier *
                  10
              ) / 10,
            carbs_g:
              Math.round(
                (Number(schedule.template.carbs_g) || 0) *
                  schedule.portion_multiplier *
                  10
              ) / 10,
            fats_g:
              Math.round(
                (Number(schedule.template.fats_g) || 0) *
                  schedule.portion_multiplier *
                  10
              ) / 10,
            fiber_g:
              Math.round(
                (Number(schedule.template.fiber_g) || 0) *
                  schedule.portion_multiplier *
                  10
              ) / 10,
            sugar_g:
              Math.round(
                (Number(schedule.template.sugar_g) || 0) *
                  schedule.portion_multiplier *
                  10
              ) / 10,
            sodium_mg: Math.round(
              (Number(schedule.template.sodium_mg) || 0) *
                schedule.portion_multiplier
            ),
            ingredients,
            instructions,
            allergens,
            image_url: schedule.template.image_url || undefined,
          });
          return acc;
        }, {} as Record<string, MealPlanTemplate[]>);

        weeklyPlan[dayName] = timingGroups;
      }

      console.log("✅ Meal plan retrieved successfully");
      return weeklyPlan;
    } catch (error) {
      console.error("💥 Error getting meal plan:", error);
      throw error;
    }
  }

  static async replaceMealInPlan(
    userId: string,
    planId: string,
    dayOfWeek: number,
    mealTiming: string,
    mealOrder: number = 0,
    preferences: any = {}
  ) {
    try {
      console.log("🔄 Replacing meal in plan with AI:", {
        planId,
        dayOfWeek,
        mealTiming,
        mealOrder,
        preferences,
      });

      // Get the meal plan with schedules
      const mealPlan = await prisma.userMealPlan.findFirst({
        where: {
          plan_id: planId,
          user_id: userId,
        },
        include: {
          schedules: {
            where: {
              day_of_week: dayOfWeek,
              meal_timing: mealTiming as any,
            },
            include: {
              template: true,
            },
            orderBy: [{ meal_order: "asc" }],
          },
        },
      });

      if (!mealPlan) {
        console.log("🔍 Meal plan not found, checking recommended menu...");

        const recommendedMenu = await prisma.recommendedMenu.findFirst({
          where: {
            menu_id: planId,
            user_id: userId,
          },
          include: {
            meals: {
              where: {
                day_number: dayOfWeek + 1,
                meal_type: mealTiming as any,
              },
            },
          },
        });

        if (!recommendedMenu) {
          throw new Error("Meal plan not found");
        }

        // Handle recommended menu replacement
        const currentMeal =
          recommendedMenu.meals[mealOrder] || recommendedMenu.meals[0];
        if (!currentMeal) {
          throw new Error(
            `No meal found for day ${dayOfWeek + 1}, timing ${mealTiming}`
          );
        }

        console.log(
          "✅ Found recommended menu meal to replace:",
          currentMeal.name
        );

        // Generate AI replacement meal for recommended menu
        const userQuestionnaire = await prisma.userQuestionnaire.findFirst({
          where: { user_id: userId },
          orderBy: { date_completed: "desc" },
        });

        const newMealData = await this.generateAIReplacementMeal(
          {
            name: currentMeal.name,
            meal_timing: currentMeal.meal_type,
            dietary_category: "BALANCED",
            calories: currentMeal.calories,
            protein_g: currentMeal.protein,
            carbs_g: currentMeal.carbs,
            fats_g: currentMeal.fat,
          },
          preferences,
          userQuestionnaire,
          userId
        );

        // Update the recommended meal
        await prisma.recommendedMeal.update({
          where: { meal_id: currentMeal.meal_id },
          data: {
            name: newMealData.name,
            calories: newMealData.calories,
            protein: newMealData.protein_g,
            carbs: newMealData.carbs_g,
            fat: newMealData.fats_g,
            fiber: newMealData.fiber_g,
            instructions: newMealData.description,
            prep_time_minutes: newMealData.prep_time_minutes,
          },
        });

        return {
          success: true,
          data: newMealData,
        };
      }

      if (!mealPlan.schedules || mealPlan.schedules.length === 0) {
        throw new Error(
          `No meals found for day ${dayOfWeek}, timing ${mealTiming}`
        );
      }

      // Find the specific meal or use the first one if meal_order is 0 or not specified
      let currentSchedule =
        mealPlan.schedules.find((s) => s.meal_order === mealOrder) ||
        mealPlan.schedules[0];

      if (!currentSchedule) {
        console.log(
          "🔍 Available schedules:",
          mealPlan.schedules.map((s) => ({
            day: s.day_of_week,
            timing: s.meal_timing,
            order: s.meal_order,
            name: s.template.name,
          }))
        );
        throw new Error(
          `No meal found for day ${dayOfWeek}, timing ${mealTiming}, order ${mealOrder}`
        );
      }

      console.log("✅ Found meal to replace:", currentSchedule.template.name);

      // Get user's dietary preferences for context
      const userQuestionnaire = await prisma.userQuestionnaire.findFirst({
        where: { user_id: userId },
        orderBy: { date_completed: "desc" },
      });

      // Generate a new meal template using AI
      const newTemplate = await this.generateAIReplacementMeal(
        currentSchedule.template,
        preferences,
        userQuestionnaire,
        userId
      );

      // Create new meal template in database
      const createdTemplate = await prisma.mealTemplate.create({
        data: newTemplate,
      });

      // Update the schedule to use the new template
      await prisma.mealPlanSchedule.update({
        where: {
          schedule_id: currentSchedule.schedule_id,
        },
        data: {
          template_id: createdTemplate.template_id,
        },
      });

      console.log("✅ AI-powered meal replacement completed");

      return {
        success: true,
        data: {
          template_id: createdTemplate.template_id,
          name: createdTemplate.name,
          description: createdTemplate.description,
          meal_timing: createdTemplate.meal_timing,
          dietary_category: createdTemplate.dietary_category,
          prep_time_minutes: createdTemplate.prep_time_minutes,
          difficulty_level: createdTemplate.difficulty_level,
          calories: createdTemplate.calories,
          protein_g: createdTemplate.protein_g,
          carbs_g: createdTemplate.carbs_g,
          fats_g: createdTemplate.fats_g,
          fiber_g: createdTemplate.fiber_g,
          sugar_g: createdTemplate.sugar_g,
          sodium_mg: createdTemplate.sodium_mg,
          ingredients_json: createdTemplate.ingredients_json,
          instructions_json: createdTemplate.instructions_json,
          allergens_json: createdTemplate.allergens_json,
          image_url: createdTemplate.image_url,
        },
      };
    } catch (error) {
      console.error("💥 Error replacing meal in plan:", error);
      throw error;
    }
  }

  static async generateAIReplacementMeal(
    currentMeal: any,
    preferences: any,
    userQuestionnaire: any,
    userId: string
  ) {
    try {
      console.log("🤖 Generating AI replacement meal...");

      // Import OpenAI service
      const { OpenAIService } = await import("./openai");

      // Build context for AI generation
      const currentMealContext = preferences.current_meal_context || {
        name: currentMeal.name,
        calories: currentMeal.calories,
        protein_g: currentMeal.protein_g,
        carbs_g: currentMeal.carbs_g,
        fats_g: currentMeal.fats_g,
      };

      const replacementPrompt = `Generate a replacement meal for the following context:

CURRENT MEAL TO REPLACE:
- Name: ${currentMealContext.name}
- Calories: ${currentMealContext.calories}
- Protein: ${currentMealContext.protein_g}g
- Carbs: ${currentMealContext.carbs_g}g
- Fats: ${currentMealContext.fats_g}g
- Meal timing: ${currentMeal.meal_timing}

USER PREFERENCES:
${
  preferences.protein_preference
    ? `- Protein preference: ${preferences.protein_preference}`
    : ""
}
${
  preferences.calorie_preference
    ? `- Calorie preference: ${preferences.calorie_preference}`
    : ""
}
${
  preferences.dietary_category
    ? `- Dietary category: ${preferences.dietary_category}`
    : ""
}
${
  preferences.max_prep_time
    ? `- Max prep time: ${preferences.max_prep_time} minutes`
    : ""
}

USER DIETARY INFO:
${
  userQuestionnaire?.dietary_restrictions
    ? `- Dietary restrictions: ${userQuestionnaire.dietary_restrictions.join(
        ", "
      )}`
    : ""
}
${
  userQuestionnaire?.food_allergies
    ? `- Food allergies: ${userQuestionnaire.food_allergies.join(", ")}`
    : ""
}
${
  userQuestionnaire?.main_goal
    ? `- Main goal: ${userQuestionnaire.main_goal}`
    : ""
}

REQUIREMENTS:
1. Create a completely different meal that matches the user's preferences
2. Maintain similar nutritional profile unless specifically requested otherwise
3. Consider dietary restrictions and allergies
4. Make it suitable for the same meal timing
5. Provide detailed ingredients list and instructions

Please return a JSON object with the following structure:
{
  "name": "Meal name",
  "description": "Brief description",
  "meal_timing": "${currentMeal.meal_timing}",
  "dietary_category": "BALANCED/VEGETARIAN/VEGAN/etc",
  "prep_time_minutes": number,
  "difficulty_level": 1-5,
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fats_g": number,
  "fiber_g": number,
  "sugar_g": number,
  "sodium_mg": number,
  "ingredients_json": ["ingredient1", "ingredient2", "etc"],
  "instructions_json": ["step1", "step2", "etc"],
  "allergens_json": ["allergen1", "allergen2"],
  "replacement_reason": "Why this meal was chosen"
}`;

      const aiResponse = await OpenAIService.generateText(
        replacementPrompt,
        1500
      );

      // Parse AI response
      let mealData;
      try {
        const cleanResponse = aiResponse
          .replace(/```json\s*/g, "")
          .replace(/```\s*/g, "")
          .trim();
        mealData = JSON.parse(cleanResponse);
      } catch (parseError) {
        console.log("⚠️ AI response parsing failed, using fallback");
        throw new Error("Failed to parse AI response");
      }

      // Validate and sanitize the AI response
      const sanitizedMeal = {
        name: mealData.name || `Replacement ${currentMeal.meal_timing}`,
        description: mealData.description || "AI-generated replacement meal",
        meal_timing: currentMeal.meal_timing,
        dietary_category: this.validateDietaryCategory(
          mealData.dietary_category
        ),
        prep_time_minutes: Math.min(
          120,
          Math.max(5, Number(mealData.prep_time_minutes) || 30)
        ),
        difficulty_level: Math.min(
          5,
          Math.max(1, Number(mealData.difficulty_level) || 2)
        ),
        calories: Math.min(
          1500,
          Math.max(100, Number(mealData.calories) || currentMeal.calories)
        ),
        protein_g: Math.min(
          80,
          Math.max(0, Number(mealData.protein_g) || currentMeal.protein_g)
        ),
        carbs_g: Math.min(
          150,
          Math.max(0, Number(mealData.carbs_g) || currentMeal.carbs_g)
        ),
        fats_g: Math.min(
          80,
          Math.max(0, Number(mealData.fats_g) || currentMeal.fats_g)
        ),
        fiber_g: Math.min(30, Math.max(0, Number(mealData.fiber_g) || 5)),
        sugar_g: Math.min(50, Math.max(0, Number(mealData.sugar_g) || 8)),
        sodium_mg: Math.min(
          2000,
          Math.max(0, Number(mealData.sodium_mg) || 400)
        ),
        ingredients_json: Array.isArray(mealData.ingredients_json)
          ? mealData.ingredients_json.slice(0, 15)
          : ["Mixed ingredients"],
        instructions_json: Array.isArray(mealData.instructions_json)
          ? mealData.instructions_json.slice(0, 10)
          : ["Prepare according to preferences"],
        allergens_json: Array.isArray(mealData.allergens_json)
          ? mealData.allergens_json
          : [],
        image_url: null,
        is_active: true,
      };

      console.log("✅ AI replacement meal generated:", sanitizedMeal.name);
      return sanitizedMeal;
    } catch (error) {
      console.log("⚠️ AI meal generation failed, using fallback");
      return this.generateFallbackReplacementMeal(currentMeal, preferences);
    }
  }

  static validateDietaryCategory(category: string): string {
    const validCategories = [
      "BALANCED",
      "VEGETARIAN",
      "VEGAN",
      "KETO",
      "PALEO",
      "MEDITERRANEAN",
    ];
    return validCategories.includes(category) ? category : "BALANCED";
  }

  static generateFallbackReplacementMeal(currentMeal: any, preferences: any) {
    const fallbackOptions = [
      {
        name: "Grilled Chicken with Vegetables",
        description: "Healthy protein with fresh vegetables",
        calories: 380,
        protein_g: 35,
        carbs_g: 15,
        fats_g: 18,
        ingredients: [
          "chicken breast",
          "mixed vegetables",
          "olive oil",
          "herbs",
        ],
        instructions: [
          "Season chicken",
          "Grill until cooked",
          "Steam vegetables",
          "Serve together",
        ],
      },
      {
        name: "Quinoa Buddha Bowl",
        description: "Nutritious plant-based meal",
        calories: 420,
        protein_g: 18,
        carbs_g: 55,
        fats_g: 15,
        ingredients: ["quinoa", "chickpeas", "vegetables", "tahini", "lemon"],
        instructions: [
          "Cook quinoa",
          "Roast vegetables",
          "Prepare dressing",
          "Assemble bowl",
        ],
      },
      {
        name: "Salmon with Sweet Potato",
        description: "Omega-3 rich fish with complex carbs",
        calories: 450,
        protein_g: 32,
        carbs_g: 35,
        fats_g: 20,
        ingredients: ["salmon fillet", "sweet potato", "broccoli", "herbs"],
        instructions: [
          "Bake salmon",
          "Roast sweet potato",
          "Steam broccoli",
          "Plate nicely",
        ],
      },
    ];

    const selected =
      fallbackOptions[Math.floor(Math.random() * fallbackOptions.length)];

    return {
      name: selected.name,
      description: selected.description,
      meal_timing: currentMeal.meal_timing,
      dietary_category: "BALANCED",
      prep_time_minutes: 25,
      difficulty_level: 2,
      calories: selected.calories,
      protein_g: selected.protein_g,
      carbs_g: selected.carbs_g,
      fats_g: selected.fats_g,
      fiber_g: 6,
      sugar_g: 8,
      sodium_mg: 500,
      ingredients_json: selected.ingredients,
      instructions_json: selected.instructions,
      allergens_json: [],
      image_url: null,
      is_active: true,
    };
  }

  // Additional utility methods
  static async getActiveMealPlan(user_id: string) {
    try {
      const activePlan = await prisma.userMealPlan.findFirst({
        where: {
          user_id,
          is_active: true,
        },
        include: {
          schedules: {
            include: {
              template: true,
            },
          },
        },
      });

      return activePlan;
    } catch (error) {
      console.error("Error getting active meal plan:", error);
      throw error;
    }
  }

  static async deactivateMealPlan(user_id: string, plan_id: string) {
    try {
      await prisma.userMealPlan.update({
        where: {
          plan_id,
          user_id,
        },
        data: {
          is_active: false,
        },
      });

      console.log("✅ Meal plan deactivated successfully");
      return { success: true };
    } catch (error) {
      console.error("Error deactivating meal plan:", error);
      throw error;
    }
  }

  static async duplicateMealPlan(
    user_id: string,
    plan_id: string,
    new_name: string
  ) {
    try {
      const originalPlan = await prisma.userMealPlan.findFirst({
        where: {
          plan_id,
          user_id,
        },
        include: {
          schedules: {
            include: {
              template: true,
            },
          },
        },
      });

      if (!originalPlan) {
        throw new Error("Original meal plan not found");
      }

      // Create new meal plan
      const newPlan = await prisma.userMealPlan.create({
        data: {
          user_id,
          name: new_name,
          plan_type: originalPlan.plan_type,
          meals_per_day: originalPlan.meals_per_day,
          snacks_per_day: originalPlan.snacks_per_day,
          rotation_frequency_days: originalPlan.rotation_frequency_days,
          include_leftovers: originalPlan.include_leftovers,
          fixed_meal_times: originalPlan.fixed_meal_times,
          target_calories_daily: originalPlan.target_calories_daily,
          target_protein_daily: originalPlan.target_protein_daily,
          target_carbs_daily: originalPlan.target_carbs_daily,
          target_fats_daily: originalPlan.target_fats_daily,
          start_date: new Date(),
          is_active: false,
        },
      });

      // Duplicate schedules
      for (const schedule of originalPlan.schedules) {
        await prisma.mealPlanSchedule.create({
          data: {
            plan_id: newPlan.plan_id,
            template_id: schedule.template_id,
            day_of_week: schedule.day_of_week,
            meal_timing: schedule.meal_timing,
            meal_order: schedule.meal_order,
            portion_multiplier: schedule.portion_multiplier,
            is_optional: schedule.is_optional,
          },
        });
      }

      console.log("✅ Meal plan duplicated successfully");
      return newPlan;
    } catch (error) {
      console.error("Error duplicating meal plan:", error);
      throw error;
    }
  }

  static async activatePlan(user_id: string, plan_id: string) {
    try {
      console.log("🚀 Activating plan:", plan_id, "for user:", user_id);

      // First deactivate any active plans
      await this.deactivateUserPlans(user_id);

      // Activate the new plan
      const updatedPlan = await prisma.userMealPlan.update({
        where: {
          plan_id,
          user_id,
        },
        data: {
          is_active: true,
          start_date: new Date(),
        },
        include: {
          schedules: {
            include: {
              template: true,
            },
          },
        },
      });

      return updatedPlan;
    } catch (error) {
      console.error("💥 Error activating plan:", error);
      throw error;
    }
  }

  static async deactivateUserPlans(user_id: string) {
    try {
      await prisma.userMealPlan.updateMany({
        where: {
          user_id,
          is_active: true,
        },
        data: {
          is_active: false,
          end_date: new Date(),
        },
      });
    } catch (error) {
      console.error("💥 Error deactivating plans:", error);
      throw error;
    }
  }

  static async savePlanFeedback(
    user_id: string,
    plan_id: string,
    rating: number,
    liked?: string,
    disliked?: string,
    suggestions?: string
  ) {
    try {
      // Create or update plan feedback
      await prisma.userMealPlan.update({
        where: {
          plan_id,
          user_id,
        },
        data: {
          rating,
          feedback_liked: liked,
          feedback_disliked: disliked,
          feedback_suggestions: suggestions,
          completed_at: new Date(),
        },
      });

      console.log("✅ Plan feedback saved successfully");
    } catch (error) {
      console.error("💥 Error saving plan feedback:", error);
      throw error;
    }
  }

  static async completePlan(
    user_id: string,
    plan_id: string,
    feedback: {
      rating: number;
      liked?: string;
      disliked?: string;
      suggestions?: string;
    }
  ) {
    try {
      console.log("🏁 Completing meal plan:", plan_id, "for user:", user_id);

      // First check if the plan exists
      const existingPlan = await prisma.userMealPlan.findFirst({
        where: {
          plan_id,
          user_id,
        },
      });

      if (!existingPlan) {
        // Try to find as recommended menu instead
        const recommendedMenu = await prisma.recommendedMenu.findFirst({
          where: {
            menu_id: plan_id,
            user_id,
          },
        });

        if (!recommendedMenu) {
          throw new Error("Plan or menu not found");
        }

        // Complete the recommended menu (no direct completion field, but we can track it)
        console.log("✅ Completing recommended menu");
        return {
          success: true,
          message: "Menu completed successfully",
        };
      }

      await prisma.userMealPlan.update({
        where: {
          plan_id,
        },
        data: {
          is_active: false,
          completed_at: new Date(),
          end_date: new Date(),
          rating: feedback.rating,
          feedback_liked: feedback.liked,
          feedback_disliked: feedback.disliked,
          feedback_suggestions: feedback.suggestions,
        },
      });

      // Clear user's active plan references
      await prisma.user.update({
        where: { user_id },
        data: {
          active_meal_plan_id: null,
          active_menu_id: null,
        },
      });

      console.log("✅ Plan completed successfully");
      return { success: true, message: "Plan completed successfully" };
    } catch (error) {
      console.error("💥 Error completing plan:", error);
      throw error;
    }
  }

  static async getMealPlanNutritionSummary(user_id: string, plan_id: string) {
    try {
      const weeklyPlan = await this.getUserMealPlan(user_id, plan_id);

      const nutritionSummary = {
        daily_averages: {
          calories: 0,
          protein_g: 0,
          carbs_g: 0,
          fats_g: 0,
          fiber_g: 0,
          sugar_g: 0,
          sodium_mg: 0,
        },
        weekly_totals: {
          calories: 0,
          protein_g: 0,
          carbs_g: 0,
          fats_g: 0,
          fiber_g: 0,
          sugar_g: 0,
          sodium_mg: 0,
        },
        daily_breakdown: {} as Record<string, any>,
      };

      const days = Object.keys(weeklyPlan);

      days.forEach((day) => {
        const dayNutrition = {
          calories: 0,
          protein_g: 0,
          carbs_g: 0,
          fats_g: 0,
          fiber_g: 0,
          sugar_g: 0,
          sodium_mg: 0,
        };

        Object.values(weeklyPlan[day]).forEach((meals) => {
          meals.forEach((meal) => {
            dayNutrition.calories += meal.calories || 0;
            dayNutrition.protein_g += meal.protein_g || 0;
            dayNutrition.carbs_g += meal.carbs_g || 0;
            dayNutrition.fats_g += meal.fats_g || 0;
            dayNutrition.fiber_g += meal.fiber_g || 0;
            dayNutrition.sugar_g += meal.sugar_g || 0;
            dayNutrition.sodium_mg += meal.sodium_mg || 0;
          });
        });

        nutritionSummary.daily_breakdown[day] = dayNutrition;

        // Add to weekly totals
        nutritionSummary.weekly_totals.calories += dayNutrition.calories;
        nutritionSummary.weekly_totals.protein_g += dayNutrition.protein_g;
        nutritionSummary.weekly_totals.carbs_g += dayNutrition.carbs_g;
        nutritionSummary.weekly_totals.fats_g += dayNutrition.fats_g;
        nutritionSummary.weekly_totals.fiber_g += dayNutrition.fiber_g;
        nutritionSummary.weekly_totals.sugar_g += dayNutrition.sugar_g;
        nutritionSummary.weekly_totals.sodium_mg += dayNutrition.sodium_mg;
      });

      // Calculate daily averages
      const numDays = days.length;
      nutritionSummary.daily_averages.calories = Math.round(
        nutritionSummary.weekly_totals.calories / numDays
      );
      nutritionSummary.daily_averages.protein_g =
        Math.round((nutritionSummary.weekly_totals.protein_g / numDays) * 10) /
        10;
      nutritionSummary.daily_averages.carbs_g =
        Math.round((nutritionSummary.weekly_totals.carbs_g / numDays) * 10) /
        10;
      nutritionSummary.daily_averages.fats_g =
        Math.round((nutritionSummary.weekly_totals.fats_g / numDays) * 10) / 10;
      nutritionSummary.daily_averages.fiber_g =
        Math.round((nutritionSummary.weekly_totals.fiber_g / numDays) * 10) /
        10;
      nutritionSummary.daily_averages.sugar_g =
        Math.round((nutritionSummary.weekly_totals.sugar_g / numDays) * 10) /
        10;
      nutritionSummary.daily_averages.sodium_mg = Math.round(
        nutritionSummary.weekly_totals.sodium_mg / numDays
      );

      return nutritionSummary;
    } catch (error) {
      console.error("Error calculating nutrition summary:", error);
      throw error;
    }
  }

  static async generateShoppingList(
    user_id: string,
    plan_id: string,
    week_start_date: string
  ) {
    try {
      console.log("🛒 Generating shopping list for plan:", plan_id);

      // Get the meal plan with all templates
      const mealPlan = await prisma.userMealPlan.findFirst({
        where: {
          plan_id,
          user_id,
        },
        include: {
          schedules: {
            include: {
              template: true,
            },
          },
        },
      });

      if (!mealPlan) {
        throw new Error("Meal plan not found");
      }

      // Aggregate all ingredients
      const ingredientMap = new Map<
        string,
        {
          name: string;
          totalQuantity: number;
          unit: string;
          category: string;
          estimatedCost: number;
        }
      >();

      mealPlan.schedules.forEach((schedule) => {
        const ingredients = Array.isArray(schedule.template.ingredients_json)
          ? schedule.template.ingredients_json
          : [];

        ingredients.forEach((ingredient: any) => {
          const key = ingredient.name?.toLowerCase() || "unknown";
          const existing = ingredientMap.get(key);

          if (existing) {
            existing.totalQuantity +=
              (ingredient.quantity || 1) * schedule.portion_multiplier;
          } else {
            // Use provided cost or calculate from pricing utility
            const ingredientCost = ingredient.estimatedCost ||
              estimateIngredientPrice(
                ingredient.name || "unknown",
                ingredient.quantity || 100,
                ingredient.unit || "g",
                ingredient.category || "other"
              ).estimated_price;

            ingredientMap.set(key, {
              name: ingredient.name || "Unknown ingredient",
              totalQuantity:
                (ingredient.quantity || 1) * schedule.portion_multiplier,
              unit: ingredient.unit || "piece",
              category: ingredient.category || "Other",
              estimatedCost: ingredientCost,
            });
          }
        });
      });

      const items = Array.from(ingredientMap.values());
      const totalCost = items.reduce(
        (sum, item) => sum + item.estimatedCost,
        0
      );

      // Create shopping list
      const shoppingList = await prisma.shoppingList.create({
        data: {
          user_id,
          plan_id,
          name: `Shopping List - ${new Date(
            week_start_date
          ).toLocaleDateString()}`,
          week_start_date: new Date(week_start_date),
          items_json: items,
          total_estimated_cost: totalCost,
          is_completed: false,
        },
      });

      console.log("✅ Shopping list generated successfully");
      return shoppingList;
    } catch (error) {
      console.error("💥 Error generating shopping list:", error);
      throw error;
    }
  }

  static async saveMealPreference(
    user_id: string,
    template_id: string,
    preference_type: string,
    rating?: number,
    notes?: string
  ) {
    try {
      console.log("💝 Saving meal preference");

      const preference = await prisma.userMealPreference.upsert({
        where: {
          user_id_template_id_preference_type: {
            user_id,
            template_id,
            preference_type,
          },
        },
        update: {
          rating,
          notes,
          updated_at: new Date(),
        },
        create: {
          user_id,
          template_id,
          preference_type,
          rating,
          notes,
        },
      });

      console.log("✅ Meal preference saved successfully");
      return preference;
    } catch (error) {
      console.error("💥 Error saving meal preference:", error);
      throw error;
    }
  }

  private static getCookingTimeFrommeal_count(meals_per_day: number): string {
    if (meals_per_day <= 2) return "minimal";
    if (meals_per_day <= 3) return "moderate";
    return "extensive";
  }
}
