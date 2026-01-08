import { Router } from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { RecommendedMenuService } from "../services/recommendedMenu";
import { prisma } from "../lib/database";
import { Response } from "express";
import { $Enums } from "@prisma/client";
import { JsonValue } from "@prisma/client/runtime/library";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

const router = Router();

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
  }
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
              0
            ),
            sample_meals: menu.meals.slice(0, 2).map((meal) => ({
              meal_id: meal.meal_id,
              name: meal.name,
              meal_type: meal.meal_type,
              ingredients_count: meal.ingredients.length,
            })),
          })
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
  }
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
        "meals"
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

      if (error instanceof Error) {
        if (error.message.includes("questionnaire not found")) {
          errorMessage =
            "Please complete your questionnaire first before generating a custom menu";
          statusCode = 400;
        } else {
          errorMessage = error.message;
        }
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
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
          mealsPerDay
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
        "meals"
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

      if (error instanceof Error) {
        if (error.message.includes("questionnaire not found")) {
          errorMessage =
            "Please complete your questionnaire first before generating a menu";
          statusCode = 400;
        } else if (error.message.includes("budget")) {
          errorMessage = "Please set a daily food budget in your questionnaire";
          statusCode = 400;
        } else {
          errorMessage = error.message;
        }
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
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
      const { mealId, preferences } = req.body;

      const updatedMeal = await RecommendedMenuService.replaceMeal(
        userId,
        menuId,
        mealId,
        preferences
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
  }
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
        isFavorite
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
  }
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
        liked
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
  }
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
        menuId
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
  }
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
        menuId
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
  }
);

