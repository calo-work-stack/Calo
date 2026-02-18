import { Router, Response, Request } from "express"; // Import Request and Response types
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/database";
import { MealPlanService } from "../services/mealPlans";
import { MealTiming } from "@prisma/client";

const router = Router();

// Get user's meal plans (for recommended menus tab)
router.get("/recommended", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.user_id;

    const userMealPlans = await prisma.userMealPlan.findMany({
      where: { user_id: userId },
      include: {
        schedules: {
          include: {
            template: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
      take: 10,
    });

    // Transform to match expected format
    const formattedPlans = userMealPlans.map((plan) => ({
      menu_id: plan.plan_id,
      title: plan.name,
      description: `${plan.meals_per_day} meals per day plan`,
      total_calories: plan.target_calories_daily || 2000,
      total_protein: plan.target_protein_daily || 150,
      total_carbs: plan.target_carbs_daily || 200,
      total_fat: plan.target_fats_daily || 67,
      days_count: plan.rotation_frequency_days,
      dietary_category: "BALANCED",
      is_active: plan.is_active,
      created_at: plan.created_at,
      meals: plan.schedules.map((schedule) => ({
        meal_id: schedule.template.template_id,
        name: schedule.template.name,
        meal_type: schedule.meal_timing,
        day_number: schedule.day_of_week + 1,
        calories: schedule.template.calories || 0,
        protein: schedule.template.protein_g || 0,
        carbs: schedule.template.carbs_g || 0,
        fat: schedule.template.fats_g || 0,
        prep_time_minutes: schedule.template.prep_time_minutes,
        cooking_method: "Mixed",
        instructions: schedule.template.description,
        ingredients: [],
      })),
    }));

    res.json({
      success: true,
      data: formattedPlans,
      hasMenus: formattedPlans.length > 0,
    });
  } catch (error) {
    console.error("Get recommended menus error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch recommended menus",
    });
  }
});

// Get specific recommended menu details
router.get(
  "/recommended/:menuId",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user.user_id;
      const { menuId } = req.params;

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

      res.json({
        success: true,
        data: menu,
      });
    } catch (error) {
      console.error("Get recommended menu details error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch menu details",
      });
    }
  }
);

// Generate new recommended menu
router.post(
  "/recommended/generate",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user.user_id;

      // Get user's questionnaire and nutrition plan
      const [questionnaire, nutritionPlan] = await Promise.all([
        prisma.userQuestionnaire.findFirst({
          where: { user_id: userId },
          orderBy: { date_completed: "desc" },
        }),
        prisma.nutritionPlan.findFirst({
          where: { user_id: userId },
          orderBy: { created_at: "desc" },
        }),
      ]);

      if (!questionnaire) {
        return res.status(400).json({
          success: false,
          error:
            "User questionnaire not found. Please complete the questionnaire first.",
        });
      }

      // Function to calculate default calories based on questionnaire data
      const calculateDefaultCalories = (questionnaire: any) => {
        let bmr = 0;

        // Harris-Benedict equation for BMR calculation
        if (questionnaire.sex === "male") {
          bmr =
            88.362 +
            13.397 * questionnaire.current_weight_kg +
            4.799 * questionnaire.height_cm -
            5.677 * questionnaire.age_years;
        } else {
          bmr =
            447.593 +
            9.247 * questionnaire.current_weight_kg +
            3.098 * questionnaire.height_cm -
            4.33 * questionnaire.age_years;
        }

        // Adjust BMR based on activity level
        let activityFactor = 1.2; // Sedentary
        if (questionnaire.activity_level === "lightly_active") {
          activityFactor = 1.375;
        } else if (questionnaire.activity_level === "moderately_active") {
          activityFactor = 1.55;
        } else if (questionnaire.activity_level === "very_active") {
          activityFactor = 1.725;
        } else if (questionnaire.activity_level === "extra_active") {
          activityFactor = 1.9;
        }

        let maintenanceCalories = bmr * activityFactor;

        // Adjust calories based on the main goal
        if (questionnaire.main_goal === "lose_weight") {
          maintenanceCalories -= 500; // Create a deficit of 500 calories
        } else if (questionnaire.main_goal === "gain_muscle") {
          maintenanceCalories += 250; // Add a surplus of 250 calories
        }

        return Math.round(maintenanceCalories);
      };

      // Create default nutrition plan if none exists
      let userNutritionPlan = nutritionPlan;
      if (!userNutritionPlan) {
        console.log(
          "⚠️ No nutrition plan found, creating default based on questionnaire"
        );

        // Calculate basic nutrition needs from questionnaire
        const defaultCalories = calculateDefaultCalories(questionnaire);
        const defaultProtein = Math.round((defaultCalories * 0.3) / 4); // 30% of calories from protein
        const defaultCarbs = Math.round((defaultCalories * 0.4) / 4); // 40% from carbs
        const defaultFats = Math.round((defaultCalories * 0.3) / 9); // 30% from fats

        userNutritionPlan = await prisma.nutritionPlan.create({
          data: {
            user_id: userId,
            goal_calories: defaultCalories,
            goal_protein_g: defaultProtein,
            goal_carbs_g: defaultCarbs,
            goal_fats_g: defaultFats,
            target_weight_kg: questionnaire.target_weight_kg,
            duration_days: questionnaire.goal_timeframe_days || 90,
            notes: "Auto-generated based on questionnaire data",
          },
        });
      }

      // Create a new recommended menu
      const menu = await prisma.recommendedMenu.create({
        data: {
          user_id: userId,
          title: `Personalized Menu - ${new Date().toLocaleDateString()}`,
          description: `Based on your ${questionnaire.main_goal} goal`,
          total_calories: userNutritionPlan.goal_calories || 2000,
          total_protein: userNutritionPlan.goal_protein_g || 150,
          total_carbs: userNutritionPlan.goal_carbs_g || 200,
          total_fat: userNutritionPlan.goal_fats_g || 70,
          created_at: new Date(),
        },
      });

      // Generate sample meals based on user preferences
      const sampleMeals = [
        {
          menu_id: menu.menu_id,
          name: "Protein Breakfast",
          meal_type: MealTiming.BREAKFAST,
          calories: Math.round(
            (userNutritionPlan.goal_calories || 2000) * 0.25
          ),
          protein: Math.round((userNutritionPlan.goal_protein_g || 150) * 0.3),
          carbs: Math.round((userNutritionPlan.goal_carbs_g || 200) * 0.2),
          fat: Math.round((userNutritionPlan.goal_fats_g || 70) * 0.25),
        },
        {
          menu_id: menu.menu_id,
          name: "Balanced Lunch",
          meal_type: MealTiming.LUNCH,
          calories: Math.round(
            (userNutritionPlan.goal_calories || 2000) * 0.35
          ),
          protein: Math.round((userNutritionPlan.goal_protein_g || 150) * 0.4),
          carbs: Math.round((userNutritionPlan.goal_carbs_g || 200) * 0.4),
          fat: Math.round((userNutritionPlan.goal_fats_g || 70) * 0.35),
        },
        {
          menu_id: menu.menu_id,
          name: "Light Dinner",
          meal_type: MealTiming.DINNER,
          calories: Math.round((userNutritionPlan.goal_calories || 2000) * 0.3),
          protein: Math.round((userNutritionPlan.goal_protein_g || 150) * 0.25),
          carbs: Math.round((userNutritionPlan.goal_carbs_g || 200) * 0.3),
          fat: Math.round((userNutritionPlan.goal_fats_g || 70) * 0.3),
        },
      ];

      await prisma.recommendedMeal.createMany({
        data: sampleMeals,
      });

      // Fetch the complete menu with meals
      const completeMenu = await prisma.recommendedMenu.findUnique({
        where: { menu_id: menu.menu_id },
        include: {
          meals: {
            include: {
              ingredients: true,
            },
          },
        },
      });

      res.json({
        success: true,
        menu: completeMenu,
      });
    } catch (error) {
      console.error("Generate recommended menu error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to generate recommended menu",
      });
    }
  }
);

