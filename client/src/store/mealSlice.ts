import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  Meal,
  MealAnalysisData,
  PendingMeal,
  MealAnalysisSchema,
} from "../types";
import { nutritionAPI, mealAPI } from "../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { StorageCleanupService } from "@/src/utils/storageCleanup";
import { File } from "expo-file-system";

interface MealState {
  meals: Meal[];
  pendingMeal: PendingMeal | null;
  isLoading: boolean;
  isAnalyzing: boolean;
  isPosting: boolean;
  isUpdating: boolean;
  isSavingFeedback: boolean;
  isTogglingFavorite: boolean;
  isDuplicating: boolean;
  error: string | null;
}

const initialState: MealState = {
  meals: [],
  pendingMeal: null,
  isLoading: false,
  isAnalyzing: false,
  isPosting: false,
  isUpdating: false,
  isSavingFeedback: false,
  isTogglingFavorite: false,
  isDuplicating: false,
  error: null,
};

const PENDING_MEAL_KEY = "pendingMeal";

// Helper function to compress/resize image if needed
export const processImage = async (imageUri: string): Promise<string> => {
  if (Platform.OS === "web") {
    try {
      console.log("Processing web image:", imageUri);

      let imageData: string;

      if (imageUri.startsWith("data:")) {
        imageData = imageUri.split(",")[1];
        console.log(
          "Extracted base64 from data URL, length:",
          imageData.length
        );
      } else {
        const response = await fetch(imageUri);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch image: ${response.status} ${response.statusText}`
          );
        }

        const blob = await response.blob();
        console.log("Image blob size:", blob.size, "bytes, type:", blob.type);

        const base64Result = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            if (!result) {
              reject(new Error("FileReader returned null result"));
              return;
            }

            const base64 = result.split(",")[1];
            if (!base64) {
              reject(new Error("Failed to extract base64 from result"));
              return;
            }

            resolve(base64);
          };
          reader.onerror = () => {
            reject(new Error("FileReader failed to read the image"));
          };
          reader.readAsDataURL(blob);
        });

        imageData = base64Result;
      }

      // Compress image if it's too large (limit to ~1MB base64)
      if (imageData.length > 1400000) {
        console.log("Image too large, compressing...");

        const img = new Image();
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const compressedBase64 = await new Promise<string>(
          (resolve, reject) => {
            img.onload = () => {
              const maxDimension = 800;
              let { width, height } = img;

              if (width > height && width > maxDimension) {
                height = (height * maxDimension) / width;
                width = maxDimension;
              } else if (height > maxDimension) {
                width = (width * maxDimension) / height;
                height = maxDimension;
              }

              canvas.width = width;
              canvas.height = height;

              if (!ctx) {
                reject(new Error("Failed to get canvas context"));
                return;
              }

              ctx.drawImage(img, 0, 0, width, height);

              const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
              const compressedBase64 = compressedDataUrl.split(",")[1];

              console.log(
                "Compressed image from",
                imageData.length,
                "to",
                compressedBase64.length
              );
              resolve(compressedBase64);
            };

            img.onerror = () =>
              reject(new Error("Failed to load image for compression"));
            img.src = `data:image/jpeg;base64,${imageData}`;
          }
        );

        return compressedBase64;
      }

      console.log("Web image processed, base64 length:", imageData.length);
      return imageData;
    } catch (error) {
      console.error("Error processing web image:", error);
      throw new Error(
        "Failed to process image: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  } else {
    // Native processing
    try {
      console.log("Processing native image:", imageUri);

      const file = new File(imageUri);
      const fileInfo = file.info();

      if (!fileInfo.exists) {
        throw new Error("Image file does not exist");
      }

      console.log("Image file size:", fileInfo.size);
      const base64 = file.base64();

      console.log("Native image processed, base64 length:", base64.length);
      return base64;
    } catch (error) {
      console.error("Error processing native image:", error);
      throw new Error(
        "Failed to process image: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  }
};

export const analyzeMeal = createAsyncThunk(
  "meal/analyzeMeal",
  async (
    params: {
      imageBase64: string;
      updateText?: string;
      language?: string;
      editedIngredients?: any[];
      mealType?: string;
      mealPeriod?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      console.log("Starting meal analysis with base64 data...");

      if (!params.imageBase64 || params.imageBase64.trim() === "") {
        throw new Error("Image data is empty or invalid");
      }

      let cleanBase64 = params.imageBase64;
      if (params.imageBase64.startsWith("data:")) {
        cleanBase64 = params.imageBase64.split(",")[1];
      }

      console.log("Base64 data length:", cleanBase64.length);

      const response = await nutritionAPI.analyzeMeal(
        cleanBase64,
        params.updateText,
        params.editedIngredients || [],
        params.language || "en",
        params.mealType
      );
      console.log("API response received:", response);

      if (response && response.success && response.data) {
        try {
          const validatedData = MealAnalysisSchema.parse(response.data);
          console.log("Data validation successful");
        } catch (validationError) {
          console.warn("API response validation failed:", validationError);
        }

        if (
          response.data.ingredients &&
          Array.isArray(response.data.ingredients)
        ) {
          response.data.ingredients = response.data.ingredients.map(
            (ingredient: any) => ({
              name: ingredient.name || "Unknown ingredient",
              calories: Number(ingredient.calories) || 0,
              protein: Number(ingredient.protein) || 0,
              carbs: Number(ingredient.carbs) || 0,
              fat: Number(ingredient.fat) || 0,
              fiber: Number(ingredient.fiber) || 0,
              sugar: Number(ingredient.sugar) || 0,
              sodium_mg: Number(ingredient.sodium_mg) || 0,
            })
          );
        }

        const pendingMeal: PendingMeal = {
          image_base_64: cleanBase64,
          analysis: {
            ...response.data,
            meal_period:
              params.mealPeriod || response.data.meal_period || "other",
          },
          timestamp: Date.now(),
        };
        console.log("Pending meal created:", pendingMeal);

        // CRITICAL FIX: Only save small analysis data, NEVER base64
        try {
          const storageData = {
            analysis: pendingMeal.analysis,
            timestamp: pendingMeal.timestamp,
          };

          // Check size before saving
          const serializedMeal = JSON.stringify(storageData);
          const sizeKB = (serializedMeal.length * 2) / 1024;

          if (sizeKB > 50) {
            console.warn(
              `⚠️ Analysis data too large (${sizeKB.toFixed(
                1
              )}KB), not persisting`
            );
          } else {
            await AsyncStorage.setItem(PENDING_MEAL_KEY, serializedMeal);
            console.log(
              `✅ Pending meal analysis saved (${sizeKB.toFixed(1)}KB)`
            );
          }
        } catch (storageError: any) {
          console.warn("Failed to save pending meal to storage:", storageError);
          // Continue without storage - meal is still in memory
        }

        console.log("Analysis completed successfully");
        return pendingMeal;
      } else {
        const errorMessage =
          response?.error || "Analysis failed - no data returned from server";
        console.error("Analysis failed:", errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      console.error("Analysis error details:", error);

      let errorMessage = "Analysis failed";
      if (error instanceof Error) {
        if (error.message.includes("Network")) {
          errorMessage =
            "Network error during meal analysis. Please check your connection and try again.";
        } else if (error.message.includes("timeout")) {
          errorMessage =
            "Analysis timed out. Please try again with a clearer image.";
        } else if (error.message.includes("_retry")) {
          errorMessage =
            "Connection issue. Please check your internet connection and try again.";
        } else {
          errorMessage = error.message;
        }
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      if (
        errorMessage.includes("Network Error") ||
        errorMessage.includes("ERR_NETWORK")
      ) {
        errorMessage = "Network error - please check your connection";
      } else if (
        errorMessage.includes("quota") ||
        errorMessage.includes("billing")
      ) {
        errorMessage =
          "AI analysis temporarily unavailable - please try again later";
      } else if (errorMessage.includes("Invalid image data")) {
        errorMessage = "Invalid image - please try a different photo";
      } else if (errorMessage.includes("OpenAI API key not configured")) {
        errorMessage = "AI service not available - please contact support";
      } else if (errorMessage.includes("400")) {
        errorMessage = "Invalid image data - please try a different image";
      } else if (errorMessage.includes("401") || errorMessage.includes("403")) {
        errorMessage = "Authentication error - please log in again";
      } else if (errorMessage.includes("500")) {
        errorMessage = "Server error - please try again later";
      }

      return rejectWithValue(errorMessage);
    }
  }
);

export const validateAndFixBase64Image = (
  base64String: string
): string | null => {
  try {
    if (base64String.startsWith("data:image/")) {
      return base64String;
    }

    if (base64String.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
      return `data:image/jpeg;base64,${base64String}`;
    }

    return null;
  } catch (error) {
    console.error("Base64 validation error:", error);
    return null;
  }
};

export const updateMeal = createAsyncThunk(
  "meal/updateMeal",
  async (
    { meal_id, updateText }: { meal_id: string; updateText: string },
    { rejectWithValue, dispatch }
  ) => {
    try {
      console.log("Starting meal update...");

      const response = await nutritionAPI.updateMeal(meal_id, updateText);
      console.log("Update response received:", response);

      if (response && response.success && response.data) {
        console.log("Meal updated successfully");
        dispatch(fetchMeals());
        return response.data;
      } else {
        const errorMessage =
          response?.error || "Update failed - no data returned";
        console.error("Update failed:", errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      console.error("Update error details:", error);

      let errorMessage = "Update failed";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      return rejectWithValue(errorMessage);
    }
  }
);

export const postMeal = createAsyncThunk(
  "meal/postMeal",
  async (_, { getState, rejectWithValue, dispatch }) => {
    try {
      const state = getState() as { meal: MealState };
      const { pendingMeal } = state.meal;

      if (!pendingMeal) {
        return rejectWithValue("No pending meal to post");
      }

      if (!pendingMeal.analysis) {
        return rejectWithValue("No meal analysis data to post");
      }

      console.log("Posting meal with analysis:", pendingMeal.analysis);
      const response = await nutritionAPI.saveMeal(
        pendingMeal.analysis,
        pendingMeal.image_base_64
      );

      if (response) {
        // Clean up storage after successful post
        try {
          await AsyncStorage.removeItem(PENDING_MEAL_KEY);
          console.log("Pending meal removed from storage");
        } catch (storageError) {
          console.warn(
            "Failed to remove pending meal from storage:",
            storageError
          );
        }

        console.log("Meal posted successfully");
        dispatch(fetchMeals());
        return response;
      }

      return rejectWithValue("Failed to post meal - no response from server");
    } catch (error) {
      console.error("Post meal error:", error);

      let errorMessage = "Failed to post meal";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchMeals = createAsyncThunk(
  "meal/fetchMeals",
  async (_, { rejectWithValue }) => {
    try {
      console.log("Fetching meals from API...");
      const meals = await nutritionAPI.getMeals();
      console.log("Meals fetched successfully, count:", meals?.length || 0);
      return meals || [];
    } catch (error) {
      console.error("Fetch meals error:", error);

      let errorMessage = "Failed to fetch meals";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return rejectWithValue(errorMessage);
    }
  }
);

export const saveMealFeedback = createAsyncThunk(
  "meal/saveMealFeedback",
  async (
    {
      mealId,
      feedback,
    }: {
      mealId: string;
      feedback: {
        tasteRating?: number;
        satietyRating?: number;
        energyRating?: number;
        heavinessRating?: number;
      };
    },
    { rejectWithValue, dispatch }
  ) => {
    try {
      console.log("💬 Saving meal feedback...");
      const response = await nutritionAPI.saveMealFeedback(mealId, feedback);
      console.log("✅ Feedback saved successfully");

      dispatch(fetchMeals());

      return { mealId, feedback };
    } catch (error) {
      console.error("💥 Save feedback error:", error);
      return rejectWithValue("Failed to save feedback");
    }
  }
);

export const toggleMealFavorite = createAsyncThunk(
  "meal/toggleMealFavorite",
  async (mealId: string, { rejectWithValue, dispatch }) => {
    try {
      console.log("❤️ Toggling meal favorite...");
      const response = await nutritionAPI.toggleMealFavorite(mealId);
      console.log("✅ Favorite toggled successfully");

      dispatch(fetchMeals());

      return { mealId, isFavorite: response.data.isFavorite };
    } catch (error) {
      console.error("💥 Toggle favorite error:", error);
      return rejectWithValue("Failed to toggle favorite");
    }
  }
);

export const duplicateMeal = createAsyncThunk(
  "meal/duplicateMeal",
  async (
    { mealId, newDate }: { mealId: string; newDate: string },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const response = await nutritionAPI.duplicateMeal(mealId, newDate);
      console.log("✅ Meal duplicated successfully");

      if (response.success && response.data) {
        dispatch(fetchMeals());
        return response.data;
      } else {
        return rejectWithValue(response.error || "Failed to duplicate meal");
      }
    } catch (error) {
      console.error("💥 Duplicate meal error:", error);
      return rejectWithValue("Failed to duplicate meal");
    }
  }
);

export const removeMeal = createAsyncThunk(
  "meal/removeMeal",
  async (mealId: string, { rejectWithValue, dispatch }) => {
    try {
      await nutritionAPI.removeMeal(mealId);
      dispatch(fetchMeals());
      return mealId;
    } catch (error: any) {
      console.error("Remove meal error:", error);
      return rejectWithValue(error.message || "Failed to remove meal");
    }
  }
);

export const loadPendingMeal = createAsyncThunk(
  "meal/loadPendingMeal",
  async (_, { rejectWithValue }) => {
    try {
      console.log("📥 Loading pending meal from storage...");

      const hasSpace = await StorageCleanupService.checkAvailableStorage();
      if (!hasSpace) {
        console.warn("⚠️ Storage issues detected, running emergency cleanup");
        await StorageCleanupService.emergencyCleanup();
        return null;
      }

      let stored: string | null = null;
      try {
        stored = await AsyncStorage.getItem(PENDING_MEAL_KEY);
      } catch (storageError: any) {
        console.error(
          "🚨 CursorWindow error reading pendingMeal:",
          storageError
        );

        if (
          storageError.message &&
          storageError.message.includes("CursorWindow")
        ) {
          console.log("🔥 CursorWindow detected, running emergency cleanup");
          await StorageCleanupService.emergencyCleanup();
        }

        try {
          await AsyncStorage.removeItem(PENDING_MEAL_KEY);
          console.log("🗑️ Removed corrupted pendingMeal key");
        } catch (removeError) {
          console.warn("Failed to remove corrupted key:", removeError);
        }

        return null;
      }

      if (stored && stored.trim() !== "") {
        try {
          const storedData = JSON.parse(stored);
          console.log("📦 Pending meal loaded from storage");

          if (
            storedData &&
            typeof storedData === "object" &&
            storedData.timestamp
          ) {
            const now = Date.now();
            const ageHours = (now - storedData.timestamp) / (1000 * 60 * 60);

            if (ageHours > 24) {
              console.log("⏰ Pending meal is too old, clearing it");
              await AsyncStorage.removeItem(PENDING_MEAL_KEY);
              return null;
            }

            const pendingMeal: PendingMeal = {
              analysis: storedData.analysis,
              timestamp: storedData.timestamp,
              image_base_64: "",
            };

            return pendingMeal;
          } else {
            console.warn("❌ Invalid pending meal structure, clearing storage");
            await AsyncStorage.removeItem(PENDING_MEAL_KEY);
            return null;
          }
        } catch (parseError) {
          console.error("❌ Failed to parse pending meal:", parseError);

          try {
            await AsyncStorage.removeItem(PENDING_MEAL_KEY);
            console.log("🗑️ Cleared corrupted pending meal data");
          } catch (removeError) {
            console.warn("Failed to clear corrupted data:", removeError);
          }

          return null;
        }
      } else {
        console.log("📭 No pending meal found in storage");
        return null;
      }
    } catch (error: any) {
      console.error("❌ Load pending meal error:", error);

      try {
        console.log("🚨 Running emergency cleanup due to load error");
        await StorageCleanupService.emergencyCleanup();
      } catch (cleanupError) {
        console.error("Emergency cleanup failed:", cleanupError);
      }

      return null;
    }
  }
);

export const deleteMeal = createAsyncThunk(
  "meals/delete",
  async (mealId: string, { rejectWithValue, dispatch }) => {
    try {
      await mealAPI.deleteMeal(mealId);
      dispatch(fetchMeals());
      return mealId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || error.message || "Failed to delete meal"
      );
    }
  }
);

const mealSlice = createSlice({
  name: "meal",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearPendingMeal: (state) => {
      state.pendingMeal = null;
      AsyncStorage.removeItem(PENDING_MEAL_KEY).catch((error) => {
        console.warn("Failed to remove pending meal from storage:", error);
      });
    },
    setPendingMeal: (state, action: PayloadAction<PendingMeal>) => {
      state.pendingMeal = action.payload;
    },
    setPendingMealForUpdate: (
      state,
      action: PayloadAction<{ meal_id: string; imageBase64: string }>
    ) => {
      state.pendingMeal = {
        image_base_64: action.payload.imageBase64,
        analysis: null,
        timestamp: Date.now(),
        meal_id: action.payload.meal_id,
      };
    },
    updateMealLocally: (state, action) => {
      state.meals = action.payload;
    },

    // ==================== INGREDIENT MANAGEMENT ACTIONS ====================

    // Update all ingredients at once and recalculate totals
    updatePendingMealIngredients: (state, action: PayloadAction<any[]>) => {
      if (state.pendingMeal?.analysis) {
        state.pendingMeal.analysis.ingredients = action.payload;

        // Recalculate total nutrition based on new ingredients
        const totalCalories = action.payload.reduce(
          (sum, ing) => sum + (Number(ing.calories) || 0),
          0
        );
        const totalProtein = action.payload.reduce(
          (sum, ing) =>
            sum + (Number(ing.protein) || Number(ing.protein_g) || 0),
          0
        );
        const totalCarbs = action.payload.reduce(
          (sum, ing) => sum + (Number(ing.carbs) || Number(ing.carbs_g) || 0),
          0
        );
        const totalFat = action.payload.reduce(
          (sum, ing) => sum + (Number(ing.fat) || Number(ing.fats_g) || 0),
          0
        );
        const totalFiber = action.payload.reduce(
          (sum, ing) => sum + (Number(ing.fiber) || Number(ing.fiber_g) || 0),
          0
        );
        const totalSugar = action.payload.reduce(
          (sum, ing) => sum + (Number(ing.sugar) || Number(ing.sugar_g) || 0),
          0
        );
        const totalSodium = action.payload.reduce(
          (sum, ing) =>
            sum + (Number(ing.sodium_mg) || Number(ing.sodium) || 0),
          0
        );

        // Update the analysis totals
        state.pendingMeal.analysis.calories = totalCalories;
        state.pendingMeal.analysis.protein_g = totalProtein;
        state.pendingMeal.analysis.carbs_g = totalCarbs;
        state.pendingMeal.analysis.fats_g = totalFat;
        state.pendingMeal.analysis.fiber_g = totalFiber;
        state.pendingMeal.analysis.sugar_g = totalSugar;
        state.pendingMeal.analysis.sodium_g = totalSodium;

        console.log(
          "✅ Pending meal ingredients and totals updated in Redux state"
        );
      }
    },

    // Update a single ingredient at a specific index
    updateSingleIngredient: (
      state,
      action: PayloadAction<{ index: number; ingredient: any }>
    ) => {
      if (state.pendingMeal?.analysis?.ingredients) {
        const { index, ingredient } = action.payload;
        if (
          index >= 0 &&
          index < state.pendingMeal.analysis.ingredients.length
        ) {
          state.pendingMeal.analysis.ingredients[index] = ingredient;

          // Recalculate totals
          const ingredients = state.pendingMeal.analysis.ingredients;
          const totalCalories = ingredients.reduce(
            (sum, ing) => sum + (Number(ing.calories) || 0),
            0
          );
          const totalProtein = ingredients.reduce(
            (sum, ing) => sum + (Number(ing.protein) || 0),
            0
          );
          const totalCarbs = ingredients.reduce(
            (sum, ing) => sum + (Number(ing.carbs) || 0),
            0
          );
          const totalFat = ingredients.reduce(
            (sum, ing) => sum + (Number(ing.fat) || 0),
            0
          );
          const totalFiber = ingredients.reduce(
            (sum, ing) => sum + (Number(ing.fiber) || 0),
            0
          );
          const totalSugar = ingredients.reduce(
            (sum, ing) => sum + (Number(ing.sugar) || 0),
            0
          );

          state.pendingMeal.analysis.calories = totalCalories;
          state.pendingMeal.analysis.protein_g = totalProtein;
          state.pendingMeal.analysis.carbs_g = totalCarbs;
          state.pendingMeal.analysis.fats_g = totalFat;
          state.pendingMeal.analysis.fiber_g = totalFiber;
          state.pendingMeal.analysis.sugar_g = totalSugar;

          console.log(
            `✅ Ingredient at index ${index} removed from Redux state`
          );
        }
      }
    },
    addIngredientToPendingMeal: (
      state: MealState,
      action: PayloadAction<any>
    ) => {
      if (!state.pendingMeal?.analysis) return;

      const analysis = state.pendingMeal.analysis;

      if (!analysis.ingredients) {
        analysis.ingredients = [];
      }

      analysis.ingredients.push(action.payload);

      const ingredients = analysis.ingredients;

      analysis.calories = ingredients.reduce(
        (sum, ing) => sum + (Number(ing.calories) || 0),
        0
      );
      analysis.protein_g = ingredients.reduce(
        (sum, ing) => sum + (Number(ing.protein) || 0),
        0
      );
      analysis.carbs_g = ingredients.reduce(
        (sum, ing) => sum + (Number(ing.carbs) || 0),
        0
      );
      analysis.fats_g = ingredients.reduce(
        (sum, ing) => sum + (Number(ing.fat) || 0),
        0
      );
      analysis.fiber_g = ingredients.reduce(
        (sum, ing) => sum + (Number(ing.fiber) || 0),
        0
      );
      analysis.sugar_g = ingredients.reduce(
        (sum, ing) => sum + (Number(ing.sugar) || 0),
        0
      );

      console.log("✅ New ingredient added to Redux state");
    },

    removeIngredientFromPendingMeal: (
      state: MealState,
      action: PayloadAction<number>
    ) => {
      const analysis = state.pendingMeal?.analysis;
      if (!analysis?.ingredients) return;

      const ingredients = analysis.ingredients; // ✅ now NON-optional
      const index = action.payload;

      if (index < 0 || index >= ingredients.length) return;

      ingredients.splice(index, 1);

      analysis.calories = ingredients.reduce(
        (sum, ing) => sum + (Number(ing.calories) || 0),
        0
      );
      analysis.protein_g = ingredients.reduce(
        (sum, ing) => sum + (Number(ing.protein) || 0),
        0
      );
      analysis.carbs_g = ingredients.reduce(
        (sum, ing) => sum + (Number(ing.carbs) || 0),
        0
      );
      analysis.fats_g = ingredients.reduce(
        (sum, ing) => sum + (Number(ing.fat) || 0),
        0
      );
      analysis.fiber_g = ingredients.reduce(
        (sum, ing) => sum + (Number(ing.fiber) || 0),
        0
      );
      analysis.sugar_g = ingredients.reduce(
        (sum, ing) => sum + (Number(ing.sugar) || 0),
        0
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(analyzeMeal.pending, (state) => {
        state.isAnalyzing = true;
        state.error = null;
      })
      .addCase(analyzeMeal.fulfilled, (state, action) => {
        state.isAnalyzing = false;
        state.pendingMeal = action.payload;
        state.error = null;
      })
      .addCase(analyzeMeal.rejected, (state, action) => {
        state.isAnalyzing = false;
        state.error = action.payload as string;
      })
      .addCase(updateMeal.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateMeal.fulfilled, (state, action) => {
        state.isUpdating = false;
        state.error = null;
        state.pendingMeal = null;
      })
      .addCase(updateMeal.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })
      .addCase(postMeal.pending, (state) => {
        state.isPosting = true;
        state.error = null;
      })
      .addCase(postMeal.fulfilled, (state, action) => {
        state.isPosting = false;
        state.pendingMeal = null;
        state.error = null;
      })
      .addCase(postMeal.rejected, (state, action) => {
        state.isPosting = false;
        state.error = action.payload as string;
      })
      .addCase(fetchMeals.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMeals.fulfilled, (state, action) => {
        state.isLoading = false;
        state.meals = action.payload;
        state.error = null;
      })
      .addCase(fetchMeals.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(removeMeal.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(removeMeal.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(removeMeal.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(saveMealFeedback.pending, (state) => {
        state.isSavingFeedback = true;
        state.error = null;
      })
      .addCase(saveMealFeedback.fulfilled, (state, action) => {
        state.isSavingFeedback = false;
      })
      .addCase(saveMealFeedback.rejected, (state, action) => {
        state.isSavingFeedback = false;
        state.error = action.payload as string;
      })
      .addCase(toggleMealFavorite.pending, (state) => {
        state.isTogglingFavorite = true;
        state.error = null;
      })
      .addCase(toggleMealFavorite.fulfilled, (state, action) => {
        state.isTogglingFavorite = false;
      })
      .addCase(toggleMealFavorite.rejected, (state, action) => {
        state.isTogglingFavorite = false;
        state.error = action.payload as string;
      })
      .addCase(duplicateMeal.pending, (state) => {
        state.isDuplicating = true;
        state.error = null;
      })
      .addCase(duplicateMeal.fulfilled, (state, action) => {
        state.isDuplicating = false;
      })
      .addCase(duplicateMeal.rejected, (state, action) => {
        state.isDuplicating = false;
        state.error = action.payload as string;
      })
      .addCase(loadPendingMeal.pending, (state) => {
        // Don't show loading for background operation
      })
      .addCase(loadPendingMeal.fulfilled, (state, action) => {
        if (action.payload) {
          state.pendingMeal = action.payload;
          console.log("✅ Pending meal restored from storage");
        }
      })
      .addCase(loadPendingMeal.rejected, (state, action) => {
        // Don't set error for storage loading failures
        console.warn("⚠️ Failed to load pending meal:", action.payload);
      })
      .addCase(deleteMeal.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteMeal.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(deleteMeal.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

// Export all actions including the new ingredient management actions
export const {
  clearError,
  clearPendingMeal,
  setPendingMeal,
  setPendingMealForUpdate,
  updateMealLocally,
  updatePendingMealIngredients,
  updateSingleIngredient,
  addIngredientToPendingMeal,
  removeIngredientFromPendingMeal,
} = mealSlice.actions;

export default mealSlice.reducer;