// POST /api/recommended-menus/:menuId/start-today - Start a recommended menu as today's plan
router.post(
  "/:menuId/start-today",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.user_id;
      const { menuId } = req.params;
      const feedback = req.body;

      console.log(
        "🚀 Starting recommended menu today:",
        menuId,
        "for user:",
        userId
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

      // Update user's active menu
      await prisma.user.update({
        where: { user_id: userId },
        data: {
          active_menu_id: menuId,
          active_meal_plan_id: null, // Clear any active meal plan
        },
      });

      console.log("✅ Menu started successfully");
      res.json({
        success: true,
        data: {
          plan_id: menuId,
          name: menu.title,
          start_date: new Date().toISOString(),
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
  }
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
  }
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
  }
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
        "✅ Input validation passed, generating comprehensive menu..."
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

      const menu = await RecommendedMenuService.generateCustomMenu(
        comprehensiveRequest
      );

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
        "meals"
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

      if (error instanceof Error) {
        if (error.message.includes("questionnaire not found")) {
          errorMessage =
            "Please complete your questionnaire first before generating a comprehensive menu";
          statusCode = 400;
        } else {
          errorMessage = error.message;
        }
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// POST /api/recommended-menus/:menuId/start-today - Create meal plan from menu and activate it
router.post(
  "/:menuId/start-today",
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
            menu.total_calories / menu.days_count
          ),
          target_protein_daily: Math.round(
            (menu.total_protein || 0) / menu.days_count
          ),
          target_carbs_daily: Math.round(
            (menu.total_carbs || 0) / menu.days_count
          ),
          target_fats_daily: Math.round(
            (menu.total_fat || 0) / menu.days_count
          ),
          start_date: new Date(),
          end_date: new Date(
            Date.now() + menu.days_count * 24 * 60 * 60 * 1000
          ),
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
        "🔄 Converting recommended meals to meal templates and schedules..."
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
            error
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
          (t) => t.name === meal.name && t.meal_timing === meal.meal_type
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
  }
);

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

      const { preferences, ingredients, user_ingredients } = req.body;

      if (
        !ingredients ||
        !Array.isArray(ingredients) ||
        ingredients.length === 0
      ) {
        return res.status(400).json({
          success: false,
          error: "At least one ingredient is required",
        });
      }

      console.log("🍽️ Generating menu with user ingredients:", {
        userId,
        ingredientCount: ingredients.length,
        preferences,
      });

      // Get user questionnaire for personalization
      const userQuestionnaire = await prisma.userQuestionnaire.findFirst({
        where: { user_id: userId },
        orderBy: { date_completed: "desc" },
      });

      // Detect language based on ingredients
      const hasHebrew = ingredients.some((ing: any) =>
        /[\u0590-\u05FF]/.test(ing.name)
      );
      const menuLanguage = hasHebrew ? "Hebrew" : "English";

      // Create enhanced prompt with user ingredients
      const ingredientsList = ingredients
        .map((ing: any) => `${ing.name} (${ing.quantity} ${ing.unit})`)
        .join(", ");

      const sanitizedDuration = Math.max(
        1,
        Math.min(30, parseInt(preferences.duration_days?.toString() || "7"))
      );

      const customName = preferences.custom_name?.trim() || null;

      const prompt = `You are a world-class chef and nutritionist. Create an exceptional ${sanitizedDuration}-day meal plan that showcases creative, delicious, and nutritious recipes.

🍽️ AVAILABLE INGREDIENTS:
${ingredientsList}

📋 USER PREFERENCES:
- Cuisine Style: ${preferences.cuisine} (embrace authentic flavors and traditional cooking methods)
- Dietary Requirements: ${preferences.dietary_restrictions.join(", ") || "None - No restrictions"}
- Meals per Day: ${preferences.meal_count} (balanced throughout the day)
- Cooking Difficulty: ${preferences.cooking_difficulty} (${preferences.cooking_difficulty === 'easy' ? 'simple, quick recipes' : preferences.cooking_difficulty === 'medium' ? 'moderately challenging' : 'complex, gourmet techniques'})
- Budget: ${preferences.budget_range} (${preferences.budget_range === 'budget' ? 'cost-effective ingredients' : preferences.budget_range === 'moderate' ? 'balanced quality and cost' : 'premium ingredients welcome'})
- Custom Name Request: ${customName || 'Create an appealing name'}

👤 USER PROFILE:
${userQuestionnaire ? `- Age: ${userQuestionnaire.age} years
- Primary Goal: ${userQuestionnaire.main_goal} (optimize nutrition for this goal)
- Activity Level: ${userQuestionnaire.physical_activity_level}
- Daily Cooking Time: ${userQuestionnaire.daily_cooking_time || '30 minutes'}
- Preferences: ${userQuestionnaire.liked_foods?.join(', ') || 'No specific preferences'}
- Dislikes: ${userQuestionnaire.disliked_foods?.join(', ') || 'None'}
- Allergies: ${userQuestionnaire.allergies?.join(', ') || 'None'}` : '- Standard nutrition requirements'}

🎯 LANGUAGE RULE:
Respond in ${menuLanguage} for ALL text (menu name, descriptions, instructions, ingredient names).

✨ RECIPE QUALITY STANDARDS:
1. CREATE RESTAURANT-QUALITY DISHES: Each meal should be exciting, flavorful, and memorable
2. MAXIMIZE INGREDIENT USE: Creatively incorporate the provided ingredients across multiple meals
3. BALANCE NUTRITION: Hit macro targets while ensuring variety and satisfaction
4. DETAILED INSTRUCTIONS: Step-by-step cooking guidance that anyone can follow
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
- Include estimated costs in local currency (₪)

📊 REQUIRED JSON FORMAT:
{
  "menu_name": "${customName || 'Creative 2-3 word name'}",
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
      "instructions": "Detailed step-by-step: 1. Prep ingredients... 2. Heat pan... 3. Cook... 4. Season... 5. Plate and serve. Include temperatures, cooking times, and pro tips.",
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

      if (!openai) {
        return res.status(503).json({
          success: false,
          error:
            "AI service is currently unavailable. Please add OPENAI_API_KEY to enable AI features.",
        });
      }

      // Optimize OpenAI call for speed and quality
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Fast and cost-effective
        messages: [
          {
            role: "system",
            content:
              "You are an award-winning chef and certified nutritionist specializing in personalized meal planning. You create restaurant-quality recipes with precise nutritional data and detailed cooking instructions. Always return valid JSON without any conversational text.",
          },
          { role: "user", content: prompt },
        ],
        max_completion_tokens: 16000,
        temperature: 0.7, // Slightly lower for more consistent, focused output
        response_format: { type: "json_object" }, // Force JSON output
      });

      const aiContent = response.choices[0]?.message?.content;
      if (!aiContent) {
        throw new Error("No response from AI");
      }

      console.log("🤖 Raw AI Response:", aiContent);

      // Check if AI returned a conversational error message (English and Hebrew)
      const conversationalIndicators = [
        "sorry",
        "cannot",
        "can't",
        "unable",
        "please provide",
        "doesn't have",
        "מצטער",
        "לא יכול",
        "לא מסוגל",
        "אנא",
        "בבקשה",
      ];

      const isConversational =
        conversationalIndicators.some((indicator) =>
          aiContent.toLowerCase().includes(indicator.toLowerCase())
        ) || !aiContent.includes("{");

      if (isConversational) {
        console.error("❌ AI returned conversational response:", aiContent);

        // Detect language for error message
        const hasHebrew = /[\u0590-\u05FF]/.test(aiContent);
        const errorMessage = hasHebrew
          ? "הבינה המלאכותית לא הצליחה ליצור תפריט עם הרכיבים שסופקו. אנא ודא שכל הרכיבים מתאימים להעדפות התזונה שלך ונסה שוב עם שמות רכיבים ברורים יותר."
          : "The AI couldn't create a menu with the provided ingredients. Please ensure all ingredients are appropriate for your dietary preferences and try again with clearer ingredient names.";

        throw new Error(errorMessage);
      }

      let parsedMenu;
      try {
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedMenu = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error(
            "Unable to generate menu. Please check your ingredient list and try again with common food items."
          );
        }
      } catch (parseError) {
        console.error("JSON parsing error:", parseError);
        throw new Error(
          "Failed to create menu. Please try again with different ingredients or simpler descriptions."
        );
      }

      // Validate parsed menu
      if (
        !parsedMenu.menu_name ||
        !parsedMenu.meals ||
        !Array.isArray(parsedMenu.meals)
      ) {
        throw new Error("Invalid menu structure from AI");
      }

      // Save menu to database - remove dietary_category field
      const savedMenu = await prisma.recommendedMenu.create({
        data: {
          user_id: userId,
          title: String(parsedMenu.menu_name || "Custom Menu"),
          description: String(parsedMenu.description || ""),
          total_calories: Math.max(
            0,
            parseInt(parsedMenu.total_calories?.toString() || "0")
          ),
          total_protein: Math.max(
            0,
            parseInt(parsedMenu.total_protein?.toString() || "0")
          ),
          total_carbs: Math.max(
            0,
            parseInt(parsedMenu.total_carbs?.toString() || "0")
          ),
          total_fat: Math.max(
            0,
            parseInt(parsedMenu.total_fat?.toString() || "0")
          ),
          days_count: Math.max(
            1,
            parseInt(
              parsedMenu.days_count?.toString() ||
                preferences.duration_days?.toString() ||
                "7"
            )
          ),
          estimated_cost: Math.max(
            0,
            parseFloat(parsedMenu.estimated_cost?.toString() || "0")
          ),
          prep_time_minutes: Math.max(
            10,
            Math.max(
              ...parsedMenu.meals.map((m: any) =>
                parseInt(m.prep_time_minutes?.toString() || "30")
              )
            )
          ),
          difficulty_level: Math.min(
            3,
            Math.max(
              1,
              preferences.cooking_difficulty === "easy"
                ? 1
                : preferences.cooking_difficulty === "hard"
                ? 3
                : 2
            )
          ),
        },
      });

      // Save meals with AI-generated images
      for (const meal of parsedMenu.meals) {
        // Generate meal image using DALL-E
        let imageUrl = null;
        try {
          if (openai) {
            console.log(`🎨 Generating image for meal: ${meal.name}`);
            const imagePrompt = `A professional food photography shot of ${meal.name}, ${meal.cooking_method || 'beautifully plated'}, restaurant quality, appetizing, high resolution, clean background, natural lighting`;

            const imageResponse = await openai.images.generate({
              model: "dall-e-3",
              prompt: imagePrompt,
              n: 1,
              size: "1024x1024",
              quality: "standard",
              style: "natural",
            });

            imageUrl = imageResponse.data[0]?.url || null;
            console.log(`✅ Image generated for ${meal.name}`);
          }
        } catch (imageError) {
          console.error(`⚠️ Failed to generate image for ${meal.name}:`, imageError);
          // Continue without image - not critical
        }

        const savedMeal = await prisma.recommendedMeal.create({
          data: {
            menu_id: savedMenu.menu_id,
            name: meal.name,
            meal_type: meal.meal_type,
            day_number: meal.day_number,
            calories: meal.calories || 0,
            protein: meal.protein || 0,
            carbs: meal.carbs || 0,
            fat: meal.fat || 0,
            prep_time_minutes: meal.prep_time_minutes || 30,
            cooking_method: meal.cooking_method || "",
            instructions: meal.instructions || "",
            image_url: imageUrl,
            language: menuLanguage,
          },
        });

        // Save ingredients
        if (meal.ingredients && Array.isArray(meal.ingredients)) {
          for (const ingredient of meal.ingredients) {
            await prisma.recommendedIngredient.create({
              data: {
                meal_id: savedMeal.meal_id,
                name: ingredient.name,
                quantity: ingredient.quantity || 1,
                unit: ingredient.unit || "piece",
                category: ingredient.category || "Other",
                estimated_cost: ingredient.estimated_cost || 0,
              },
            });
          }
        }
      }

      res.json({
        success: true,
        data: {
          menu_id: savedMenu.menu_id,
          ...parsedMenu,
        },
        message: "Menu generated successfully with your ingredients!",
      });
    } catch (error) {
      console.error("💥 Error generating menu with ingredients:", error);

      // Extract user-friendly error message
      let userMessage = "Failed to generate menu. Please try again.";

      if (error instanceof Error) {
        if (error.message.includes("ingredients are appropriate")) {
          userMessage = error.message;
        } else if (
          error.message.includes("No JSON") ||
          error.message.includes("Failed to parse")
        ) {
          userMessage =
            "Could not create menu with these ingredients. Please try using common food items with English or Hebrew names.";
        } else if (error.message.includes("AI service")) {
          userMessage =
            "AI service is temporarily unavailable. Please try again later.";
        } else {
          userMessage = error.message;
        }
      }

      res.status(500).json({
        success: false,
        error: userMessage,
        details:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.stack
            : undefined,
      });
    }
  }
);

// Get meal plan with progress (ingredient checks)
router.get(
  "/:planId/with-progress",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
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

      menu.meals.forEach((meal) => {
        const dayNumber = meal.day_number;

        if (!daysMap.has(dayNumber)) {
          // Calculate date for this day
          const startDate = menu.start_date
            ? new Date(menu.start_date)
            : new Date();
          const dayDate = new Date(startDate);
          dayDate.setDate(startDate.getDate() + dayNumber - 1);

          daysMap.set(dayNumber, {
            day: dayNumber,
            date: dayDate.toISOString(),
            meals: [],
          });
        }

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
            quantity: `${ing.quantity} ${ing.unit}`,
          })),
          instructions: meal.instructions || "",
          image_url: meal.image_url,
        });
      });

      const transformedData = {
        plan_id: menu.menu_id,
        name: menu.title,
        duration: menu.days_count,
        start_date: menu.start_date?.toISOString() || new Date().toISOString(),
        end_date: menu.end_date?.toISOString() || new Date().toISOString(),
        status: menu.is_active ? "active" : "completed",
        days: Array.from(daysMap.values()),
        ingredient_checks: ingredientChecks,
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
  }
);

// Toggle ingredient check
router.post(
  "/:planId/ingredients/:ingredientId/check",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
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
  }
);

// Submit menu review
router.post(
  "/:planId/review",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
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
  }
);

export default router;