// Current/active meal plan
router.get("/current", authenticateToken, async (req: AuthRequest, res) => {
  try {
    console.log("📋 Getting current meal plan for user:", req.user?.user_id);

    const user_id = req.user?.user_id;
    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    // Get user's active plan/menu IDs
    const user = await prisma.user.findUnique({
      where: { user_id },
      select: {
        active_meal_plan_id: true,
        active_menu_id: true,
      },
    });

    let weeklyPlan: any = {};
    let planId: string | null = null;
    let planName: string | null = null;
    let hasActivePlan = false;
    let startDate: Date = new Date();
    let daysCount: number = 7;
    let planData: any = null;

    // First try to get active meal plan
    if (user?.active_meal_plan_id) {
      console.log("🔍 Checking active meal plan:", user.active_meal_plan_id);

      const activeMealPlan = await prisma.userMealPlan.findFirst({
        where: {
          plan_id: user.active_meal_plan_id,
          user_id: user_id,
        },
        include: {
          schedules: {
            include: {
              template: true,
            },
            orderBy: [{ day_of_week: "asc" }, { meal_timing: "asc" }],
          },
        },
      });

      if (activeMealPlan && activeMealPlan.schedules?.length > 0) {
        console.log(
          "✅ Active meal plan found with",
          activeMealPlan.schedules.length,
          "meals"
        );

        const dayNames = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];

        weeklyPlan = {};
        activeMealPlan.schedules.forEach((schedule) => {
          const dayName = dayNames[schedule.day_of_week];
          const timing = schedule.meal_timing;

          if (!weeklyPlan[dayName]) {
            weeklyPlan[dayName] = {};
          }
          if (!weeklyPlan[dayName][timing]) {
            weeklyPlan[dayName][timing] = [];
          }

          weeklyPlan[dayName][timing].push({
            template_id: schedule.template.template_id,
            name: schedule.template.name,
            description: schedule.template.description,
            meal_timing: timing,
            dietary_category: schedule.template.dietary_category,
            prep_time_minutes: schedule.template.prep_time_minutes,
            difficulty_level: schedule.template.difficulty_level,
            calories: schedule.template.calories,
            protein_g: schedule.template.protein_g,
            carbs_g: schedule.template.carbs_g,
            fats_g: schedule.template.fats_g,
            fiber_g: schedule.template.fiber_g,
            sugar_g: schedule.template.sugar_g,
            sodium_mg: schedule.template.sodium_mg,
            ingredients: schedule.template.ingredients_json,
            instructions: schedule.template.instructions_json,
            allergens: schedule.template.allergens_json,
            image_url: schedule.template.image_url,
            user_rating: 0,
            user_comments: "",
            is_favorite: false,
          });
        });

        planId = activeMealPlan.plan_id;
        planName = activeMealPlan.name;
        startDate = activeMealPlan.start_date ?? new Date();
        daysCount = activeMealPlan.rotation_frequency_days;
        hasActivePlan = true;

        const daysDiff = Math.floor(
          (new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        planData = {
          plan_id: activeMealPlan.plan_id,
          name: activeMealPlan.name,
          plan_type: activeMealPlan.plan_type,
          meals_per_day: activeMealPlan.meals_per_day,
          snacks_per_day: activeMealPlan.snacks_per_day,
          rotation_frequency_days: activeMealPlan.rotation_frequency_days,
          target_calories_daily: activeMealPlan.target_calories_daily,
          target_protein_daily: activeMealPlan.target_protein_daily,
          target_carbs_daily: activeMealPlan.target_carbs_daily,
          target_fats_daily: activeMealPlan.target_fats_daily,
          start_date: activeMealPlan.start_date,
          end_date: activeMealPlan.end_date,
          is_active: activeMealPlan.is_active,
          current_day: (daysDiff % activeMealPlan.rotation_frequency_days) + 1,
          progress_percentage: Math.round(
            (daysDiff / activeMealPlan.rotation_frequency_days) * 100
          ),
          weekly_plan: weeklyPlan,
        };
      } else {
        console.log("🧹 Cleaning up invalid meal plan reference");
        await prisma.user.update({
          where: { user_id },
          data: { active_meal_plan_id: null },
        });
      }
    }

    // If no meal plan, check for recommended menu
    if (!hasActivePlan && user?.active_menu_id) {
      console.log("🔍 Checking active recommended menu:", user.active_menu_id);

      const recommendedMenu = await prisma.recommendedMenu.findFirst({
        where: {
          menu_id: user.active_menu_id,
          user_id: user_id,
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

      // BUGFIX: Validate that the menu is actually active (is_active = true)
      // This prevents showing a "completed" menu as active due to stale active_menu_id
      if (recommendedMenu && !recommendedMenu.is_active) {
        console.log(
          "⚠️ Found menu but is_active = false, cleaning up stale active_menu_id"
        );
        // Clean up the stale reference
        await prisma.user.update({
          where: { user_id: user_id },
          data: { active_menu_id: null },
        });
        // Don't show this menu as active
      } else if (recommendedMenu && recommendedMenu.meals?.length > 0) {
        console.log(
          "✅ Active recommended menu found with",
          recommendedMenu.meals.length,
          "meals"
        );

        const dayNames = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];

        weeklyPlan = {};
        recommendedMenu.meals.forEach((meal) => {
          const dayName = dayNames[(meal.day_number - 1) % 7];
          const timing = meal.meal_type;

          if (!weeklyPlan[dayName]) {
            weeklyPlan[dayName] = {};
          }
          if (!weeklyPlan[dayName][timing]) {
            weeklyPlan[dayName][timing] = [];
          }

          weeklyPlan[dayName][timing].push({
            template_id: meal.meal_id,
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

        planId = user.active_menu_id;
        planName = recommendedMenu.title;
        // Use actual start_date from the menu, or fallback to now
        startDate = recommendedMenu.start_date ? new Date(recommendedMenu.start_date) : new Date();
        daysCount = recommendedMenu.days_count || 7;
        hasActivePlan = true;

        // Calculate current day based on start_date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDateNormalized = new Date(startDate);
        startDateNormalized.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor(
          (today.getTime() - startDateNormalized.getTime()) / (1000 * 60 * 60 * 24)
        );
        const currentDay = Math.max(1, Math.min(daysDiff + 1, daysCount));
        const progressPercentage = Math.round((currentDay / daysCount) * 100);

        const mealsPerDay =
          Object.values(weeklyPlan).reduce((count: number, day: any) => {
            return (
              count +
              Object.values(day).reduce(
                (dayCount: number, meals: any) =>
                  dayCount + (Array.isArray(meals) ? meals.length : 0),
                0
              )
            );
          }, 0) / Object.keys(weeklyPlan).length;

        planData = {
          plan_id: user.active_menu_id,
          name: recommendedMenu.title,
          plan_type: "RECOMMENDED",
          meals_per_day: Math.round(mealsPerDay),
          snacks_per_day: 0,
          rotation_frequency_days: daysCount,
          target_calories_daily: Math.round(recommendedMenu.total_calories / daysCount),
          target_protein_daily: Math.round(
            (recommendedMenu.total_protein || 0) / daysCount
          ),
          target_carbs_daily: Math.round(
            (recommendedMenu.total_carbs || 0) / daysCount
          ),
          target_fats_daily: Math.round((recommendedMenu.total_fat || 0) / daysCount),
          start_date: startDate.toISOString(),
          end_date: recommendedMenu.end_date?.toISOString() || null,
          is_active: true,
          current_day: currentDay,
          progress_percentage: progressPercentage,
          weekly_plan: weeklyPlan,
        };
      } else {
        console.log("🧹 Cleaning up invalid menu reference");
        await prisma.user.update({
          where: { user_id },
          data: { active_menu_id: null },
        });
      }
    }

    const totalMeals = Object.values(weeklyPlan).reduce(
      (total: number, dayMeals: any) => {
        return (
          total +
          Object.values(dayMeals).reduce(
            (dayTotal: number, mealTimings: any) => {
              return (
                dayTotal + (Array.isArray(mealTimings) ? mealTimings.length : 0)
              );
            },
            0
          )
        );
      },
      0
    );

    console.log("📋 Final check: hasActivePlan =", hasActivePlan);
    console.log("📋 Plan ID:", planId);
    console.log("📋 Total meals:", totalMeals);
    console.log("📋 Weekly plan structure:", Object.keys(weeklyPlan));

    if (hasActivePlan && planData && totalMeals > 0) {
      // Include menu_id for the /with-progress endpoint (uses RecommendedMenu.menu_id)
      const menuId = user?.active_menu_id || planData.plan_id;

      res.json({
        success: true,
        hasActivePlan: true,
        planId: menuId, // Use menu_id for /with-progress endpoint
        menuId: menuId, // Explicit menu_id
        planName: planData.name,
        start_date: planData.start_date,
        end_date: planData.end_date,
        days_count: planData.rotation_frequency_days,
        target_calories_daily: planData.target_calories_daily,
        target_protein_daily: planData.target_protein_daily,
        target_carbs_daily: planData.target_carbs_daily,
        target_fats_daily: planData.target_fats_daily,
        data: {
          ...planData,
          weekly_plan: planData.weekly_plan,
        },
        current_day: planData.current_day,
        progress_percentage: planData.progress_percentage,
      });
    } else {
      console.log("⚠️ No active plan data found");
      res.json({
        success: true,
        hasActivePlan: false,
        data: null,
      });
    }
  } catch (error) {
    console.error("💥 Error getting current meal plan:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get current meal plan",
    });
  }
});

// Create comprehensive menu
router.post(
  "/create-comprehensive",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      console.log(
        "🎨 Creating comprehensive menu for user:",
        req.user?.user_id
      );
      console.log("📝 Config:", req.body);

      const user_id = req.user?.user_id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const {
        menuName,
        days,
        mealsPerDay,
        dietaryPreferences,
        excludedIngredients,
        includedIngredients,
        cuisineTypes,
        cookingMethods,
        budget,
        targetCalories,
        proteinGoal,
        carbGoal,
        fatGoal,
        specialRequests,
      } = req.body;

      // Validate required fields
      if (!menuName || !days || !mealsPerDay) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: menuName, days, mealsPerDay",
        });
      }

      // Create comprehensive menu using MealPlanService
      const config = {
        name: menuName,
        plan_type: "WEEKLY" as const,
        meals_per_day: parseInt(mealsPerDay) || 3,
        snacks_per_day: 0,
        rotation_frequency_days: parseInt(days) || 7,
        include_leftovers: false,
        fixed_meal_times: true,
        dietary_preferences: dietaryPreferences || [],
        excluded_ingredients: excludedIngredients || [],
      };

      const mealPlan = await MealPlanService.createUserMealPlan(
        user_id,
        config
      );

      // Update user's active meal plan
      await prisma.user.update({
        where: { user_id },
        data: {
          active_meal_plan_id: mealPlan.plan_id,
          active_menu_id: mealPlan.plan_id,
        },
      });

      console.log("✅ Comprehensive menu created successfully");
      res.json({
        success: true,
        data: mealPlan,
        message: "Comprehensive menu created successfully",
      });
    } catch (error) {
      console.error("💥 Error creating comprehensive menu:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create comprehensive menu",
      });
    }
  }
);

