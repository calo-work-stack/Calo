import { Router, Response } from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { z } from "zod";
import {
  parseIngredientInput,
  calculateNutrition,
  searchIngredients,
  getAvailableUnits,
  getAvailablePreparations,
  getIngredient,
  lookupNutrition,
} from "../services/ingredientService";

const router = Router();

// Validation schemas
const parseSchema = z.object({
  input: z.string().min(1, "Input is required"),
  language: z.enum(["he", "en"]).default("he"),
});

const searchSchema = z.object({
  q: z.string().min(1, "Query is required"),
  lang: z.enum(["he", "en"]).default("he"),
  limit: z.coerce.number().min(1).max(50).default(10),
});

const calculateSchema = z.object({
  ingredient_key: z.string().nullable(),
  quantity: z.number().min(0.1, "Quantity must be positive"),
  unit: z.string().default("g"),
  preparation_method: z.string().nullable().default(null),
  estimated_nutrition: z
    .object({
      calories: z.number(),
      protein_g: z.number(),
      carbs_g: z.number(),
      fats_g: z.number(),
      fiber_g: z.number(),
      sugar_g: z.number(),
      sodium_mg: z.number(),
    })
    .optional(),
});

/**
 * POST /api/ingredients/parse
 * Parse free-text ingredient input using AI
 */
router.post(
  "/parse",
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

      const validationResult = parseSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid input",
          details: validationResult.error.errors,
        });
      }

      const { input, language } = validationResult.data;
      console.log(`🔍 Parsing ingredient: "${input}" (${language})`);

      const parsed = await parseIngredientInput(input, language);

      // If we have an ingredient key, also return the nutrition preview
      let nutritionPreview = null;
      if (parsed.ingredient_key || parsed.estimated_nutrition) {
        nutritionPreview = calculateNutrition(
          parsed.ingredient_key,
          parsed.quantity,
          parsed.unit,
          parsed.preparation_method,
          parsed.estimated_nutrition
        );
      }

      return res.json({
        success: true,
        data: {
          ...parsed,
          nutrition_preview: nutritionPreview,
        },
      });
    } catch (error) {
      console.error("Parse ingredient error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to parse ingredient",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/ingredients/search
 * Search ingredients by query
 */
router.get(
  "/search",
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

      const validationResult = searchSchema.safeParse(req.query);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid query parameters",
          details: validationResult.error.errors,
        });
      }

      const { q, lang, limit } = validationResult.data;
      const results = searchIngredients(q, lang, limit);

      return res.json({
        success: true,
        data: results,
        count: results.length,
      });
    } catch (error) {
      console.error("Search ingredients error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to search ingredients",
      });
    }
  }
);

/**
 * POST /api/ingredients/calculate
 * Calculate nutrition for an ingredient with quantity and preparation
 */
router.post(
  "/calculate",
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

      const validationResult = calculateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid input",
          details: validationResult.error.errors,
        });
      }

      const {
        ingredient_key,
        quantity,
        unit,
        preparation_method,
        estimated_nutrition,
      } = validationResult.data;

      const nutrition = calculateNutrition(
        ingredient_key,
        quantity,
        unit,
        preparation_method,
        estimated_nutrition
      );

      // Get ingredient details if we have a key
      let ingredientDetails = null;
      if (ingredient_key) {
        ingredientDetails = getIngredient(ingredient_key);
      }

      return res.json({
        success: true,
        data: {
          nutrition,
          ingredient: ingredientDetails
            ? {
                key: ingredient_key,
                name_en: ingredientDetails.name_en,
                name_he: ingredientDetails.name_he,
                category: ingredientDetails.category,
              }
            : null,
        },
      });
    } catch (error) {
      console.error("Calculate nutrition error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to calculate nutrition",
      });
    }
  }
);

/**
 * GET /api/ingredients/units
 * Get available measurement units
 */
router.get(
  "/units",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const units = getAvailableUnits();
      return res.json({
        success: true,
        data: units,
      });
    } catch (error) {
      console.error("Get units error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to get units",
      });
    }
  }
);

/**
 * GET /api/ingredients/preparations
 * Get available preparation methods
 */
router.get(
  "/preparations",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const preparations = getAvailablePreparations();
      return res.json({
        success: true,
        data: preparations,
      });
    } catch (error) {
      console.error("Get preparations error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to get preparations",
      });
    }
  }
);

/**
 * GET /api/ingredients/:key
 * Get ingredient details by key
 */
router.get(
  "/:key",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { key } = req.params;
      const ingredient = getIngredient(key);

      if (!ingredient) {
        return res.status(404).json({
          success: false,
          error: "Ingredient not found",
        });
      }

      const nutrition = lookupNutrition(key);

      return res.json({
        success: true,
        data: {
          key,
          ...ingredient,
          nutrition_per_100g: nutrition,
        },
      });
    } catch (error) {
      console.error("Get ingredient error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to get ingredient",
      });
    }
  }
);

export default router;
