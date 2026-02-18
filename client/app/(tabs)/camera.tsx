import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, Alert, ScrollView, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { router } from "expo-router";
import { useMealDataRefresh } from "@/hooks/useMealDataRefresh";
import { useImagePicker } from "@/hooks/camera/useImagePicker";
import { useMealAnalysis } from "@/hooks/camera/useMealAnalysis";
import { useIngredientEditor } from "@/hooks/camera/useIngredientEditor";
import { useCameraAnimations } from "@/hooks/camera/useCameraAnimations";
import { useMealsRemaining } from "@/hooks/useMealsRemaining";
import {
  SmartIngredientModal,
  DeleteConfirmModal,
  CameraOptionsView,
  MealTypeSelectionView,
} from "@/components/camera";
import { SelectedImage } from "@/components/camera/SelectedImage";
import { AnalysisResults } from "@/components/camera/AnalysisResults";
import { IngredientsList } from "@/components/camera/IngredientsList";
import { ActionButtons } from "@/components/camera/ActionButtons";
import { HealthInsights } from "@/components/camera/HealthInsights";
import { MealType } from "@/components/camera/MealTypeSelector";
import { AnalysisData } from "@/src/types/camera";
import { CameraErrorBoundary } from "@/components/camera/CameraErrorBoundary";

