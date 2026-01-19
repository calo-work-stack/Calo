// src/middleware/prismaTenantMiddleware.ts
import { Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { tenantMiddleware } from "./tenantMiddleware";
import { AuthRequest } from "./auth";

// ✅ הרחב את AuthRequest עם prisma ו-tenantId
export interface TenantAuthRequest extends AuthRequest {
  prisma?: PrismaClient;
  tenantId?: string;
}

export async function prismaTenantMiddleware(
  req: TenantAuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // ✅ וודא שיש משתמש מאומת
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required before tenant middleware",
      });
    }

    // ✅ קבל tenant_id מהמשתמש
    const tenantId = req.user.tenant_id;

    if (!tenantId || tenantId.trim().length === 0) {
      console.error("❌ User missing tenant_id:", req.user.email);
      return res.status(403).json({
        error: "User account not properly configured (missing tenant)",
      });
    }

    req.tenantId = tenantId;

    // ✅ צור Prisma instance עם tenant middleware
    const prisma = new PrismaClient();
    (prisma as any).$use(tenantMiddleware(tenantId));
    req.prisma = prisma;

    // ✅ Log
    console.log(`🔐 Tenant context: ${tenantId} | User: ${req.user.email}`);

    // ✅ ניקוי
    res.on("finish", async () => {
      try {
        await prisma.$disconnect();
      } catch (err) {
        console.error("Error disconnecting Prisma:", err);
      }
    });

    res.on("close", async () => {
      if (!res.writableEnded) {
        try {
          await prisma.$disconnect();
        } catch (err) {
          console.error("Error disconnecting Prisma on close:", err);
        }
      }
    });

    next();
  } catch (error) {
    console.error("Prisma tenant middleware error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
