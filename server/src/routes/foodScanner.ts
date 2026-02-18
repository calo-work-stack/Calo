import { Router, Response } from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { FoodScannerService } from "../services/foodScanner";
import { UsageTrackingService } from "../services/usageTracking";
import { z } from "zod";
import { ProductData } from "../types/foodScanner";
import { estimateProductPrice } from "../utils/pricing";

const router = Router();

// Validation schemas
const barcodeSchema = z.object({
  barcode: z.string().min(8, "Barcode must be at least 8 characters"),
});

const imageSchema = z
  .object({
    image: z.string().min(100, "Image data is required").optional(),
    imageBase64: z.string().min(100, "Image data is required").optional(),
  })
  .refine((data) => data.image || data.imageBase64, {
    message: "Either image or imageBase64 is required",
  });

const addToMealSchema = z.object({
  productData: z.object({
    name: z.string(),
    brand: z.string().optional().nullable(),
    category: z.string().default("other"),
    nutrition_per_100g: z.object({
      calories: z.coerce.number().default(0),
      protein: z.coerce.number().default(0),
      carbs: z.coerce.number().default(0),
      fat: z.coerce.number().default(0),
      fiber: z.coerce.number().optional(),
      sugar: z.coerce.number().optional(),
      sodium: z.coerce.number().optional(),
    }).default({ calories: 0, protein: 0, carbs: 0, fat: 0 }),
    ingredients: z.array(z.string()).default([]),
    allergens: z.array(z.string()).default([]),
    labels: z.array(z.string()).default([]),
    health_score: z.coerce.number().optional().nullable(),
    barcode: z.string().optional().nullable(),
    image_url: z.string().optional().nullable(),
    // Price estimation fields
    estimated_price: z.coerce.number().optional().nullable(),
    price_per_100g: z.coerce.number().optional().nullable(),
    price_confidence: z.enum(["high", "medium", "low"]).optional().nullable(),
  }),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1 gram"),
  mealTiming: z.string().optional().default("snack"),
  is_mandatory: z.boolean().optional(),
  estimated_price: z.coerce.number().optional(), // Final price for the quantity
});

// Scan barcode endpoint
router.post(
  "/barcode",
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

      console.log("🔍 Barcode scan request received");
      const validationResult = barcodeSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid barcode",
          details: validationResult.error.errors,
        });
      }

      const { barcode } = validationResult.data;

      const result = await FoodScannerService.scanBarcode(barcode, userId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("❌ Barcode scan error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isNotFound = errorMessage.toLowerCase().includes("not found");
      res.status(isNotFound ? 404 : 500).json({
        success: false,
        error: isNotFound
          ? "Product not found. Try entering the barcode manually or search by name."
          : "Failed to scan barcode. Please try again.",
      });
    }
  },
);

// Scan image endpoint
router.post(
  "/image",
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

      const limitCheck = await UsageTrackingService.checkMealScanLimit(userId);
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

      console.log("📷 Image scan request received");
      const validationResult = imageSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid image data",
          details: validationResult.error.errors,
        });
      }

      const { image, imageBase64 } = validationResult.data;
      const imageData = image || imageBase64 || "";

      const result = await FoodScannerService.scanProductImage(
        imageData,
        userId,
      );

      await UsageTrackingService.incrementMealScanCount(userId);

      res.json({
        success: true,
        data: result,
        usage: {
          current: limitCheck.current + 1,
          limit: limitCheck.limit,
          remaining: limitCheck.remaining - 1,
        },
      });
    } catch (error) {
      console.error("❌ Image scan error:", error);
      res.status(500).json({
        success: false,
        error: "Could not identify the product. Please try a clearer image or search by name.",
      });
    }
  },
);

// Add product to meal log endpoint
router.post(
  "/add-to-meal",
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

      console.log("📝 Add to meal log request received");
      const validationResult = addToMealSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid meal data",
          details: validationResult.error.errors,
        });
      }

      const { productData, quantity, mealTiming, is_mandatory } =
        validationResult.data;

      // Calculate estimated price for the quantity
      let finalEstimatedPrice = validationResult.data.estimated_price;
      if (!finalEstimatedPrice && productData.price_per_100g) {
        finalEstimatedPrice = Math.round((productData.price_per_100g * quantity / 100) * 100) / 100;
      } else if (!finalEstimatedPrice) {
        const priceEstimate = estimateProductPrice(productData.name, productData.category, quantity);
        finalEstimatedPrice = priceEstimate.estimated_price;
      }

      const meal = await FoodScannerService.addProductToMealLog(
        userId,
        productData,
        quantity,
        mealTiming,
        is_mandatory,
      );

      res.json({
        success: true,
        data: {
          ...meal,
          estimated_price: finalEstimatedPrice,
        },
      });
    } catch (error) {
      console.error("❌ Add to meal error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to add product to meal log. Please try again.",
      });
    }
  },
);

// Search products by name (for manual entry)
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

      const query = req.query.q as string;
      const page = parseInt(req.query.page as string) || 1;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: "Search query must be at least 2 characters",
        });
      }

      console.log("🔍 Product search request:", query);
      const products = await FoodScannerService.searchProductsByName(
        query.trim(),
        page,
      );

      res.json({
        success: true,
        data: products,
        query: query,
        page: page,
        count: products.length,
      });
    } catch (error) {
      console.error("❌ Product search error:", error);
      res.status(500).json({
        success: false,
        error: "Search failed. Please try again.",
      });
    }
  },
);

// Add this to your food-scanner routes file (where you have the /search route)

router.post(
  "/search/save",
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

      const productData = req.body.product as ProductData;

      if (!productData || !productData.name) {
        return res.status(400).json({
          success: false,
          error: "Invalid product data",
        });
      }

      console.log("💾 Saving selected product to history:", productData.name);

      await FoodScannerService.saveSearchedProductToHistory(
        productData,
        userId,
      );

      res.json({
        success: true,
        message: "Product saved to scan history",
      });
    } catch (error) {
      console.error("❌ Error saving product:", error);
      res.status(500).json({
        success: false,
        error: "Failed to save product to history.",
      });
    }
  },
);
// Get scan history
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

      const products = await FoodScannerService.getScanHistory(userId);

      res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      console.error("❌ Get scan history error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get scan history",
      });
    }
  },
);

export default router;
