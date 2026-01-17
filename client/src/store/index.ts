import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import authSlice from "./authSlice";
import mealSlice from "./mealSlice";
import calendarSlice from "./calendarSlice";
import questionnaireSlice from "./questionnaireSlice";

// Track if cleanup is in progress to prevent infinite loops
let cleanupInProgress = false;

/**
 * Emergency cleanup when storage is full
 */
const performEmergencyCleanup = async (): Promise<boolean> => {
  if (cleanupInProgress) return false;
  cleanupInProgress = true;

  try {
    console.log("🆘 [Storage] Emergency cleanup triggered...");

    // Keys to preserve (auth-related)
    const keysToPreserve = [
      "persist:auth",
      "userToken",
      "userId",
      "@user_id",
      "@auth_token",
    ];

    const allKeys = await AsyncStorage.getAllKeys();
    const keysToRemove = allKeys.filter(
      (key) => !keysToPreserve.some((preserve) => key.includes(preserve))
    );

    console.log(`🗑️ [Storage] Removing ${keysToRemove.length} of ${allKeys.length} keys`);

    // Remove in batches
    const batchSize = 10;
    for (let i = 0; i < keysToRemove.length; i += batchSize) {
      const batch = keysToRemove.slice(i, i + batchSize);
      try {
        await AsyncStorage.multiRemove(batch);
      } catch (e) {
        // Try removing one by one
        for (const key of batch) {
          try {
            await AsyncStorage.removeItem(key);
          } catch (innerErr) {
            // Continue with next key
          }
        }
      }
    }

    console.log("✅ [Storage] Emergency cleanup completed");
    return true;
  } catch (error) {
    console.error("❌ [Storage] Emergency cleanup failed:", error);
    return false;
  } finally {
    cleanupInProgress = false;
  }
};

/**
 * Check if error is a storage full error
 */
const isStorageFullError = (error: any): boolean => {
  const message = error?.message || "";
  return (
    message.includes("database or disk is full") ||
    message.includes("SQLITE_FULL") ||
    message.includes("row too big") ||
    message.includes("CursorWindow") ||
    error?.code === 13 ||
    message.includes("No space left") ||
    message.includes("disk full")
  );
};

/**
 * Safe AsyncStorage wrapper that handles SQLITE_FULL errors
 */
const createSafeAsyncStorage = () => ({
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error: any) {
      console.warn(`⚠️ [Storage] setItem failed for ${key}:`, error?.message);

      if (isStorageFullError(error)) {
        console.log("🆘 [Storage] Storage full - running cleanup...");
        const cleaned = await performEmergencyCleanup();

        if (cleaned) {
          // Retry once after cleanup
          try {
            await AsyncStorage.setItem(key, value);
            console.log(`✅ [Storage] Retry successful for ${key}`);
            return;
          } catch (retryError) {
            console.warn(`⚠️ [Storage] Retry failed for ${key}, skipping`);
          }
        }
      }
      // Silently fail - don't crash the app
      console.warn(`⚠️ [Storage] Skipping storage for ${key}`);
    }
  },
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error: any) {
      console.warn(`⚠️ [Storage] getItem failed for ${key}:`, error?.message);

      if (isStorageFullError(error)) {
        await performEmergencyCleanup();
      }
      return null;
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn(`⚠️ [Storage] removeItem failed for ${key}:`, error);
      // Silently fail
    }
  },
});

const safeAsyncStorage = createSafeAsyncStorage();

// Cross-platform storage adapter for redux-persist
const createCrossPlatformStorage = () => {
  if (Platform.OS === "web") {
    return {
      setItem: async (key: string, value: string) => {
        localStorage.setItem(key, value);
      },
      getItem: async (key: string) => {
        return localStorage.getItem(key);
      },
      removeItem: async (key: string) => {
        localStorage.removeItem(key);
      },
    };
  } else {
    // For mobile, sanitize keys because SecureStore doesn't allow all chars
    const sanitizeKey = (key: string): string =>
      key.replace(/[^a-zA-Z0-9._-]/g, "_");

    return {
      setItem: async (key: string, value: string) => {
        const sanitizedKey = sanitizeKey(key);
        try {
          await SecureStore.setItemAsync(sanitizedKey, value);
        } catch (error: any) {
          console.warn(`⚠️ [SecureStore] setItem failed for ${sanitizedKey}:`, error?.message);
          // Silently fail - don't crash the app
        }
      },
      getItem: async (key: string) => {
        const sanitizedKey = sanitizeKey(key);
        try {
          return await SecureStore.getItemAsync(sanitizedKey);
        } catch (error) {
          console.warn(`⚠️ [SecureStore] getItem failed for ${sanitizedKey}`);
          return null;
        }
      },
      removeItem: async (key: string) => {
        const sanitizedKey = sanitizeKey(key);
        try {
          await SecureStore.deleteItemAsync(sanitizedKey);
        } catch (error) {
          console.warn(`⚠️ [SecureStore] removeItem failed for ${sanitizedKey}`);
        }
      },
    };
  }
};

const crossPlatformStorage = createCrossPlatformStorage();

// Auth config uses cross-platform storage (SecureStore on mobile, localStorage on web)
const authPersistConfig = {
  key: "auth",
  storage: crossPlatformStorage,
  whitelist: ["user", "token", "isAuthenticated"],
};

// Meal and Calendar configs use safe AsyncStorage (handles SQLITE_FULL errors)
const mealPersistConfig = {
  key: "meal",
  storage: safeAsyncStorage,
  whitelist: ["meals"],
};

const calendarPersistConfig = {
  key: "calendar",
  storage: safeAsyncStorage,
  whitelist: ["calendarData"],
};

const persistedAuthReducer = persistReducer(authPersistConfig, authSlice);
const persistedMealReducer = persistReducer(mealPersistConfig, mealSlice);
const persistedCalendarReducer = persistReducer(
  calendarPersistConfig,
  calendarSlice
);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    meal: persistedMealReducer,
    calendar: persistedCalendarReducer,
    questionnaire: questionnaireSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
