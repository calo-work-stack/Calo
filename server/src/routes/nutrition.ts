import { Router, Response } from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/database";
import { z } from "zod";
import { mealAnalysisSchema, mealUpdateSchema } from "../types/nutrition";
import { NutritionService } from "../services/nutrition";
import { AchievementService } from "../services/achievements";
import { UsageTrackingService } from "../services/usageTracking";
import { MealTrackingService } from "../services/mealTracking";
import * as fs from "fs";
import * as path from "path";

// Load ingredient nutrition database for manual meal enrichment
let ingredientNutritionDB: Record<string, any> = {};
try {
  const dbPath = path.join(__dirname, "../data/ingredientNutrition.json");
  ingredientNutritionDB = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
} catch (e) {
  console.warn("⚠️ Could not load ingredientNutrition.json:", e);
}

/**
 * Look up ingredient nutrition data from the database.
 * Matches by English name, Hebrew name, or aliases.
 */
function lookupIngredientNutrition(ingredientName: string): any | null {
  const lower = ingredientName.toLowerCase().trim();

  // Direct key match
  if (ingredientNutritionDB[lower]) {
    return ingredientNutritionDB[lower];
  }

  // Search by name_en, name_he, or aliases_he
  for (const key of Object.keys(ingredientNutritionDB)) {
    const entry = ingredientNutritionDB[key];
    if (
      entry.name_en?.toLowerCase() === lower ||
      entry.name_he === ingredientName.trim() ||
      entry.aliases_he?.some((alias: string) => alias === ingredientName.trim())
    ) {
      return entry;
    }
  }
  return null;
}

/**
 * Enrich plain string ingredients with nutritional data from the database.
 * Assumes a default portion of 100g per ingredient.
 */
function enrichIngredients(
  ingredients: string[]
): { name: string; calories: number; protein: number; carbs: number; fat: number; fiber?: number; sugar?: number }[] {
  return ingredients.map((name) => {
    const data = lookupIngredientNutrition(name);
    if (data && data.per_100g) {
      return {
        name,
        calories: data.per_100g.calories || 0,
        protein: data.per_100g.protein_g || 0,
        carbs: data.per_100g.carbs_g || 0,
        fat: data.per_100g.fats_g || 0,
        fiber: data.per_100g.fiber_g || 0,
        sugar: data.per_100g.sugar_g || 0,
      };
    }
    // No match found — return ingredient with zero nutrition
    return { name, calories: 0, protein: 0, carbs: 0, fat: 0 };
  });
}

const router = Router();

const waterIntakeSchema = z.object({
  cups_consumed: z.number().min(0).max(50),
  date: z.string().optional(),
});

// Track water intake (using database)
router.post(
  "/water-intake",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.user_id;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "User not authenticated" });
    }

    try {
      const validationResult = waterIntakeSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid request data",
        });
      }

      const { cups_consumed, date } = validationResult.data;
      // Use UTC midnight to avoid timezone drift between server and client dates
      const dateStr = date ? date : new Date().toISOString().split("T")[0];
      const trackingDate = new Date(`${dateStr}T00:00:00.000Z`);

      // Calculate milliliters
      const milliliters_consumed = cups_consumed * 250;

      // Upsert water intake record in database
      const waterRecord = await prisma.waterIntake.upsert({
        where: {
          user_id_date: {
            user_id: userId,
            date: trackingDate,
          },
        },
        update: {
          cups_consumed,
          milliliters_consumed,
          updated_at: new Date(),
        },
        create: {
          user_id: userId,
          date: trackingDate,
          cups_consumed,
          milliliters_consumed,
        },
      });

      // Calculate XP based on water intake
      let xpAwarded = 0;
      const waterGoalComplete = cups_consumed >= 8;

      if (cups_consumed >= 8) {
        xpAwarded = 25;
      } else if (cups_consumed >= 4) {
        xpAwarded = 15;
      } else if (cups_consumed > 0) {
        xpAwarded = 5;
      }

      try {
        const achievementResult = await AchievementService.updateUserProgress(
          userId,
          false,
          waterGoalComplete,
          false,
          xpAwarded
        );

        res.json({
          success: true,
          data: waterRecord,
          xpAwarded: achievementResult.xpGained || 0,
          leveledUp: achievementResult.leveledUp || false,
          newLevel: achievementResult.newLevel || undefined,
          newAchievements: achievementResult.newAchievements || [],
        });
      } catch (achievementError) {
        res.json({
          success: true,
          data: waterRecord,
          xpAwarded,
          leveledUp: false,
          newLevel: undefined,
          newAchievements: [],
        });
      }
    } catch (error) {
      console.error("💥 Error tracking water intake:", error);
      res.status(500).json({
        success: false,
        error: "Failed to track water intake",
      });
    }
  }
);

