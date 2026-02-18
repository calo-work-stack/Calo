import { Router } from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { RecommendedMenuService } from "../services/recommendedMenu";
import { prisma } from "../lib/database";
import { Response } from "express";
import { $Enums } from "@prisma/client";
import { JsonValue } from "@prisma/client/runtime/library";
import OpenAI from "openai";
import { getErrorMessage, errorMessageIncludes } from "../utils/errorUtils";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

const router = Router();

const MAX_MENUS_PER_USER = 3;

// Helper function to check if user has reached menu limit
async function checkMenuLimit(userId: string): Promise<{ allowed: boolean; currentCount: number }> {
  const count = await prisma.recommendedMenu.count({
    where: { user_id: userId },
  });
  return {
    allowed: count < MAX_MENUS_PER_USER,
    currentCount: count,
  };
}

// Get user's recommended menus
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    console.log("📋 Getting recommended menus for user:", userId);

    const menus = await prisma.recommendedMenu.findMany({
      where: { user_id: userId },
      include: {
        meals: {
          include: {
            ingredients: true,
          },
          orderBy: [{ day_number: "asc" }, { meal_type: "asc" }],
        },
      },
      orderBy: { created_at: "desc" },
    });

    console.log(`✅ Found ${menus.length} recommended menus`);

    res.json({
      success: true,
      data: menus,
      menuCount: menus.length,
      maxMenus: MAX_MENUS_PER_USER,
      canCreateMore: menus.length < MAX_MENUS_PER_USER,
    });
  } catch (error) {
    console.error("💥 Error getting recommended menus:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get recommended menus",
    });
  }
});

// Get specific menu details
router.get(
  "/:menuId",
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

      const { menuId } = req.params;
      console.log("📋 Getting menu details for:", menuId);

      const menu = await prisma.recommendedMenu.findFirst({
        where: {
          menu_id: menuId,
          user_id: userId, // Ensure user can only access their own menus
        },
        include: {
          meals: {
            include: {
              ingredients: true,
            },
            orderBy: [{ day_number: "asc" }, { meal_type: "asc" }],
          },
        },
      });

      if (!menu) {
        return res.status(404).json({
          success: false,
          error: "Menu not found",
        });
      }

      console.log(`✅ Found menu with ${menu.meals.length} meals`);

      res.json({
        success: true,
        data: menu,
      });
    } catch (error) {
      console.error("💥 Error getting menu details:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get menu details",
      });
    }
  },
);

router.delete(
  "/:menuId",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.user_id;
      if (!userId) {
        console.log("❌ DELETE: No user ID found");
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
      }

      const { menuId } = req.params;
      console.log("🗑️ DELETE request for menu:", menuId, "by user:", userId);

      // Check if menu exists and belongs to user
      const menu = await prisma.recommendedMenu.findFirst({
        where: {
          menu_id: menuId,
          user_id: userId,
        },
        include: {
          meals: {
            include: {
              ingredients: true,
              ingredientChecks: true,
            },
          },
        },
      });

      if (!menu) {
        console.log("❌ Menu not found or doesn't belong to user");
        return res.status(404).json({
          success: false,
          error: "Menu not found or unauthorized",
        });
      }

      console.log(
        `📋 Found menu: "${menu.title}" with ${menu.meals.length} meals`,
      );

      // Check if this menu is currently active
      if (menu.is_active) {
        console.log("⚠️ Menu is currently active, deactivating first");

        // Update user's active_menu_id if it matches
        const user = await prisma.user.findUnique({
          where: { user_id: userId },
          select: { active_menu_id: true },
        });

        if (user?.active_menu_id === menuId) {
          await prisma.user.update({
            where: { user_id: userId },
            data: { active_menu_id: null },
          });
          console.log("✅ Cleared user's active_menu_id");
        }
      }

      // Delete the menu (cascade will handle meals, ingredients, and checks)
      await prisma.recommendedMenu.delete({
        where: { menu_id: menuId },
      });

      console.log("✅ Menu deleted successfully");

      res.json({
        success: true,
        message: "Menu deleted successfully",
        deletedMenuId: menuId,
        mealsDeleted: menu.meals.length,
      });
    } catch (error: any) {
      console.error("💥 Error deleting menu:", error);

      // Handle specific Prisma errors
      if (error.code === "P2003") {
        return res.status(400).json({
          success: false,
          error: "Cannot delete menu: it's referenced by other records",
          details: error.meta,
        });
      }

      if (error.code === "P2025") {
        return res.status(404).json({
          success: false,
          error: "Menu not found",
        });
      }

      res.status(500).json({
        success: false,
        error: "Failed to delete menu",
        details: error.message,
      });
    }
  },
);

