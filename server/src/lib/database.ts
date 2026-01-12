import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

// Create Prisma client optimized for Supabase pooler
export const prisma =
  global.__prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

let isConnected = false;
let connectionPromise: Promise<void> | null = null;

const MAX_RETRIES = 5; // Increase retries for pooler
const INITIAL_RETRY_DELAY = 1000; // Start with 1 second

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function connectDatabase() {
  if (isConnected) return;
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`🔌 Database connection attempt ${attempt}/${MAX_RETRIES}...`);
        
        // Set a timeout for the connection attempt
        const connectPromise = prisma.$connect();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 10000)
        );
        
        await Promise.race([connectPromise, timeoutPromise]);
        
        // Quick health check
        await prisma.$queryRaw`SELECT 1`;

        isConnected = true;
        console.log("✅ Database connected successfully");
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`❌ Attempt ${attempt} failed:`, lastError.message);
        
        isConnected = false;

        if (attempt < MAX_RETRIES) {
          // Exponential backoff: 1s, 2s, 4s, 8s, 16s
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
          console.log(`⏳ Retrying in ${delay}ms...`);
          await sleep(delay);
        }
      }
    }

    connectionPromise = null;
    throw new Error(
      `Failed to connect after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`
    );
  })();

  try {
    await connectionPromise;
  } finally {
    connectionPromise = null;
  }
}

const disconnect = async () => {
  try {
    if (isConnected) {
      console.log("🔌 Disconnecting from database...");
      await prisma.$disconnect();
      isConnected = false;
      console.log("✅ Database disconnected");
    }
  } catch (error) {
    console.error("❌ Error during disconnect:", error);
  }
};

process.on("beforeExit", disconnect);
process.on("SIGINT", async () => {
  await disconnect();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await disconnect();
  process.exit(0);
});

export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("❌ Database health check failed:", error);
    isConnected = false;
    return false;
  }
}