function CameraScreenContent() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { refreshAllMealData } = useMealDataRefresh();
  const mealsRemaining = useMealsRemaining();

  const { pendingMeal } = useSelector((state: RootState) => state.meal);

  const {
    selectedImage,
    setSelectedImage,
    takePhoto,
    selectFromGallery,
    clearImage,
  } = useImagePicker();

  const {
    analysisData,
    setAnalysisData,
    hasBeenAnalyzed,
    setHasBeenAnalyzed,
    isAnalyzing,
    isPosting,
    isUpdating,
    analysisPhase,
    analysisProgress,
    analysisStatusMessage,
    analyzeImage,
    reAnalyze,
    saveMeal,
    reset: resetAnalysis,
  } = useMealAnalysis({
    isRTL,
    onAnalysisComplete: () => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setShowResults(true);
      animations.playResultsAnimation();
    },
    onSaveComplete: () => {
      refreshAllMealData();
      mealsRemaining.refresh(); // Refresh meals remaining count after saving
      handleReset();
    },
  });

  const {
    showEditModal,
    editingIngredient,
    editingIndex,
    startEdit,
    startAdd,
    save: saveIngredient,
    remove: removeIngredient,
    cancel: cancelEdit,
  } = useIngredientEditor();

  const animations = useCameraAnimations(selectedImage, hasBeenAnalyzed);

  const [userComment, setUserComment] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(
    null,
  );
  const [showMealTypeSelector, setShowMealTypeSelector] = useState(true);

  const scrollViewRef = useRef<ScrollView>(null);

  // CRITICAL: Watch pendingMeal from Redux to ensure UI transitions when analysis completes
  // This is the primary fallback - if Redux has analysis data, FORCE the UI to show results
  useEffect(() => {
    console.log("📊 pendingMeal effect triggered:", {
      hasAnalysis: !!pendingMeal?.analysis,
      hasBeenAnalyzed,
      showResults,
      mealName: pendingMeal?.analysis?.meal_name,
    });

    if (pendingMeal?.analysis) {
      console.log(
        "✅ Redux has pendingMeal.analysis - forcing UI transition to results",
      );
      setAnalysisData(pendingMeal.analysis);
      setHasBeenAnalyzed(true);
      setShowResults(true);

      if (pendingMeal.image_base_64) {
        const imageUri = pendingMeal.image_base_64.startsWith("data:")
          ? pendingMeal.image_base_64
          : `data:image/jpeg;base64,${pendingMeal.image_base_64}`;
        setSelectedImage(imageUri);
      }

      animations.playResultsAnimation();
    }
  }, [pendingMeal]);

  const handleReset = () => {
    resetAnalysis();
    clearImage();
    setUserComment("");
    setShowResults(false);
    setSelectedMealType(null);
    setShowMealTypeSelector(true);
    animations.reset();
  };

  const handleTakePhoto = async () => {
    if (!selectedMealType) {
      Alert.alert(
        t("camera.mealType.title"),
        t("camera.mealType.selectBeforePhoto"),
      );
      return;
    }

    const imageUri = await takePhoto();
    if (imageUri) {
      setShowMealTypeSelector(false);
      setShowResults(false);
    }
  };

  const handleSelectFromGallery = async () => {
    if (!selectedMealType) {
      Alert.alert(
        t("camera.mealType.title"),
        t("camera.mealType.selectBeforeGallery"),
      );
      return;
    }

    const imageUri = await selectFromGallery();
    if (imageUri) {
      setShowMealTypeSelector(false);
      setShowResults(false);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!selectedImage) {
      Alert.alert(t("common.error"), t("camera.errors.selectImageFirst"));
      return;
    }
    if (!selectedMealType) {
      Alert.alert(t("common.error"), t("camera.errors.selectMealTypeFirst"));
      return;
    }

    const success = await analyzeImage(
      selectedImage,
      selectedMealType.period,
      userComment,
    );

    if (success) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const handleReAnalyze = async (additionalMessage: string = "") => {
    if (!selectedImage) return;
    await reAnalyze(selectedImage, additionalMessage, userComment);
    await refreshAllMealData();
  };

  const handleSaveMeal = async () => {
    if (!analysisData && !pendingMeal?.analysis) {
      Alert.alert(t("common.error"), t("camera.errors.noAnalysisData"));
      return;
    }
    if (!selectedMealType) {
      Alert.alert(t("common.error"), t("camera.errors.selectMealTypeFirst"));
      return;
    }

    await saveMeal();
  };

  const handleDeleteMeal = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteMeal = () => {
    handleReset();
    setShowDeleteConfirm(false);
    Alert.alert(t("common.success"), t("camera.messages.mealDiscarded"));
  };

  const handleMealTypeSelect = (mealType: MealType) => {
    setSelectedMealType(mealType);
    setShowMealTypeSelector(false);
  };

  const handleBackToMealTypeSelection = () => {
    setSelectedMealType(null);
    setShowMealTypeSelector(true);
  };

  const getNutritionValue = (
    data: AnalysisData | undefined,
    field: string,
  ): number => {
    if (!data) return 0;

    // Build variations to check for different field naming conventions
    const baseField = field.replace("_g", "").replace("_mg", "");
    const variations = [
      field, // e.g., "protein_g"
      baseField, // e.g., "protein"
      `${baseField}_g`, // e.g., "protein_g"
      `${baseField}s`, // e.g., "proteins" (plural)
      `${baseField}s_g`, // e.g., "proteins_g"
    ];

    // Special handling for fats/fat - server returns "fat" but field might be "fats_g"
    if (field === "fats_g" || baseField === "fats") {
      variations.push("fat", "fats", "fat_g");
    }

    for (const variation of variations) {
      const value = data[variation as keyof typeof data];
      if (typeof value === "number" && value > 0) {
        return Math.round(value);
      }
      if (typeof value === "string" && !isNaN(parseFloat(value))) {
        return Math.round(parseFloat(value));
      }
    }
    return 0;
  };

  const getMealName = (data: AnalysisData): string => {
    return data?.name || data?.meal_name || "Analyzed Meal";
  };

  /**
   * Calculate estimated price using AI pricing from backend
   * The backend returns estimated_cost for each ingredient
   */
  const calculateEstimatedPrice = (data: AnalysisData | undefined): number => {
    if (!data) return 0;

    // First check if the analysis data has a total estimated_price from the backend
    if (data.estimated_price && data.estimated_price > 0) {
      return Math.round(data.estimated_price * 100) / 100;
    }

    // Otherwise, sum up the estimated_cost from each ingredient
    if (!data.ingredients || data.ingredients.length === 0) return 0;

    try {
      let totalPrice = 0;
      for (const ing of data.ingredients) {
        if (ing.estimated_cost && ing.estimated_cost > 0) {
          totalPrice += ing.estimated_cost;
        }
      }
      return Math.round(totalPrice * 100) / 100;
    } catch (error) {
      console.warn("Error calculating price from AI data:", error);
      return 0;
    }
  };

  /**
   * 🔥 FIXED: Calculate total nutrition by SUMMING UP all ingredient values
   * This is the critical fix - we now iterate through all ingredients and sum their nutrition
   */
  const calculateTotalNutrition = () => {
    const data = analysisData || pendingMeal?.analysis;

    if (!data) {
      return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
      };
    }

    // If backend provides total values at the top level, use those first
    const hasTopLevelNutrition =
      data.calories ||
      getNutritionValue(data, "protein_g") ||
      getNutritionValue(data, "carbs_g");

    if (hasTopLevelNutrition) {
      return {
        calories: data.calories || 0,
        protein: getNutritionValue(data, "protein_g") || 0,
        carbs: getNutritionValue(data, "carbs_g") || 0,
        fat: getNutritionValue(data, "fats_g") || 0,
        fiber: getNutritionValue(data, "fiber_g") || 0,
        sugar: getNutritionValue(data, "sugar_g") || 0,
        sodium: getNutritionValue(data, "sodium_mg") || 0,
      };
    }

    // 🔥 FIX: Sum up nutrition from all ingredients
    if (!data.ingredients || data.ingredients.length === 0) {
      return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
      };
    }

    const totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
    };

    // Sum up each ingredient's nutrition values
    data.ingredients.forEach((ingredient: any) => {
      // Helper function to safely get a numeric value from an ingredient
      const getIngredientValue = (field: string): number => {
        const baseField = field.replace("_g", "").replace("_mg", "");
        const variations = [
          field,
          baseField,
          `${baseField}_g`,
          `${baseField}s`,
          `${baseField}s_g`,
        ];

        // Special handling for fat/fats
        if (field === "fats_g" || baseField === "fats" || baseField === "fat") {
          variations.push("fat", "fats", "fat_g", "fats_g");
        }

        for (const variation of variations) {
          const value = ingredient[variation];
          if (typeof value === "number" && value > 0) {
            return value;
          }
          if (typeof value === "string" && !isNaN(parseFloat(value))) {
            return parseFloat(value);
          }
        }
        return 0;
      };

      // Add each nutrient from this ingredient
      totals.calories += getIngredientValue("calories") || 0;
      totals.protein += getIngredientValue("protein_g") || 0;
      totals.carbs += getIngredientValue("carbs_g") || 0;
      totals.fat += getIngredientValue("fats_g") || 0;
      totals.fiber += getIngredientValue("fiber_g") || 0;
      totals.sugar += getIngredientValue("sugar_g") || 0;
      totals.sodium += getIngredientValue("sodium_mg") || 0;
    });

    // Round all values for clean display
    return {
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein),
      carbs: Math.round(totals.carbs),
      fat: Math.round(totals.fat),
      fiber: Math.round(totals.fiber),
      sugar: Math.round(totals.sugar),
      sodium: Math.round(totals.sodium),
    };
  };

  if (showMealTypeSelector) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#10B981" />
        <MealTypeSelectionView
          onSelect={handleMealTypeSelect}
          mealsRemaining={{
            remaining: mealsRemaining.remaining,
            limit: mealsRemaining.limit,
            used: mealsRemaining.used,
            canLogMandatory: mealsRemaining.canLogMandatory,
          }}
        />
      </SafeAreaView>
    );
  }

  if (selectedMealType && !selectedImage) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#10B981" />
        <CameraOptionsView
          selectedMealType={selectedMealType}
          onBack={handleBackToMealTypeSelection}
          onTakePhoto={handleTakePhoto}
          onSelectFromGallery={handleSelectFromGallery}
        />
      </SafeAreaView>
    );
  }

  if (selectedImage && !hasBeenAnalyzed) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#10B981" />
        <SelectedImage
          imageUri={selectedImage}
          userComment={userComment}
          isAnalyzing={isAnalyzing}
          hasBeenAnalyzed={hasBeenAnalyzed}
          analysisPhase={analysisPhase}
          analysisProgress={analysisProgress}
          analysisStatusMessage={analysisStatusMessage}
          onRemoveImage={handleReset}
          onRetakePhoto={handleTakePhoto}
          onAnalyze={handleAnalyzeImage}
          onCommentChange={setUserComment}
        />
      </SafeAreaView>
    );
  }

  // Use analysisData or fallback to pendingMeal?.analysis
  const displayData = analysisData || pendingMeal?.analysis;

  if (showResults && displayData) {
    const totalNutrition = calculateTotalNutrition();

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#10B981" />
        <ScrollView
          ref={scrollViewRef}
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.resultsContainer}>
            <AnalysisResults
              imageUri={selectedImage!}
              mealName={getMealName(displayData)}
              nutrition={totalNutrition}
              estimatedPrice={calculateEstimatedPrice(displayData)}
            />

            <ActionButtons
              onDelete={handleDeleteMeal}
              onReAnalyze={handleReAnalyze}
              onSave={handleSaveMeal}
              isUpdating={isUpdating}
              isPosting={isPosting}
            />

            <IngredientsList
              ingredients={displayData?.ingredients || []}
              onEditIngredient={startEdit}
              onRemoveIngredient={removeIngredient}
              onAddIngredient={startAdd}
            />

            <HealthInsights
              recommendations={displayData?.recommendations}
              healthNotes={displayData?.recommendations}
            />
          </View>
        </ScrollView>

        <SmartIngredientModal
          visible={showEditModal}
          ingredient={editingIngredient}
          isEditing={editingIndex >= 0}
          onClose={cancelEdit}
          onSave={saveIngredient}
        />

        <DeleteConfirmModal
          visible={showDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={confirmDeleteMeal}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#10B981" />
    </SafeAreaView>
  );
}

export default function CameraScreen() {
  return (
    <CameraErrorBoundary>
      <CameraScreenContent />
    </CameraErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    paddingTop: 12,
  },
});