// Get water intake for a specific date (using database)
router.get(
  "/water-intake/:date",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.user_id;
    const { date } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    try {
      // Use UTC midnight to match how water intake dates are stored
      const trackingDate = new Date(`${date}T00:00:00.000Z`);

      if (isNaN(trackingDate.getTime())) {
        return res.status(400).json({ success: false, error: "Invalid date format" });
      }

      const waterRecord = await prisma.waterIntake.findUnique({
        where: {
          user_id_date: {
            user_id: userId,
            date: trackingDate,
          },
        },
      });

      res.json({
        success: true,
        data: waterRecord || { cups_consumed: 0, milliliters_consumed: 0 },
      });
    } catch (error) {
      console.error("Error fetching water intake:", error);
      res.status(500).json({ error: "Failed to fetch water intake" });
    }
  }
);

// Apply auth middleware to all routes
// router.use(authenticateToken); //commented to apply auth each route

// Analyze meal endpoint
router.post("/analyze", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const limitCheck = await UsageTrackingService.checkMealScanLimit(
      req.user.user_id
    );
    if (!limitCheck.allowed) {
      return res.status(403).json({
        success: false,
        error: limitCheck.message,
        usage: {
          current: limitCheck.current,
          limit: limitCheck.limit,
          remaining: limitCheck.remaining,
        },
      });
    }

    // Validate request body
    const validationResult = mealAnalysisSchema.safeParse(req.body);

    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error);
      return res.status(400).json({
        success: false,
        error:
          "Invalid request data: " +
          validationResult.error.errors.map((e) => e.message).join(", "),
      });
    }

    const {
      imageBase64,
      date,
      updateText,
      editedIngredients = [],
      mealType,
      mealPeriod,
    } = req.body;

    // Always derive language from the user's preferred_lang stored in the DB.
    // This is the single source of truth — the client does not control this.
    const language = req.user?.preferred_lang === "HE" ? "hebrew" : "english";

    if (!imageBase64 || imageBase64.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Image data is required",
      });
    }

    // Validate image data
    let cleanBase64 = imageBase64;
    if (imageBase64.startsWith("data:image/")) {
      const commaIndex = imageBase64.indexOf(",");
      if (commaIndex !== -1) {
        cleanBase64 = imageBase64.substring(commaIndex + 1);
      }
    }

    // Check if base64 is valid
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(cleanBase64)) {
      return res.status(400).json({
        success: false,
        error: "Invalid image data format",
      });
    }

    if (cleanBase64.length < 1000) {
      return res.status(400).json({
        success: false,
        error: "Image data is too small or invalid",
      });
    }

    // Validate request data
    const analysisSchema = z.object({
      imageBase64: z.string().min(1, "Image data is required"),
      language: z.enum(["english", "hebrew"]).default("english"),
      date: z.string().optional(),
      updateText: z.string().optional(),
      editedIngredients: z.array(z.any()).default([]),
      mealType: z.string().optional(),
      mealPeriod: z.string().optional(),
    });

    const validatedData = analysisSchema.parse({
      imageBase64,
      language,
      date,
      updateText,
      editedIngredients,
      mealType,
      mealPeriod,
    });

    const result = await NutritionService.analyzeMeal(req.user.user_id, {
      imageBase64: validatedData.imageBase64,
      language: validatedData.language,
      date: validatedData.date || new Date().toISOString().split("T")[0],
      updateText: validatedData.updateText,
      editedIngredients: validatedData.editedIngredients,
      mealType: validatedData.mealType,
      mealPeriod: validatedData.mealPeriod,
    });

    await UsageTrackingService.incrementMealScanCount(req.user.user_id);

    res.json({
      ...result,
      usage: {
        current: limitCheck.current + 1,
        limit: limitCheck.limit,
        remaining: limitCheck.remaining - 1,
      },
    });
  } catch (error) {
    console.error("Analyze meal error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to analyze meal";
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

// Update meal endpoint
router.put("/update", authenticateToken, async (req: AuthRequest, res) => {
  try {
    console.log("Update meal request received");

    const validationResult = mealUpdateSchema.safeParse(req.body);

    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error);
      return res.status(400).json({
        success: false,
        error:
          "Invalid request data: " +
          validationResult.error.errors.map((e) => e.message).join(", "),
      });
    }

    const { meal_id, updateText } = validationResult.data;

    // Language always comes from the user's DB preference, not from the client
    const updateLanguage = req.user?.preferred_lang === "HE" ? "hebrew" : "english";

    console.log("Updating meal for user:", req.user.user_id);

    const meal = await NutritionService.updateMeal(req.user.user_id, {
      meal_id,
      updateText,
      language: updateLanguage,
    });

    console.log("Meal updated successfully");

    res.json({
      success: true,
      message: "Meal updated successfully",
      data: meal,
    });
  } catch (error) {
    console.error("Update meal error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update meal";
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

// Direct meal update endpoint for manual edits
router.put(
  "/meals/:mealId",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { mealId } = req.params;
      const userId = req.user.user_id;
      const mealData = req.body;

      // Validate meal belongs to user
      const existingMeal = await prisma.meal.findFirst({
        where: {
          meal_id: parseInt(mealId),
          user_id: userId,
        },
      });

      if (!existingMeal) {
        return res.status(404).json({
          success: false,
          error: "Meal not found or access denied",
        });
      }

      // Safe numeric parser — rejects NaN to prevent data corruption
      const safeNum = (val: any, fallback: number | null): number | null => {
        if (val === undefined || val === null || val === "") return fallback;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? fallback : parsed;
      };

      // Update meal with provided data
      const updatedMeal = await prisma.meal.update({
        where: { meal_id: parseInt(mealId) },
        data: {
          meal_name: mealData.meal_name || existingMeal.meal_name,
          calories: safeNum(mealData.calories, existingMeal.calories),
          protein_g: safeNum(mealData.protein_g, existingMeal.protein_g),
          carbs_g: safeNum(mealData.carbs_g, existingMeal.carbs_g),
          fats_g: safeNum(mealData.fats_g, existingMeal.fats_g),
          fiber_g: safeNum(mealData.fiber_g, existingMeal.fiber_g),
          sugar_g: safeNum(mealData.sugar_g, existingMeal.sugar_g),
          sodium_mg: safeNum(mealData.sodium_mg, existingMeal.sodium_mg),
          saturated_fats_g: safeNum(mealData.saturated_fats_g, existingMeal.saturated_fats_g),
          polyunsaturated_fats_g: safeNum(mealData.polyunsaturated_fats_g, existingMeal.polyunsaturated_fats_g),
          monounsaturated_fats_g: safeNum(mealData.monounsaturated_fats_g, existingMeal.monounsaturated_fats_g),
          cholesterol_mg: safeNum(mealData.cholesterol_mg, existingMeal.cholesterol_mg),
          serving_size_g: safeNum(mealData.serving_size_g, existingMeal.serving_size_g),
          ingredients: mealData.ingredients || existingMeal.ingredients,
          food_category: mealData.food_category || existingMeal.food_category,
          cooking_method: mealData.cooking_method || existingMeal.cooking_method,
          updated_at: new Date(),
        },
      });

      res.json({
        success: true,
        message: "Meal updated successfully",
        data: updatedMeal,
      });
    } catch (error) {
      console.error("Direct meal update error:", error);
      const message =
        error instanceof Error ? error.message : "Failed to update meal";
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

// Save meal endpoint
router.post("/save", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { mealData, imageBase64 } = req.body;

    if (!mealData) {
      return res.status(400).json({
        success: false,
        error: "Meal data is required",
      });
    }

    const meal = await NutritionService.saveMeal(
      req.user.user_id,
      mealData,
      imageBase64
    );

    console.log("Meal saved successfully");
    res.json({
      success: true,
      data: meal,
    });
  } catch (error) {
    console.error("Save meal error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to save meal";
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

// Get daily stats
// Get range statistics
router.get("/stats/range", authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Try both parameter name variations
    const startDate = req.query.startDate || req.query.start;
    const endDate = req.query.endDate || req.query.end;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: "Both startDate and endDate are required",
      });
    }

    const startDateStr = String(startDate).trim();
    const endDateStr = String(endDate).trim();

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDateStr)) {
      return res.status(400).json({
        success: false,
        error: `Date must be in YYYY-MM-DD format. Received startDate: '${startDateStr}'`,
      });
    }

    if (!dateRegex.test(endDateStr)) {
      return res.status(400).json({
        success: false,
        error: `Date must be in YYYY-MM-DD format. Received endDate: '${endDateStr}'`,
      });
    }

    const startDateObj = new Date(startDateStr);
    const endDateObj = new Date(endDateStr);

    if (isNaN(startDateObj.getTime())) {
      return res.status(400).json({ success: false, error: `Invalid start date: '${startDateStr}'` });
    }

    if (isNaN(endDateObj.getTime())) {
      return res.status(400).json({ success: false, error: `Invalid end date: '${endDateStr}'` });
    }

    if (startDateObj > endDateObj) {
      return res.status(400).json({ success: false, error: "startDate must be before or equal to endDate" });
    }

    const statistics = await NutritionService.getRangeStatistics(
      req.user.user_id,
      startDateStr,
      endDateStr
    );

    console.log("✅ Range statistics retrieved successfully");

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error("💥 Get range statistics error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch range statistics";
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});
// NEW ENDPOINTS FOR HISTORY FEATURES

const feedbackSchema = z.object({
  taste_rating: z.number().int().min(1).max(5).optional(),
  satiety_rating: z.number().int().min(1).max(5).optional(),
  energy_rating: z.number().int().min(1).max(5).optional(),
  heaviness_rating: z.number().int().min(1).max(5).optional(),
});

// Save meal feedback (ratings)
router.post(
  "/meals/:mealId/feedback",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { mealId } = req.params;

      const validation = feedbackSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid feedback data. Ratings must be integers between 1 and 5.",
        });
      }

      const result = await NutritionService.saveMealFeedback(
        req.user.user_id,
        mealId,
        validation.data
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("💥 Save feedback error:", error);
      const message =
        error instanceof Error ? error.message : "Failed to save feedback";
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

// Toggle meal favorite status
router.post(
  "/meals/:mealId/favorite",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { mealId } = req.params;

      const result = await NutritionService.toggleMealFavorite(
        req.user.user_id,
        mealId
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("💥 Toggle favorite error:", error);
      const message =
        error instanceof Error ? error.message : "Failed to toggle favorite";
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

// Duplicate meal to a new date
router.post(
  "/meals/:mealId/duplicate",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { mealId } = req.params;
      const { newDate } = req.body;

      // Validate mealId
      if (!mealId || mealId === "undefined") {
        return res.status(400).json({
          success: false,
          error: "Invalid meal ID provided",
        });
      }

      const result = await NutritionService.duplicateMeal(
        req.user.user_id,
        mealId,
        newDate
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("💥 Duplicate meal error:", error);
      const message =
        error instanceof Error ? error.message : "Failed to duplicate meal";
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

// Get meal details with full nutrition info
router.get(
  "/meals/:meal_id/details",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { meal_id } = req.params;
      const userId = req.user.user_id;

      console.log("🔍 Fetching full meal details:", meal_id);

      const meal = await prisma.meal.findFirst({
        where: {
          meal_id: parseInt(meal_id),
          user_id: userId,
        },
      });

      if (!meal) {
        return res.status(404).json({
          success: false,
          error: "Meal not found",
        });
      }

      // Format the complete meal data with all nutrition fields from schema
      const fullMealData = {
        ...meal,
        // Include all nutrition fields from your Prisma schema
        protein_g: meal.protein_g,
        carbs_g: meal.carbs_g,
        fats_g: meal.fats_g,
        saturated_fats_g: meal.saturated_fats_g,
        polyunsaturated_fats_g: meal.polyunsaturated_fats_g,
        monounsaturated_fats_g: meal.monounsaturated_fats_g,
        omega_3_g: meal.omega_3_g,
        omega_6_g: meal.omega_6_g,
        fiber_g: meal.fiber_g,
        soluble_fiber_g: meal.soluble_fiber_g,
        insoluble_fiber_g: meal.insoluble_fiber_g,
        sugar_g: meal.sugar_g,
        cholesterol_mg: meal.cholesterol_mg,
        sodium_mg: meal.sodium_mg,
        alcohol_g: meal.alcohol_g,
        caffeine_mg: meal.caffeine_mg,
        liquids_ml: meal.liquids_ml,
        serving_size_g: meal.serving_size_g,
        allergens_json: meal.allergens_json,
        vitamins_json: meal.vitamins_json,
        micronutrients_json: meal.micronutrients_json,
        glycemic_index: meal.glycemic_index,
        insulin_index: meal.insulin_index,
        food_category: meal.food_category,
        processing_level: meal.processing_level,
        cooking_method: meal.cooking_method,
        additives_json: meal.additives_json,
        health_risk_notes: meal.health_risk_notes,
        ingredients: meal.ingredients,
      };

      console.log("✅ Full meal details retrieved");

      res.json({
        success: true,
        data: fullMealData,
      });
    } catch (error) {
      console.error("💥 Get meal details error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch meal details",
      });
    }
  }
);

// Get meal history for a user — MUST be defined before /meals/:meal_id to avoid route shadowing
router.get(
  "/meals/history",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { period = "week" } = req.query;

      // Calculate date range based on period
      const now = new Date();
      let startDate = new Date();

      switch (period) {
        case "today":
          startDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(now.getMonth() - 1);
          break;
        case "all":
          startDate = new Date(0); // Beginning of time
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }

      const meals = await prisma.meal.findMany({
        where: {
          user_id: req.user.user_id,
          created_at: {
            gte: startDate,
            lte: now,
          },
        },
        orderBy: {
          created_at: "desc",
        },
        take: 500,
        select: {
          meal_id: true,
          meal_name: true,
          meal_period: true,
          image_url: true,
          created_at: true,
          upload_time: true,
          calories: true,
          protein_g: true,
          carbs_g: true,
          fats_g: true,
          fiber_g: true,
          sugar_g: true,
          sodium_mg: true,
          liquids_ml: true,
          ingredients: true,
          food_category: true,
          cooking_method: true,
          confidence: true,
        },
      });
      res.json({
        success: true,
        data: meals,
      });
    } catch (error) {
      console.error("💥 Get meal history error:", error);
      const message =
        error instanceof Error ? error.message : "Failed to fetch meal history";
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

router.get(
  "/meals/:meal_id",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { meal_id } = req.params;
      const userId = req.user.user_id;

      console.log("🔍 Fetching meal:", meal_id);

      const meal = await prisma.meal.findFirst({
        where: {
          meal_id: parseInt(meal_id),
          user_id: userId,
        },
      });

      if (!meal) {
        return res.status(404).json({
          success: false,
          error: "Meal not found",
        });
      }

      console.log("✅ Meal retrieved");

      res.json({
        success: true,
        data: meal,
      });
    } catch (error) {
      console.error("💥 Get meal error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch meal",
      });
    }
  }
);

