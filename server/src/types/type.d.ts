import { PrismaClient } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      prisma?: PrismaClient;
      tenantId?: string;
      // user כבר מוגדר במקום אחר, לא צריך להגדיר כאן
    }
  }
}

export {};