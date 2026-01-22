import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { errorMessageIncludesAny } from "./errorHandler";

interface StorageInfo {
  totalSize: number;
  itemCount: number;
  largeItems: Array<{ key: string; size: number }>;
}

export class DatabaseCleanupService {
  private static readonly MAX_STORAGE_SIZE = 50 * 1024 * 1024; // 50MB limit
  private static readonly MAX_ITEM_SIZE = 1024 * 1024; // 1MB per item
  private static readonly CLEANUP_KEYS = [
    "meal_cache_",
    "statistics_cache_",
    "old_user_data_",
    "temp_image_",
    "expired_session_",
  ];

  /**
   * Get storage information - safe version that handles CursorWindow errors
   */
  static async getStorageInfo(): Promise<StorageInfo> {
    try {
      const keys = await AsyncStorage.getAllKeys();

      let totalSize = 0;
      let itemCount = 0;
      const largeItems: Array<{ key: string; size: number }> = [];
      const problematicKeys: string[] = [];

      // Get items one by one to avoid CursorWindow errors
      for (const key of keys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            const size = new Blob([value]).size;
            totalSize += size;
            itemCount++;

            if (size > this.MAX_ITEM_SIZE) {
              largeItems.push({ key, size });
            }
          }
        } catch (itemError: any) {
          // If we can't read this item, it's likely causing CursorWindow errors
          if (itemError?.message?.includes("CursorWindow") ||
              itemError?.message?.includes("row too big")) {
            console.warn(`🚨 CursorWindow error for key: ${key}, marking for removal`);
            problematicKeys.push(key);
            // Estimate large size since we can't read it
            largeItems.push({ key, size: this.MAX_ITEM_SIZE * 2 });
          } else {
            console.warn(`Failed to read ${key}:`, itemError);
          }
        }
      }

      // Immediately try to remove problematic keys that cause CursorWindow errors
      if (problematicKeys.length > 0) {
        console.log(`🗑️ Removing ${problematicKeys.length} problematic keys...`);
        for (const key of problematicKeys) {
          try {
            await AsyncStorage.removeItem(key);
            console.log(`✅ Removed problematic key: ${key}`);
          } catch (removeError) {
            console.error(`Failed to remove ${key}:`, removeError);
          }
        }
      }