// DELETE /api/nutrition/meals/:id - Delete meal
router.delete(
  "/meals/:id",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const mealId = parseInt(req.params.id);
      const userId = req.user.user_id;

      // Verify meal belongs to user
      const existingMeal = await prisma.meal.findFirst({
        where: {
          meal_id: mealId,
          user_id: userId,
        },
      });

      if (!existingMeal) {
        return res.status(404).json({
          success: false,
          error: "Meal not found",
        });
      }

      // Delete meal
      await prisma.meal.delete({
        where: { meal_id: mealId },
      });

      // Smart cache update - remove meal directly without refetching
      NutritionService.removeMealFromCache(userId, mealId);

      console.log("✅ Meal deleted successfully:", mealId);

      res.json({
        success: true,
        message: "Meal deleted successfully",
      });
    } catch (error) {
      console.error("💥 Error deleting meal:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete meal",
      });
    }
  }
);

// Get all meals for a user
router.get(
  "/meals",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { offset = 0, limit = 100 } = req.query;
      const safeLimit = Math.min(Number(limit), 500);

      const meals = await NutritionService.getUserMeals(
        req.user.user_id,
        Number(offset),
        safeLimit
      );
      res.json({
        success: true,
        data: meals,
      });
    } catch (error) {
      console.error("💥 Get meals error:", error);
      const message =
        error instanceof Error ? error.message : "Failed to fetch meals";
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

// Get usage statistics
router.get(
  "/usage-stats",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.user_id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const stats = await UsageTrackingService.getUserUsageStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("💥 Get usage stats error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get usage stats",
      });
    }
  }
);

