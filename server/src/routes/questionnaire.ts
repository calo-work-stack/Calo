import { Router } from "express";
import { prisma } from "../lib/database";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { questionnaireSchema } from "../types/questionnaire";
import { DailyGoalsService } from "../services/dailyGoal";
import { QuestionnaireValidationService } from "../services/questionnaireValidation";

const router = Router();

// POST /api/questionnaire - Save user questionnaire
router.post("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.user_id;
    const questionnaireData = req.body;

    console.log("📝 Saving questionnaire for user:", userId);
    console.log("📝 Questionnaire data:", questionnaireData);

    // Check if user already has a questionnaire
    const existingQuestionnaire = await prisma.userQuestionnaire.findFirst({
      where: { user_id: userId },
    });

    // Sanitize and validate data
    const sanitizeFloat = (val: any) => {
      if (val === "" || val === null || val === undefined) return null;
      const parsed = parseFloat(val);
      return isNaN(parsed) ? null : parsed;
    };

    const sanitizeInt = (val: any) => {
      if (val === "" || val === null || val === undefined) return null;
      const parsed = parseInt(val);
      return isNaN(parsed) ? null : parsed;
    };

    const sanitizeString = (val: any) => {
      if (val === "" || val === null || val === undefined) return null;
      return String(val);
    };

    const sanitizeBoolean = (val: any) => {
      if (typeof val === "boolean") return val;
      if (typeof val === "string") {
        return val.toLowerCase() === "true" || val === "1";
      }
      return false; // Default to false for required boolean fields
    };

    const sanitizeArray = (val: any) => {
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        if (val.trim() === "" || val.toLowerCase() === "none") return [];
        try {
          return JSON.parse(val);
        } catch {
          return val
            .split(",")
            .map((item) => item.trim())
            .filter((item) => item && item.toLowerCase() !== "none");
        }
      }
      return [];
    };

    const sanitizeStringArray = (val: any) => {
      if (typeof val === "string") {
        if (val.trim() === "" || val.toLowerCase() === "none") return [];
        return [val];
      }
      return sanitizeArray(val);
    };

    // Sanitize all fields according to Prisma schema requirements

    // Required numeric fields
    questionnaireData.age = sanitizeInt(questionnaireData.age) || 18; // Default to 18 if invalid
    questionnaireData.height_cm =
      sanitizeFloat(questionnaireData.height_cm) || 170;
    questionnaireData.weight_kg =
      sanitizeFloat(questionnaireData.weight_kg) || 70;

    // Optional numeric fields
    questionnaireData.target_weight_kg = sanitizeFloat(
      questionnaireData.target_weight_kg
    );
    questionnaireData.body_fat_percentage = sanitizeFloat(
      questionnaireData.body_fat_percentage
    );
    questionnaireData.goal_timeframe_days = sanitizeInt(
      questionnaireData.goal_timeframe_days
    );
    questionnaireData.sport_duration_min = sanitizeInt(
      questionnaireData.sport_duration_min
    );
    questionnaireData.meals_per_day =
      sanitizeInt(questionnaireData.meals_per_day) || 3;
    questionnaireData.daily_food_budget = sanitizeFloat(
      questionnaireData.daily_food_budget
    );

    // Required string fields - ensure they're not empty
    questionnaireData.gender = questionnaireData.gender || "לא צוין";
    questionnaireData.commitment_level =
      questionnaireData.commitment_level || "בינוני";
    questionnaireData.cooking_preference =
      questionnaireData.cooking_preference || "קל";
    questionnaireData.dietary_style = questionnaireData.dietary_style || "רגיל";

    // Optional string fields
    questionnaireData.daily_cooking_time = sanitizeString(
      questionnaireData.daily_cooking_time
    );

    // Handle meal_times - convert array to string as per Prisma schema
    if (Array.isArray(questionnaireData.meal_times)) {
      questionnaireData.meal_times = questionnaireData.meal_times.join(", ");
    }
    questionnaireData.meal_times =
      questionnaireData.meal_times || "8:00, 12:00, 18:00";

    // Handle fasting_hours - ensure it's a string or null as per Prisma schema
    if (
      questionnaireData.fasting_hours === "" ||
      questionnaireData.fasting_hours === undefined
    ) {
      questionnaireData.fasting_hours = null;
    } else if (questionnaireData.fasting_hours) {
      questionnaireData.fasting_hours = String(questionnaireData.fasting_hours);
    } else {
      questionnaireData.fasting_hours = null;
    }

    // Handle legacy fields that might come as arrays
    if (Array.isArray(questionnaireData.meal_timing_restrictions)) {
      questionnaireData.meal_timing_restrictions =
        questionnaireData.meal_timing_restrictions.join(", ");
    }

    // Handle notifications_preference - must be enum value or null
    if (questionnaireData.notifications_preference) {
      const validNotificationPrefs = ["DAILY", "WEEKLY", "NONE"];
      let prefValue = questionnaireData.notifications_preference;

      // If it's an array, take the first value
      if (Array.isArray(prefValue)) {
        prefValue = prefValue[0];
      }

      // Normalize the value
      if (typeof prefValue === "string") {
        const upperValue = prefValue.toUpperCase();
        if (validNotificationPrefs.includes(upperValue)) {
          questionnaireData.notifications_preference = upperValue as
            | "DAILY"
            | "WEEKLY"
            | "NONE";
        } else {
          questionnaireData.notifications_preference = null;
        }
      } else {
        questionnaireData.notifications_preference = null;
      }
    } else {
      questionnaireData.notifications_preference = null;
    }

    // Array fields that should be arrays in Prisma
    questionnaireData.additional_personal_info = sanitizeStringArray(
      questionnaireData.additional_personal_info
    );
    questionnaireData.main_goal_text = sanitizeStringArray(
      questionnaireData.main_goal_text
    );
    questionnaireData.specific_goal = sanitizeStringArray(
      questionnaireData.specific_goal
    );
    questionnaireData.most_important_outcome = sanitizeStringArray(
      questionnaireData.most_important_outcome
    );
    questionnaireData.special_personal_goal = sanitizeStringArray(
      questionnaireData.special_personal_goal
    );
    questionnaireData.sport_types = sanitizeArray(
      questionnaireData.sport_types
    );
    questionnaireData.workout_times = sanitizeStringArray(
      questionnaireData.workout_times
    );
    questionnaireData.fitness_device_type = sanitizeStringArray(
      questionnaireData.fitness_device_type
    );
    questionnaireData.additional_activity_info = sanitizeStringArray(
      questionnaireData.additional_activity_info
    );
    questionnaireData.medical_conditions = sanitizeArray(
      questionnaireData.medical_conditions
    );
    questionnaireData.medical_conditions_text = sanitizeStringArray(
      questionnaireData.medical_conditions_text
    );
    questionnaireData.available_cooking_methods = sanitizeArray(
      questionnaireData.available_cooking_methods
    );
    questionnaireData.shopping_method = sanitizeStringArray(
      questionnaireData.shopping_method
    );
    questionnaireData.allergies = sanitizeArray(questionnaireData.allergies);
    questionnaireData.allergies_text = sanitizeStringArray(
      questionnaireData.allergies_text
    );
    questionnaireData.meal_texture_preference = sanitizeStringArray(
      questionnaireData.meal_texture_preference
    );
    questionnaireData.regular_drinks = sanitizeArray(
      questionnaireData.regular_drinks
    );
    questionnaireData.past_diet_difficulties = sanitizeArray(
      questionnaireData.past_diet_difficulties
    );

    // Boolean fields
    questionnaireData.snacks_between_meals = sanitizeBoolean(
      questionnaireData.snacks_between_meals
    );
    questionnaireData.uses_fitness_devices = sanitizeBoolean(
      questionnaireData.uses_fitness_devices
    );
    questionnaireData.kosher = sanitizeBoolean(questionnaireData.kosher);
    questionnaireData.intermittent_fasting = sanitizeBoolean(
      questionnaireData.intermittent_fasting
    );

    // Validate and normalize enums
    const normalizeEnum = (
      value: string,
      allowedValues: string[],
      defaultValue: string
    ) => {
      if (!value || value === "") return defaultValue;

      // Handle physical activity level variations
      if (allowedValues.includes("MODERATE")) {
        const lowerValue = value.toLowerCase();
        if (lowerValue.includes("none") || lowerValue.includes("ללא"))
          return "NONE";
        if (lowerValue.includes("light") || lowerValue.includes("קל"))
          return "LIGHT";
        if (lowerValue.includes("moderate") || lowerValue.includes("בינוני"))
          return "MODERATE";
        if (lowerValue.includes("high") || lowerValue.includes("גבוה"))
          return "HIGH";
      }

      // Handle sport frequency variations
      if (allowedValues.includes("TWO_TO_THREE")) {
        const lowerValue = value.toLowerCase();
        if (lowerValue.includes("none") || lowerValue.includes("ללא"))
          return "NONE";
        if (lowerValue.includes("once") || lowerValue.includes("פעם"))
          return "ONCE_A_WEEK";
        if (
          lowerValue.includes("2-3") ||
          lowerValue.includes("שתיים") ||
          lowerValue.includes("שלוש")
        )
          return "TWO_TO_THREE";
        if (
          lowerValue.includes("4-5") ||
          lowerValue.includes("ארבע") ||
          lowerValue.includes("חמש")
        )
          return "FOUR_TO_FIVE";
        if (lowerValue.includes("more than") || lowerValue.includes("יותר"))
          return "MORE_THAN_FIVE";
      }

      return allowedValues.includes(value) ? value : defaultValue;
    };

    // Required enum fields with defaults
    questionnaireData.physical_activity_level = normalizeEnum(
      questionnaireData.physical_activity_level,
      ["NONE", "LIGHT", "MODERATE", "HIGH"],
      "MODERATE"
    );

    questionnaireData.sport_frequency = normalizeEnum(
      questionnaireData.sport_frequency,
      ["NONE", "ONCE_A_WEEK", "TWO_TO_THREE", "FOUR_TO_FIVE", "MORE_THAN_FIVE"],
      "TWO_TO_THREE"
    );

    questionnaireData.main_goal = normalizeEnum(
      questionnaireData.main_goal,
      [
        "WEIGHT_LOSS",
        "WEIGHT_MAINTENANCE",
        "WEIGHT_GAIN",
        "GENERAL_HEALTH",
        "MEDICAL_CONDITION",
        "SPORTS_PERFORMANCE",
        "ALERTNESS",
        "ENERGY",
        "SLEEP_QUALITY",
        "OTHER",
      ],
      "GENERAL_HEALTH"
    );
    questionnaireData.smoking_status = questionnaireData.smoking_status || "NO";

    // Handle sleep_hours_per_night
    questionnaireData.sleep_hours_per_night = sanitizeFloat(
      questionnaireData.sleep_hours_per_night
    );

    questionnaireData.sport_frequency = normalizeEnum(
      questionnaireData.sport_frequency,
      ["NONE", "ONCE_A_WEEK", "TWO_TO_THREE", "FOUR_TO_FIVE", "MORE_THAN_FIVE"],
      "TWO_TO_THREE"
    );

    questionnaireData.main_goal = normalizeEnum(
      questionnaireData.main_goal,
      [
        "WEIGHT_LOSS",
        "WEIGHT_MAINTENANCE",
        "WEIGHT_GAIN",
        "GENERAL_HEALTH",
        "MEDICAL_CONDITION",
        "SPORTS_PERFORMANCE",
        "ALERTNESS",
        "ENERGY",
        "SLEEP_QUALITY",
        "OTHER",
      ],
      "GENERAL_HEALTH"
    );

    // Validate using the imported schema
    const validationResult = questionnaireSchema.safeParse(questionnaireData);

    if (!validationResult.success) {
      console.error("Questionnaire validation error:", validationResult.error);
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validationResult.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          received:
            err.code === "invalid_type" ? (err as any).received : undefined,
          expected:
            err.code === "invalid_type" ? (err as any).expected : undefined,
        })),
      });
    }

    const validatedData = validationResult.data;

    let savedQuestionnaire;

    if (existingQuestionnaire) {
      // Update existing questionnaire
      savedQuestionnaire = await prisma.userQuestionnaire.update({
        where: { questionnaire_id: existingQuestionnaire.questionnaire_id },
        data: {
          // Personal data
          age: validatedData.age,
          gender: validatedData.gender,
          height_cm: validatedData.height_cm,
          weight_kg: validatedData.weight_kg,
          target_weight_kg: validatedData.target_weight_kg,
          body_fat_percentage: validatedData.body_fat_percentage,
          additional_personal_info: validatedData.additional_personal_info,

          // Goals
          main_goal: validatedData.main_goal,
          main_goal_text: validatedData.main_goal_text,
          specific_goal: validatedData.specific_goal,
          goal_timeframe_days: validatedData.goal_timeframe_days,
          commitment_level: validatedData.commitment_level,
          most_important_outcome: validatedData.most_important_outcome,
          special_personal_goal: validatedData.special_personal_goal,

          // Physical activity
          physical_activity_level: validatedData.physical_activity_level,
          sport_frequency: validatedData.sport_frequency,
          sport_types: validatedData.sport_types,
          sport_duration_min: validatedData.sport_duration_min,
          workout_times: validatedData.workout_times,
          uses_fitness_devices: validatedData.uses_fitness_devices,
          fitness_device_type: validatedData.fitness_device_type,
          additional_activity_info: validatedData.additional_activity_info,

          // Health
          medical_conditions: validatedData.medical_conditions,
          medical_conditions_text: validatedData.medical_conditions_text,
          medications: validatedData.medications,
          health_goals: validatedData.health_goals,
          functional_issues: validatedData.functional_issues,
          food_related_medical_issues:
            validatedData.food_related_medical_issues,

          // Means and conditions
          meals_per_day: validatedData.meals_per_day,
          snacks_between_meals: validatedData.snacks_between_meals,
          meal_times: validatedData.meal_times,
          cooking_preference: validatedData.cooking_preference,
          available_cooking_methods: validatedData.available_cooking_methods,
          daily_food_budget: validatedData.daily_food_budget,
          shopping_method: validatedData.shopping_method,
          daily_cooking_time: validatedData.daily_cooking_time,

          // Dietary preferences and restrictions
          kosher: validatedData.kosher,
          allergies: validatedData.allergies,
          allergies_text: validatedData.allergies_text,
          dietary_style: validatedData.dietary_style,
          meal_texture_preference: validatedData.meal_texture_preference,
          disliked_foods: validatedData.disliked_foods,
          liked_foods: validatedData.liked_foods,
          regular_drinks: validatedData.regular_drinks,
          intermittent_fasting: validatedData.intermittent_fasting,
          fasting_hours: validatedData.fasting_hours,

          // Additional
          past_diet_difficulties: validatedData.past_diet_difficulties,

          // Legacy fields
          program_duration: validatedData.program_duration,
          meal_timing_restrictions: validatedData.meal_timing_restrictions,
          dietary_restrictions: validatedData.dietary_restrictions,
          willingness_to_follow: validatedData.willingness_to_follow,
          upcoming_events: validatedData.upcoming_events,
          upload_frequency: validatedData.upload_frequency,
          notifications_preference: validatedData.notifications_preference,
          personalized_tips: validatedData.personalized_tips,
          health_metrics_integration: validatedData.health_metrics_integration,
          family_medical_history: validatedData.family_medical_history,
          smoking_status: validatedData.smoking_status,
          sleep_hours_per_night: validatedData.sleep_hours_per_night,

          date_completed: new Date(),
        },
      });
    } else {
      // Create new questionnaire
      savedQuestionnaire = await prisma.userQuestionnaire.create({
        data: {
          user: {
            connect: { user_id: userId },
          },
          // Personal data
          age: validatedData.age,
          gender: validatedData.gender,
          height_cm: validatedData.height_cm,
          weight_kg: validatedData.weight_kg,
          target_weight_kg: validatedData.target_weight_kg,
          body_fat_percentage: validatedData.body_fat_percentage,
          additional_personal_info: validatedData.additional_personal_info,

          // Goals
          main_goal: validatedData.main_goal,
          main_goal_text: validatedData.main_goal_text,
          specific_goal: validatedData.specific_goal,
          goal_timeframe_days: validatedData.goal_timeframe_days,
          commitment_level: validatedData.commitment_level,
          most_important_outcome: validatedData.most_important_outcome,
          special_personal_goal: validatedData.special_personal_goal,

          // Physical activity
          physical_activity_level: validatedData.physical_activity_level,
          sport_frequency: validatedData.sport_frequency,
          sport_types: validatedData.sport_types,
          sport_duration_min: validatedData.sport_duration_min,
          workout_times: validatedData.workout_times,
          uses_fitness_devices: validatedData.uses_fitness_devices,
          fitness_device_type: validatedData.fitness_device_type,
          additional_activity_info: validatedData.additional_activity_info,

          // Health
          medical_conditions: validatedData.medical_conditions,
          medical_conditions_text: validatedData.medical_conditions_text,
          medications: validatedData.medications,
          health_goals: validatedData.health_goals,
          functional_issues: validatedData.functional_issues,
          food_related_medical_issues:
            validatedData.food_related_medical_issues,

          // Means and conditions
          meals_per_day: validatedData.meals_per_day,
          snacks_between_meals: validatedData.snacks_between_meals,
          meal_times: validatedData.meal_times,
          cooking_preference: validatedData.cooking_preference,
          available_cooking_methods: validatedData.available_cooking_methods,
          daily_food_budget: validatedData.daily_food_budget,
          shopping_method: validatedData.shopping_method,
          daily_cooking_time: validatedData.daily_cooking_time,

          // Dietary preferences and restrictions
          kosher: validatedData.kosher,
          allergies: validatedData.allergies,
          allergies_text: validatedData.allergies_text,
          dietary_style: validatedData.dietary_style,
          meal_texture_preference: validatedData.meal_texture_preference,
          disliked_foods: validatedData.disliked_foods,
          liked_foods: validatedData.liked_foods,
          regular_drinks: validatedData.regular_drinks,
          intermittent_fasting: validatedData.intermittent_fasting,
          fasting_hours: validatedData.fasting_hours,

          // Additional
          past_diet_difficulties: validatedData.past_diet_difficulties,

          // Legacy fields
          program_duration: validatedData.program_duration,
          meal_timing_restrictions: validatedData.meal_timing_restrictions,
          dietary_restrictions: validatedData.dietary_restrictions,
          willingness_to_follow: validatedData.willingness_to_follow,
          upcoming_events: validatedData.upcoming_events,
          upload_frequency: validatedData.upload_frequency,
          notifications_preference: validatedData.notifications_preference,
          personalized_tips: validatedData.personalized_tips,
          health_metrics_integration: validatedData.health_metrics_integration,
          family_medical_history: validatedData.family_medical_history,
          smoking_status: validatedData.smoking_status,
          sleep_hours_per_night: validatedData.sleep_hours_per_night,

          date_completed: new Date(),
        },
      });
    }

    // Mark questionnaire as completed only if it's not an edit mode
    if (!questionnaireData.isEditMode) {
      await prisma.user.update({
        where: { user_id: userId },
        data: {
          is_questionnaire_completed: true,
        },
      });
    }

    console.log("✅ Questionnaire saved successfully");

    // Send response immediately - no blocking operations before this
    res.status(200).json({
      success: true,
      message: existingQuestionnaire
        ? "Questionnaire updated successfully"
        : "Questionnaire saved successfully",
      questionnaire: {
        ...savedQuestionnaire,
        meals_per_day: savedQuestionnaire.meals_per_day || 3,
      },
    });

    // ============================================================
    // ALL BACKGROUND TASKS BELOW - Response already sent to user
    // ============================================================

    // Create/update daily goals in background (non-blocking)
    // This ensures goals reflect the latest questionnaire answers without blocking the user
    setImmediate(async () => {
      try {
        console.log(
          "📊 Creating/updating daily goals in background after questionnaire save..."
        );
        const goals = await DailyGoalsService.createOrUpdateDailyGoals(userId);
        console.log("✅ Daily goals created/updated successfully:", goals);
      } catch (goalError) {
        console.error("⚠️  Failed to create/update daily goals:", goalError);
        // Log but don't fail - this runs in background
      }
    });

    // Generate initial recommended menu in background (non-blocking) - only for new questionnaires
    if (!existingQuestionnaire) {
      setImmediate(async () => {
        try {
          const { RecommendedMenuService } = await import(
            "../services/recommendedMenu"
          );
          await RecommendedMenuService.generatePersonalizedMenu({ userId });
          console.log("✅ Initial menu generated successfully in background");
        } catch (error) {
          console.log("⚠️ Background menu generation failed:", error);
        }
      });
    } else {
      console.log("ℹ️ Skipping menu generation for questionnaire update");
    }

    // Schedule async validation of open-text fields in the background
    // This validates inputs without blocking the user's workflow
    QuestionnaireValidationService.scheduleValidation(userId, validatedData);
  } catch (error) {
    console.error("💥 Questionnaire save error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to save questionnaire",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /api/questionnaire - Retrieve user questionnaire
router.get("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.user_id;

    console.log("📖 Fetching questionnaire for user:", userId);

    const questionnaire = await prisma.userQuestionnaire.findFirst({
      where: { user_id: userId },
      orderBy: { date_completed: "desc" },
    });

    if (!questionnaire) {
      return res.json({
        success: true,
        message: "No questionnaire found",
        data: null,
      });
    }

    console.log("✅ Questionnaire retrieved successfully");

    // Return success with questionnaire data including meals_per_day
    res.json({
      success: true,
      data: {
        ...questionnaire,
        meals_per_day: questionnaire.meals_per_day || 3,
      },
      message: "Questionnaire fetched successfully",
    });
  } catch (error) {
    console.error("💥 Questionnaire fetch error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch questionnaire",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export { router as questionnaireRoutes };
