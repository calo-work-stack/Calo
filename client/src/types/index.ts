import { z } from "zod";

//
// ✅ Zod Schemas
//
export const SignUpSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string(),
  birth_date: z.preprocess((arg) => {
    if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
  }, z.date()),
});

export const SignInSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const MealAnalysisSchema = z.object({
  meal_name: z.string(),
  description: z.string().optional(),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fats_g: z.number(),
  fiber_g: z.number().optional(),
  sugar_g: z.number().optional(),
  sodium_g: z.number().optional(),
  // Add other fields from your API response
  healthScore: z.string().optional(),
  cooking_method: z.string().optional(),
  food_category: z.string().optional(),
  serving_size_g: z.number().optional(),
  glycemic_index: z.number().optional(),
  insulin_index: z.number().optional(),
  omega_3_g: z.number().optional(),
  omega_6_g: z.number().optional(),
  cholesterol_mg: z.number().optional(),
  processing_level: z.string().optional(),
  ingredients: z
    .array(
      z.object({
        name: z.string(),
        calories: z.number(),
        protein: z.number(),
        carbs: z.number(),
        fat: z.number(),
        fiber: z.number().optional(),
        sugar: z.number().optional(),
      })
    )
    .optional(),
  recommendations: z.string().optional(),
  health_risk_notes: z.string().optional(),
});

//
// ✅ Zod-Inferred Types
//
export type SignUpData = z.infer<typeof SignUpSchema>;
export type SignInData = z.infer<typeof SignInSchema>;
export type MealAnalysisData = z.infer<typeof MealAnalysisSchema>;

//
// ✅ Manual Interfaces - Updated to match Prisma schema
//
export interface User {
  email_verified: any;
  user_id: string;
  email: string;
  name?: string;
  birth_date?: string;
  avatar_url?: string;
  subscription_type: string;
  signup_date: string;
  is_questionnaire_completed: boolean;
  ai_requests_count?: number;
  ai_requests_reset_at?: string;
  created_at?: string;
  password_hash?: string;
  subscription_start?: string;
  subscription_end?: string;
  email_verification_code?: string;
  email_verification_expires?: string;
  password_reset_code?: string;
  password_reset_expires?: string;
  level?: number;
  total_points?: number;
  current_xp?: number;
  current_streak?: number;
  best_streak?: number;
  total_complete_days?: number;
  last_complete_date?: string;
  active_meal_plan_id?: string;
  active_menu_id?: string;
  meals_per_day?: number;
  is_admin?: boolean;
  is_super_admin?: boolean;
}

export interface Meal {
  // Primary Prisma fields
  meal_id: number;
  user_id: string;
  image_url?: string;
  upload_time: string;
  analysis_status: "PENDING" | "COMPLETED";
  meal_name: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fats_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  created_at: string;

  // Extended nutritional fields
  saturated_fats_g?: number | null;
  polyunsaturated_fats_g?: number | null;
  monounsaturated_fats_g?: number | null;
  omega_3_g?: number | null;
  omega_6_g?: number | null;
  soluble_fiber_g?: number | null;
  insoluble_fiber_g?: number | null;
  cholesterol_mg?: number | null;
  alcohol_g?: number | null;
  caffeine_mg?: number | null;
  liquids_ml?: number | null;
  serving_size_g?: number | null;
  glycemic_index?: number | null;
  insulin_index?: number | null;
  food_category?: string | null;
  processing_level?: string | null;
  cooking_method?: string | null;
  health_risk_notes?: string | null;

  // JSON fields
  allergens_json?: any;
  vitamins_json?: any;
  micronutrients_json?: any;
  additives_json?: any;
  ingredients?: Array<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
  }>;

  // Compatibility fields
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  userId: string;

  // User interaction fields
  is_favorite?: boolean;
  taste_rating?: number;
  satiety_rating?: number;
  energy_rating?: number;
  heaviness_rating?: number;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export interface AIResponse {
  success: boolean;
  data?: MealAnalysisData;
  error?: string;
}

export interface PendingMeal {
  image_base_64: string;
  image_uri?: string;
  analysis: MealAnalysisData | null;
  timestamp: number;
  meal_id?: string; // For updates
}

// Daily stats interface
export interface DailyStats {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  meal_count: number;
}

export interface SignUpInput {
  email: string;
  password: string;
  name: string;
  birth_date: Date;
}

export interface QuestionnaireData {
  // Personal data
  age: string;
  gender?: string;
  height_cm?: string;
  weight_kg?: string;
  target_weight_kg?: string | null;
  body_fat_percentage?: string | null;
  additional_personal_info?: string[] | string;

  // Goals
  main_goal: string;
  main_goal_text?: string;
  specific_goal?: string;
  goal_timeframe_days?: string | null;
  commitment_level?: string;
  most_important_outcome?: string[] | string;
  special_personal_goal?: string[] | string;

  // Physical activity
  physical_activity_level: string;
  sport_frequency: string;
  sport_types?: string[];
  sport_duration_min?: string | null;
  workout_times?: string;
  uses_fitness_devices?: boolean;
  fitness_device_type?: string;
  additional_activity_info?: string;

  // Health
  medical_conditions?: string[];
  medical_conditions_text?: string;
  medications?: string;
  health_goals?: string;
  functional_issues?: string;
  food_related_medical_issues?: string;

  // Means and conditions
  meals_per_day?: string;
  snacks_between_meals?: boolean;
  meal_times?: string;
  cooking_preference?: string;
  available_cooking_methods?: string[];
  daily_food_budget?: string | null;
  shopping_method?: string[] | string;
  daily_cooking_time?: string | null;

  // Dietary preferences and restrictions
  kosher?: boolean;
  allergies?: string[];
  allergies_text?: string;
  dietary_style?: string;
  meal_texture_preference?: string;
  disliked_foods?: string;
  liked_foods?: string;
  regular_drinks?: string[];
  intermittent_fasting?: boolean;
  fasting_hours?: string | null;

  // Additional
  past_diet_difficulties?: string;

  // Legacy fields from schema (for compatibility)
  program_duration?: string;
  meal_timing_restrictions?: string;
  dietary_restrictions?: string;
  willingness_to_follow?: boolean;
  upcoming_events?: string;
  upload_frequency?: string;
  notifications_preference?: string;
  personalized_tips?: boolean;
  health_metrics_integration?: boolean;
  family_medical_history?: string[];
  smoking_status?: string;
  sleep_hours_per_night?: string;
}

export interface MealAnalysis {
  name?: string;
  meal_name?: string;
  description?: string;
  calories?: number;
  totalCalories?: number;
  protein?: number;
  protein_g?: number;
  totalProtein?: number;
  carbs?: number;
  carbs_g?: number;
  totalCarbs?: number;
  fat?: number;
  fats_g?: number;
  totalFat?: number;
  fiber?: number;
  fiber_g?: number;
  sugar?: number;
  sugar_g?: number;
  sodium?: number;
  sodium_mg?: number;
  ingredients?: Array<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
  }>;
}
export interface DailyGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}