// Get meals remaining for today (mandatory meal limit tracking)
router.get(
  "/meals-remaining",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.user_id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const mealsRemaining = await MealTrackingService.getMealsRemaining(userId);

      res.json({
        success: true,
        data: mealsRemaining,
      });
    } catch (error) {
      console.error("💥 Get meals remaining error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get meals remaining",
      });
    }
  }
);

// Manual meal addition endpoint
router.post(
  "/meals/manual",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.user_id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      console.log("📝 Manual meal addition request:", req.body);

      const {
        mealName,
        calories,
        protein,
        carbs,
        fat,
        fiber,
        sugar,
        sodium,
        ingredients,
        mealPeriod,
        imageUrl,
        date,
      } = req.body;

      if (!mealName || !calories) {
        return res.status(400).json({
          success: false,
          error: "Meal name and calories are required",
        });
      }

      // Enrich ingredients with nutritional data from database
      let enrichedIngredients: any[] | null = null;
      if (ingredients) {
        const rawIngredients = Array.isArray(ingredients)
          ? ingredients
          : [ingredients];
        enrichedIngredients = enrichIngredients(rawIngredients);
      }

      const mealData = {
        user_id: userId,
        meal_name: mealName,
        calories: parseFloat(calories),
        protein_g: protein ? parseFloat(protein) : null,
        carbs_g: carbs ? parseFloat(carbs) : null,
        fats_g: fat ? parseFloat(fat) : null,
        fiber_g: fiber ? parseFloat(fiber) : null,
        sugar_g: sugar ? parseFloat(sugar) : null,
        sodium_mg: sodium ? parseFloat(sodium) : null,
        ingredients: enrichedIngredients
          ? JSON.stringify(enrichedIngredients)
          : null,
        meal_period: mealPeriod || "other",
        image_url: imageUrl || "",
        analysis_status: "COMPLETED",
        upload_time: date ? new Date(date) : new Date(),
        created_at: date ? new Date(date) : new Date(),
        confidence: 100,
      };

      const meal = await prisma.meal.create({
        data: mealData,
      });

      // Smart cache update - add meal directly without refetching
      NutritionService.addMealToCache(userId, meal);

      console.log("✅ Manual meal added successfully:", meal.meal_id);

      res.json({
        success: true,
        data: meal,
        message: "Meal added successfully",
      });
    } catch (error) {
      console.error("💥 Manual meal addition error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to add meal",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export { router as nutritionRoutes };
