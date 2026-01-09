import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Import optimizedStorage for safe operations, but keep AsyncStorage for getAllKeys
// which doesn't benefit from optimization
let optimizedStorage: any = null;

// Lazy load to avoid circular dependency
const getOptimizedStorage = async () => {
  if (!optimizedStorage) {
    const module = await import("./optimizedStorage");
    optimizedStorage = module.optimizedStorage;
  }
  return optimizedStorage;
};

export interface StorageInfo {
  totalSize: number;
  usedSize: number;
  availableSize: number;
  largeItems: Array<{
    key: string;
    size: number;
  }>;
}

export class StorageCleanupService {
  private static readonly STORAGE_WARNING_THRESHOLD = 0.5; // 50% - more aggressive
  private static readonly STORAGE_CRITICAL_THRESHOLD = 0.7; // 70% - earlier intervention
  private static readonly LARGE_ITEM_THRESHOLD = 512; // 512 bytes
  private static readonly MAX_STORAGE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly MAX_ITEM_SIZE = 1.5 * 1024 * 1024; // 1.5MB per item (safe for SQLite)
  private static readonly SECURE_STORE_SIZE_LIMIT = 2048; // SecureStore limit
  private static readonly CLEANUP_AGE_DAYS = 3; // Keep only 3 days of data

