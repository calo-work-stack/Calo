import express, { Request, Response } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth";
import { z } from "zod";

const router = express.Router();
const prisma = new PrismaClient();

// Define the AuthenticatedUser interface to match what the auth middleware provides
interface AuthenticatedUser {
  user_id: string;
  email: string;
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

// Validation schemas
const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  quantity: z.number().positive("Quantity must be positive").default(1),
  unit: z.string().default("pieces"),
  category: z.string().default("Manual"),
  added_from: z.string().optional(),
  product_barcode: z.string().optional(),
  estimated_cost: z.number().optional(),
  // Metadata can include ingredient image (ing_img) and other custom fields
  metadata: z.object({
    ing_img: z.string().optional(),
    barcode: z.string().optional(),
  }).passthrough().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  quantity: z.number().positive("Quantity must be positive").optional(),
  unit: z.string().optional(),
  category: z.string().optional(),
  estimated_cost: z.number().optional().nullable(),
});

// Validation helpers
const validateShoppingItem = (item: any) => {
  const errors: string[] = [];

  if (
    !item.name ||
    typeof item.name !== "string" ||
    item.name.trim().length === 0
  ) {
    errors.push("Name is required and must be a non-empty string");
  }

  if (item.quantity !== undefined) {
    const qty = parseFloat(item.quantity);
    if (isNaN(qty) || qty <= 0) {
      errors.push("Quantity must be a positive number");
    }
  }

  if (item.unit && typeof item.unit !== "string") {
    errors.push("Unit must be a string");
  }

  if (item.category && typeof item.category !== "string") {
    errors.push("Category must be a string");
  }

  if (item.added_from && typeof item.added_from !== "string") {
    errors.push("added_from must be a string");
  }

  return errors;
};

