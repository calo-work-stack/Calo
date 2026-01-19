// src/middleware/tenantMiddleware.ts
import { Prisma } from "@prisma/client";

export function tenantMiddleware(tenantId: string) {
  return async (params: any, next: (params: any) => Promise<any>) => {
    const tablesWithTenant = [
      "User",
      "Meal",
      "NutritionPlan",
      "ShoppingList",
      "DailyGoal",
      "MealCompletion",
      "Achievement",
      "Device",
      "MealPlan",
      "CalendarEntry",
    ];

    // אם הטבלה לא צריכה tenant, המשך
    if (!params.model || !tablesWithTenant.includes(params.model)) {
      return next(params);
    }

    // Log (הסר בפרודקשן)
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `🔒 Tenant filter: ${params.model}.${params.action} -> ${tenantId}`
      );
    }

    // Read operations
    if (
      [
        "findMany",
        "findFirst",
        "findUnique",
        "update",
        "updateMany",
        "delete",
        "deleteMany",
        "count",
        "aggregate",
      ].includes(params.action)
    ) {
      params.args = params.args || {};
      params.args.where = {
        ...params.args.where,
        tenant_id: tenantId,
      };
    }

    // Create
    if (params.action === "create") {
      params.args = params.args || {};
      params.args.data = {
        ...params.args.data,
        tenant_id: tenantId,
      };
    }

    // CreateMany
    if (params.action === "createMany") {
      params.args = params.args || {};
      if (Array.isArray(params.args.data)) {
        params.args.data = params.args.data.map((item: any) => ({
          ...item,
          tenant_id: tenantId,
        }));
      }
    }

    // Upsert
    if (params.action === "upsert") {
      params.args = params.args || {};
      params.args.where = {
        ...params.args.where,
        tenant_id: tenantId,
      };
      params.args.create = {
        ...params.args.create,
        tenant_id: tenantId,
      };
      params.args.update = {
        ...params.args.update,
        tenant_id: tenantId,
      };
    }

    return next(params);
  };
}