      return { totalSize, itemCount, largeItems };
    } catch (error: any) {
      console.error("Error getting storage info:", error);

      // If even getting keys fails, try emergency cleanup
      if (errorMessageIncludesAny(error, ["CursorWindow", "row too big"])) {
        console.log("🚨 CursorWindow error detected, running emergency cleanup");
        await this.emergencyCleanup();
      }

      return { totalSize: 0, itemCount: 0, largeItems: [] };
    }
  }

  /**
   * Clean up old and large cache items - safe version
   */
  static async performCleanup(): Promise<{
    cleaned: number;
    freedSpace: number;
  }> {
    try {
      console.log("🧹 Starting database cleanup...");

      const keys = await AsyncStorage.getAllKeys();
      let cleanedItems = 0;
      let freedSpace = 0;
      const keysToRemove: string[] = [];

      // Process items one by one to avoid CursorWindow errors
      for (const key of keys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (!value) continue;

          const size = new Blob([value]).size;
          let shouldRemove = false;

          // Check if it's a cleanup target
          for (const cleanupKey of this.CLEANUP_KEYS) {
            if (key.startsWith(cleanupKey)) {
              shouldRemove = true;
              break;
            }
          }

          // Check if item is too large
          if (size > this.MAX_ITEM_SIZE) {
            shouldRemove = true;
            console.log(
              `🗑️ Removing large item: ${key} (${(size / 1024).toFixed(1)}KB)`
            );
          }

          // Check if item is expired cache
          if (key.includes("cache_") && this.isCacheExpired(key, value)) {
            shouldRemove = true;
          }

          if (shouldRemove) {
            keysToRemove.push(key);
            freedSpace += size;
          }
        } catch (itemError: any) {
          // If we can't read an item, it may be corrupted or too large - remove it
          if (itemError?.message?.includes("CursorWindow") ||
              itemError?.message?.includes("row too big")) {
            console.warn(`🚨 CursorWindow error for ${key}, removing...`);
            keysToRemove.push(key);
          }
        }
      }

      // Remove identified items one by one to be safe
      for (const key of keysToRemove) {
        try {
          await AsyncStorage.removeItem(key);
          cleanedItems++;
        } catch (removeError) {
          console.error(`Failed to remove ${key}:`, removeError);
        }
      }

      console.log(
        `✅ Cleaned ${cleanedItems} items, freed ${(freedSpace / 1024).toFixed(1)}KB`
      );

      return { cleaned: cleanedItems, freedSpace };
    } catch (error) {
      console.error("Error during cleanup:", error);
      return { cleaned: 0, freedSpace: 0 };
    }
  }

  /**
   * Check if cached item is expired
   */
  private static isCacheExpired(key: string, value: string): boolean {
    try {
      const data = JSON.parse(value);
      if (data.timestamp && data.ttl) {
        const expiry = data.timestamp + data.ttl;
        return Date.now() > expiry;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Remove any images accidentally stored in AsyncStorage
   */
  static async removeStoredImages(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const imageKeys = keys.filter(
        (key) =>
          key.includes("image_") ||
          key.includes("avatar_") ||
          key.includes("meal_photo_") ||
          key.includes("base64_") ||
          key.includes("photo_")
      );

      if (imageKeys.length > 0) {
        await AsyncStorage.multiRemove(imageKeys);
        console.log(
          `🗑️ Removed ${imageKeys.length} image entries from AsyncStorage`
        );
      }
    } catch (error) {
      console.error("Error removing stored images:", error);
    }
  }

  /**
   * Clear expired sessions and tokens
   */
  static async clearExpiredSessions(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const sessionKeys = keys.filter(
        (key) => key.includes("session_") || key.includes("temp_token_")
      );

      for (const key of sessionKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value && this.isCacheExpired(key, value)) {
          await AsyncStorage.removeItem(key);
          console.log(`🗑️ Removed expired session: ${key}`);
        }
      }
    } catch (error) {
      console.error("Error clearing expired sessions:", error);
    }
  }

  /**
   * Remove oversized entries that cause CursorWindow errors
   */
  static async removeOversizedEntries(): Promise<number> {
    let removed = 0;
    try {
      console.log("🔍 Scanning for oversized AsyncStorage entries...");

      const keys = await AsyncStorage.getAllKeys();
      const MAX_SAFE_SIZE = 100 * 1024; // 100KB - be conservative

      for (const key of keys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            const size = new Blob([value]).size;

            if (size > MAX_SAFE_SIZE) {
              await AsyncStorage.removeItem(key);
              console.log(
                `🗑️ Removed oversized entry: ${key} (${(size / 1024).toFixed(
                  1
                )}KB)`
              );
              removed++;
            }
          }
        } catch (itemError) {
          // If we can't even read it, it's likely corrupted or too large - remove it
          try {
            await AsyncStorage.removeItem(key);
            console.log(`🗑️ Removed unreadable entry: ${key}`);
            removed++;
          } catch (removeError) {
            console.error(`Failed to remove ${key}:`, removeError);
          }
        }
      }

      console.log(`✅ Removed ${removed} oversized entries`);
    } catch (error) {
      console.error("Error removing oversized entries:", error);
    }
    return removed;
  }

  /**
   * Emergency cleanup when storage is full or has CursorWindow errors
   */
  static async emergencyCleanup(): Promise<void> {
    try {
      console.log("🚨 Emergency cleanup triggered");

      // First, remove oversized entries (primary cause of CursorWindow errors)
      await this.removeOversizedEntries();

      // Remove any stored images
      await this.removeStoredImages();

      // Remove all cache items
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.includes("cache_"));

      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`🧹 Emergency: Removed ${cacheKeys.length} cache items`);
      }

      // Clear temporary files
      const tempKeys = keys.filter((key) => key.includes("temp_"));
      if (tempKeys.length > 0) {
        await AsyncStorage.multiRemove(tempKeys);
        console.log(`🧹 Emergency: Removed ${tempKeys.length} temp items`);
      }
    } catch (error) {
      console.error("Error during emergency cleanup:", error);
    }
  }

  /**
   * Monitor storage and trigger cleanup if needed
   */
  static async monitorStorage(): Promise<void> {
    try {
      const storageInfo = await this.getStorageInfo();

      console.log(
        `📊 Storage: ${(storageInfo.totalSize / 1024).toFixed(1)}KB, ${
          storageInfo.itemCount
        } items`
      );

      // Trigger cleanup if storage is getting full
      if (storageInfo.totalSize > this.MAX_STORAGE_SIZE * 0.8) {
        console.log("⚠️ Storage approaching limit, starting cleanup...");
        await this.performCleanup();
      }

      // Emergency cleanup if storage is critical
      if (storageInfo.totalSize > this.MAX_STORAGE_SIZE) {
        console.log("🚨 Storage limit exceeded, emergency cleanup...");
        await this.emergencyCleanup();
      }
    } catch (error) {
      console.error("Error monitoring storage:", error);
    }
  }
}

// Auto-cleanup on app start
export const initializeStorageCleanup = async (): Promise<void> => {
  try {
    // Immediately remove any oversized entries that could cause CursorWindow errors
    console.log("🧹 Running startup cleanup...");

    // Run emergency cleanup first to clear any CursorWindow-causing entries
    await DatabaseCleanupService.emergencyCleanup();

    // Then remove oversized entries more aggressively
    await DatabaseCleanupService.removeOversizedEntries();
    await DatabaseCleanupService.removeStoredImages();

    await DatabaseCleanupService.monitorStorage();
    await DatabaseCleanupService.clearExpiredSessions();

    // Schedule periodic cleanup - run more frequently
    setInterval(async () => {
      try {
        await DatabaseCleanupService.monitorStorage();
      } catch (e) {
        console.warn("Periodic cleanup failed, running emergency:", e);
        await DatabaseCleanupService.emergencyCleanup();
      }
    }, 3 * 60 * 1000); // Every 3 minutes
  } catch (error: any) {
    console.error("Error initializing storage cleanup:", error);

    // If we hit CursorWindow error, try more aggressive cleanup
    if (errorMessageIncludesAny(error, ["CursorWindow", "row too big"])) {
      console.log("🚨 CursorWindow error at startup, running aggressive cleanup");
    }

    // If cleanup fails, try emergency cleanup
    try {
      await DatabaseCleanupService.emergencyCleanup();
    } catch (emergencyError) {
      console.error("Emergency cleanup also failed:", emergencyError);
    }
  }
};