// Get user's shopping list
router.get(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.user_id;
      if (!userId) {
        console.error("❌ [ShoppingList] User not authenticated");
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      console.log("📦 [ShoppingList] Fetching shopping list for user:", userId);

      const shoppingList = await prisma.shoppingList.findMany({
        where: { user_id: userId },
        orderBy: [{ is_purchased: "asc" }, { created_at: "desc" }],
      });

      console.log("✅ [ShoppingList] Found", shoppingList.length, "items");

      res.json({
        success: true,
        data: shoppingList.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          is_purchased: item.is_purchased,
          added_from: item.added_from,
          estimated_cost: item.estimated_cost,
          created_at: item.created_at,
          updated_at: item.updated_at,
          barcode:
            item.metadata &&
            typeof item.metadata === "object" &&
            "barcode" in item.metadata
              ? item.metadata.barcode
              : undefined,
        })),
      });
    } catch (error) {
      console.error("❌ [ShoppingList] Error fetching shopping list:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch shopping list",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Add single item to shopping list
router.post(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.user_id;
      if (!userId) {
        console.error("❌ [ShoppingList] User not authenticated");
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      console.log("📦 [ShoppingList] Adding item for user:", userId, req.body);

      // Validate input using zod schema
      const validatedData = createSchema.parse(req.body);

      // Check for duplicate items
      const existingItem = await prisma.shoppingList.findFirst({
        where: {
          user_id: userId,
          name: {
            equals: validatedData.name.trim(),
            mode: "insensitive",
          },
          is_purchased: false,
        },
      });

      if (existingItem) {
        // Update existing item quantity
        const updatedItem = await prisma.shoppingList.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + validatedData.quantity,
            updated_at: new Date(),
          },
        });

        return res.json({
          success: true,
          data: updatedItem,
          message: "Existing item quantity updated",
        });
      }

      const createData: any = {
        user_id: userId,
        name: validatedData.name.trim(),
        quantity: validatedData.quantity,
        unit: validatedData.unit,
        category: validatedData.category,
        added_from: validatedData.added_from || "manual",
        estimated_cost: validatedData.estimated_cost || null,
        is_purchased: false,
      };

      // Add metadata if provided (includes ing_img, barcode, etc.)
      if (validatedData.metadata || validatedData.product_barcode) {
        createData.metadata = {
          ...(validatedData.metadata || {}),
          ...(validatedData.product_barcode ? { barcode: validatedData.product_barcode } : {}),
        };
      }

      const item = await prisma.shoppingList.create({
        data: createData,
      });

      console.log("✅ [ShoppingList] Item created:", item.id, item.name);

      res.status(201).json({
        success: true,
        data: item,
        message: "Item added successfully",
      });
    } catch (error) {
      console.error("❌ [ShoppingList] Error adding item:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: error.errors,
        });
      }
      res.status(500).json({
        success: false,
        error: "Failed to add item",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Bulk add items to shopping list
router.post(
  "/bulk-add",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.user_id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const { items } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Items must be a non-empty array",
        });
      }

      console.log(
        "📦 [ShoppingList] Bulk adding items for user:",
        userId,
        "- count:",
        items.length
      );

      const addedItems: any[] = [];
      const updatedItems: any[] = [];
      const errors: string[] = [];

      for (let i = 0; i < items.length; i++) {
        const itemData = items[i];

        try {
          // Validate each item
          const validatedData = createSchema.parse(itemData);

          // Check for existing item
          const existingItem = await prisma.shoppingList.findFirst({
            where: {
              user_id: userId,
              name: {
                equals: validatedData.name.trim(),
                mode: "insensitive",
              },
              is_purchased: false,
            },
          });

          if (existingItem) {
            const updated = await prisma.shoppingList.update({
              where: { id: existingItem.id },
              data: {
                quantity: existingItem.quantity + validatedData.quantity,
                updated_at: new Date(),
              },
            });
            updatedItems.push(updated);
          } else {
            const createData: any = {
              user_id: userId,
              name: validatedData.name.trim(),
              quantity: validatedData.quantity,
              unit: validatedData.unit,
              category: validatedData.category,
              added_from: validatedData.added_from || "manual",
              estimated_cost: validatedData.estimated_cost || null,
              is_purchased: false,
            };

            // Add metadata if provided (includes ing_img, barcode, etc.)
            if (validatedData.metadata || validatedData.product_barcode) {
              createData.metadata = {
                ...(validatedData.metadata || {}),
                ...(validatedData.product_barcode ? { barcode: validatedData.product_barcode } : {}),
              };
            }

            const newItem = await prisma.shoppingList.create({
              data: createData,
            });
            addedItems.push(newItem);
          }
        } catch (itemError) {
          console.error(`Error processing item ${i + 1}:`, itemError);
          if (itemError instanceof z.ZodError) {
            errors.push(
              `Item ${i + 1}: Validation failed - ${itemError.errors
                .map((e) => e.message)
                .join(", ")}`
            );
          } else {
            errors.push(
              `Item ${i + 1}: ${
                itemError instanceof Error ? itemError.message : "Unknown error"
              }`
            );
          }
        }
      }

      if (
        errors.length > 0 &&
        addedItems.length === 0 &&
        updatedItems.length === 0
      ) {
        return res.status(400).json({
          success: false,
          error: "Failed to process any items",
          details: errors,
        });
      }

      console.log(
        `✅ [ShoppingList] Bulk add completed: ${addedItems.length} added, ${updatedItems.length} updated`
      );

      res.status(201).json({
        success: true,
        data: {
          added: addedItems.length,
          updated: updatedItems.length,
          total: addedItems.length + updatedItems.length,
          errors: errors.length > 0 ? errors : undefined,
        },
        message: `Successfully processed ${
          addedItems.length + updatedItems.length
        } items${errors.length > 0 ? ` (${errors.length} errors)` : ""}`,
      });
    } catch (error) {
      console.error("❌ Error bulk adding items:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Validation failed for bulk add request",
          details: error.errors,
        });
      }
      res.status(500).json({
        success: false,
        error: "Failed to add items",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Update item
router.put(
  "/:id",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.user_id;
      const itemId = req.params.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      if (!itemId) {
        return res.status(400).json({
          success: false,
          error: "Item ID is required",
        });
      }

      // Check if item exists and belongs to user
      const existingItem = await prisma.shoppingList.findFirst({
        where: {
          id: itemId,
          user_id: userId,
        },
      });

      if (!existingItem) {
        return res.status(404).json({
          success: false,
          error: "Item not found or access denied",
        });
      }

      // Validate input using zod schema
      const validatedData = updateSchema.parse(req.body);

      const updateData: any = { updated_at: new Date() };

      if (validatedData.name !== undefined)
        updateData.name = validatedData.name.trim();
      if (validatedData.quantity !== undefined)
        updateData.quantity = validatedData.quantity;
      if (validatedData.unit !== undefined)
        updateData.unit = validatedData.unit.trim();
      if (validatedData.category !== undefined)
        updateData.category = validatedData.category.trim();
      if (validatedData.estimated_cost !== undefined)
        updateData.estimated_cost = validatedData.estimated_cost;

      // Handle potential metadata updates if provided, e.g., barcode
      if (req.body.metadata?.barcode !== undefined) {
        const existingMetadata =
          existingItem.metadata &&
          typeof existingItem.metadata === "object" &&
          !Array.isArray(existingItem.metadata)
            ? (existingItem.metadata as Prisma.JsonObject)
            : {};

        updateData.metadata = {
          ...existingMetadata,
          barcode: req.body.metadata.barcode,
        };
      }

      const updatedItem = await prisma.shoppingList.update({
        where: { id: itemId },
        data: updateData,
      });

      res.json({
        success: true,
        data: updatedItem,
        message: "Item updated successfully",
      });
    } catch (error) {
      console.error("Error updating shopping list item:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: error.errors,
        });
      }
      res.status(500).json({
        success: false,
        error: "Failed to update item",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Toggle purchased status
router.put(
  "/:id/toggle",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.user_id;
      const itemId = req.params.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      if (!itemId) {
        return res.status(400).json({
          success: false,
          error: "Item ID is required",
        });
      }

      const item = await prisma.shoppingList.findFirst({
        where: { id: itemId, user_id: userId },
      });

      if (!item) {
        return res.status(404).json({
          success: false,
          error: "Item not found or access denied",
        });
      }

      const updatedItem = await prisma.shoppingList.update({
        where: { id: itemId },
        data: {
          is_purchased: !item.is_purchased,
          updated_at: new Date(),
        },
      });

      res.json({
        success: true,
        data: updatedItem,
        message: `Item marked as ${
          updatedItem.is_purchased ? "purchased" : "not purchased"
        }`,
      });
    } catch (error) {
      console.error("Error toggling item status:", error);
      res.status(500).json({
        success: false,
        error: "Failed to toggle item status",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Delete item
router.delete(
  "/:id",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.user_id;
      const itemId = req.params.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      if (!itemId) {
        return res.status(400).json({
          success: false,
          error: "Item ID is required",
        });
      }

      const existingItem = await prisma.shoppingList.findFirst({
        where: {
          id: itemId,
          user_id: userId,
        },
      });

      if (!existingItem) {
        return res.status(404).json({
          success: false,
          error: "Item not found or access denied",
        });
      }

      await prisma.shoppingList.delete({
        where: { id: itemId },
      });

      res.json({
        success: true,
        message: "Item deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting shopping list item:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete item",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Clear all purchased items
router.delete(
  "/purchased",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.user_id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const deletedItems = await prisma.shoppingList.deleteMany({
        where: {
          user_id: userId,
          is_purchased: true,
        },
      });

      res.json({
        success: true,
        data: { deleted: deletedItems.count },
        message: `${deletedItems.count} purchased items cleared`,
      });
    } catch (error) {
      console.error("Error clearing purchased items:", error);
      res.status(500).json({
        success: false,
        error: "Failed to clear purchased items",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Get shopping list statistics
router.get(
  "/stats",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.user_id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const [total, purchased, categories] = await Promise.all([
        prisma.shoppingList.count({
          where: { user_id: userId },
        }),
        prisma.shoppingList.count({
          where: { user_id: userId, is_purchased: true },
        }),
        prisma.shoppingList.groupBy({
          by: ["category"],
          where: { user_id: userId },
          _count: true,
        }),
      ]);

      const totalCost = await prisma.shoppingList.aggregate({
        where: { user_id: userId },
        _sum: { estimated_cost: true },
      });

      res.json({
        success: true,
        data: {
          total_items: total,
          purchased_items: purchased,
          pending_items: total - purchased,
          completion_rate:
            total > 0 ? Math.round((purchased / total) * 100) : 0,
          categories: categories.map((cat) => ({
            name: cat.category,
            count: cat._count,
          })),
          estimated_total_cost: totalCost._sum.estimated_cost || 0,
        },
      });
    } catch (error) {
      console.error("Error fetching shopping list stats:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default router;