  /**
   * Safe wrapper for AsyncStorage.setItem with size validation
   */
  static async safeSetItem(key: string, value: string): Promise<boolean> {
    try {
      const size = new Blob([value]).size;

      if (size > this.MAX_ITEM_SIZE) {
        console.error(
          `❌ Item too large for single storage: ${key} (${size} bytes, max: ${this.MAX_ITEM_SIZE})`
        );

        // Try to chunk the data
        const chunked = await this.setItemChunked(key, value);
        if (chunked) {
          console.log(`✅ Stored ${key} in chunks`);
          return true;
        }

        return false;
      }

      await AsyncStorage.setItem(key, value);
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to store ${key}:`, error);

      if (
        error?.message?.includes("row too big") ||
        error?.message?.includes("CursorWindow") ||
        error?.message?.includes("database or disk is full") ||
        error?.message?.includes("SQLITE_FULL")
      ) {
        console.error("🚨 SQLite storage error detected");
        await this.emergencyCleanup();
      }

      return false;
    }
  }

  /**
   * Store large items by splitting them into chunks
   */
  private static async setItemChunked(
    key: string,
    value: string
  ): Promise<boolean> {
    try {
      const chunkSize = 1 * 1024 * 1024; // 1MB chunks
      const chunks = Math.ceil(value.length / chunkSize);

      if (chunks > 50) {
        console.error(
          `❌ Data too large even for chunking: ${key} (${chunks} chunks)`
        );
        return false;
      }

      // Store metadata
      await AsyncStorage.setItem(
        `${key}_meta`,
        JSON.stringify({ chunks, timestamp: Date.now() })
      );

      // Store chunks
      for (let i = 0; i < chunks; i++) {
        const chunk = value.slice(i * chunkSize, (i + 1) * chunkSize);
        await AsyncStorage.setItem(`${key}_chunk_${i}`, chunk);
      }

      console.log(`📦 Stored ${key} in ${chunks} chunks`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to chunk ${key}:`, error);
      // Clean up partial chunks
      await this.removeChunkedItem(key);
      return false;
    }
  }

  /**
   * Retrieve chunked items
   */
  static async getItemChunked(key: string): Promise<string | null> {
    try {
      const metaStr = await AsyncStorage.getItem(`${key}_meta`);
      if (!metaStr) {
        // Not a chunked item, try regular get
        return await AsyncStorage.getItem(key);
      }

      const meta = JSON.parse(metaStr);
      const chunks: string[] = [];

      for (let i = 0; i < meta.chunks; i++) {
        const chunk = await AsyncStorage.getItem(`${key}_chunk_${i}`);
        if (chunk === null) {
          console.error(`❌ Missing chunk ${i} for ${key}`);
          return null;
        }
        chunks.push(chunk);
      }

      return chunks.join("");
    } catch (error) {
      console.error(`❌ Failed to retrieve chunked ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove chunked items
   */
  private static async removeChunkedItem(key: string): Promise<void> {
    try {
      const metaStr = await AsyncStorage.getItem(`${key}_meta`);
      if (metaStr) {
        const meta = JSON.parse(metaStr);
        const keysToRemove = [`${key}_meta`];

        for (let i = 0; i < meta.chunks; i++) {
          keysToRemove.push(`${key}_chunk_${i}`);
        }

        await AsyncStorage.multiRemove(keysToRemove);
      }
    } catch (error) {
      console.error(`Failed to remove chunked item ${key}:`, error);
    }
  }

  static async checkAndCleanupIfNeeded(): Promise<boolean> {
    try {
      // Immediate check for SQLITE_FULL error
      if (await this.isDatabaseFull()) {
        console.log("🚨 SQLITE_FULL detected - running emergency cleanup");
        return await this.emergencyCleanup();
      }

      // Check available storage first
      const hasSpace = await this.checkAvailableStorage();
      if (!hasSpace) {
        console.log("🚨 No available storage, running emergency cleanup");
        return await this.emergencyCleanup();
      }

      const storageInfo = await this.getStorageInfo();
      const usageRatio = storageInfo.usedSize / storageInfo.totalSize;

      console.log(
        `📊 Storage usage: ${Math.round(usageRatio * 100)}% (${
          storageInfo.usedSize
        }/${storageInfo.totalSize} bytes)`
      );

      // Log large items
      if (storageInfo.largeItems.length > 0) {
        console.log("📦 Large items detected:");
        storageInfo.largeItems.slice(0, 5).forEach((item) => {
          console.log(`  - ${item.key}: ${(item.size / 1024).toFixed(2)} KB`);
        });
      }

      if (usageRatio > this.STORAGE_CRITICAL_THRESHOLD) {
        console.log(
          "🚨 Critical storage usage detected, running emergency cleanup"
        );
        return await this.emergencyCleanup();
      } else if (usageRatio > this.STORAGE_WARNING_THRESHOLD) {
        console.log("⚠️ High storage usage detected, running routine cleanup");
        return await this.routineCleanup();
      }

      return true;
    } catch (error) {
      console.error("❌ Storage check failed:", error);
      return await this.emergencyCleanup();
    }
  }

  static async checkAvailableStorage(): Promise<boolean> {
    try {
      const testKey = `storage_test_${Date.now()}`;
      const testData = "test_data_for_storage_check";

      await AsyncStorage.setItem(testKey, testData);
      await AsyncStorage.removeItem(testKey);

      return true;
    } catch (error: any) {
      console.error("🚨 Storage availability check failed:", error);

      const isStorageFull =
        error?.message?.includes("database or disk is full") ||
        error?.message?.includes("SQLITE_FULL") ||
        error?.message?.includes("row too big") ||
        error?.message?.includes("CursorWindow") ||
        error?.code === 13 ||
        error?.message?.includes("No space left") ||
        error?.message?.includes("disk full");

      return !isStorageFull;
    }
  }

  static async isDatabaseFull(): Promise<boolean> {
    try {
      const testKey = "storage_test_" + Date.now();
      await AsyncStorage.setItem(testKey, "test");
      await AsyncStorage.removeItem(testKey);
      return false;
    } catch (error: any) {
      console.error("🚨 Database storage test failed:", error);
      return (
        error?.message?.includes("database or disk is full") ||
        error?.message?.includes("row too big") ||
        error?.message?.includes("CursorWindow") ||
        error?.code === 13 ||
        error?.message?.includes("SQLITE_FULL") ||
        error?.message?.includes("disk full") ||
        error?.message?.includes("No space left")
      );
    }
  }

  static async emergencyCleanup(): Promise<boolean> {
    try {
      console.log("🆘 Starting emergency storage cleanup...");

      // Step 1: Selective cleanup - DON'T clear everything, preserve auth
      const keysToPreserve = [
        "persist:auth",
        "userToken",
        "userId",
        "@user_id",
        "@auth_token",
      ];

      try {
        console.log("🗑️ Clearing non-essential AsyncStorage items...");
        const allKeys = await AsyncStorage.getAllKeys();
        const keysToRemove = allKeys.filter(
          (key) => !keysToPreserve.some((preserve) => key.includes(preserve))
        );

        console.log(
          `📊 Removing ${keysToRemove.length} of ${allKeys.length} keys`
        );

        // Remove in batches to avoid overwhelming the system
        const batchSize = 10;
        for (let i = 0; i < keysToRemove.length; i += batchSize) {
          const batch = keysToRemove.slice(i, i + batchSize);
          await AsyncStorage.multiRemove(batch);
        }

        console.log("✅ Selective AsyncStorage cleanup completed");
      } catch (error) {
        console.error("❌ AsyncStorage selective cleanup failed:", error);
        // Try removing individual keys one by one as fallback
        try {
          const allKeys = await AsyncStorage.getAllKeys();
          for (const key of allKeys) {
            if (!keysToPreserve.some((preserve) => key.includes(preserve))) {
              try {
                await AsyncStorage.removeItem(key);
              } catch (e) {
                // Continue with next key
              }
            }
          }
        } catch (e) {
          console.error("Failed to remove individual keys:", e);
        }
      }

      // Step 2: Clean up chunked items
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const chunkKeys = allKeys.filter(
          (key) => key.includes("_chunk_") || key.includes("_meta")
        );

        if (chunkKeys.length > 0) {
          await AsyncStorage.multiRemove(chunkKeys);
          console.log(`🗑️ Removed ${chunkKeys.length} chunk keys`);
        }
      } catch (error) {
        console.error("Failed to clean chunk keys:", error);
      }

      // Step 3: Selective SecureStore cleanup - PRESERVE AUTH
      if (Platform.OS !== "web") {
        try {
          // Keys to remove (non-auth cache and data)
          const keysToRemove = [
            "meal_data",
            "pendingMeal",
            "cachedUserData",
            "largeImageData",
            "meal_cache",
            "user_profile_cache",
            "persist:meal",
            "persist:calendar",
            "persist:questionnaire",
            "persist:statistics",
            "image_cache_",
            "query_cache_",
            "user_questionnaire",
            "meal_analysis_",
            "notification_settings",
            "notification_settings_v3",
            "global_notifications_enabled_v3",
          ];

          for (const key of keysToRemove) {
            try {
              await SecureStore.deleteItemAsync(key);
            } catch (e) {
              // Key might not exist
            }
          }
          console.log("✅ SecureStore selectively cleared (auth preserved)");
        } catch (error) {
          console.error("❌ SecureStore cleanup failed:", error);
        }
      }

      // Step 4: Clear TanStack Query cache
      try {
        const { queryClient } = await import("../services/queryClient");
        queryClient.clear();
        queryClient.removeQueries();
        console.log("✅ Cleared TanStack Query cache");
      } catch (error) {
        console.warn("⚠️ Failed to clear query cache:", error);
      }

      // Step 5: Force garbage collection
      if (global.gc) {
        global.gc();
        console.log("✅ Forced garbage collection");
      }

      console.log("✅ Emergency cleanup completed");
      return true;
    } catch (error) {
      console.error("❌ Emergency cleanup failed:", error);
      return false;
    }
  }

  static async routineCleanup(): Promise<boolean> {
    try {
      console.log("🧹 Starting routine storage cleanup...");

      await this.clearOldMealData(this.CLEANUP_AGE_DAYS);
      await this.clearTemporaryData();
      await this.clearAnalyticsData();
      await this.clearOversizedItems(); // New: remove items that are too large
      await this.clearOldCacheData(this.CLEANUP_AGE_DAYS);

      console.log("✅ Routine cleanup completed");
      return true;
    } catch (error) {
      console.error("❌ Routine cleanup failed:", error);
      return false;
    }
  }

  /**
   * Remove items that exceed safe size limits
   */
  private static async clearOversizedItems(): Promise<void> {
    try {
      const storageInfo = await this.getStorageInfo();
      const oversizedItems = storageInfo.largeItems.filter(
        (item) => item.size > this.MAX_ITEM_SIZE
      );

      if (oversizedItems.length > 0) {
        console.log(`🗑️ Found ${oversizedItems.length} oversized items`);

        for (const item of oversizedItems) {
          try {
            // Check if it's a chunked item
            const isChunked = await AsyncStorage.getItem(`${item.key}_meta`);
            if (isChunked) {
              await this.removeChunkedItem(item.key);
            } else {
              await AsyncStorage.removeItem(item.key);
            }
            console.log(
              `🗑️ Removed oversized item: ${item.key} (${(
                item.size /
                1024 /
                1024
              ).toFixed(2)} MB)`
            );
          } catch (error) {
            console.error(
              `Failed to remove oversized item ${item.key}:`,
              error
            );
          }
        }
      }
    } catch (error) {
      console.error("Failed to clear oversized items:", error);
    }
  }

  private static async clearOldCacheData(daysToKeep: number): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffTimestamp = cutoffDate.getTime();

      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(
        (key) =>
          key.includes("cache_") ||
          key.includes("_cache") ||
          key.includes("query-cache") ||
          key.includes("image_cache")
      );

      let removed = 0;
      for (const key of cacheKeys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            const data = JSON.parse(value);
            if (data.timestamp && data.timestamp < cutoffTimestamp) {
              await AsyncStorage.removeItem(key);
              removed++;
            }
          }
        } catch (e) {
          // If we can't parse it, it's probably corrupted, remove it
          await AsyncStorage.removeItem(key);
          removed++;
        }
      }

      console.log(`🗑️ Removed ${removed} old cache items`);
    } catch (error) {
      console.error("Failed to clear old cache data:", error);
    }
  }

  private static async getStorageInfo(): Promise<StorageInfo> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalUsedSize = 0;
      const largeItems: Array<{ key: string; size: number }> = [];
      const storage = await getOptimizedStorage();

      for (const key of keys) {
        try {
          // Use optimizedStorage to safely get items without CursorWindow errors
          const value = await storage.getItem(key);
          const itemSize = value ? new Blob([value]).size : 0;
          totalUsedSize += itemSize;

          if (itemSize > this.LARGE_ITEM_THRESHOLD) {
            largeItems.push({ key, size: itemSize });
          }
        } catch (error: any) {
          // If we hit CursorWindow error, mark this item as oversized and remove it
          if (error?.message?.includes("CursorWindow") || error?.message?.includes("row too big")) {
            console.warn(`🚨 CursorWindow error for key ${key}, marking for removal`);
            largeItems.push({ key, size: this.MAX_ITEM_SIZE * 2 }); // Mark as oversized

            // Try to remove the problematic item
            try {
              await storage.removeItem(key);
              console.log(`🗑️ Removed oversized item: ${key}`);
            } catch (e) {
              console.error(`Failed to remove oversized item ${key}:`, e);
            }
          } else {
            console.warn(`Failed to get size for key ${key}:`, error);
          }
        }
      }

      return {
        totalSize: this.MAX_STORAGE_SIZE,
        usedSize: totalUsedSize,
        availableSize: this.MAX_STORAGE_SIZE - totalUsedSize,
        largeItems: largeItems.sort((a, b) => b.size - a.size),
      };
    } catch (error) {
      console.error("Failed to get storage info:", error);
      return {
        totalSize: this.MAX_STORAGE_SIZE,
        usedSize: 0,
        availableSize: this.MAX_STORAGE_SIZE,
        largeItems: [],
      };
    }
  }

  private static async clearOldMealData(daysToKeep: number = 7): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const keys = await AsyncStorage.getAllKeys();
      const keysToRemove = [];

      for (const key of keys) {
        if (
          key.includes("meal_") ||
          key.includes("pendingMeal") ||
          key.includes("persist:meal")
        ) {
          try {
            const value = await AsyncStorage.getItem(key);
            if (value) {
              const data = JSON.parse(value);
              const timestamp =
                data.timestamp || data.created_at || data.upload_time;

              if (timestamp && new Date(timestamp) < cutoffDate) {
                keysToRemove.push(key);
              } else if (!timestamp) {
                keysToRemove.push(key);
              }
            }
          } catch (error) {
            keysToRemove.push(key);
          }
        }
      }

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        console.log(`🗑️ Cleared ${keysToRemove.length} old meal data items`);
      }
    } catch (error) {
      console.error("Failed to clear old meal data:", error);
    }
  }

  private static async clearTemporaryData(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const tempKeys = keys.filter(
        (key) =>
          key.includes("temp_") ||
          key.includes("tmp_") ||
          key.includes("cache_") ||
          key.startsWith("__") ||
          key.includes("query_cache") ||
          key.includes("image_") ||
          key.includes("photo_") ||
          key.includes("base64_")
      );

      if (tempKeys.length > 0) {
        await AsyncStorage.multiRemove(tempKeys);
        console.log(`🧹 Cleared ${tempKeys.length} temporary items`);
      }
    } catch (error) {
      console.error("Failed to clear temporary data:", error);
    }
  }

  private static async clearAnalyticsData(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const analyticsKeys = keys.filter(
        (key) =>
          key.includes("analytics_") ||
          key.includes("debug_") ||
          key.includes("log_") ||
          key.includes("crash_") ||
          key.includes("performance_")
      );

      if (analyticsKeys.length > 0) {
        await AsyncStorage.multiRemove(analyticsKeys);
        console.log(`📊 Cleared ${analyticsKeys.length} analytics items`);
      }
    } catch (error) {
      console.error("Failed to clear analytics data:", error);
    }
  }

  static async checkStorageBeforeOperation(): Promise<boolean> {
    try {
      const testResult = await this.performMinimalStorageTest();
      if (!testResult) {
        console.log("🚨 Storage test failed - running emergency cleanup");
        await this.emergencyCleanup();
        return await this.performMinimalStorageTest();
      }
      return true;
    } catch (error) {
      console.error("❌ Storage check failed:", error);
      await this.emergencyCleanup();
      return false;
    }
  }

  static async performMinimalStorageTest(): Promise<boolean> {
    try {
      const testKey = `test_${Date.now()}`;
      const testValue = "test";

      await AsyncStorage.setItem(testKey, testValue);
      const retrieved = await AsyncStorage.getItem(testKey);
      await AsyncStorage.removeItem(testKey);

      return retrieved === testValue;
    } catch (error: any) {
      console.error("🚨 Minimal storage test failed:", error);

      const isSQLiteError =
        error?.message?.includes("database or disk is full") ||
        error?.message?.includes("SQLITE_FULL") ||
        error?.message?.includes("row too big") ||
        error?.message?.includes("CursorWindow") ||
        error?.code === 13 ||
        error?.message?.includes("No space left") ||
        error?.message?.includes("disk full");

      return !isSQLiteError;
    }
  }

  static async monitorStorageUsage(): Promise<void> {
    try {
      const storageInfo = await this.getStorageInfo();
      const usageRatio = storageInfo.usedSize / storageInfo.totalSize;

      console.log(`📊 Storage Monitor: ${Math.round(usageRatio * 100)}% used`);

      if (storageInfo.largeItems.length > 0) {
        console.log("📦 Top 3 largest items:");
        storageInfo.largeItems.slice(0, 3).forEach((item) => {
          console.log(`  - ${item.key}: ${(item.size / 1024).toFixed(2)} KB`);
        });
      }

      if (usageRatio > 0.8) {
        console.warn("⚠️ Storage usage is high, consider cleanup");
        await this.routineCleanup();
      }
    } catch (error) {
      console.error("Failed to monitor storage:", error);
    }
  }

  /**
   * Validate data size before attempting to store
   */
  static validateDataSize(data: string): {
    isValid: boolean;
    size: number;
    recommendation: string;
  } {
    const size = new Blob([data]).size;

    if (size > this.MAX_ITEM_SIZE) {
      return {
        isValid: false,
        size,
        recommendation: `Data is ${(size / 1024 / 1024).toFixed(
          2
        )}MB, which exceeds the ${(this.MAX_ITEM_SIZE / 1024 / 1024).toFixed(
          2
        )}MB limit. Consider using file system storage or chunking.`,
      };
    }

    if (size > this.MAX_ITEM_SIZE * 0.8) {
      return {
        isValid: true,
        size,
        recommendation: `Data is ${(size / 1024 / 1024).toFixed(
          2
        )}MB, approaching the limit. Consider optimization.`,
      };
    }

    return {
      isValid: true,
      size,
      recommendation: "Data size is acceptable.",
    };
  }
}