// GET /api/recommended-menus/debug - Debug endpoint to check menu data
router.get(
  "/debug",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.user_id;
      console.log("🐛 Debug: Checking menus for user:", userId);

      // Get raw menu count
      const menuCount = await prisma.recommendedMenu.count({
        where: { user_id: userId },
      });

      // Get detailed menu data
      const menus = await prisma.recommendedMenu.findMany({
        where: { user_id: userId },
        include: {
          meals: {
            include: {
              ingredients: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
      });

      const debugInfo = {
        user_id: userId,
        menu_count: menuCount,
        menus: menus.map(
          (menu: {
            menu_id: any;
            title: any;
            created_at: any;
            meals: any[];
          }) => ({
            menu_id: menu.menu_id,
            title: menu.title,
            created_at: menu.created_at,
            meals_count: menu.meals.length,
            total_ingredients: menu.meals.reduce(
              (total, meal) => total + meal.ingredients.length,
              0,
            ),
            sample_meals: menu.meals.slice(0, 2).map((meal) => ({
              meal_id: meal.meal_id,
              name: meal.name,
              meal_type: meal.meal_type,
              ingredients_count: meal.ingredients.length,
            })),
          }),
        ),
      };

      res.json({
        success: true,
        debug_info: debugInfo,
      });
    } catch (error) {
      console.error("💥 Debug error:", error);
      res.status(500).json({
        success: false,
        error: "Debug failed",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// POST /api/recommended-menus/generate-custom - Generate custom menu based on user description
router.post(
  "/generate-custom",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.user_id;
      console.log("🎨 Generating custom menu for user:", userId);
      console.log("📋 Custom request:", req.body);

      // Check menu limit
      const { allowed, currentCount } = await checkMenuLimit(userId);
      if (!allowed) {
        return res.status(400).json({
          success: false,
          error: `Maximum ${MAX_MENUS_PER_USER} menus allowed. Please delete a menu to create a new one.`,
          currentCount,
          maxMenus: MAX_MENUS_PER_USER,
        });
      }

      const {
        days = 7,
        mealsPerDay = "3_main",
        customRequest,
        budget,
        mealChangeFrequency = "daily",
        includeLeftovers = false,
        sameMealTimes = true,
      } = req.body;

      // Validate input
      if (!customRequest || customRequest.trim() === "") {
        return res.status(400).json({
          success: false,
          error: "Custom request description is required",
        });
      }

      if (days < 1 || days > 30) {
        return res.status(400).json({
          success: false,
          error: "Days must be between 1 and 30",
        });
      }

      console.log("✅ Input validation passed, generating custom menu...");

      const menu = await RecommendedMenuService.generateCustomMenu({
        userId,
        days,
        mealsPerDay,
        customRequest: customRequest.trim(),
        budget,
        mealChangeFrequency,
        includeLeftovers,
        sameMealTimes,
      });

      if (!menu) {
        throw new Error("Custom menu generation returned null");
      }

      console.log("🎉 Custom menu generated successfully!");
      console.log("📊 Menu stats:", {
        menu_id: menu?.menu_id,
        title: menu?.title,
        meals_count: menu?.meals?.length || 0,
        total_calories: menu?.total_calories,
      });

      const responseData = {
        ...menu,
        menu_id: menu.menu_id,
        title: menu.title,
        description: menu.description,
        meals: menu.meals || [],
        days_count: menu.days_count,
        total_calories: menu.total_calories,
        estimated_cost: menu.estimated_cost,
      };

      console.log(
        "📤 Sending custom menu response with",
        responseData.meals.length,
        "meals",
      );

      res.json({
        success: true,
        message: "Custom menu generated successfully",
        data: responseData,
      });
    } catch (error) {
      console.error("💥 Error generating custom menu:", error);

      let errorMessage = "Failed to generate custom menu";
      let statusCode = 500;

      if (errorMessageIncludes(error, "questionnaire not found")) {
        errorMessage =
          "Please complete your questionnaire first before generating a custom menu";
        statusCode = 400;
      } else {
        errorMessage = getErrorMessage(error);
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// POST /api/recommended-menus/generate - Generate new menu with preferences
router.post(
  "/generate",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.user_id;
      console.log("🎯 Generating menu for user:", userId);
      console.log("📋 Request body:", req.body);

      // Check menu limit
      const { allowed, currentCount } = await checkMenuLimit(userId);
      if (!allowed) {
        return res.status(400).json({
          success: false,
          error: `Maximum ${MAX_MENUS_PER_USER} menus allowed. Please delete a menu to create a new one.`,
          currentCount,
          maxMenus: MAX_MENUS_PER_USER,
        });
      }

      const {
        days = 7,
        mealsPerDay = "3_main", // "3_main", "3_plus_2_snacks", "2_plus_1_intermediate"
        mealChangeFrequency = "daily", // "daily", "every_3_days", "weekly", "automatic"
        includeLeftovers = false,
        sameMealTimes = true,
        targetCalories,
        dietaryPreferences,
        excludedIngredients,
        budget,
      } = req.body;

      // Validate input parameters
      if (days < 1 || days > 30) {
        return res.status(400).json({
          success: false,
          error: "Days must be between 1 and 30",
        });
      }

      if (
        !["3_main", "3_plus_2_snacks", "2_plus_1_intermediate"].includes(
          mealsPerDay,
        )
      ) {
        return res.status(400).json({
          success: false,
          error: "Invalid meals per day option",
        });
      }

      console.log("✅ Input validation passed, generating menu...");

      const menu = await RecommendedMenuService.generatePersonalizedMenu({
        userId,
        days,
        mealsPerDay,
        mealChangeFrequency,
        includeLeftovers,
        sameMealTimes,
        targetCalories,
        dietaryPreferences,
        excludedIngredients,
        budget,
      });

      if (!menu) {
        throw new Error("Menu generation returned null");
      }

      console.log("🎉 Menu generated successfully!");
      console.log("📊 Menu stats:", {
        menu_id: menu?.menu_id,
        title: menu?.title,
        meals_count: menu?.meals?.length || 0,
        total_calories: menu?.total_calories,
      });

      // Ensure the response has the expected structure
      const responseData = {
        ...menu,
        // Ensure we have at least these fields for the client
        menu_id: menu.menu_id,
        title: menu.title,
        description: menu.description,
        meals: menu.meals || [],
        days_count: menu.days_count,
        total_calories: menu.total_calories,
        estimated_cost: menu.estimated_cost,
      };

      console.log(
        "📤 Sending response with",
        responseData.meals.length,
        "meals",
      );

      res.json({
        success: true,
        message: "Menu generated successfully",
        data: responseData,
      });
    } catch (error) {
      console.error("💥 Error generating menu:", error);

      // Provide more specific error messages
      let errorMessage = "Failed to generate menu";
      let statusCode = 500;

      if (errorMessageIncludes(error, "questionnaire not found")) {
        errorMessage =
          "Please complete your questionnaire first before generating a menu";
        statusCode = 400;
      } else if (errorMessageIncludes(error, "budget")) {
        errorMessage = "Please set a daily food budget in your questionnaire";
        statusCode = 400;
      } else {
        errorMessage = getErrorMessage(error);
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        details: getErrorMessage(error),
      });
    }
  },
);

// GET /api/recommended-menus/:menuId/meal-alternatives/:mealId - Get AI-generated meal alternatives
router.get(
  "/:menuId/meal-alternatives/:mealId",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.user_id;
      const { menuId, mealId } = req.params;
      const { language = "en" } = req.query;

      console.log("🔄 Getting meal alternatives for:", { menuId, mealId, language });

      // Get the original meal
      const originalMeal = await prisma.recommendedMeal.findFirst({
        where: {
          meal_id: mealId,
          menu: {
            menu_id: menuId,
            user_id: userId,
          },
        },
        include: {
          ingredients: true,
        },
      });

      if (!originalMeal) {
        return res.status(404).json({
          success: false,
          error: "Meal not found",
        });
      }

      // Get user questionnaire for personalization
      const questionnaire = await prisma.userQuestionnaire.findFirst({
        where: { user_id: userId },
        orderBy: { date_completed: "desc" },
      });

      // Generate alternatives using AI with language support
      const alternatives = await RecommendedMenuService.getMealAlternatives(
        originalMeal,
        questionnaire,
        3, // Return 3 alternatives
        language as string, // Pass language for AI generation
      );

      console.log(
        `✅ Generated ${alternatives.length} meal alternatives for ${originalMeal.name} in ${language}`
      );

      res.json({
        success: true,
        data: alternatives,
      });
    } catch (error) {
      console.error("💥 Error getting meal alternatives:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get meal alternatives",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// POST /api/recommended-menus/:menuId/meals/:mealId/skip - Mark a meal as skipped
router.post(
  "/:menuId/meals/:mealId/skip",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.user_id;
      const { menuId, mealId } = req.params;
      const { reason } = req.body;

      console.log("⏭️ Skipping meal:", { menuId, mealId, reason });

      // Verify meal belongs to user's menu
      const meal = await prisma.recommendedMeal.findFirst({
        where: {
          meal_id: mealId,
          menu: {
            menu_id: menuId,
            user_id: userId,
          },
        },
      });

      if (!meal) {
        return res.status(404).json({
          success: false,
          error: "Meal not found",
        });
      }

      // Create or update meal completion record as skipped
      await prisma.mealCompletion.upsert({
        where: {
          user_id_menu_id_day_number_meal_type: {
            user_id: userId,
            menu_id: menuId,
            day_number: meal.day_number,
            meal_type: meal.meal_type,
          },
        },
        update: {
          skipped: true,
          skip_reason: reason || null,
          updated_at: new Date(),
        },
        create: {
          user_id: userId,
          menu_id: menuId,
          day_number: meal.day_number,
          meal_type: meal.meal_type,
          skipped: true,
          skip_reason: reason || null,
        },
      });

      console.log("✅ Meal skipped successfully");

      res.json({
        success: true,
        message: "Meal skipped successfully",
      });
    } catch (error) {
      console.error("💥 Error skipping meal:", error);
      res.status(500).json({
        success: false,
        error: "Failed to skip meal",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// POST /api/recommended-menus/:menuId/replace-meal - Replace a specific meal
router.post(
  "/:menuId/replace-meal",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.user_id;
      const { menuId } = req.params;
      const { mealId, preferences, language = "en" } = req.body;

      console.log("🔄 Replace meal request:", { menuId, mealId, language, alternativeName: preferences?.alternativeName });

      const updatedMeal = await RecommendedMenuService.replaceMeal(
        userId,
        menuId,
        mealId,
        preferences,
        language, // Pass language for AI generation
      );

      res.json({
        success: true,
        data: updatedMeal,
      });
    } catch (error) {
      console.error("💥 Error replacing meal:", error);
      res.status(500).json({
        success: false,
        error: "Failed to replace meal",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// POST /api/recommended-menus/:menuId/favorite-meal - Mark meal as favorite
router.post(
  "/:menuId/favorite-meal",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.user_id;
      const { menuId } = req.params;
      const { mealId, isFavorite } = req.body;

      await RecommendedMenuService.markMealAsFavorite(
        userId,
        menuId,
        mealId,
        isFavorite,
      );

      res.json({
        success: true,
        message: isFavorite
          ? "Meal marked as favorite"
          : "Meal removed from favorites",
      });
    } catch (error) {
      console.error("💥 Error updating meal favorite:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update meal favorite",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// POST /api/recommended-menus/:menuId/meal-feedback - Give feedback on meal
router.post(
  "/:menuId/meal-feedback",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.user_id;
      const { menuId } = req.params;
      const { mealId, liked } = req.body;

      await RecommendedMenuService.giveMealFeedback(
        userId,
        menuId,
        mealId,
        liked,
      );

      res.json({
        success: true,
        message: "Feedback recorded successfully",
      });
    } catch (error) {
      console.error("💥 Error recording meal feedback:", error);
      res.status(500).json({
        success: false,
        error: "Failed to record feedback",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// GET /api/recommended-menus/:menuId/shopping-list - Get shopping list for menu
router.get(
  "/:menuId/shopping-list",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.user_id;
      const { menuId } = req.params;

      const shoppingList = await RecommendedMenuService.generateShoppingList(
        userId,
        menuId,
      );

      res.json({
        success: true,
        data: shoppingList,
      });
    } catch (error) {
      console.error("💥 Error generating shopping list:", error);
      res.status(500).json({
        success: false,
        error: "Failed to generate shopping list",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// GET /api/recommended-menus/:menuId/completion - Check if menu is completed and get summary
router.get(
  "/:menuId/completion",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.user_id;
      const { menuId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      console.log("📊 Checking completion for menu:", menuId);

      const summary = await RecommendedMenuService.checkMenuCompletion(
        userId,
        menuId,
      );

      if (!summary) {
        return res.json({
          success: true,
          completed: false,
          message: "Menu is still active",
        });
      }

      res.json({
        success: true,
        completed: true,
        data: summary,
      });
    } catch (error) {
      console.error("💥 Error checking menu completion:", error);
      res.status(500).json({
        success: false,
        error: "Failed to check menu completion",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// POST /api/recommended-menus/:menuId/start-today - Start a recommended menu as today's plan
router.post(
  "/:menuId/start-today",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.user_id;
      const { menuId } = req.params;

      console.log(
        "🚀 Starting recommended menu today:",
        menuId,
        "for user:",
        userId,
      );

      // Get the recommended menu
      const menu = await prisma.recommendedMenu.findFirst({
        where: {
          menu_id: menuId,
          user_id: userId,
        },
        include: {
          meals: {
            include: {
              ingredients: true,
            },
          },
        },
      });

      if (!menu) {
        return res.status(404).json({
          success: false,
          error: "Menu not found",
        });
      }

      // Calculate start and end dates based on today
      // Use noon UTC to avoid timezone shift issues (midnight local can become previous day in UTC)
      const now = new Date();
      const startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0));
      const endDate = new Date(startDate);
      endDate.setUTCDate(endDate.getUTCDate() + menu.days_count - 1);
      endDate.setUTCHours(23, 59, 59, 999);

      console.log("📅 Setting menu dates:", {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        days_count: menu.days_count,
      });

      // Deactivate any other active recommended menus for this user
      const deactivateResult = await prisma.recommendedMenu.updateMany({
        where: {
          user_id: userId,
          menu_id: { not: menuId },
          is_active: true,
        },
        data: { is_active: false },
      });
      console.log(`📋 Deactivated ${deactivateResult.count} other menus`);

      // Update the menu with start_date, end_date and mark as active
      const updatedMenu = await prisma.recommendedMenu.update({
        where: { menu_id: menuId },
        data: {
          is_active: true,
          start_date: startDate,
          end_date: endDate,
        },
      });
      console.log(`📋 Menu ${menuId} now has is_active = ${updatedMenu.is_active}`);

      // Update user's active menu
      const updatedUser = await prisma.user.update({
        where: { user_id: userId },
        data: {
          active_menu_id: menuId,
          active_meal_plan_id: null, // Clear any active meal plan
        },
      });
      console.log(`📋 User active_menu_id updated to: ${updatedUser.active_menu_id}`);

      console.log("✅ Menu started successfully - All state synchronized:", {
        menu_id: menuId,
        is_active: updatedMenu.is_active,
        user_active_menu_id: updatedUser.active_menu_id,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });
      res.json({
        success: true,
        data: {
          plan_id: menuId,
          name: menu.title,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          days_count: menu.days_count,
        },
      });
    } catch (error) {
      console.error("💥 Error starting menu:", error);
      res.status(500).json({
        success: false,
        error: "Failed to start menu",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// POST /api/recommended-menus/:menuId/review - Submit menu review
router.post(
  "/:menuId/review",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.user_id;
      const { menuId } = req.params;
      const { rating, liked, disliked, suggestions, wouldRecommend } = req.body;

      console.log("📝 Submitting menu review for:", menuId);

      // Save review to database
      await prisma.menuReview.create({
        data: {
          menu_id: menuId,
          user_id: userId,
          rating,
          liked,
          disliked,
          suggestions,
          would_recommend: wouldRecommend,
        },
      });

      res.json({
        success: true,
        message: "Review saved successfully",
      });
    } catch (error) {
      console.error("💥 Error saving menu review:", error);
      res.status(500).json({
        success: false,
        error: "Failed to save review",
      });
    }
  },
);

// POST /api/recommended-menus/:menuId/regenerate-with-feedback - Regenerate menu with user feedback
router.post(
  "/:menuId/regenerate-with-feedback",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.user_id;
      const { menuId } = req.params;
      const {
        rating,
        liked,
        disliked,
        suggestions,
        enhancements,
        wouldRecommend,
      } = req.body;

      console.log("🤖 Regenerating menu with AI feedback for:", menuId);

      // Get original menu
      const originalMenu = await prisma.recommendedMenu.findFirst({
        where: { menu_id: menuId, user_id: userId },
        include: {
          meals: {
            include: {
              ingredients: true,
            },
          },
        },
      });

      if (!originalMenu) {
        return res.status(404).json({
          success: false,
          error: "Menu not found",
        });
      }

      // Get user questionnaire
      const questionnaire = await prisma.userQuestionnaire.findFirst({
        where: { user_id: userId },
      });

      // Generate enhanced menu using AI with feedback
      const enhancedMenu =
        await RecommendedMenuService.generateEnhancedMenuWithFeedback({
          userId,
          originalMenu,
          questionnaire,
          feedback: {
            rating,
            liked,
            disliked,
            suggestions,
            enhancements,
            wouldRecommend,
          },
        });

      res.json({
        success: true,
        data: enhancedMenu,
        message: "Enhanced menu generated successfully",
      });
    } catch (error) {
      console.error("💥 Error regenerating menu with feedback:", error);
      res.status(500).json({
        success: false,
        error: "Failed to generate enhanced menu",
      });
    }
  },
);

// POST /api/recommended-menus/generate-comprehensive - Generate comprehensive menu with detailed parameters
router.post(
  "/generate-comprehensive",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.user_id;
      console.log("🎯 Generating comprehensive menu for user:", userId);
      console.log("📋 Request body:", req.body);

      // Check menu limit
      const { allowed, currentCount } = await checkMenuLimit(userId);
      if (!allowed) {
        return res.status(400).json({
          success: false,
          error: `Maximum ${MAX_MENUS_PER_USER} menus allowed. Please delete a menu to create a new one.`,
          currentCount,
          maxMenus: MAX_MENUS_PER_USER,
        });
      }

      const {
        name,
        days = 7,
        mealsPerDay = "3_main",
        targetCalories,
        proteinGoal,
        carbGoal,
        fatGoal,
        budget,
        specialRequests,
      } = req.body;

      // Validate input
      if (!name || name.trim() === "") {
        return res.status(400).json({
          success: false,
          error: "Menu name is required",
        });
      }

      if (days < 1 || days > 30) {
        return res.status(400).json({
          success: false,
          error: "Days must be between 1 and 30",
        });
      }

      console.log(
        "✅ Input validation passed, generating comprehensive menu...",
      );

      // Sanitize user inputs to prevent injection
      const sanitizeName = (name || "").replace(/[^\w\s-]/g, "").trim();
      const sanitizeRequests = (specialRequests || "")
        .replace(/[<>]/g, "")
        .trim();

      // Create comprehensive request with sanitized inputs
      const comprehensiveRequest = {
        userId,
        days,
        mealsPerDay,
        targetCalories,
        dietaryPreferences: [],
        excludedIngredients: [],
        budget,
        customRequest: [
          `Create a comprehensive menu named "${sanitizeName}".`,
          sanitizeRequests ? sanitizeRequests : "",
          targetCalories
            ? `Target ${parseInt(targetCalories.toString())} calories daily.`
            : "",
          proteinGoal
            ? `${parseInt(proteinGoal.toString())}g protein daily.`
            : "",
          carbGoal ? `${parseInt(carbGoal.toString())}g carbs daily.` : "",
          fatGoal ? `${parseInt(fatGoal.toString())}g fats daily.` : "",
        ]
          .filter(Boolean)
          .join(" ")
          .trim(),
      };

      const menu =
        await RecommendedMenuService.generateCustomMenu(comprehensiveRequest);

      if (!menu) {
        throw new Error("Comprehensive menu generation returned null");
      }

      console.log("🎉 Comprehensive menu generated successfully!");
      console.log("📊 Menu stats:", {
        menu_id: menu?.menu_id,
        title: menu?.title,
        meals_count: menu?.meals?.length || 0,
        total_calories: menu?.total_calories,
      });

      const responseData = {
        ...menu,
        menu_id: menu.menu_id,
        title: menu.title,
        description: menu.description,
        meals: menu.meals || [],
        days_count: menu.days_count,
        total_calories: menu.total_calories,
        estimated_cost: menu.estimated_cost,
      };

      console.log(
        "📤 Sending comprehensive menu response with",
        responseData.meals.length,
        "meals",
      );

      res.json({
        success: true,
        message: "Comprehensive menu generated successfully",
        data: responseData,
      });
    } catch (error) {
      console.error("💥 Error generating comprehensive menu:", error);

      let errorMessage = "Failed to generate comprehensive menu";
      let statusCode = 500;

      if (errorMessageIncludes(error, "questionnaire not found")) {
        errorMessage =
          "Please complete your questionnaire first before generating a comprehensive menu";
        statusCode = 400;
      } else {
        errorMessage = getErrorMessage(error);
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        details: getErrorMessage(error),
      });
    }
  },
);

// DEPRECATED: This duplicate route is shadowed by the one above. Keeping for reference.
// The route above now properly handles setting start_date and end_date.
// If meal plan creation is needed, consider renaming this to "/:menuId/start-with-meal-plan"
/*
router.post(
  "/:menuId/start-today-legacy",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.user_id;
      const { menuId } = req.params;

      console.log("🚀 Starting menu:", menuId, "for user:", userId);

      // Get the recommended menu
      const menu = await prisma.recommendedMenu.findFirst({
        where: {
          menu_id: menuId,
          user_id: userId,
        },
        include: {
          meals: {
            include: {
              ingredients: true,
            },
            orderBy: [{ day_number: "asc" }, { meal_type: "asc" }],
          },
        },
      });

      if (!menu) {
        return res.status(404).json({
          success: false,
          error: "Menu not found",
        });
      }

      // Create a new meal plan from the recommended menu
      const planId = `plan_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Calculate proper start and end dates
      const planStartDate = new Date();
      planStartDate.setHours(0, 0, 0, 0); // Start of today
      const planEndDate = new Date(planStartDate);
      planEndDate.setDate(planEndDate.getDate() + menu.days_count - 1);
      planEndDate.setHours(23, 59, 59, 999); // End of last day

      const mealPlan = await prisma.userMealPlan.create({
        data: {
          plan_id: planId,
          user_id: userId,
          name: menu.title,
          plan_type: "WEEKLY",
          meals_per_day: 3,
          snacks_per_day: 0,
          rotation_frequency_days: menu.days_count,
          include_leftovers: false,
          fixed_meal_times: true,
          target_calories_daily: Math.round(
            menu.total_calories / menu.days_count,
          ),
          target_protein_daily: Math.round(
            (menu.total_protein || 0) / menu.days_count,
          ),
          target_carbs_daily: Math.round(
            (menu.total_carbs || 0) / menu.days_count,
          ),
          target_fats_daily: Math.round(
            (menu.total_fat || 0) / menu.days_count,
          ),
          start_date: planStartDate,
          end_date: planEndDate,
          is_active: true,
        },
      });

      // Deactivate any other active meal plans
      await prisma.userMealPlan.updateMany({
        where: {
          user_id: userId,
          plan_id: { not: planId },
          is_active: true,
        },
        data: { is_active: false },
      });

      // Deactivate any other active recommended menus for this user
      await prisma.recommendedMenu.updateMany({
        where: {
          user_id: userId,
          menu_id: { not: menuId },
          is_active: true,
        },
        data: { is_active: false },
      });

      // Update the RecommendedMenu with start_date, end_date and mark as active
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0); // Set to start of day
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + menu.days_count - 1);
      endDate.setHours(23, 59, 59, 999); // Set to end of day

      await prisma.recommendedMenu.update({
        where: { menu_id: menuId },
        data: {
          is_active: true,
          start_date: startDate,
          end_date: endDate,
        },
      });

      // Update user's active meal plan reference
      await prisma.user.update({
        where: { user_id: userId },
        data: {
          active_meal_plan_id: planId,
          active_menu_id: menuId,
        },
      });

      // Create meal templates and schedules from recommended menu meals
      console.log(
        "🔄 Converting recommended meals to meal templates and schedules...",
      );

      const createdTemplates: {
        name: string;
        created_at: Date;
        image_url: string | null;
        calories: number | null;
        protein_g: number | null;
        carbs_g: number | null;
        fats_g: number | null;
        fiber_g: number | null;
        sugar_g: number | null;
        sodium_mg: number | null;
        allergens_json: JsonValue | null;
        updated_at: Date;
        is_active: boolean;
        template_id: string;
        description: string | null;
        dietary_category: $Enums.DietaryCategory;
        prep_time_minutes: number | null;
        difficulty_level: number | null;
        meal_timing: $Enums.MealTiming;
        ingredients_json: JsonValue | null;
        instructions_json: JsonValue | null;
      }[] = [];
      const scheduleData = [];

      for (const meal of menu.meals) {
        try {
          // Create meal template for this meal
          const template = await prisma.mealTemplate.create({
            data: {
              name: meal.name,
              description:
                meal.instructions || `${meal.name} from recommended menu`,
              meal_timing: meal.meal_type,
              dietary_category: "BALANCED",
              prep_time_minutes: meal.prep_time_minutes || 30,
              difficulty_level: 2,
              calories: meal.calories,
              protein_g: meal.protein,
              carbs_g: meal.carbs,
              fats_g: meal.fat,
              fiber_g: meal.fiber || 0,
              sugar_g: 0,
              sodium_mg: 0,
              ingredients_json: meal.ingredients?.map((ing) => ing.name) || [],
              instructions_json:
                typeof meal.instructions === "string"
                  ? [meal.instructions]
                  : meal.instructions || [],
              allergens_json: [],
              image_url: null,
              is_active: true,
            },
          });

          createdTemplates.push(template);

          // Create schedule entry
          const dayOfWeek = (meal.day_number - 1) % 7; // Convert to 0-6 format
          scheduleData.push({
            plan_id: planId,
            template_id: template.template_id,
            day_of_week: dayOfWeek,
            meal_timing: meal.meal_type,
            meal_order: 1,
            portion_multiplier: 1.0,
            is_optional: false,
          });
        } catch (error) {
          console.error(
            "❌ Error creating template for meal:",
            meal.name,
            error,
          );
        }
      }

      // Bulk create schedule entries
      if (scheduleData.length > 0) {
        await prisma.mealPlanSchedule.createMany({
          data: scheduleData,
        });
        console.log(`✅ Created ${scheduleData.length} meal schedule entries`);
      }

      // Convert meals to weekly plan structure for response
      const weeklyPlan: { [day: string]: { [timing: string]: any[] } } = {};
      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];

      menu.meals.forEach((meal) => {
        const dayName = dayNames[(meal.day_number - 1) % 7];
        const timing = meal.meal_type;

        if (!weeklyPlan[dayName]) {
          weeklyPlan[dayName] = {};
        }
        if (!weeklyPlan[dayName][timing]) {
          weeklyPlan[dayName][timing] = [];
        }

        // Find the corresponding template
        const template = createdTemplates.find(
          (t) => t.name === meal.name && t.meal_timing === meal.meal_type,
        );

        weeklyPlan[dayName][timing].push({
          template_id: template?.template_id || meal.meal_id,
          name: meal.name,
          description: meal.instructions || "",
          meal_timing: timing,
          dietary_category: "BALANCED",
          prep_time_minutes: meal.prep_time_minutes || 30,
          difficulty_level: 2,
          calories: meal.calories,
          protein_g: meal.protein,
          carbs_g: meal.carbs,
          fats_g: meal.fat,
          fiber_g: meal.fiber || 0,
          sugar_g: 0,
          sodium_mg: 0,
          ingredients: meal.ingredients?.map((ing) => ing.name) || [],
          instructions:
            typeof meal.instructions === "string"
              ? [meal.instructions]
              : meal.instructions || [],
          allergens: [],
          image_url: null,
          user_rating: 0,
          user_comments: "",
          is_favorite: false,
        });
      });

      console.log("✅ Menu converted to meal plan successfully");

      res.json({
        success: true,
        message: "Menu started successfully",
        data: {
          plan_id: planId,
          menu_id: menuId, // The RecommendedMenu ID for /with-progress endpoint
          name: mealPlan.name,
          start_date: mealPlan.start_date,
          end_date: mealPlan.end_date,
          is_active: mealPlan.is_active,
          target_calories_daily: mealPlan.target_calories_daily,
          target_protein_daily: mealPlan.target_protein_daily,
          target_carbs_daily: mealPlan.target_carbs_daily,
          target_fats_daily: mealPlan.target_fats_daily,
          weekly_plan: weeklyPlan,
        },
      });
    } catch (error) {
      console.error("💥 Error starting menu:", error);
      res.status(500).json({
        success: false,
        error: "Failed to start menu",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);
*/

// Helper: Clear placeholder state when AI fails - ensures meals don't stay stuck in "Preparing..." forever
async function clearPlaceholderState(
  menuId: string,
  savedMealIds: { mealId: string; dayNumber: number; mealType: string }[],
) {
  try {
    for (const meal of savedMealIds) {
      await prisma.recommendedMeal.update({
        where: { meal_id: meal.mealId },
        data: {
          cooking_method: "Simple preparation",
          instructions: "Recipe details could not be generated. You can edit this meal to add your own instructions.",
        },
      });
    }
    console.log(`🔧 Cleared placeholder state for menu ${menuId} (${savedMealIds.length} meals)`);
  } catch (e) {
    console.error(`❌ Failed to clear placeholder state for menu ${menuId}:`, e);
  }
}

// Generate menu with user ingredients
router.post(
  "/generate-with-ingredients",
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

      // Check menu limit
      const { allowed, currentCount } = await checkMenuLimit(userId);
      if (!allowed) {
        return res.status(400).json({
          success: false,
          error: `Maximum ${MAX_MENUS_PER_USER} menus allowed. Please delete a menu to create a new one.`,
          currentCount,
          maxMenus: MAX_MENUS_PER_USER,
        });
      }

      const { preferences, ingredients = [], user_ingredients } = req.body;

      // Ingredients are now optional - AI will suggest ingredients if none provided
      const hasIngredients =
        Array.isArray(ingredients) && ingredients.length > 0;

      console.log("🍽️ Generating menu:", {
        userId,
        ingredientCount: hasIngredients ? ingredients.length : 0,
        hasUserIngredients: hasIngredients,
        preferences,
      });

      // Get user questionnaire for personalization
      const userQuestionnaire = await prisma.userQuestionnaire.findFirst({
        where: { user_id: userId },
        orderBy: { date_completed: "desc" },
      });

      // Detect language based on ingredients or preferences
      const hasHebrew =
        hasIngredients &&
        ingredients.some((ing: any) => /[\u0590-\u05FF]/.test(ing.name));
      const menuLanguage = hasHebrew ? "Hebrew" : "English";

      // Create ingredients list if provided, otherwise AI will suggest
      const ingredientsList = hasIngredients
        ? ingredients
            .map((ing: any) => `${ing.name} (${ing.quantity} ${ing.unit})`)
            .join(", ")
        : "None provided - AI will suggest appropriate ingredients based on preferences";

      const sanitizedDuration = Math.max(
        1,
        Math.min(30, parseInt(preferences.duration_days?.toString() || "7")),
      );

      const customName = preferences.custom_name?.trim() || null;

      const prompt = `You are a world-class chef and nutritionist. Create an exceptional ${sanitizedDuration}-day meal plan that showcases creative, delicious, and nutritious recipes.

🍽️ ${hasIngredients ? "AVAILABLE INGREDIENTS:" : "INGREDIENT GUIDANCE:"}
${hasIngredients ? ingredientsList : "No specific ingredients provided. Please suggest appropriate, commonly available ingredients that match the cuisine style and dietary preferences. Focus on fresh, affordable, and accessible ingredients."}

📋 USER PREFERENCES:
- Cuisine Style: ${preferences.cuisine} (embrace authentic flavors and traditional cooking methods)
- Dietary Requirements: ${preferences.dietary_restrictions.join(", ") || "None - No restrictions"}
- Meals per Day: ${preferences.meal_count} (balanced throughout the day)
- Cooking Difficulty: ${preferences.cooking_difficulty} (${preferences.cooking_difficulty === "easy" ? "simple, quick recipes" : preferences.cooking_difficulty === "medium" ? "moderately challenging" : "complex, gourmet techniques"})
- Budget: ${preferences.budget_range} (${preferences.budget_range === "budget" ? "cost-effective ingredients" : preferences.budget_range === "moderate" ? "balanced quality and cost" : "premium ingredients welcome"})
- Custom Name Request: ${customName || "Create an appealing name"}

👤 USER PROFILE:
${
  userQuestionnaire
    ? `- Age: ${userQuestionnaire.age} years
- Primary Goal: ${userQuestionnaire.main_goal} (optimize nutrition for this goal)
- Activity Level: ${userQuestionnaire.physical_activity_level}
- Daily Cooking Time: ${userQuestionnaire.daily_cooking_time || "30 minutes"}
- Preferences: ${userQuestionnaire.liked_foods?.join(", ") || "No specific preferences"}
- Dislikes: ${userQuestionnaire.disliked_foods?.join(", ") || "None"}
- Allergies: ${userQuestionnaire.allergies?.join(", ") || "None"}`
    : "- Standard nutrition requirements"
}

🎯 LANGUAGE RULE:
Respond in ${menuLanguage} for ALL text (menu name, descriptions, instructions, ingredient names).

✨ RECIPE QUALITY STANDARDS:
1. CREATE RESTAURANT-QUALITY DISHES: Each meal should be exciting, flavorful, and memorable
2. ${hasIngredients ? "MAXIMIZE INGREDIENT USE: Creatively incorporate the provided ingredients across multiple meals" : "SMART INGREDIENT SELECTION: Choose fresh, affordable, and accessible ingredients that complement the cuisine style"}
3. BALANCE NUTRITION: Hit macro targets while ensuring variety and satisfaction
4. STRUCTURED INSTRUCTIONS: Each meal MUST have 4-8 numbered cooking steps. Each step starts with an action verb (Prep, Heat, Sear, Mix, Bake, etc.). Include temperatures (°C) and times (minutes) where applicable. Final step should be plating/serving.
5. SMART MEAL PLANNING: Prep ingredients once, use in multiple meals when possible
6. FLAVOR PROFILES: Layer flavors with herbs, spices, and proper cooking techniques
7. VISUAL APPEAL: Describe plating and presentation tips
8. TIME-EFFICIENT: Batch cooking tips and prep-ahead suggestions

🥗 MEAL CREATION GUIDELINES:
- BREAKFAST: Energizing, protein-rich, prep time 10-20 minutes
- LUNCH: Satisfying, balanced, can be prepared ahead, 20-30 minutes
- DINNER: Main event, flavorful, family-friendly, 30-45 minutes
- SNACKS: Quick, nutritious, portable options

💡 MENU NAMING:
${customName ? `Use this exact name: "${customName}"` : `Create a catchy, 2-3 word name in ${menuLanguage} that captures the menu's essence (e.g., "Mediterranean Magic", "Fresh Week Fusion", "Protein Power Plan")`}

⚠️ CRITICAL:
- Return ONLY valid JSON, no conversational text
- If dietary conflicts exist, intelligently substitute (e.g., tofu for chicken in vegetarian)
- Ensure all quantities are realistic and practical

💰 ISRAELI MARKET PRICING GUIDE (₪ per unit):
Use these REALISTIC Israeli supermarket prices for cost estimation:
PROTEINS (per 100g):
- Chicken breast: ₪12-15 | Chicken thighs: ₪8-10 | Ground chicken: ₪10-12
- Beef (ground): ₪18-25 | Beef steak: ₪35-50 | Beef stew meat: ₪25-30
- Salmon fillet: ₪35-45 | Tilapia/Sea bream: ₪20-25 | Tuna (canned): ₪8-12
- Eggs (per egg): ₪1-1.5 | Tofu (per 100g): ₪5-8 | Cottage cheese: ₪4-6
- Turkey breast: ₪15-18 | Lamb: ₪40-55

DAIRY & ALTERNATIVES (per 100g/ml):
- Milk (per liter): ₪6-8 | Greek yogurt: ₪3-5 | Regular yogurt: ₪2-3
- Cheese (yellow): ₪8-12 | Feta cheese: ₪6-9 | Cream cheese: ₪5-7
- Butter (per 100g): ₪5-7 | Tahini: ₪4-6 | Hummus: ₪3-5

GRAINS & CARBS:
- Rice (per 100g): ₪1-2 | Pasta (per 100g): ₪1-2 | Bread (loaf): ₪8-15
- Quinoa (per 100g): ₪4-6 | Oats (per 100g): ₪1-2 | Couscous: ₪2-3
- Pita bread (per 4): ₪5-8 | Tortillas (per 6): ₪12-15

VEGETABLES (per 100g):
- Tomatoes: ₪2-4 | Cucumbers: ₪1-2 | Peppers: ₪3-5 | Onions: ₪1-2
- Carrots: ₪1-2 | Broccoli: ₪4-6 | Zucchini: ₪2-3 | Eggplant: ₪2-3
- Leafy greens (lettuce, spinach): ₪3-5 | Avocado (per piece): ₪5-8

FRUITS (per 100g):
- Apples: ₪2-3 | Bananas: ₪2-3 | Oranges: ₪2-3 | Berries: ₪8-12
- Dates: ₪4-6 | Grapes: ₪4-6

PANTRY & SPICES:
- Olive oil (per 100ml): ₪4-6 | Vegetable oil (per 100ml): ₪1-2
- Spices (per 10g): ₪2-4 | Salt/Pepper: ₪0.5-1 | Garlic (per head): ₪2-3
- Honey (per 100g): ₪5-8 | Sugar (per 100g): ₪1-2

EXAMPLE: A meal with 150g chicken breast (₪18-22), 200g vegetables (₪6-8), 100g rice (₪1-2) = approximately ₪25-32 total

📊 REQUIRED JSON FORMAT:
{
  "menu_name": "${customName || "Creative 2-3 word name"}",
  "description": "Compelling 1-2 sentence description highlighting key benefits and flavors",
  "total_calories": <sum of all meals>,
  "total_protein": <sum in grams>,
  "total_carbs": <sum in grams>,
  "total_fat": <sum in grams>,
  "days_count": ${sanitizedDuration},
  "estimated_cost": <total cost in ₪>,
  "meals": [
    {
      "name": "Descriptive, appetizing meal name",
      "meal_type": "BREAKFAST|LUNCH|DINNER|SNACK",
      "day_number": <1-${sanitizedDuration}>,
      "calories": <realistic calorie count>,
      "protein": <grams>,
      "carbs": <grams>,
      "fat": <grams>,
      "prep_time_minutes": <realistic time>,
      "cooking_method": "Specific method (e.g., 'Pan-searing and roasting', 'Slow cooker', 'Stir-frying')",
      "instructions": "1. Prep: Dice the onions and mince garlic.\n2. Sear: Heat olive oil in a pan over medium-high heat (200°C).\n3. Cook: Add chicken and cook 5-6 min per side.\n4. Season: Add paprika, salt, and pepper.\n5. Finish: Let rest 3 minutes, then plate with fresh herbs.",
      "dietary_tags": ["vegan", "vegetarian", "gluten-free", "dairy-free", "nut-free", "meat", "fish", "egg"] (include all that apply),
      "ingredients": [
        {
          "name": "Precise ingredient name",
          "quantity": <precise amount>,
          "unit": "g|ml|piece|tbsp|tsp|cup",
          "category": "protein|vegetable|grain|dairy|fruit|spice|fat",
          "estimated_cost": <cost in ₪>
        }
      ]
    }
  ]
}

🚀 PERFORMANCE NOTE: Generate this menu efficiently with rich detail in under 10 seconds.`;

      // ========== INSTANT MENU CREATION ==========
      // Create menu immediately with placeholder data, then enhance in background

      const cuisineEmojis: Record<string, string> = {
        mediterranean: "🌿",
        asian: "🥢",
        american: "🍔",
        italian: "🍝",
        mexican: "🌮",
        indian: "🍛",
        japanese: "🍣",
        middle_eastern: "🥙",
        french: "🥐",
      };

      const cuisineNames: Record<string, string> = {
        mediterranean: "Mediterranean",
        asian: "Asian Fusion",
        american: "American Classic",
        italian: "Italian",
        mexican: "Mexican",
        indian: "Indian",
        japanese: "Japanese",
        middle_eastern: "Middle Eastern",
        french: "French",
      };

      // Generate quick menu name
      const quickMenuName =
        preferences.custom_name?.trim() ||
        `${cuisineEmojis[preferences.cuisine] || "🍽️"} ${cuisineNames[preferences.cuisine] || "Custom"} ${sanitizedDuration}-Day Plan`;

      // Create placeholder meals based on preferences
      const mealTypes = ["BREAKFAST", "LUNCH", "DINNER"];
      const placeholderMeals: any[] = [];

      for (let day = 1; day <= sanitizedDuration; day++) {
        for (const mealType of mealTypes.slice(
          0,
          preferences.meal_count || 3,
        )) {
          placeholderMeals.push({
            name: `${mealType.charAt(0) + mealType.slice(1).toLowerCase()} - Day ${day}`,
            meal_type: mealType,
            day_number: day,
            calories:
              mealType === "BREAKFAST" ? 400 : mealType === "LUNCH" ? 600 : 700,
            protein:
              mealType === "BREAKFAST" ? 20 : mealType === "LUNCH" ? 35 : 40,
            carbs:
              mealType === "BREAKFAST" ? 50 : mealType === "LUNCH" ? 60 : 70,
            fat: mealType === "BREAKFAST" ? 15 : mealType === "LUNCH" ? 20 : 25,
            prep_time_minutes: 30,
            cooking_method: "Preparing...",
            instructions:
              "AI is generating detailed recipe... Check back in a moment!",
            dietary_tags: preferences.dietary_restrictions || [],
            ingredients: [],
            is_generating: true,
          });
        }
      }

      // Calculate totals
      const totalCalories = placeholderMeals.reduce(
        (sum, m) => sum + m.calories,
        0,
      );
      const totalProtein = placeholderMeals.reduce(
        (sum, m) => sum + m.protein,
        0,
      );
      const totalCarbs = placeholderMeals.reduce((sum, m) => sum + m.carbs, 0);
      const totalFat = placeholderMeals.reduce((sum, m) => sum + m.fat, 0);

      // Auto-activate: calculate start and end dates
      const now = new Date();
      const startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0));
      const endDate = new Date(startDate);
      endDate.setUTCDate(endDate.getUTCDate() + sanitizedDuration - 1);
      endDate.setUTCHours(23, 59, 59, 999);

      // Deactivate any other active menus for this user
      await prisma.recommendedMenu.updateMany({
        where: {
          user_id: userId,
          is_active: true,
        },
        data: { is_active: false },
      });

      // Save menu to database IMMEDIATELY - auto-activated
      const savedMenu = await prisma.recommendedMenu.create({
        data: {
          user_id: userId,
          title: quickMenuName,
          description: `${cuisineNames[preferences.cuisine] || "Custom"} cuisine menu being personalized by AI...`,
          total_calories: totalCalories,
          total_protein: totalProtein,
          total_carbs: totalCarbs,
          total_fat: totalFat,
          days_count: sanitizedDuration,
          estimated_cost: 0,
          prep_time_minutes: 30,
          difficulty_level:
            preferences.cooking_difficulty === "easy"
              ? 1
              : preferences.cooking_difficulty === "hard"
                ? 3
                : 2,
          is_active: true,
          start_date: startDate,
          end_date: endDate,
        },
      });

      // Update user's active menu
      await prisma.user.update({
        where: { user_id: userId },
        data: {
          active_menu_id: savedMenu.menu_id,
          active_meal_plan_id: null,
        },
      });

      // Save placeholder meals
      const savedMealIds: {
        mealId: string;
        dayNumber: number;
        mealType: string;
      }[] = [];

      for (const meal of placeholderMeals) {
        const savedMeal = await prisma.recommendedMeal.create({
          data: {
            menu_id: savedMenu.menu_id,
            name: meal.name,
            meal_type: meal.meal_type,
            day_number: meal.day_number,
            calories: meal.calories,
            protein: meal.protein,
            carbs: meal.carbs,
            fat: meal.fat,
            prep_time_minutes: meal.prep_time_minutes,
            cooking_method: meal.cooking_method,
            instructions: meal.instructions,
            image_url: null,
            language: menuLanguage,
            dietary_tags: meal.dietary_tags,
          },
        });

        savedMealIds.push({
          mealId: savedMeal.meal_id,
          dayNumber: meal.day_number,
          mealType: meal.meal_type,
        });
      }

      console.log(
        `✅ Menu created instantly: ${savedMenu.menu_id} with ${savedMealIds.length} placeholder meals`,
      );

      // Send response IMMEDIATELY - user can start using the menu
      res.json({
        success: true,
        data: {
          menu_id: savedMenu.menu_id,
          plan_id: savedMenu.menu_id,
          menu_name: quickMenuName,
          name: quickMenuName,
          description: `${cuisineNames[preferences.cuisine] || "Custom"} cuisine menu - AI is personalizing your recipes...`,
          total_calories: totalCalories,
          total_protein: totalProtein,
          total_carbs: totalCarbs,
          total_fat: totalFat,
          days_count: sanitizedDuration,
          estimated_cost: 0,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          is_active: true,
          meals: placeholderMeals,
          is_generating: true,
        },
        message:
          "Menu created! AI is now personalizing your recipes in the background.",
      });

      // ========== BACKGROUND AI ENHANCEMENT ==========
      // Generate meals in PARALLEL BATCHES for speed
      // Day 1 runs first (to get menu name), then remaining days run 3 at a time
      const menuId = savedMenu.menu_id;
      if (openai) {
        setImmediate(async () => {
          try {
            console.log(`🤖 Starting parallel AI enhancement for menu: ${menuId} (${sanitizedDuration} days)`);

            let totalUpdated = 0;
            let menuName = quickMenuName;
            let menuDescription = "";

            // --- Helper: build prompt for a single day ---
            const buildDayPrompt = (day: number, dayMealIds: typeof savedMealIds) => {
              const cookingStyles = [
                "grilled", "baked", "stir-fried", "steamed", "roasted",
                "sautéed", "poached", "braised", "pan-seared", "slow-cooked",
              ];
              const varietyHint = cookingStyles.slice((day - 1) * 2 % cookingStyles.length, (day - 1) * 2 % cookingStyles.length + 3).join(", ");

              return `You are a world-class chef creating DAY ${day} of a ${sanitizedDuration}-day ${preferences.cuisine || "mixed"} meal plan.

📋 REQUIREMENTS:
- Cuisine: ${preferences.cuisine || "mixed"}
- Dietary: ${(preferences.dietary_restrictions || []).join(", ") || "None"}
- Difficulty: ${preferences.cooking_difficulty || "easy"}
- Budget: ${preferences.budget_range || "moderate"}
- Language: ${menuLanguage}
${day === 1 ? `- Menu Name: ${customName || "Create a catchy 2-3 word name in " + menuLanguage}` : ""}

${userQuestionnaire ? `👤 USER: Age ${userQuestionnaire.age}, Goal: ${userQuestionnaire.main_goal}, Activity: ${userQuestionnaire.physical_activity_level}` : ""}

🍽️ Generate EXACTLY these meals for day ${day}:
${dayMealIds.map((m) => `- ${m.mealType}`).join("\n")}

${hasIngredients ? `Available ingredients: ${ingredientsList}` : "Suggest fresh, affordable ingredients."}

🎨 VARIETY (important!):
- This is day ${day} of ${sanitizedDuration} - each day must feel DIFFERENT
- Preferred cooking methods for today: ${varietyHint}
- Do NOT repeat standard meals like plain chicken and rice
- Use creative names, varied proteins (chicken, fish, eggs, tofu, beef, legumes), diverse grains, seasonal vegetables
- Breakfast ideas: shakshuka, overnight oats, smoothie bowls, French toast, granola parfaits, savory crepes
- Lunch/Dinner ideas: stir-fry, stuffed peppers, grain bowls, wraps, pasta, curry, tacos, soups

✨ RECIPE RULES:
- Each meal: 4-8 numbered cooking steps with action verbs, temperatures (°C), and times
- Each ingredient MUST have estimated_cost in ₪ (Israeli Shekels)
- Use realistic Israeli supermarket prices

💰 PRICE GUIDE (₪): Chicken breast 100g: ₪12-15, Rice 100g: ₪1-2, Vegetables 100g: ₪2-5, Eggs each: ₪1.5, Olive oil 100ml: ₪4-6, Cheese 100g: ₪8-12, Ground beef 100g: ₪14-18, Fish fillet 100g: ₪15-25, Tofu 100g: ₪5-7, Pasta 100g: ₪2-3

📊 RESPOND IN THIS JSON FORMAT:
{
  ${day === 1 ? `"menu_name": "Catchy name",\n  "description": "1-2 sentence description",` : ""}
  "meals": [
    {
      "name": "Creative appetizing name",
      "meal_type": "BREAKFAST|LUNCH|DINNER|SNACK|MORNING_SNACK|AFTERNOON_SNACK",
      "day_number": ${day},
      "calories": <number>,
      "protein": <grams>,
      "carbs": <grams>,
      "fat": <grams>,
      "prep_time_minutes": <number>,
      "cooking_method": "Specific method",
      "instructions": "1. Prep: ...\\n2. Cook: ...\\n3. ...",
      "dietary_tags": [],
      "ingredients": [
        {"name": "ingredient", "quantity": <number>, "unit": "g|ml|piece|tbsp", "category": "protein|vegetable|grain|dairy|fruit|spice|fat", "estimated_cost": <₪ number>}
      ]
    }
  ]
}`;
            };

            // --- Helper: process AI response for one day ---
            const processDay = async (day: number) => {
              const dayMealIds = savedMealIds.filter((m) => m.dayNumber === day);
              if (dayMealIds.length === 0) return 0;

              console.log(`📅 Generating day ${day}/${sanitizedDuration}: ${dayMealIds.map((m) => m.mealType).join(", ")}`);

              const response = await openai!.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                  {
                    role: "system",
                    content: `You are an award-winning chef. Create diverse, restaurant-quality recipes. Return ONLY valid JSON. You MUST generate exactly ${dayMealIds.length} meals. Every ingredient MUST have a realistic estimated_cost in ₪. Make each meal unique and creative.`,
                  },
                  { role: "user", content: buildDayPrompt(day, dayMealIds) },
                ],
                max_completion_tokens: 4096,
                temperature: 0.8,
                response_format: { type: "json_object" },
              });

              const aiContent = response.choices[0]?.message?.content;
              if (!aiContent) throw new Error("No AI response");

              let parsed: any;
              try {
                parsed = JSON.parse(aiContent);
              } catch {
                const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
                if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
                else throw new Error("Failed to parse JSON");
              }

              // Grab menu name from day 1
              if (day === 1 && parsed.menu_name) {
                menuName = String(parsed.menu_name);
                menuDescription = String(parsed.description || "");
              }

              const aiMeals = parsed.meals || [];
              if (!Array.isArray(aiMeals) || aiMeals.length === 0) throw new Error("No meals in response");

              let dayUpdated = 0;
              for (const aiMeal of aiMeals) {
                const aiMealType = (aiMeal.meal_type || "").toUpperCase();
                const matchingMeal = dayMealIds.find((m) => m.mealType === aiMealType);
                if (!matchingMeal) continue;

                await prisma.recommendedMeal.update({
                  where: { meal_id: matchingMeal.mealId },
                  data: {
                    name: aiMeal.name || "Delicious Meal",
                    calories: parseFloat(aiMeal.calories?.toString() || "500"),
                    protein: parseFloat(aiMeal.protein?.toString() || "25"),
                    carbs: parseFloat(aiMeal.carbs?.toString() || "50"),
                    fat: parseFloat(aiMeal.fat?.toString() || "20"),
                    prep_time_minutes: parseInt(aiMeal.prep_time_minutes?.toString() || "30"),
                    cooking_method: aiMeal.cooking_method || "Mixed cooking",
                    instructions: aiMeal.instructions || "",
                    dietary_tags: Array.isArray(aiMeal.dietary_tags) ? aiMeal.dietary_tags : [],
                  },
                });

                if (Array.isArray(aiMeal.ingredients)) {
                  for (const ing of aiMeal.ingredients) {
                    const cost = parseFloat(ing.estimated_cost?.toString() || "0");
                    try {
                      await prisma.recommendedIngredient.create({
                        data: {
                          meal_id: matchingMeal.mealId,
                          name: ing.name || "Ingredient",
                          quantity: parseFloat(ing.quantity?.toString() || "1"),
                          unit: ing.unit || "piece",
                          category: ing.category || "Other",
                          estimated_cost: cost,
                        },
                      });
                    } catch {}
                  }
                }
                dayUpdated++;
              }

              console.log(`✅ Day ${day} complete: ${dayUpdated} meals`);
              return dayUpdated;
            };

            // --- EXECUTE: Day 1 first (for menu name), then remaining days in parallel batches of 3 ---
            try {
              const day1Result = await processDay(1);
              totalUpdated += day1Result;
            } catch (err) {
              console.error(`❌ Day 1 failed:`, (err as Error).message);
            }

            // Remaining days in parallel batches of 3
            const BATCH_SIZE = 3;
            for (let batchStart = 2; batchStart <= sanitizedDuration; batchStart += BATCH_SIZE) {
              const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, sanitizedDuration);
              const batchDays = [];
              for (let d = batchStart; d <= batchEnd; d++) batchDays.push(d);

              console.log(`⚡ Parallel batch: days ${batchDays.join(", ")}`);

              const results = await Promise.allSettled(
                batchDays.map((d) => processDay(d))
              );

              for (let i = 0; i < results.length; i++) {
                if (results[i].status === "fulfilled") {
                  totalUpdated += (results[i] as PromiseFulfilledResult<number>).value;
                } else {
                  console.error(`❌ Day ${batchDays[i]} failed:`, (results[i] as PromiseRejectedResult).reason?.message);
                }
              }
            }

            // Update remaining placeholder meals to remove "Preparing..." state
            for (const meal of savedMealIds) {
              try {
                const dbMeal = await prisma.recommendedMeal.findUnique({
                  where: { meal_id: meal.mealId },
                });
                if (dbMeal && dbMeal.cooking_method === "Preparing...") {
                  await prisma.recommendedMeal.update({
                    where: { meal_id: meal.mealId },
                    data: {
                      cooking_method: "Simple preparation",
                      instructions: "Recipe could not be generated. Tap Edit to customize this meal.",
                    },
                  });
                }
              } catch {}
            }

            // Update menu totals
            const allMeals = await prisma.recommendedMeal.findMany({
              where: { menu_id: menuId },
              include: { ingredients: true },
            });
            const computedCalories = allMeals.reduce((s, m) => s + m.calories, 0);
            const computedProtein = allMeals.reduce((s, m) => s + m.protein, 0);
            const computedCarbs = allMeals.reduce((s, m) => s + m.carbs, 0);
            const computedFat = allMeals.reduce((s, m) => s + m.fat, 0);
            const computedCost = allMeals.reduce(
              (s, m) => s + m.ingredients.reduce((is, i) => is + (i.estimated_cost || 0), 0),
              0,
            );

            await prisma.recommendedMenu.update({
              where: { menu_id: menuId },
              data: {
                title: menuName,
                description: menuDescription || undefined,
                total_calories: Math.round(computedCalories),
                total_protein: Math.round(computedProtein),
                total_carbs: Math.round(computedCarbs),
                total_fat: Math.round(computedFat),
                estimated_cost: Math.round(computedCost * 10) / 10,
              },
            });

            console.log(`✅ Menu ${menuId} fully complete: ${totalUpdated}/${savedMealIds.length} meals, ₪${computedCost.toFixed(1)} total cost`);

            // Generate images (optional, non-blocking)
            for (const meal of allMeals) {
              if (meal.name && !meal.name.includes(" - Day ") && !meal.image_url) {
                try {
                  const imgResp = await openai.images.generate({
                    model: "dall-e-3",
                    prompt: `Professional food photo of ${meal.name}, ${meal.cooking_method || "beautifully plated"}, restaurant quality, appetizing`,
                    n: 1,
                    size: "1024x1024",
                    quality: "standard",
                    style: "natural",
                  });
                  const imageUrl = imgResp.data?.[0]?.url;
                  if (imageUrl) {
                    await prisma.recommendedMeal.update({
                      where: { meal_id: meal.meal_id },
                      data: { image_url: imageUrl },
                    });
                  }
                } catch {
                  // Image generation is optional
                }
              }
            }

            console.log(`✅ Background processing complete for menu: ${menuId}`);
          } catch (bgError) {
            console.error(`❌ Background AI enhancement failed for menu ${menuId}:`, bgError);
            await clearPlaceholderState(menuId, savedMealIds).catch(() => {});
          }
        });
      } else {
        console.warn(`⚠️ No OpenAI API key - clearing placeholder state for menu ${menuId}`);
        await clearPlaceholderState(menuId, savedMealIds);
      }
    } catch (error) {
      console.error("💥 Error generating menu with ingredients:", error);

      // Extract user-friendly error message
      let userMessage = "Failed to generate menu. Please try again.";

      if (errorMessageIncludes(error, "ingredients are appropriate")) {
        userMessage = getErrorMessage(error);
      } else if (
        errorMessageIncludes(error, "No JSON") ||
        errorMessageIncludes(error, "Failed to parse")
      ) {
        userMessage =
          "Could not create menu with these ingredients. Please try using common food items with English or Hebrew names.";
      } else if (errorMessageIncludes(error, "AI service")) {
        userMessage =
          "AI service is temporarily unavailable. Please try again later.";
      } else {
        userMessage = getErrorMessage(error);
      }

      res.status(500).json({
        success: false,
        error: userMessage,
        details:
          process.env.NODE_ENV === "development"
            ? getErrorMessage(error)
            : undefined,
      });
    }
  },
);

// Get meal plan with progress (ingredient checks)
router.get(
  "/:planId/with-progress",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.user_id;
      const { planId } = req.params;

      // Get the menu with all meals and ingredients
      const menu = await prisma.recommendedMenu.findUnique({
        where: {
          menu_id: planId,
          user_id: userId,
        },
        include: {
          meals: {
            include: {
              ingredients: true,
            },
            orderBy: [{ day_number: "asc" }, { meal_type: "asc" }],
          },
        },
      });

      if (!menu) {
        return res.status(404).json({
          success: false,
          error: "Menu not found",
        });
      }

      // Auto-fix: If menu is active but has no start_date, set it to today
      if (menu.is_active && !menu.start_date) {
        const fixedStartDate = new Date();
        fixedStartDate.setHours(0, 0, 0, 0);
        const fixedEndDate = new Date(fixedStartDate);
        fixedEndDate.setDate(fixedEndDate.getDate() + menu.days_count - 1);
        fixedEndDate.setHours(23, 59, 59, 999);

        await prisma.recommendedMenu.update({
          where: { menu_id: planId },
          data: {
            start_date: fixedStartDate,
            end_date: fixedEndDate,
          },
        });

        // Update local reference
        menu.start_date = fixedStartDate;
        menu.end_date = fixedEndDate;
        console.log(`🔧 Auto-fixed missing start_date for menu ${planId}`);
      }

      // Get all ingredient checks for this user's menu
      const mealIds = menu.meals.map((m) => m.meal_id);
      const ingredientChecks = await prisma.ingredientCheck.findMany({
        where: {
          user_id: userId,
          meal_id: { in: mealIds },
        },
      });

      // Transform data to match frontend expectations
      const daysMap = new Map<number, any>();

      // Check if menu was created recently (within 10 minutes) - only show generating state for recent menus
      const menuAge = Date.now() - new Date(menu.created_at).getTime();
      const isRecentMenu = menuAge < 10 * 60 * 1000; // 10 minutes

      // Normalize dates to noon UTC for consistent cross-timezone date calculations
      const baseStartDate = menu.start_date
        ? new Date(menu.start_date)
        : new Date();
      // Normalize to noon UTC of the same date to avoid timezone shift
      baseStartDate.setUTCHours(12, 0, 0, 0);

      const nowLocal = new Date();
      const today = new Date(Date.UTC(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate(), 12, 0, 0, 0));

      console.log("📅 Date calculation for menu:", {
        menu_id: planId,
        raw_start_date: menu.start_date?.toISOString(),
        normalized_start_date: baseStartDate.toISOString(),
        today_utc: today.toISOString(),
        days_count: menu.days_count,
      });

      menu.meals.forEach((meal) => {
        const dayNumber = meal.day_number;

        if (!daysMap.has(dayNumber)) {
          // Calculate date for this day (add days to normalized start date, keep noon UTC)
          const dayDate = new Date(baseStartDate);
          dayDate.setUTCDate(baseStartDate.getUTCDate() + dayNumber - 1);
          dayDate.setUTCHours(12, 0, 0, 0);

          const isToday = dayDate.getTime() === today.getTime();

          console.log(`  Day ${dayNumber}: ${dayDate.toISOString().split('T')[0]} ${isToday ? '(TODAY)' : ''}`);

          daysMap.set(dayNumber, {
            day: dayNumber,
            date: dayDate.toISOString(),
            meals: [],
          });
        }

        // Only mark as generating if menu is recent AND meal looks like a placeholder
        const isPlaceholder = isRecentMenu && meal.cooking_method === "Preparing...";

        daysMap.get(dayNumber).meals.push({
          meal_id: meal.meal_id,
          meal_type: meal.meal_type,
          name: meal.name,
          description: meal.name,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          ingredients: meal.ingredients.map((ing) => ({
            ingredient_id: ing.ingredient_id,
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            category: ing.category,
            estimated_cost: ing.estimated_cost,
          })),
          instructions: meal.instructions || "",
          image_url: meal.image_url,
          dietary_tags: meal.dietary_tags || [],
          cooking_method: meal.cooking_method || null,
          is_completed: meal.is_completed || false,
          completed_at: meal.completed_at || null,
          is_generating: isPlaceholder,
        });
      });

      // Calculate daily calorie target from total
      const dailyCalorieTarget = menu.days_count > 0
        ? Math.round(menu.total_calories / menu.days_count)
        : 2000;

      // Compute estimated cost from ingredients if menu-level cost is 0
      let menuEstimatedCost = menu.estimated_cost || 0;
      if (menuEstimatedCost === 0) {
        menuEstimatedCost = menu.meals.reduce((sum, meal) => {
          return sum + meal.ingredients.reduce((ingSum, ing) => ingSum + (ing.estimated_cost || 0), 0);
        }, 0);
      }

      const transformedData = {
        plan_id: menu.menu_id,
        name: menu.title,
        duration: menu.days_count,
        start_date: menu.start_date?.toISOString() || new Date().toISOString(),
        end_date: menu.end_date?.toISOString() || new Date().toISOString(),
        status: menu.is_active ? "active" : "completed",
        daily_calorie_target: dailyCalorieTarget,
        estimated_cost: menuEstimatedCost,
        days: Array.from(daysMap.values()),
        ingredient_checks: ingredientChecks,
        is_generating: isRecentMenu && menu.meals.some(m => m.cooking_method === "Preparing..."),
      };

      res.json({
        success: true,
        data: transformedData,
      });
    } catch (error) {
      console.error("Error fetching menu with progress:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch menu",
      });
    }
  },
);

// Toggle ingredient check
router.post(
  "/:planId/ingredients/:ingredientId/check",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.user_id;
      const { planId, ingredientId } = req.params;
      const { meal_id, checked } = req.body;

      if (!meal_id) {
        return res.status(400).json({
          success: false,
          error: "meal_id is required",
        });
      }

      // Upsert ingredient check
      const ingredientCheck = await prisma.ingredientCheck.upsert({
        where: {
          user_id_ingredient_id_meal_id: {
            user_id: userId,
            ingredient_id: ingredientId,
            meal_id: meal_id,
          },
        },
        update: {
          checked,
          checked_at: checked ? new Date() : null,
        },
        create: {
          user_id: userId,
          ingredient_id: ingredientId,
          meal_id: meal_id,
          checked,
          checked_at: checked ? new Date() : null,
        },
      });

      res.json({
        success: true,
        data: ingredientCheck,
      });
    } catch (error) {
      console.error("Error updating ingredient check:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update ingredient check",
      });
    }
  },
);

// Submit menu review
router.post(
  "/:planId/review",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.user_id;
      const { planId } = req.params;
      const { type, rating, feedback, reason } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          error: "Rating must be between 1 and 5",
        });
      }

      if (!type || !["completed", "failed"].includes(type)) {
        return res.status(400).json({
          success: false,
          error: "Type must be 'completed' or 'failed'",
        });
      }

      // Create review
      const review = await prisma.menuReview.create({
        data: {
          menu_id: planId,
          user_id: userId,
          type,
          rating,
          feedback: feedback || null,
          reason: reason || null,
        },
      });

      // Update menu status
      await prisma.recommendedMenu.update({
        where: {
          menu_id: planId,
        },
        data: {
          is_active: false,
        },
      });

      // BUGFIX: Also clear user's active_menu_id to keep in sync
      // This prevents the bug where app shows menu as "active" but is_active = false
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { active_menu_id: true },
      });

      if (user?.active_menu_id === planId) {
        await prisma.user.update({
          where: { user_id: userId },
          data: { active_menu_id: null },
        });
        console.log("✅ Cleared user's active_menu_id after menu completion");
      }

      res.json({
        success: true,
        data: review,
      });
    } catch (error) {
      console.error("Error submitting review:", error);
      res.status(500).json({
        success: false,
        error: "Failed to submit review",
      });
    }
  },
);

// PUT /api/recommended-menus/:menuId - Edit menu metadata
router.put(
  "/:menuId",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.user_id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { menuId } = req.params;
      const { title, description, dietary_category } = req.body;

      const menu = await prisma.recommendedMenu.findFirst({
        where: { menu_id: menuId, user_id: userId },
      });

      if (!menu) {
        return res.status(404).json({ success: false, error: "Menu not found" });
      }

      const updated = await prisma.recommendedMenu.update({
        where: { menu_id: menuId },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(dietary_category !== undefined && { dietary_category }),
        },
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      console.error("Error updating menu:", error);
      res.status(500).json({ success: false, error: "Failed to update menu" });
    }
  }
);

// PUT /api/recommended-menus/:menuId/meals/:mealId - Edit individual meal
router.put(
  "/:menuId/meals/:mealId",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.user_id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { menuId, mealId } = req.params;
      const { name, calories, protein, carbs, fat, instructions, ingredients } = req.body;

      // Verify meal belongs to user's menu
      const meal = await prisma.recommendedMeal.findFirst({
        where: {
          meal_id: mealId,
          menu: { menu_id: menuId, user_id: userId },
        },
      });

      if (!meal) {
        return res.status(404).json({ success: false, error: "Meal not found" });
      }

      const updated = await prisma.recommendedMeal.update({
        where: { meal_id: mealId },
        data: {
          ...(name !== undefined && { name }),
          ...(calories !== undefined && { calories: parseFloat(calories) }),
          ...(protein !== undefined && { protein: parseFloat(protein) }),
          ...(carbs !== undefined && { carbs: parseFloat(carbs) }),
          ...(fat !== undefined && { fat: parseFloat(fat) }),
          ...(instructions !== undefined && { instructions }),
        },
        include: { ingredients: true },
      });

      // Update ingredients if provided
      if (ingredients && Array.isArray(ingredients)) {
        // Delete existing ingredients
        await prisma.recommendedIngredient.deleteMany({
          where: { meal_id: mealId },
        });

        // Create new ingredients
        for (const ing of ingredients) {
          await prisma.recommendedIngredient.create({
            data: {
              meal_id: mealId,
              name: ing.name,
              quantity: parseFloat(ing.quantity) || 1,
              unit: ing.unit || "piece",
              category: ing.category || "Other",
              estimated_cost: parseFloat(ing.estimated_cost) || 0,
            },
          });
        }
      }

      // Re-fetch with ingredients
      const finalMeal = await prisma.recommendedMeal.findUnique({
        where: { meal_id: mealId },
        include: { ingredients: true },
      });

      res.json({ success: true, data: finalMeal });
    } catch (error) {
      console.error("Error updating meal:", error);
      res.status(500).json({ success: false, error: "Failed to update meal" });
    }
  }
);

// DELETE /api/recommended-menus/:menuId/meals/:mealId - Delete meal from menu
router.delete(
  "/:menuId/meals/:mealId",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.user_id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { menuId, mealId } = req.params;

      const meal = await prisma.recommendedMeal.findFirst({
        where: {
          meal_id: mealId,
          menu: { menu_id: menuId, user_id: userId },
        },
      });

      if (!meal) {
        return res.status(404).json({ success: false, error: "Meal not found" });
      }

      await prisma.recommendedMeal.delete({
        where: { meal_id: mealId },
      });

      res.json({ success: true, message: "Meal deleted successfully" });
    } catch (error) {
      console.error("Error deleting meal:", error);
      res.status(500).json({ success: false, error: "Failed to delete meal" });
    }
  }
);

// POST /api/recommended-menus/:menuId/meals - Add new meal to menu
router.post(
  "/:menuId/meals",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.user_id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { menuId } = req.params;
      const { name, meal_type, day_number, calories, protein, carbs, fat, instructions, ingredients } = req.body;

      // Verify menu belongs to user
      const menu = await prisma.recommendedMenu.findFirst({
        where: { menu_id: menuId, user_id: userId },
      });

      if (!menu) {
        return res.status(404).json({ success: false, error: "Menu not found" });
      }

      if (!name || !meal_type) {
        return res.status(400).json({ success: false, error: "Name and meal_type are required" });
      }

      const newMeal = await prisma.recommendedMeal.create({
        data: {
          menu_id: menuId,
          name,
          meal_type: meal_type.toUpperCase(),
          day_number: day_number || 1,
          calories: parseFloat(calories) || 0,
          protein: parseFloat(protein) || 0,
          carbs: parseFloat(carbs) || 0,
          fat: parseFloat(fat) || 0,
          instructions: instructions || null,
        },
      });

      // Add ingredients if provided
      if (ingredients && Array.isArray(ingredients)) {
        for (const ing of ingredients) {
          await prisma.recommendedIngredient.create({
            data: {
              meal_id: newMeal.meal_id,
              name: ing.name,
              quantity: parseFloat(ing.quantity) || 1,
              unit: ing.unit || "piece",
              category: ing.category || "Other",
              estimated_cost: parseFloat(ing.estimated_cost) || 0,
            },
          });
        }
      }

      const mealWithIngredients = await prisma.recommendedMeal.findUnique({
        where: { meal_id: newMeal.meal_id },
        include: { ingredients: true },
      });

      res.json({ success: true, data: mealWithIngredients });
    } catch (error) {
      console.error("Error adding meal:", error);
      res.status(500).json({ success: false, error: "Failed to add meal" });
    }
  }
);

// POST /api/recommended-menus/:menuId/stop - Stop/pause active menu
router.post(
  "/:menuId/stop",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.user_id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { menuId } = req.params;

      const menu = await prisma.recommendedMenu.findFirst({
        where: { menu_id: menuId, user_id: userId },
      });

      if (!menu) {
        return res.status(404).json({ success: false, error: "Menu not found" });
      }

      await prisma.recommendedMenu.update({
        where: { menu_id: menuId },
        data: { is_active: false },
      });

      // Clear user's active_menu_id
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { active_menu_id: true },
      });

      if (user?.active_menu_id === menuId) {
        await prisma.user.update({
          where: { user_id: userId },
          data: { active_menu_id: null },
        });
      }

      console.log(`✅ Menu ${menuId} stopped successfully`);

      res.json({ success: true, message: "Menu stopped successfully" });
    } catch (error) {
      console.error("Error stopping menu:", error);
      res.status(500).json({ success: false, error: "Failed to stop menu" });
    }
  }
);

// GET /api/recommended-menus/:menuId/today-meals - Get today's meals + completion status
router.get(
  "/:menuId/today-meals",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.user_id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { menuId } = req.params;

      const menu = await prisma.recommendedMenu.findFirst({
        where: { menu_id: menuId, user_id: userId },
        include: {
          meals: {
            include: { ingredients: true },
            orderBy: [{ day_number: "asc" }, { meal_type: "asc" }],
          },
        },
      });

      if (!menu) {
        return res.status(404).json({ success: false, error: "Menu not found" });
      }

      // Calculate today's day_number using noon UTC to avoid timezone shifts
      let dayNumber = 1;
      if (menu.start_date) {
        const startRaw = new Date(menu.start_date);
        const start = new Date(Date.UTC(startRaw.getUTCFullYear(), startRaw.getUTCMonth(), startRaw.getUTCDate(), 12, 0, 0, 0));
        const nowLocal = new Date();
        const today = new Date(Date.UTC(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate(), 12, 0, 0, 0));
        const diffDays = Math.round(
          (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        );
        dayNumber = Math.max(1, Math.min(diffDays + 1, menu.days_count));
      }

      // Get today's meals
      const todayMeals = menu.meals.filter((m) => m.day_number === dayNumber);

      // Get completions for today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const completions = await prisma.mealCompletion.findMany({
        where: {
          user_id: userId,
          menu_id: menuId,
          completed_date: { gte: todayStart, lte: todayEnd },
        },
      });

      const completedMealTypes = new Set(
        completions.map((c) => c.meal_type.toUpperCase())
      );

      const mealsWithStatus = todayMeals.map((meal) => ({
        ...meal,
        is_completed: meal.is_completed || completedMealTypes.has(meal.meal_type.toUpperCase()),
      }));

      const totalMealsToday = mealsWithStatus.length;
      const completedCount = mealsWithStatus.filter((m) => m.is_completed).length;

      res.json({
        success: true,
        data: {
          day_number: dayNumber,
          total_days: menu.days_count,
          meals: mealsWithStatus,
          total_meals_today: totalMealsToday,
          completed_meals_today: completedCount,
          menu_name: menu.title,
        },
      });
    } catch (error) {
      console.error("Error getting today's meals:", error);
      res.status(500).json({ success: false, error: "Failed to get today's meals" });
    }
  }
);

export default router;
