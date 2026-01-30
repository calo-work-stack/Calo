import axios from "axios";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// Types
export interface NutritionData {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
}

export interface ParsedIngredient {
  ingredient_key: string | null;
  ingredient_name_en: string;
  ingredient_name_he: string;
  preparation_method: string | null;
  quantity: number;
  unit: string;
  is_estimated: boolean;
  estimated_nutrition?: NutritionData;
  nutrition_preview?: CalculatedNutrition;
}

export interface CalculatedNutrition extends NutritionData {
  quantity_g: number;
  preparation_method: string | null;
  is_estimated: boolean;
}

export interface IngredientSearchResult {
  key: string;
  name_en: string;
  name_he: string;
  category: string;
}

export interface UnitOption {
  key: string;
  name_en: string;
  name_he: string;
  grams: number;
}

export interface PreparationOption {
  key: string;
  name_en: string;
  name_he: string;
  modifiers: Partial<NutritionData>;
}

// API Configuration
const getApiBaseUrl = (): string => {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error("API_URL environment variable is not configured");
  }
  return baseUrl;
};

// Token management (matches pattern from api.ts)
let cachedToken: string | null = null;
let tokenCacheTimestamp: number = 0;
const TOKEN_CACHE_DURATION = 300000; // 5 minutes

const getStoredToken = async (): Promise<string | null> => {
  const now = Date.now();
  if (cachedToken && now - tokenCacheTimestamp < TOKEN_CACHE_DURATION) {
    return cachedToken;
  }

  try {
    const token =
      Platform.OS === "web"
        ? localStorage.getItem("auth_token")
        : await SecureStore.getItemAsync("auth_token_secure");

    cachedToken = token;
    tokenCacheTimestamp = now;
    return token;
  } catch (error) {
    console.error("Error getting stored token:", error);
    return null;
  }
};

// Create axios instance for ingredient API
const createIngredientApiInstance = () => {
  const instance = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 10000,
    withCredentials: Platform.OS === "web",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  // Add auth token to requests
  instance.interceptors.request.use(
    async (config) => {
      const token = await getStoredToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  return instance;
};

const api = createIngredientApiInstance();

/**
 * Parse free-text ingredient input
 * @param input - User input like "חציל מטוגן 100g"
 * @param language - "he" or "en"
 */
export async function parse(
  input: string,
  language: "he" | "en" = "he"
): Promise<ParsedIngredient> {
  try {
    const response = await api.post("/ingredients/parse", {
      input,
      language,
    });

    if (response.data.success) {
      return response.data.data;
    }

    throw new Error(response.data.error || "Failed to parse ingredient");
  } catch (error) {
    console.error("Ingredient parse error:", error);
    throw error;
  }
}

/**
 * Search ingredients by query
 * @param query - Search query
 * @param language - "he" or "en"
 * @param limit - Max results (default 10)
 */
export async function search(
  query: string,
  language: "he" | "en" = "he",
  limit: number = 10
): Promise<IngredientSearchResult[]> {
  try {
    const response = await api.get("/ingredients/search", {
      params: {
        q: query,
        lang: language,
        limit,
      },
    });

    if (response.data.success) {
      return response.data.data;
    }

    throw new Error(response.data.error || "Failed to search ingredients");
  } catch (error) {
    console.error("Ingredient search error:", error);
    throw error;
  }
}

/**
 * Calculate nutrition for an ingredient
 * @param params - Calculation parameters
 */
export async function calculate(params: {
  ingredient_key: string | null;
  quantity: number;
  unit: string;
  preparation_method: string | null;
  estimated_nutrition?: NutritionData;
}): Promise<{
  nutrition: CalculatedNutrition;
  ingredient: IngredientSearchResult | null;
}> {
  try {
    const response = await api.post("/ingredients/calculate", params);

    if (response.data.success) {
      return response.data.data;
    }

    throw new Error(response.data.error || "Failed to calculate nutrition");
  } catch (error) {
    console.error("Ingredient calculate error:", error);
    throw error;
  }
}

/**
 * Get available measurement units
 */
export async function getUnits(): Promise<UnitOption[]> {
  try {
    const response = await api.get("/ingredients/units");

    if (response.data.success) {
      return response.data.data;
    }

    throw new Error(response.data.error || "Failed to get units");
  } catch (error) {
    console.error("Get units error:", error);
    // Return default units on error
    return [
      { key: "g", name_en: "grams", name_he: "גרם", grams: 1 },
      { key: "tsp", name_en: "teaspoon", name_he: "כפית", grams: 5 },
      { key: "tbsp", name_en: "tablespoon", name_he: "כף", grams: 15 },
      { key: "cup", name_en: "cup", name_he: "כוס", grams: 240 },
      { key: "piece", name_en: "piece", name_he: "יחידה", grams: -1 },
    ];
  }
}

/**
 * Get available preparation methods
 */
export async function getPreparations(): Promise<PreparationOption[]> {
  try {
    const response = await api.get("/ingredients/preparations");

    if (response.data.success) {
      return response.data.data;
    }

    throw new Error(response.data.error || "Failed to get preparations");
  } catch (error) {
    console.error("Get preparations error:", error);
    // Return default preparations on error
    return [
      { key: "raw", name_en: "Raw", name_he: "נא", modifiers: {} },
      {
        key: "fried",
        name_en: "Fried",
        name_he: "מטוגן",
        modifiers: { calories: 90, fats_g: 10, sodium_mg: 50 },
      },
      {
        key: "sauteed",
        name_en: "Sautéed",
        name_he: "מוקפץ",
        modifiers: { calories: 45, fats_g: 5, sodium_mg: 25 },
      },
      {
        key: "baked",
        name_en: "Baked",
        name_he: "אפוי",
        modifiers: { calories: 10, fats_g: 1 },
      },
      {
        key: "grilled",
        name_en: "Grilled",
        name_he: "צלוי",
        modifiers: { calories: 5, fats_g: 0.5 },
      },
      { key: "boiled", name_en: "Boiled", name_he: "מבושל", modifiers: {} },
      { key: "steamed", name_en: "Steamed", name_he: "מאודה", modifiers: {} },
    ];
  }
}

/**
 * Get ingredient details by key
 * @param key - Ingredient key
 */
export async function getIngredient(key: string): Promise<{
  key: string;
  name_en: string;
  name_he: string;
  category: string;
  nutrition_per_100g: NutritionData;
} | null> {
  try {
    const response = await api.get(`/ingredients/${key}`);

    if (response.data.success) {
      return response.data.data;
    }

    return null;
  } catch (error) {
    console.error("Get ingredient error:", error);
    return null;
  }
}

// Export all functions as default object for convenience
export const ingredientAPI = {
  parse,
  search,
  calculate,
  getUnits,
  getPreparations,
  getIngredient,
};

export default ingredientAPI;
