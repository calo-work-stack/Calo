import express, { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { NutritionService } from "../services/nutrition";

const router = express.Router();
const prisma = new PrismaClient();

// Helper to map meal_type string to meal_period
function mealTypeToPeriod(mealType: string): string {
  const map: Record<string, string> = {
    BREAKFAST: "breakfast",
    LUNCH: "lunch",
    DINNER: "dinner",
    SNACK: "snack",
    MORNING_SNACK: "snack",
    AFTERNOON_SNACK: "snack",
  };
  return map[mealType.toUpperCase()] || "other";
}

// Mark meal as completed
router.post(
  "/complete",
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

      const {
        plan_id,
        menu_id,
        meal_name,
        meal_type,
        day_number,
        calories,
        protein_g,
        carbs_g,
        fats_g,
        rating,
        taste_rating,
        satiety_rating,
        energy_rating,
        heaviness_rating,
        notes,
        prep_time_actual,
        image_url,
        meal_id_ref,
        ingredients,
        cooking_method,
        estimated_cost,
      } = req.body;

      if (!meal_name || !meal_type) {
        return res.status(400).json({
          success: false,
          error: "Meal name and type are required",
        });
      }

      // Create meal completion record
      const completion = await prisma.mealCompletion.create({
        data: {
          user_id: userId,
          plan_id,
          menu_id,
          meal_name,
          meal_type,
          day_number: day_number || 1,
          completed_date: new Date(),
          calories,
          protein_g,
          carbs_g,
          fats_g,
          rating,
          notes,
          prep_time_actual,
          image_url: image_url || null,
          meal_id_ref: meal_id_ref || null,
          ingredients_json: ingredients || null,
        },
      });

      // Calculate total cost from ingredients if not provided
      let mealCost = estimated_cost || 0;
      if (!mealCost && ingredients && Array.isArray(ingredients)) {
        mealCost = ingredients.reduce(
          (sum: number, ing: any) => sum + (ing.estimated_cost || 0),
          0
        );
      }

      // Save meal to nutrition history
      let historyMealId: number | null = null;
      try {
        const historyMeal = await prisma.meal.create({
          data: {
            user_id: userId,
            image_url: image_url || "",
            analysis_status: "COMPLETED",
            meal_name: meal_name,
            meal_period: mealTypeToPeriod(meal_type),
            description: `Completed from menu: ${meal_name}`,
            calories: calories || 0,
            protein_g: protein_g || 0,
            carbs_g: carbs_g || 0,
            fats_g: fats_g || 0,
            ingredients: ingredients || null,
            confidence: 100,
            taste_rating: taste_rating || rating || 0,
            satiety_rating: satiety_rating || 0,
            energy_rating: energy_rating || 0,
            heaviness_rating: heaviness_rating || 0,
            estimated_cost: mealCost || null,
            cooking_method: cooking_method || null,
          },
        });
        historyMealId = historyMeal.meal_id;

        // Update completion with history reference
        await prisma.mealCompletion.update({
          where: { id: completion.id },
          data: {
            saved_to_history: true,
            history_meal_id: historyMealId,
          },
        });
      } catch (histErr) {
        console.error("Failed to save meal to history:", histErr);
        // Non-critical: completion still succeeded
      }

      // Mark RecommendedMeal as completed if meal_id_ref is provided
      if (meal_id_ref) {
        try {
          await prisma.recommendedMeal.update({
            where: { meal_id: meal_id_ref },
            data: {
              is_completed: true,
              completed_at: new Date(),
            },
          });
        } catch (rmErr) {
          console.error("Failed to mark recommended meal as completed:", rmErr);
        }
      }

      // Update plan progress if plan_id is provided
      if (plan_id) {
        const plan = await prisma.userMealPlan.findUnique({
          where: { plan_id },
        });

        if (plan) {
          const completedMeals = plan.meals_completed + 1;
          const progressPercentage =
            plan.total_meals > 0
              ? (completedMeals / plan.total_meals) * 100
              : 0;

          await prisma.userMealPlan.update({
            where: { plan_id },
            data: {
              meals_completed: completedMeals,
              progress_percentage: Math.min(progressPercentage, 100),
              status: progressPercentage >= 100 ? "completed" : "active",
              completed_at: progressPercentage >= 100 ? new Date() : null,
            },
          });
        }
      }

      // Award XP for meal completion
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
      });

      if (user) {
        const xpGained = 10;
        const bonusXp = rating && rating >= 4 ? 5 : 0;

        await prisma.user.update({
          where: { user_id: userId },
          data: {
            current_xp: (user.current_xp || 0) + xpGained + bonusXp,
            total_points: (user.total_points || 0) + xpGained + bonusXp,
          },
        });
      }

      // Clear nutrition cache so history reflects the new meal immediately
      NutritionService.clearCachesForUser(userId);

      res.json({
        success: true,
        data: completion,
        history_meal_id: historyMealId,
        xp_gained: 10 + (rating && rating >= 4 ? 5 : 0),
        message: "Meal marked as completed successfully!",
      });
    } catch (error) {
      console.error("Error completing meal:", error);
      res.status(500).json({
        success: false,
        error: "Failed to complete meal",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Get meal completion history
router.get(
  "/history",
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

      const { limit = 50, offset = 0, plan_id, menu_id } = req.query;

      const where: any = { user_id: userId };
      if (plan_id) where.plan_id = plan_id;
      if (menu_id) where.menu_id = menu_id;

      const completions = await prisma.mealCompletion.findMany({
        where,
        orderBy: { completed_date: "desc" },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      });

      const totalCount = await prisma.mealCompletion.count({ where });

      res.json({
        success: true,
        data: completions,
        pagination: {
          total: totalCount,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore:
            totalCount > parseInt(offset as string) + parseInt(limit as string),
        },
      });
    } catch (error) {
      console.error("Error fetching meal completion history:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch completion history",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Get completion stats
router.get(
  "/stats",
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

      const { plan_id, menu_id, period = "week" } = req.query;

      let dateFilter = new Date();
      if (period === "week") {
        dateFilter.setDate(dateFilter.getDate() - 7);
      } else if (period === "month") {
        dateFilter.setMonth(dateFilter.getMonth() - 1);
      } else if (period === "year") {
        dateFilter.setFullYear(dateFilter.getFullYear() - 1);
      }

      const where: any = {
        user_id: userId,
        completed_date: { gte: dateFilter },
      };
      if (plan_id) where.plan_id = plan_id;
      if (menu_id) where.menu_id = menu_id;

      const [
        totalCompleted,
        avgRating,
        totalCalories,
        totalProtein,
        mealTypeBreakdown,
      ] = await Promise.all([
        prisma.mealCompletion.count({ where }),
        prisma.mealCompletion.aggregate({
          where: { ...where, rating: { not: null } },
          _avg: { rating: true },
        }),
        prisma.mealCompletion.aggregate({
          where: { ...where, calories: { not: null } },
          _sum: { calories: true },
        }),
        prisma.mealCompletion.aggregate({
          where: { ...where, protein_g: { not: null } },
          _sum: { protein_g: true },
        }),
        prisma.mealCompletion.groupBy({
          by: ["meal_type"],
          where,
          _count: true,
        }),
      ]);

      res.json({
        success: true,
        data: {
          period,
          total_completed: totalCompleted,
          average_rating: avgRating._avg.rating || 0,
          total_calories: totalCalories._sum.calories || 0,
          total_protein: totalProtein._sum.protein_g || 0,
          meal_type_breakdown: mealTypeBreakdown.map((item) => ({
            meal_type: item.meal_type,
            count: item._count,
          })),
        },
      });
    } catch (error) {
      console.error("Error fetching completion stats:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch completion stats",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default router;