// Activate a menu as the current active menu
router.post(
  "/:planId/activate",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      console.log("🔄 Activating menu:", req.params.planId);

      const user_id = req.user?.user_id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const { planId } = req.params;

      // Verify the plan exists and belongs to the user
      const mealPlan = await prisma.userMealPlan.findFirst({
        where: {
          plan_id: planId,
          user_id: user_id,
        },
      });

      if (!mealPlan) {
        return res.status(404).json({
          success: false,
          error: "Meal plan not found",
        });
      }

      // Deactivate all other plans for this user
      await prisma.userMealPlan.updateMany({
        where: { user_id },
        data: { is_active: false },
      });

      // Activate the selected plan
      await prisma.userMealPlan.update({
        where: { plan_id: planId },
        data: { is_active: true },
      });

      // Update user's active meal plan reference
      await prisma.user.update({
        where: { user_id },
        data: {
          active_meal_plan_id: planId,
          active_menu_id: planId,
        },
      });

      console.log("✅ Menu activated successfully");
      res.json({
        success: true,
        message: "Menu activated successfully",
        planId,
      });
    } catch (error) {
      console.error("💥 Error activating menu:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to activate menu",
      });
    }
  }
);

// Get user's active menu status
router.get(
  "/active-status",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const user_id = req.user?.user_id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const user = await prisma.user.findUnique({
        where: { user_id },
        select: {
          active_meal_plan_id: true,
          active_menu_id: true,
        },
      });

      res.json({
        success: true,
        hasActiveMenu: !!(user?.active_meal_plan_id || user?.active_menu_id),
        activePlanId: user?.active_meal_plan_id,
        activeMenuId: user?.active_menu_id,
      });
    } catch (error) {
      console.error("💥 Error getting active menu status:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get active menu status",
      });
    }
  }
);

