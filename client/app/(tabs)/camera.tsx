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
  EditIngredientModal,
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
    updateField,
    save: saveIngredient,
    remove: removeIngredient,
    cancel: cancelEdit,
  } = useIngredientEditor();

  const animations = useCameraAnimations(selectedImage, hasBeenAnalyzed);

  const [userComment, setUserComment] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(
    null
  );
  const [showMealTypeSelector, setShowMealTypeSelector] = useState(true);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (pendingMeal?.analysis) {
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
        "Select Meal Type",
        "Please select a meal type before taking a photo"
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
        "Select Meal Type",
        "Please select a meal type before selecting from gallery"
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
      Alert.alert(t("common.error"), "Please select an image first");
      return;
    }
    if (!selectedMealType) {
      Alert.alert(t("common.error"), "Please select a meal type first");
      return;
    }

    const success = await analyzeImage(
      selectedImage,
      selectedMealType.period,
      userComment
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
    if (!analysisData) {
      Alert.alert(t("common.error"), "No analysis data to save");
      return;
    }
    if (!selectedMealType) {
      Alert.alert(t("common.error"), "Please select a meal type");
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
    Alert.alert(t("common.success"), "Meal discarded");
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
    field: string
  ): number => {
    if (!data) return 0;

    const variations = [
      field,
      field.replace("_g", ""),
      field.replace("_mg", ""),
      field.replace("g", ""),
      field.replace("mg", ""),
    ];

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

  const calculateTotalNutrition = () => {
    if (!pendingMeal?.analysis) {
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

    return {
      calories: pendingMeal.analysis.calories || 0,
      protein: getNutritionValue(pendingMeal.analysis, "protein_g") || 0,
      carbs: getNutritionValue(pendingMeal.analysis, "carbs_g") || 0,
      fat: getNutritionValue(pendingMeal.analysis, "fats_g") || 0,
      fiber: getNutritionValue(pendingMeal.analysis, "fiber_g") || 0,
      sugar: getNutritionValue(pendingMeal.analysis, "sugar_g") || 0,
      sodium: getNutritionValue(pendingMeal.analysis, "sodium_mg") || 0,
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
          onRemoveImage={handleReset}
          onRetakePhoto={handleTakePhoto}
          onAnalyze={handleAnalyzeImage}
          onCommentChange={setUserComment}
        />
      </SafeAreaView>
    );
  }

  if (showResults && analysisData) {
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
              mealName={getMealName(analysisData)}
              nutrition={totalNutrition}
            />

            <ActionButtons
              onDelete={handleDeleteMeal}
              onReAnalyze={handleReAnalyze}
              onSave={handleSaveMeal}
              isUpdating={isUpdating}
              isPosting={isPosting}
            />

            <IngredientsList
              ingredients={pendingMeal?.analysis?.ingredients || []}
              onEditIngredient={startEdit}
              onRemoveIngredient={removeIngredient}
              onAddIngredient={startAdd}
            />

            <HealthInsights
              recommendations={analysisData.recommendations}
              healthNotes={analysisData.healthNotes}
            />
          </View>
        </ScrollView>

        <EditIngredientModal
          visible={showEditModal}
          ingredient={editingIngredient}
          isEditing={editingIndex >= 0}
          onClose={cancelEdit}
          onSave={saveIngredient}
          onUpdateField={updateField}
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
