import { useState } from "react";
import { Alert } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/src/store";
import {
  analyzeMeal,
  postMeal,
  clearPendingMeal,
  clearError,
} from "@/src/store/mealSlice";
import { nutritionAPI } from "@/src/services/api";
import { AnalysisData } from "@/src/types/camera";
import { optimizeImageForUpload } from "@/src/utils/imageOptimiztion";
import { File } from "expo-file-system";

interface UseMealAnalysisOptions {
  onAnalysisComplete?: () => void;
  onSaveComplete?: () => void;
  isRTL?: boolean;
}

export function useMealAnalysis(options: UseMealAnalysisOptions = {}) {
  const dispatch = useDispatch<AppDispatch>();
  const { pendingMeal, isAnalyzing, isPosting, isUpdating } = useSelector(
    (state: RootState) => state.meal
  );

  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [hasBeenAnalyzed, setHasBeenAnalyzed] = useState(false);

  const processImage = async (imageUri: string): Promise<string | null> => {
    try {
      if (!imageUri || imageUri.trim() === "") {
        console.error("Invalid image URI provided");
        return null;
      }

      try {
        const optimizedBase64 = await optimizeImageForUpload(imageUri, {
          maxWidth: 1024,
          maxHeight: 1024,
          quality: 0.8,
          format: "jpeg",
        });

        if (optimizedBase64 && optimizedBase64.length > 100) {
          return optimizedBase64;
        }
      } catch (optimizeError) {
        console.warn("Image optimization failed, falling back:", optimizeError);
      }

      try {
        const file = new File(imageUri);
        const base64 = await file.text();

        if (!base64 || base64.length < 100) {
          console.error("Failed to convert image to base64");
          return null;
        }

        if (base64.length > 10 * 1024 * 1024) {
          console.error("Image too large for processing");
          return null;
        }

        return base64;
      } catch (fileError) {
        console.error("Failed to read image file:", fileError);
        return null;
      }
    } catch (error) {
      console.error("Error processing image:", error);
      return null;
    }
  };

  const checkUsageLimit = async (): Promise<boolean> => {
    try {
      const stats = await nutritionAPI.getUsageStats();
      const { remaining } = stats.mealScans;

      if (remaining === 0) {
        Alert.alert("Limit Reached", "You've used all meal scans this month.", [
          { text: "Add Manually", onPress: () => {} },
          { text: "Cancel", style: "cancel" },
        ]);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error checking limits:", error);
      return true;
    }
  };

  const analyzeImage = async (
    imageUri: string,
    mealType: string,
    userComment?: string
  ): Promise<boolean> => {
    const canProceed = await checkUsageLimit();
    if (!canProceed) return false;

    try {
      const base64Image = await processImage(imageUri);
      if (!base64Image) {
        Alert.alert("Error", "Could not process image.");
        return false;
      }

      const analysisParams = {
        imageBase64: base64Image,
        language: options.isRTL ? "hebrew" : "english",
        updateText:
          userComment?.trim() ||
          "Please provide detailed nutritional analysis.",
        mealType,
        mealPeriod: mealType,
      };

      const result = await dispatch(analyzeMeal(analysisParams));

      if (analyzeMeal.fulfilled.match(result)) {
        setHasBeenAnalyzed(true);
        options.onAnalysisComplete?.();
        return true;
      } else {
        const errorMessage = result.payload || "Analysis failed";
        Alert.alert(
          "Analysis Failed",
          typeof errorMessage === "string" ? errorMessage : "Analysis failed"
        );
        return false;
      }
    } catch (error) {
      console.error("Analysis error:", error);
      Alert.alert("Analysis Failed", "Analysis failed");
      return false;
    }
  };

  const reAnalyze = async (
    imageUri: string,
    additionalMessage?: string,
    userComment?: string
  ): Promise<boolean> => {
    if (!hasBeenAnalyzed) {
      Alert.alert("Error", "No meal to re-analyze");
      return false;
    }

    try {
      const base64Image = await processImage(imageUri);
      if (!base64Image) {
        Alert.alert("Error", "Could not process image");
        return false;
      }

      const currentIngredients = pendingMeal?.analysis?.ingredients || [];

      let updateText = additionalMessage?.trim() || userComment?.trim() || "";
      if (currentIngredients.length > 0) {
        const ingredientsList = currentIngredients
          .map((ing) => ing.name)
          .join(", ");
        updateText +=
          (updateText ? " " : "") + `Ingredients: ${ingredientsList}.`;
      }

      const reAnalysisParams = {
        imageBase64: base64Image,
        language: options.isRTL ? "hebrew" : "english",
        updateText: updateText || "Please re-analyze",
        editedIngredients: currentIngredients,
      };

      const result = await dispatch(analyzeMeal(reAnalysisParams)).unwrap();
      setAnalysisData(result.analysis);
      setHasBeenAnalyzed(true);

      Alert.alert("Success", "Meal re-analyzed successfully!");
      return true;
    } catch (error) {
      console.error("Re-analysis error:", error);
      Alert.alert("Error", "Re-analysis failed");
      return false;
    }
  };

  const saveMeal = async (): Promise<boolean> => {
    if (!analysisData && !pendingMeal?.analysis) {
      Alert.alert("Error", "No analysis data to save");
      return false;
    }

    try {
      const result = await dispatch(postMeal());

      if (postMeal.fulfilled.match(result)) {
        Alert.alert("Success", "Meal saved successfully!");
        options.onSaveComplete?.();
        return true;
      } else {
        Alert.alert("Save Failed", "Failed to save meal");
        return false;
      }
    } catch (error) {
      Alert.alert("Save Failed", "Save failed");
      return false;
    }
  };

  const reset = () => {
    setAnalysisData(null);
    setHasBeenAnalyzed(false);
    dispatch(clearPendingMeal());
    dispatch(clearError());
  };

  return {
    analysisData,
    setAnalysisData,
    hasBeenAnalyzed,
    setHasBeenAnalyzed,
    isAnalyzing,
    isPosting,
    isUpdating,
    pendingMeal,
    analyzeImage,
    reAnalyze,
    saveMeal,
    reset,
  };
}