// Swap meal endpoint
router.post(
  "/:planId/swap-meal",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const user_id = req.user?.user_id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const { planId } = req.params;
      const { currentMeal, dayName, mealTiming, preferences } = req.body;

      console.log("🔄 Swap meal request:", {
        planId,
        currentMeal: currentMeal?.name || currentMeal?.template_id,
        dayName,
        mealTiming,
        preferences,
      });

      // Convert day name to number
      const dayMap: { [key: string]: number } = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };

      const dayOfWeek = dayMap[dayName.toLowerCase()] ?? 0;

      const result = await MealPlanService.replaceMealInPlan(
        user_id,
        planId,
        dayOfWeek,
        mealTiming,
        0,
        {
          ...preferences,
          current_meal_context: currentMeal,
        }
      );

      res.json({
        success: true,
        data: result.data,
        message: "Meal swapped successfully",
      });
    } catch (error) {
      console.error("💥 Error swapping meal:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to swap meal",
      });
    }
  }
);

// Create new meal plan
router.post("/create", authenticateToken, async (req: AuthRequest, res) => {
  try {
    console.log("🤖 Creating meal plan for user:", req.user?.user_id);
    console.log("📝 Config:", req.body);

    const user_id = req.user?.user_id;
    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    const config = req.body;

    // Validate required fields
    if (!config.name || !config.plan_type || !config.meals_per_day) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name, plan_type, meals_per_day",
      });
    }

    const mealPlan = await MealPlanService.createUserMealPlan(user_id, config);

    console.log("✅ Meal plan created successfully");
    res.json({
      success: true,
      data: mealPlan,
      message: "Meal plan created successfully",
    });
  } catch (error) {
    console.error("💥 Error creating meal plan:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create meal plan",
    });
  }
});
// Replace meal in plan
router.put(
  "/:planId/replace",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      console.log("🔄 Replacing meal in plan:", req.params.planId);

      const user_id = req.user?.user_id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const { planId } = req.params;
      const {
        day_of_week,
        meal_timing,
        meal_order = 0,
        preferences = {},
      } = req.body;

      // Validate required fields
      if (day_of_week === undefined || !meal_timing) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: day_of_week, meal_timing",
        });
      }

      console.log("🔍 Meal replacement request:", {
        planId,
        day_of_week,
        meal_timing,
        meal_order,
        user_id,
      });

      const result = await MealPlanService.replaceMealInPlan(
        user_id,
        planId,
        day_of_week,
        meal_timing,
        meal_order,
        preferences
      );

      console.log("✅ Meal replaced successfully");
      res.json({
        success: true,
        data: result,
        message: "Meal replaced successfully",
      });
    } catch (error) {
      console.error("💥 Error replacing meal:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to replace meal",
      });
    }
  }
);

