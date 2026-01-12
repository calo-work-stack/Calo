export interface QuestionnaireData {
  // Personal data
  age: string;
  gender: string;
  height_cm: string;
  weight_kg: string;
  target_weight_kg: string | null;
  body_fat_percentage: string | null;
  additional_personal_info: string[];

  // Goals
  main_goal: string;
  main_goal_text: string[];
  secondary_goal?: string | null;
  specific_goal: string[];
  goal_timeframe_days: string | null;
  commitment_level: string;
  most_important_outcome: string[];
  special_personal_goal: string[];

  // Physical activity
  physical_activity_level: string;
  sport_frequency: string;
  sport_types: string[];
  sport_duration_min: string | null;
  workout_times: string[];
  uses_fitness_devices: boolean;
  fitness_device_type: string[];
  additional_activity_info: string[];

  // Health
  medical_conditions?: string[];
  medical_conditions_text: string[];
  medications: string[];
  health_goals: string[];
  functional_issues: string[];
  food_related_medical_issues: string[];

  // Means and conditions
  meals_per_day: string;
  snacks_between_meals: boolean;
  meal_times: string[];
  cooking_preference: string;
  available_cooking_methods: string[];
  daily_food_budget: string | null;
  shopping_method: string[];
  daily_cooking_time: string | null;

  // Dietary preferences and restrictions
  kosher: boolean;
  allergies: string[];
  allergies_text: string[];
  dietary_style: string;
  meal_texture_preference: string[];
  disliked_foods: string[];
  liked_foods: string[];
  regular_drinks: string[];
  intermittent_fasting: boolean;
  fasting_hours: string | null;

  // Additional
  past_diet_difficulties: string[];

  // Additional schema fields
  program_duration?: string;
  meal_timing_restrictions?: string;
  dietary_restrictions?: string[];
  willingness_to_follow?: boolean;
  upcoming_events?: string[];
  upload_frequency?: string;
  notifications_preference?: 'DAILY' | 'WEEKLY' | 'NONE' | null;
  personalized_tips?: boolean;
  health_metrics_integration?: boolean;
  family_medical_history?: string[];
  smoking_status?: 'YES' | 'NO' | null;
  sleep_hours_per_night?: string | null;
}

export interface StepProps {
  formData: QuestionnaireData;
  setFormData: (data: QuestionnaireData) => void;
  onNext?: () => void;
  onSubmit?: () => void;
  isSaving?: boolean;
}