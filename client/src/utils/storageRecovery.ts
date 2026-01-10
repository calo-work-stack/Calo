import AsyncStorage from "@react-native-async-storage/async-storage";

export class StorageRecoveryService {
  static async clearOversizedEntries(): Promise<{
    success: boolean;
    removed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let removed = 0;

    try {
      console.log("🔧 Starting aggressive storage recovery for CursorWindow errors...");

      let keys: readonly string[] = [];

      try {
        keys = await AsyncStorage.getAllKeys();
        console.log(`📋 Found ${keys.length} storage keys`);
      } catch (getAllKeysError: any) {
        console.error("❌ Failed to get all keys:", getAllKeysError);

        // If we can't even get keys, the database is severely corrupted
        if (getAllKeysError?.message?.includes("CursorWindow") ||
            getAllKeysError?.message?.includes("row too big") ||
            getAllKeysError?.message?.includes("database or disk is full") ||
            getAllKeysError?.message?.includes("empty for row") ||
            getAllKeysError?.message?.includes("Couldn't read row")) {
          console.log("🚨 Database corruption detected - performing nuclear cleanup...");

          try {
            await AsyncStorage.clear();
            console.log("✅ Storage cleared successfully");
            return { success: true, removed: -1, errors: ["Nuclear cleanup performed"] };
          } catch (clearError) {
            errors.push("Failed to clear storage");
            return { success: false, removed: 0, errors };
          }
        }

        errors.push("Failed to enumerate storage keys");
        return { success: false, removed: 0, errors };
      }

      // Target known problematic keys first (base64 image data)
      const KNOWN_PROBLEMATIC_KEYS = [
        "pendingMeal",
        "persist:meal",
        "meal_data",
        "largeImageData",
        "image_cache",
        "meal_cache",
      ];

      console.log("🎯 Removing known problematic keys first...");
      for (const key of KNOWN_PROBLEMATIC_KEYS) {
        const matchingKeys = keys.filter(k => k.includes(key));
        for (const matchingKey of matchingKeys) {
          try {
            await AsyncStorage.removeItem(matchingKey);
            console.log(`🗑️  Removed problematic key: ${matchingKey}`);
            removed++;
          } catch (removeError) {
            console.warn(`Failed to remove ${matchingKey}:`, removeError);
          }
        }
      }

      // Small delay to let database recover
      await new Promise((resolve) => setTimeout(resolve, 100));

      const MAX_SAFE_SIZE = 100 * 1024; // 100KB
      const CHUNK_SIZE = 5; // Smaller chunks for safety

      console.log("🔍 Scanning remaining keys...");
      for (let i = 0; i < keys.length; i += CHUNK_SIZE) {
        const keyChunk = keys.slice(i, i + CHUNK_SIZE);

        for (const key of keyChunk) {
          // Skip already removed keys
          if (KNOWN_PROBLEMATIC_KEYS.some(pk => key.includes(pk))) {
            continue;
          }

          try {
            const value = await AsyncStorage.getItem(key);

            if (value) {
              const size = new Blob([value]).size;

              if (size > MAX_SAFE_SIZE) {
                console.log(
                  `🗑️  Removing oversized entry: ${key} (${(size / 1024).toFixed(1)}KB)`
                );
                await AsyncStorage.removeItem(key);
                removed++;
              }
            }
          } catch (itemError: any) {
            // CursorWindow/empty row errors mean the item is corrupted
            if (itemError?.message?.includes("CursorWindow") ||
                itemError?.message?.includes("row too big") ||
                itemError?.message?.includes("empty for row") ||
                itemError?.message?.includes("Couldn't read row")) {
              console.log(`🚨 Database error on "${key}" - removing immediately`);
            } else {
              console.log(`⚠️  Key "${key}" is unreadable, removing it...`);
            }

            try {
              await AsyncStorage.removeItem(key);
              removed++;
              console.log(`✅ Removed problematic key: ${key}`);
            } catch (removeError: any) {
              console.error(`❌ Failed to remove "${key}":`, removeError);
              errors.push(`Failed to remove key: ${key}`);
            }
          }
        }

        // Small delay between chunks
        await new Promise((resolve) => setTimeout(resolve, 20));
      }

      console.log(`✅ Storage recovery complete. Removed ${removed} items.`);

      return {
        success: true,
        removed,
        errors,
      };
    } catch (error: any) {
      console.error("❌ Storage recovery failed:", error);
      errors.push(error.message || "Unknown error");

      return {
        success: false,
        removed,
        errors,
      };
    }
  }

  static async clearPendingMealImages(): Promise<void> {
    try {
      console.log("🗑️  Clearing any stored meal images...");

      const mealKey = "pendingMeal";
      const stored = await AsyncStorage.getItem(mealKey);

      if (stored) {
        try {
          const data = JSON.parse(stored);

          if (data && data.image_base_64) {
            const cleanData = {
              analysis: data.analysis,
              timestamp: data.timestamp,
            };

            await AsyncStorage.setItem(mealKey, JSON.stringify(cleanData));
            console.log("✅ Removed base64 image from pending meal");
          }
        } catch (parseError) {
          await AsyncStorage.removeItem(mealKey);
          console.log("✅ Removed corrupted pending meal data");
        }
      }
    } catch (error) {
      console.error("Error clearing pending meal images:", error);
    }
  }

  static async performFullRecovery(): Promise<void> {
    console.log("🔧 Starting full storage recovery...");

    await this.clearPendingMealImages();
    await this.clearOversizedEntries();

    console.log("✅ Full storage recovery complete");
  }
}