// Generate shopping list
router.post(
  "/:planId/shopping-list",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      console.log("🛒 Generating shopping list for plan:", req.params.planId);

      const user_id = req.user?.user_id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const { planId } = req.params;
      const { week_start_date } = req.body;

      if (!week_start_date) {
        return res.status(400).json({
          success: false,
          error: "Missing required field: week_start_date",
        });
      }

      const shoppingList = await MealPlanService.generateShoppingList(
        user_id,
        planId,
        week_start_date
      );

      console.log("✅ Shopping list generated successfully");
      res.json({
        success: true,
        data: shoppingList,
        message: "Shopping list generated successfully",
      });
    } catch (error) {
      console.error("💥 Error generating shopping list:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate shopping list",
      });
    }
  }
);

// Save meal preference
router.post(
  "/preferences",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      console.log("💝 Saving meal preference");

      const user_id = req.user?.user_id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const { template_id, preference_type, rating, notes } = req.body;

      if (!template_id || !preference_type) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: template_id, preference_type",
        });
      }

      const preference = await MealPlanService.saveMealPreference(
        user_id,
        template_id,
        preference_type,
        rating,
        notes
      );

      console.log("✅ Meal preference saved successfully");
      res.json({
        success: true,
        data: preference,
        message: "Preference saved successfully",
      });
    } catch (error) {
      console.error("💥 Error saving meal preference:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to save preference",
      });
    }
  }
);

// Activate meal plan
router.post(
  "/:planId/activate",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      console.log("🚀 Activating meal plan:", req.params.planId);

      const user_id = req.user?.user_id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const { planId } = req.params;
      const { previousPlanFeedback } = req.body;

      // If there's feedback about a previous plan, store it
      if (previousPlanFeedback) {
        await MealPlanService.savePlanFeedback(
          user_id,
          previousPlanFeedback.planId,
          previousPlanFeedback.rating,
          previousPlanFeedback.liked,
          previousPlanFeedback.disliked,
          previousPlanFeedback.suggestions
        );
      }

      // Deactivate all other plans for this user
      await MealPlanService.deactivateUserPlans(user_id);

      // Activate the new plan
      const activatedPlan = await MealPlanService.activatePlan(user_id, planId);

      console.log("✅ Meal plan activated successfully");
      res.json({
        success: true,
        data: activatedPlan,
        message: "Meal plan activated successfully",
      });
    } catch (error) {
      console.error("💥 Error activating meal plan:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to activate meal plan",
      });
    }
  }
);

// Complete meal plan with feedback
router.post(
  "/:planId/complete",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { planId } = req.params;
      const userId = req.user?.user_id; // Correctly access userId from req.user
      const { rating, feedback, liked, disliked, suggestions } = req.body;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Update meal plan status to completed
      const completedPlan = await prisma.userMealPlan.update({
        // Correct model name to UserMealPlan
        where: {
          plan_id: planId, // Use plan_id for UserMealPlan
          user_id: userId,
        },
        data: {
          is_active: false,
          completed_at: new Date(), // Use completed_at field
          rating: rating,
          feedback_liked: liked || "",
          feedback_disliked: disliked || "",
          feedback_suggestions: suggestions || "",
        },
      });

      // Generate completion summary
      const summary = {
        planId: planId,
        duration: completedPlan.rotation_frequency_days || 7, // Use rotation_frequency_days
        totalMeals: 0, // Calculate from meal plan data
        totalCalories: 0, // Calculate from meal plan data
        completedAt: new Date(),
      };

      // Award XP for completing meal plan
      await prisma.user.update({
        where: { user_id: userId }, // Use user_id field
        data: {
          current_xp: {
            increment: 100, // Award 100 XP for completing a meal plan
          },
        },
      });

      res.json({
        success: true,
        data: {
          ...completedPlan,
          summary: summary,
        },
        message: "Meal plan completed successfully",
      });
    } catch (error) {
      console.error("Error completing meal plan:", error);
      res.status(500).json({
        error: "Failed to complete meal plan",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Get meal plan progress
router.get(
  "/:planId/progress",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const user_id = req.user?.user_id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const { planId } = req.params;

      // Get plan details
      const plan = await prisma.userMealPlan.findFirst({
        where: {
          plan_id: planId,
          user_id: user_id,
        },
      });

      if (!plan) {
        return res.status(404).json({
          success: false,
          error: "Plan not found",
        });
      }

      // Calculate progress based on start date and current date
      const startDate = plan.start_date || new Date();
      const currentDate = new Date();
      const totalDays = plan.rotation_frequency_days || 7;

      const daysSinceStart = Math.floor(
        (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const currentDay = (daysSinceStart % totalDays) + 1;
      const completedCycles = Math.floor(daysSinceStart / totalDays);
      const progressPercentage = Math.min(
        100,
        (daysSinceStart / totalDays) * 100
      );

      res.json({
        success: true,
        data: {
          planId,
          startDate: startDate.toISOString(),
          currentDate: currentDate.toISOString(),
          totalDays,
          daysSinceStart,
          currentDay,
          completedCycles,
          progressPercentage: Math.round(progressPercentage),
          isActive: plan.is_active,
          isCompleted: !!plan.completed_at,
        },
      });
    } catch (error) {
      console.error("💥 Error getting plan progress:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get plan progress",
      });
    }
  }
);

// Get today's meals from active plan
router.get("/today", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user_id = req.user?.user_id;
    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    // Get user's active plan
    const user = await prisma.user.findUnique({
      where: { user_id },
      select: {
        active_meal_plan_id: true,
        active_menu_id: true,
      },
    });

    if (!user?.active_meal_plan_id && !user?.active_menu_id) {
      return res.json({
        success: true,
        data: {
          hasActivePlan: false,
          todayMeals: [],
        },
      });
    }

    // Get today's day of week (0 = Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay();

    let todayMeals: any[] = [];

    if (user.active_meal_plan_id) {
      // Get from meal plan
      const schedules = await prisma.mealPlanSchedule.findMany({
        where: {
          plan_id: user.active_meal_plan_id,
          day_of_week: dayOfWeek,
        },
        include: {
          template: true,
        },
        orderBy: [{ meal_timing: "asc" }, { meal_order: "asc" }],
      });

      todayMeals = schedules.map((schedule) => ({
        template_id: schedule.template.template_id,
        name: schedule.template.name,
        description: schedule.template.description,
        meal_timing: schedule.meal_timing,
        calories: schedule.template.calories,
        protein_g: schedule.template.protein_g,
        carbs_g: schedule.template.carbs_g,
        fats_g: schedule.template.fats_g,
        prep_time_minutes: schedule.template.prep_time_minutes,
        difficulty_level: schedule.template.difficulty_level,
        ingredients: schedule.template.ingredients_json,
        instructions: schedule.template.instructions_json,
      }));
    } else if (user.active_menu_id) {
      // Get from recommended menu
      const menuMeals = await prisma.recommendedMeal.findMany({
        where: {
          menu_id: user.active_menu_id,
          day_number: dayOfWeek + 1, // Recommended meals use 1-7 instead of 0-6
        },
        include: {
          ingredients: true,
        },
        orderBy: [{ meal_type: "asc" }],
      });

      todayMeals = menuMeals.map((meal) => ({
        meal_id: meal.meal_id,
        name: meal.name,
        description: meal.instructions,
        meal_timing: meal.meal_type,
        calories: meal.calories,
        protein_g: meal.protein,
        carbs_g: meal.carbs,
        fats_g: meal.fat,
        prep_time_minutes: meal.prep_time_minutes,
        ingredients: meal.ingredients.map((ing) => ing.name),
        instructions: meal.instructions ? [meal.instructions] : [],
      }));
    }

    res.json({
      success: true,
      data: {
        hasActivePlan: true,
        todayMeals,
        dayOfWeek,
        planType: user.active_meal_plan_id ? "meal_plan" : "recommended_menu",
      },
    });
  } catch (error) {
    console.error("💥 Error getting today's meals:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get today's meals",
    });
  }
});

// Get meal plan by ID
router.get("/:planId", authenticateToken, async (req: AuthRequest, res) => {
  try {
    console.log("📋 Getting meal plan:", req.params.planId);

    const user_id = req.user?.user_id;
    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    const { planId } = req.params;

    // First check if it's a meal plan
    const mealPlan = await prisma.userMealPlan.findFirst({
      where: {
        plan_id: planId,
        user_id: user_id,
      },
      include: {
        schedules: {
          include: {
            template: true,
          },
          orderBy: [{ day_of_week: "asc" }, { meal_timing: "asc" }],
        },
      },
    });

    if (mealPlan && mealPlan.schedules?.length > 0) {
      console.log(
        "✅ Found meal plan with",
        mealPlan.schedules.length,
        "scheduled meals"
      );

      // Create weekly plan starting from plan start date
      const planStartDate = mealPlan.start_date || new Date();
      const startDayOfWeek = planStartDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

      const allDayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];

      // Reorder days to start from plan start day
      const dayNames = [
        ...allDayNames.slice(startDayOfWeek),
        ...allDayNames.slice(0, startDayOfWeek),
      ];

      const weeklyPlan: { [day: string]: { [timing: string]: any[] } } = {};

      mealPlan.schedules.forEach((schedule) => {
        // Map schedule day_of_week to correct day name
        const dayName = dayNames[schedule.day_of_week];
        const timing = schedule.meal_timing;

        console.log(
          `📅 Processing meal: ${schedule.template.name} for ${dayName} ${timing}`
        );

        if (!weeklyPlan[dayName]) {
          weeklyPlan[dayName] = {};
        }
        if (!weeklyPlan[dayName][timing]) {
          weeklyPlan[dayName][timing] = [];
        }

        // Properly parse JSON fields with fallbacks
        let ingredients: string[] = [];
        let instructions: string[] = [];
        let allergens: string[] = [];

        try {
          if (schedule.template.ingredients_json) {
            if (Array.isArray(schedule.template.ingredients_json)) {
              ingredients = schedule.template.ingredients_json as string[];
            } else if (typeof schedule.template.ingredients_json === "string") {
              ingredients = JSON.parse(schedule.template.ingredients_json);
            }
          }
        } catch (e) {
          console.warn(
            "Failed to parse ingredients_json for template:",
            schedule.template.template_id
          );
          ingredients = ["Mixed ingredients"];
        }

        try {
          if (schedule.template.instructions_json) {
            if (Array.isArray(schedule.template.instructions_json)) {
              instructions = schedule.template.instructions_json as string[];
            } else if (
              typeof schedule.template.instructions_json === "string"
            ) {
              instructions = JSON.parse(schedule.template.instructions_json);
            }
          }
        } catch (e) {
          console.warn(
            "Failed to parse instructions_json for template:",
            schedule.template.template_id
          );
          instructions = ["Prepare according to recipe"];
        }

        try {
          if (schedule.template.allergens_json) {
            if (Array.isArray(schedule.template.allergens_json)) {
              allergens = schedule.template.allergens_json as string[];
            } else if (typeof schedule.template.allergens_json === "string") {
              allergens = JSON.parse(schedule.template.allergens_json);
            }
          }
        } catch (e) {
          console.warn(
            "Failed to parse allergens_json for template:",
            schedule.template.template_id
          );
          allergens = [];
        }

        weeklyPlan[dayName][timing].push({
          template_id: schedule.template.template_id,
          name: schedule.template.name,
          description: schedule.template.description || "",
          meal_timing: timing,
          dietary_category: schedule.template.dietary_category || "BALANCED",
          prep_time_minutes: schedule.template.prep_time_minutes || 30,
          difficulty_level: schedule.template.difficulty_level || 2,
          calories: schedule.template.calories || 0,
          protein_g: schedule.template.protein_g || 0,
          carbs_g: schedule.template.carbs_g || 0,
          fats_g: schedule.template.fats_g || 0,
          fiber_g: schedule.template.fiber_g || 0,
          sugar_g: schedule.template.sugar_g || 0,
          sodium_mg: schedule.template.sodium_mg || 0,
          ingredients: ingredients,
          instructions: instructions,
          allergens: allergens,
          image_url: schedule.template.image_url || null,
          user_rating: 0,
          user_comments: "",
          is_favorite: false,
        });
      });

      console.log(
        "📊 Weekly plan structure created with",
        Object.keys(weeklyPlan).length,
        "days"
      );
      Object.entries(weeklyPlan).forEach(([day, timings]) => {
        const mealCount = Object.values(timings).reduce(
          (count, meals) => count + meals.length,
          0
        );
        console.log(`  📅 ${day}: ${mealCount} meals`);
      });

      return res.json({
        success: true,
        data: weeklyPlan,
        planId: planId,
        planName: mealPlan.name,
        start_date: planStartDate.toISOString(),
        days_count: mealPlan.rotation_frequency_days,
        target_calories_daily: mealPlan.target_calories_daily,
        target_protein_daily: mealPlan.target_protein_daily,
        target_carbs_daily: mealPlan.target_carbs_daily,
        target_fats_daily: mealPlan.target_fats_daily,
      });
    }

    // If not a meal plan, check if it's a recommended menu
    const recommendedMenu = await prisma.recommendedMenu.findFirst({
      where: {
        menu_id: planId,
        user_id: user_id,
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

    if (recommendedMenu && recommendedMenu.meals?.length > 0) {
      console.log(
        "✅ Found recommended menu with",
        recommendedMenu.meals.length,
        "meals"
      );

      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];

      const weeklyPlan: { [day: string]: { [timing: string]: any[] } } = {};

      recommendedMenu.meals.forEach((meal) => {
        const dayName = dayNames[(meal.day_number - 1) % 7];
        const timing = meal.meal_type;

        console.log(
          `📅 Processing recommended meal: ${meal.name} for ${dayName} ${timing}`
        );

        if (!weeklyPlan[dayName]) {
          weeklyPlan[dayName] = {};
        }
        if (!weeklyPlan[dayName][timing]) {
          weeklyPlan[dayName][timing] = [];
        }

        weeklyPlan[dayName][timing].push({
          template_id: meal.meal_id,
          name: meal.name,
          description: meal.instructions || "",
          meal_timing: timing,
          dietary_category: "BALANCED",
          prep_time_minutes: meal.prep_time_minutes || 30,
          difficulty_level: 2,
          calories: meal.calories || 0,
          protein_g: meal.protein || 0,
          carbs_g: meal.carbs || 0,
          fats_g: meal.fat || 0,
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

      console.log(
        "📊 Weekly plan structure created with",
        Object.keys(weeklyPlan).length,
        "days"
      );
      Object.entries(weeklyPlan).forEach(([day, timings]) => {
        const mealCount = Object.values(timings).reduce(
          (count, meals) => count + meals.length,
          0
        );
        console.log(`  📅 ${day}: ${mealCount} meals`);
      });

      return res.json({
        success: true,
        data: weeklyPlan,
        planId: planId,
        planName: recommendedMenu.title,
        start_date: new Date().toISOString(),
        days_count: 7,
        target_calories_daily: Math.round(recommendedMenu.total_calories / 7),
        target_protein_daily: Math.round(
          (recommendedMenu.total_protein || 0) / 7
        ),
        target_carbs_daily: Math.round((recommendedMenu.total_carbs || 0) / 7),
        target_fats_daily: Math.round((recommendedMenu.total_fat || 0) / 7),
      });
    }

    console.log("❌ No meal plan or recommended menu found for ID:", planId);
    return res.status(404).json({
      success: false,
      error: "Meal plan not found",
    });
  } catch (error) {
    console.error("💥 Error getting meal plan:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get meal plan",
    });
  }
});

// Deactivate meal plan
router.post(
  "/:planId/deactivate",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      console.log("🔄 Deactivating meal plan:", req.params.planId);

      const user_id = req.user?.user_id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const { planId } = req.params;
      await MealPlanService.deactivateMealPlan(user_id, planId);

      console.log("✅ Meal plan deactivated successfully");
      res.json({
        success: true,
        message: "Meal plan deactivated successfully",
      });
    } catch (error) {
      console.error("💥 Error deactivating meal plan:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to deactivate meal plan",
      });
    }
  }
);

// Get calendar data for meal plan tracking
router.get(
  "/calendar/:year/:month",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { year, month } = req.params;
      // Ensure userId is correctly accessed, assuming req.user is populated by authenticateToken
      const userId = (req as any).user?.user_id; // Use 'any' to access user_id if not directly typed

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0); // Day 0 of next month is the last day of current month

      // Get meal completions for the month
      const mealCompletions = await prisma.mealCompletion.findMany({
        where: {
          user_id: userId,
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          created_at: "asc",
        },
      });

      // Get active meal plan or recommended menu for the user
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: {
          active_meal_plan_id: true,
          active_menu_id: true,
        },
      });

      let activePlanInfo: {
        id: string;
        type: "meal_plan" | "recommended_menu";
      } | null = null;
      if (user?.active_meal_plan_id) {
        activePlanInfo = { id: user.active_meal_plan_id, type: "meal_plan" };
      } else if (user?.active_menu_id) {
        activePlanInfo = { id: user.active_menu_id, type: "recommended_menu" };
      }

      // Fetch plan details to get nutritional goals
      let planGoals: {
        goal_calories?: number;
        goal_protein_g?: number;
        goal_carbs_g?: number;
        goal_fats_g?: number;
      } = {};
      if (activePlanInfo) {
        if (activePlanInfo.type === "meal_plan") {
          const plan = await prisma.userMealPlan.findUnique({
            where: { plan_id: activePlanInfo.id },
            select: {
              target_calories_daily: true,
              target_protein_daily: true,
              target_carbs_daily: true,
              target_fats_daily: true,
            },
          });
          if (plan) {
            planGoals = {
              goal_calories: plan.target_calories_daily || 2000,
              goal_protein_g: plan.target_protein_daily || 150,
              goal_carbs_g: plan.target_carbs_daily || 250,
              goal_fats_g: plan.target_fats_daily || 67,
            };
          }
        } else if (activePlanInfo.type === "recommended_menu") {
          const menu = await prisma.recommendedMenu.findUnique({
            where: { menu_id: activePlanInfo.id },
            select: {
              total_calories: true,
              total_protein: true,
              total_carbs: true,
              total_fat: true,
            },
          });
          if (menu) {
            planGoals = {
              goal_calories: menu.total_calories
                ? Math.round(menu.total_calories / 7)
                : 2000, // Assuming 7 days a week for recommended menu
              goal_protein_g: menu.total_protein
                ? Math.round(menu.total_protein / 7)
                : 150,
              goal_carbs_g: menu.total_carbs
                ? Math.round(menu.total_carbs / 7)
                : 250,
              goal_fats_g: menu.total_fat ? Math.round(menu.total_fat / 7) : 67,
            };
          }
        }
      }

      // Structure calendar data
      const calendarData: { [date: string]: any } = {};
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split("T")[0];
        const dayCompletions = mealCompletions.filter(
          (completion) =>
            completion.created_at.toISOString().split("T")[0] === dateStr
        );

        // Calculate actuals from meal completions
        const actualCalories = dayCompletions.reduce(
          (sum, comp) => sum + (comp.calories || 0),
          0
        );
        const actualProtein = dayCompletions.reduce(
          (sum, comp) => sum + (comp.protein_g || 0),
          0
        );
        const actualCarbs = dayCompletions.reduce(
          (sum, comp) => sum + (comp.carbs_g || 0),
          0
        );
        const actualFat = dayCompletions.reduce(
          (sum, comp) => sum + (comp.fats_g || 0),
          0
        );
        const averageRating =
          dayCompletions.length > 0
            ? dayCompletions.reduce(
                (sum, comp) => sum + (comp.rating || 0),
                0
              ) / dayCompletions.length
            : 0;

        calendarData[dateStr] = {
          date: dateStr,
          // Use goals from active plan, with defaults if not available
          calories_goal: planGoals.goal_calories || 2000,
          calories_actual: actualCalories,
          protein_goal: planGoals.goal_protein_g || 150,
          protein_actual: actualProtein,
          carbs_goal: planGoals.goal_carbs_g || 250,
          carbs_actual: actualCarbs,
          fat_goal: planGoals.goal_fats_g || 67,
          fat_actual: actualFat,
          meal_count: dayCompletions.length,
          quality_score: averageRating, // This represents the average rating of completed meals for the day
          water_intake_ml: 0, // TODO: Add water tracking integration
          events: [], // TODO: Integrate with calendar events if applicable
        };

        currentDate.setDate(currentDate.getDate() + 1);
      }

      res.json({
        success: true,
        data: calendarData,
        activePlan: activePlanInfo, // Include info about the active plan
        planGoals: planGoals, // Include the fetched plan goals
      });
    } catch (error) {
      console.error("Error fetching calendar data:", error);
      res.status(500).json({
        error: "Failed to fetch calendar data",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Swap meal in a plan
router.post(
  "/:planId/swap-meal",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.user_id;
      const { planId } = req.params;
      const { currentMeal, dayName, mealTiming, preferences } = req.body;

      console.log("🔄 Swapping meal in plan:", planId);

      // Verify plan belongs to user
      const plan = await prisma.userMealPlan.findFirst({
        where: {
          plan_id: planId,
          user_id: userId,
        },
      });

      if (!plan) {
        return res.status(404).json({
          success: false,
          error: "Meal plan not found",
        });
      }

      // Find alternative meal from templates
      const alternatives = await prisma.mealTemplate.findMany({
        where: {
          meal_timing: mealTiming as any,
          dietary_category: preferences?.dietary_category || "BALANCED",
          prep_time_minutes: preferences?.max_prep_time
            ? { lte: preferences.max_prep_time }
            : undefined,
          template_id: { not: currentMeal.template_id },
        },
        take: 5,
      });

      if (alternatives.length === 0) {
        return res.status(404).json({
          success: false,
          error: "No alternative meals found",
        });
      }

      // Select random alternative
      const newMeal =
        alternatives[Math.floor(Math.random() * alternatives.length)];

      // Update the schedule
      await prisma.mealPlanSchedule.updateMany({
        where: {
          plan_id: planId,
          template_id: currentMeal.template_id,
        },
        data: {
          template_id: newMeal.template_id,
        },
      });

      res.json({
        success: true,
        message: "Meal swapped successfully",
        data: {
          oldMeal: currentMeal,
          newMeal,
        },
      });
    } catch (error) {
      console.error("💥 Swap meal error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to swap meal",
      });
    }
  }
);

export { router as mealPlansRoutes };
