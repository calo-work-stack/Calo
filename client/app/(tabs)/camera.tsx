import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Modal,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Animated,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/src/store";
import {
  analyzeMeal,
  postMeal,
  clearPendingMeal,
  clearError,
} from "@/src/store/mealSlice";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import {
  CreditCard as Edit3,
  TriangleAlert as AlertTriangle,
  X,
  ChevronLeft,
  Camera,
  Image as ImageIcon,
  Zap,
  Info,
  ArrowLeft,
  RotateCcw,
  Check,
  Trash2,
} from "lucide-react-native";
import { useMealDataRefresh } from "@/hooks/useMealDataRefresh";
import { useTheme } from "@/src/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import {
  ImageSelector,
  SelectedImage,
  NutritionOverview,
  IngredientsList,
  ActionButtons,
  HealthInsights,
  ScanningAnimation,
} from "@/components/camera";
import {
  MealTypeSelector,
  MealType,
} from "@/components/camera/MealTypeSelector";
import { nutritionAPI } from "@/src/services/api";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface Ingredient {
  name: string;
  calories: number;
  protein_g?: number;
  protein?: number;
  carbs_g?: number;
  carbs?: number;
  fats_g?: number;
  fat?: number;
  fats?: number;
  fiber_g?: number;
  fiber?: number;
  sugar_g?: number;
  sugar?: number;
  sodium_mg?: number;
  sodium?: number;
  estimated_portion_g?: number;
}

interface AnalysisData {
  name?: string;
  meal_name?: string;
  description?: string;
  calories: number;
  protein_g?: number;
  protein?: number;
  carbs_g?: number;
  carbs?: number;
  fats_g?: number;
  fat?: number;
  fats?: number;
  fiber_g?: number;
  fiber?: number;
  sugar_g?: number;
  sugar?: number;
  sodium_mg?: number;
  sodium?: number;
  saturated_fats_g?: number;
  polyunsaturated_fats_g?: number;
  monounsaturated_fats_g?: number;
  omega_3_g?: number;
  omega_6_g?: number;
  cholesterol_mg?: number;
  serving_size_g?: number;
  ingredients?: Ingredient[];
  healthScore?: string;
  recommendations?: string;
  cookingMethod?: string;
  cooking_method?: string;
  food_category?: string;
  confidence?: number;
  servingSize?: string;
  healthNotes?: string;
}

function CameraScreenContent() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const dispatch = useDispatch<AppDispatch>();
  const { refreshAllMealData, refreshMealData, immediateRefresh } =
    useMealDataRefresh();
  const { colors, isDark } = useTheme();

  const { pendingMeal, isAnalyzing, isPosting, isUpdating, error } =
    useSelector((state: RootState) => state.meal);
  const { user } = useSelector((state: RootState) => state.auth);
  const mealsPerDay = user?.meals_per_day || 3;

  // Local state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [userComment, setUserComment] = useState("");
  const [editedIngredients, setEditedIngredients] = useState<Ingredient[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(
    null
  );
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [hasBeenAnalyzed, setHasBeenAnalyzed] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [showScanAnimation, setShowScanAnimation] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(
    null
  );
  const [showMealTypeSelector, setShowMealTypeSelector] = useState(true);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const nutritionCardAnim = useRef(new Animated.Value(0)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Refs
  const scrollViewRef = useRef<ScrollView>(null);

  // Request camera permission on mount
  useEffect(() => {
    const requestCameraPermission = async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    };
    requestCameraPermission();
  }, []);

  // Clear error on mount
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Start scanning animation
  useEffect(() => {
    if (selectedImage && !hasBeenAnalyzed) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [selectedImage, hasBeenAnalyzed]);

  // Update local state when pendingMeal changes
  useEffect(() => {
    if (pendingMeal?.analysis) {
      setAnalysisData(pendingMeal.analysis);
      const ingredients = pendingMeal.analysis.ingredients || [];
      setEditedIngredients(ingredients);
      setHasBeenAnalyzed(true);
      setShowResults(true);

      if (pendingMeal.image_base_64) {
        const imageUri = pendingMeal.image_base_64.startsWith("data:")
          ? pendingMeal.image_base_64
          : `data:image/jpeg;base64,${pendingMeal.image_base_64}`;
        setSelectedImage(imageUri);
      }

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(nutritionCardAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();
    }
  }, [pendingMeal, fadeAnim, slideAnim, nutritionCardAnim]);

  // Helper function to get nutrition value with fallbacks
  const getNutritionValue = (
    data: AnalysisData | Ingredient | undefined,
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

  // Helper function to get meal name
  const getMealName = (data: AnalysisData): string => {
    return data?.name || data?.meal_name || "Analyzed Meal";
  };

  // Image selection handlers
  const handleTakePhoto = async () => {
    if (!selectedMealType) {
      Alert.alert(
        "Select Meal Type",
        "Please select a meal type before taking a photo"
      );
      return;
    }

    if (hasPermission === null) {
      Alert.alert(
        t("common.error"),
        "Camera permission is still being checked."
      );
      return;
    }
    if (!hasPermission) {
      Alert.alert(
        t("camera.permission"),
        "Camera permission is required to take photos. Please grant permission in settings."
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        resetAnalysisState();
        setShowResults(false);
        setShowMealTypeSelector(false);
      }
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert(t("common.error"), "Failed to take photo");
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
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("camera.permission"),
          "Gallery permission is required to select photos"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        resetAnalysisState();
        setShowResults(false);
        setShowMealTypeSelector(false);
      }
    } catch (error) {
      console.error("Gallery error:", error);
      Alert.alert(t("common.error"), "Failed to select image");
    }
  };

  // Reset analysis state when new image is selected or analysis is discarded
  const resetAnalysisState = () => {
    setAnalysisData(null);
    setEditedIngredients([]);
    setUserComment("");
    setHasBeenAnalyzed(false);
    dispatch(clearPendingMeal());
    dispatch(clearError());

    // Reset animations
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    nutritionCardAnim.setValue(0);
  };

  // Initial analysis
  const handleAnalyzeImage = async () => {
    if (!selectedImage) {
      Alert.alert(t("common.error"), "Please select an image first");
      return;
    }
    if (!selectedMealType) {
      Alert.alert(t("common.error"), "Please select a meal type first");
      return;
    }

    // Check usage limit first
    try {
      const stats = await nutritionAPI.getUsageStats();
      const { current, limit, remaining } = stats.mealScans;

      if (remaining === 0) {
        Alert.alert(
          t("common.limitReached") || "Limit Reached",
          `You've used all ${limit} meal scans this month. Upgrade your plan for more scans or add meals manually.`,
          [
            {
              text: t("common.addManually") || "Add Manually",
              onPress: () => router.push("/(tabs)/history"),
            },
            {
              text: t("common.upgradePlan") || "Upgrade",
              onPress: () => router.push("/payment-plan"),
            },
            { text: t("common.cancel") || "Cancel", style: "cancel" },
          ]
        );
        return;
      }

      if (remaining <= 2) {
        Alert.alert(
          t("common.lowOnScans") || "Low on Scans",
          `You have ${remaining} meal scan${
            remaining > 1 ? "s" : ""
          } remaining this month.`,
          [{ text: t("common.ok") || "OK" }]
        );
      }
    } catch (error) {
      console.error("Error checking limits:", error);
    }

    // Check and cleanup storage before analysis
    try {
      const { StorageCleanupService } = await import(
        "@/src/utils/storageCleanup"
      );
      const storageOk = await StorageCleanupService.checkAndCleanupIfNeeded();
      if (!storageOk) {
        Alert.alert(
          "Storage Full",
          "Device storage is full. Please free up space and try again."
        );
        return;
      }
    } catch (error) {
      console.warn("Storage check failed:", error);
    }

    // Show scanning animation with progress
    setShowScanAnimation(true);
    setAnalysisProgress(0);

    // Simulate progress during analysis
    const progressInterval = setInterval(() => {
      setAnalysisProgress((prev) => Math.min(prev + 10, 90));
    }, 1000);

    try {
      const base64Image = await processImage(selectedImage);
      if (!base64Image) {
        clearInterval(progressInterval);
        setShowScanAnimation(false);
        Alert.alert(t("common.error"), "Could not process image.");
        return;
      }

      const analysisParams = {
        imageBase64: base64Image,
        language: isRTL ? "hebrew" : "english",
        includeDetailedIngredients: true,
        includeNutritionBreakdown: true,
        updateText:
          userComment.trim() || "Please provide detailed nutritional analysis.",
        mealType: selectedMealType.period,
        mealPeriod: selectedMealType.period,
      };

      console.log("🚀 Analysis parameters:", {
        hasImage: !!analysisParams.imageBase64,
        language: analysisParams.language,
        mealType: analysisParams.mealType,
        mealPeriod: analysisParams.mealPeriod,
      });

      console.log("🚀 Starting analysis with params:", {
        hasImage: !!analysisParams.imageBase64,
        language: analysisParams.language,
        mealType: analysisParams.mealType,
      });

      const result = await dispatch(analyzeMeal(analysisParams));

      clearInterval(progressInterval);
      setAnalysisProgress(100);

      if (analyzeMeal.fulfilled.match(result)) {
        console.log("✅ Analysis successful:", result.payload);
        setTimeout(() => {
          setShowScanAnimation(false);
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }, 500);
      } else {
        setShowScanAnimation(false);
        const errorMessage =
          result.payload ||
          "Failed to analyze meal. Please check your connection and try again.";
        console.error("❌ Analysis failed:", errorMessage);
        Alert.alert(
          t("camera.analysis_failed"),
          typeof errorMessage === "string"
            ? errorMessage
            : "Analysis failed. Please try again."
        );
      }
    } catch (error) {
      clearInterval(progressInterval);
      setShowScanAnimation(false);
      console.error("💥 Analysis error:", error);

      let errorMessage = "Analysis failed";
      if (error instanceof Error) {
        if (error.message.includes("Network")) {
          errorMessage =
            "Network error. Please check your connection and try again.";
        } else if (error.message.includes("timeout")) {
          errorMessage =
            "Analysis timed out. Please try again with a clearer image.";
        } else {
          errorMessage = error.message;
        }
      }

      Alert.alert(t("camera.analysis_failed"), errorMessage);
    }
  };

  // Handle scanning animation completion
  const handleScanComplete = () => {
    setShowScanAnimation(false);
  };

  // Re-analysis after edits
  const handleReAnalyze = async () => {
    if (!selectedImage || !hasBeenAnalyzed) {
      Alert.alert(t("common.error"), "No meal to re-analyze");
      return;
    }
    if (!selectedMealType) {
      Alert.alert(t("common.error"), "Please select a meal type first");
      return;
    }

    // Show scanning animation
    setShowScanAnimation(true);

    try {
      // Trigger immediate cache refresh first
      await immediateRefresh();

      const base64Image = await processImage(selectedImage);
      if (!base64Image) {
        setShowScanAnimation(false);
        Alert.alert(
          t("common.error") || "Error",
          "Could not process image for re-analysis."
        );
        return;
      }

      let updateText = userComment.trim();
      if (editedIngredients.length > 0) {
        const ingredientsList = editedIngredients
          .map((ing) => ing.name)
          .join(", ");
        updateText +=
          (updateText ? " " : "") +
          `Please re-analyze considering these ingredients: ${ingredientsList}. Provide updated nutritional information.`;
      }
      if (!updateText) {
        updateText =
          "Please re-analyze this meal with updated nutritional information.";
      }

      const reAnalysisParams = {
        imageBase64: base64Image,
        language: isRTL ? "hebrew" : "english",
        includeDetailedIngredients: true,
        includeNutritionBreakdown: true,
        updateText: updateText,
      };

      console.log("🔄 Starting re-analysis...");
      const result = await dispatch(analyzeMeal(reAnalysisParams)).unwrap();

      console.log("Re-analysis completed:", result);

      // Update local state immediately
      setAnalysisData(result.analysis);
      setEditedIngredients(result.analysis?.ingredients || []);
      setHasBeenAnalyzed(true);

      // Force complete cache invalidation and refresh
      await refreshAllMealData();

      // Hide scanning animation after successful completion
      setShowScanAnimation(false);

      console.log("✅ Re-analysis and cache refresh completed");

      Alert.alert(
        t("common.success") || "Success",
        t("camera.reAnalysisSuccess") || "Meal re-analyzed successfully!"
      );
    } catch (error) {
      setShowScanAnimation(false);
      console.error("❌ Re-analysis error:", error);
      Alert.alert(
        t("common.error") || "Error",
        error instanceof Error ? error.message : "Re-analysis failed"
      );
    }
  };

  // Save meal to database
  const handleSaveMeal = async () => {
    if (!analysisData) {
      Alert.alert(t("common.error"), "No analysis data to save");
      return;
    }
    if (!selectedMealType) {
      Alert.alert(t("common.error"), "Please select a meal type to save");
      return;
    }

    try {
      const result = await dispatch(postMeal());

      if (postMeal.fulfilled.match(result)) {
        await refreshAllMealData();

        Alert.alert(t("camera.save_success"), "Meal saved successfully!", [
          {
            text: t("common.ok"),
            onPress: () => {
              resetAnalysisState();
              setSelectedImage(null);
              setShowResults(false);
              // Reset meal type selection after saving
              setSelectedMealType(null);
              setShowMealTypeSelector(true);
            },
          },
        ]);
      } else {
        Alert.alert(
          t("camera.save_failed"),
          typeof result.payload === "string"
            ? result.payload
            : "Failed to save meal. Please try again."
        );
      }
    } catch (error) {
      Alert.alert(
        t("camera.save_failed"),
        error instanceof Error ? error.message : "Save failed"
      );
    }
  };

  // Discard analysis
  const handleDeleteMeal = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteMeal = () => {
    resetAnalysisState();
    setSelectedImage(null);
    setShowDeleteConfirm(false);
    setShowResults(false);
    // Reset meal type selection after discarding
    setSelectedMealType(null);
    setShowMealTypeSelector(true);
    Alert.alert(t("common.success"), "Meal analysis discarded successfully");
  };

  // Ingredient editing functions
  const handleEditIngredient = (ingredient: Ingredient, index: number) => {
    setEditingIngredient({ ...ingredient });
    setEditingIndex(index);
    setShowEditModal(true);
  };

  const handleAddIngredient = () => {
    const newIngredient: Ingredient = {
      name: "",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium_mg: 0,
    };
    setEditingIngredient(newIngredient);
    setEditingIndex(-1);
    setShowEditModal(true);
  };

  const handleRemoveIngredient = (index: number) => {
    const updatedIngredients = editedIngredients.filter((_, i) => i !== index);
    setEditedIngredients(updatedIngredients);
  };

  const handleSaveIngredient = () => {
    if (!editingIngredient || !editingIngredient.name.trim()) {
      Alert.alert(t("common.error"), "Ingredient name is required");
      return;
    }

    const updatedIngredients = [...editedIngredients];

    if (editingIndex >= 0) {
      updatedIngredients[editingIndex] = editingIngredient;
    } else {
      updatedIngredients.push(editingIngredient);
    }

    setEditedIngredients(updatedIngredients);
    setShowEditModal(false);
    setEditingIngredient(null);
    setEditingIndex(-1);
  };

  // Calculate total nutrition from current data
  const calculateTotalNutrition = () => {
    const currentIngredients =
      editedIngredients.length > 0
        ? editedIngredients
        : analysisData?.ingredients || [];

    if (!analysisData && currentIngredients.length === 0) {
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

    const totalCalories = analysisData?.calories || 0;
    const totalProtein = analysisData
      ? getNutritionValue(analysisData, "protein_g") ||
        getNutritionValue(analysisData, "protein") ||
        0
      : 0;
    const totalCarbs = analysisData
      ? getNutritionValue(analysisData, "carbs_g") ||
        getNutritionValue(analysisData, "carbs") ||
        0
      : 0;
    const totalFat = analysisData
      ? getNutritionValue(analysisData, "fats_g") ||
        getNutritionValue(analysisData, "fat") ||
        0
      : 0;
    const totalFiber = analysisData
      ? getNutritionValue(analysisData, "fiber_g") ||
        getNutritionValue(analysisData, "fiber") ||
        0
      : 0;
    const totalSugar = analysisData
      ? getNutritionValue(analysisData, "sugar_g") ||
        getNutritionValue(analysisData, "sugar") ||
        0
      : 0;
    const totalSodium = analysisData
      ? getNutritionValue(analysisData, "sodium_mg") ||
        getNutritionValue(analysisData, "sodium") ||
        0
      : 0;

    if (currentIngredients.length > 0) {
      let ingredientSumCalories = 0;
      let ingredientSumProtein = 0;
      let ingredientSumCarbs = 0;
      let ingredientSumFat = 0;
      let ingredientSumFiber = 0;
      let ingredientSumSugar = 0;
      let ingredientSumSodium = 0;

      currentIngredients.forEach((ingredient) => {
        ingredientSumCalories += getNutritionValue(ingredient, "calories");
        ingredientSumProtein +=
          getNutritionValue(ingredient, "protein_g") ||
          getNutritionValue(ingredient, "protein");
        ingredientSumCarbs +=
          getNutritionValue(ingredient, "carbs_g") ||
          getNutritionValue(ingredient, "carbs");
        ingredientSumFat +=
          getNutritionValue(ingredient, "fats_g") ||
          getNutritionValue(ingredient, "fat");
        ingredientSumFiber +=
          getNutritionValue(ingredient, "fiber_g") ||
          getNutritionValue(ingredient, "fiber");
        ingredientSumSugar +=
          getNutritionValue(ingredient, "sugar_g") ||
          getNutritionValue(ingredient, "sugar");
        ingredientSumSodium +=
          getNutritionValue(ingredient, "sodium_mg") ||
          getNutritionValue(ingredient, "sodium");
      });

      return {
        calories: ingredientSumCalories || totalCalories,
        protein: ingredientSumProtein || totalProtein,
        carbs: ingredientSumCarbs || totalCarbs,
        fat: ingredientSumFat || totalFat,
        fiber: ingredientSumFiber || totalFiber,
        sugar: ingredientSumSugar || totalSugar,
        sodium: ingredientSumSodium || totalSodium,
      };
    }

    return {
      calories: totalCalories,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
      fiber: totalFiber,
      sugar: totalSugar,
      sodium: totalSodium,
    };
  };

  const renderAnalysisResults = () => {
    if (!analysisData) return null;

    const totalNutrition = calculateTotalNutrition();

    return (
      <View style={styles.resultsContainer}>
        {/* Header */}
        <View style={styles.resultsHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.resultsTitle}>{getMealName(analysisData)}</Text>
          <TouchableOpacity style={styles.infoButton}>
            <Info size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Nutrition Overview */}
        <NutritionOverview
          nutrition={totalNutrition}
          mealName={getMealName(analysisData)}
        />

        {/* Action Buttons */}
        <ActionButtons
          onDelete={handleDeleteMeal}
          onReAnalyze={handleReAnalyze}
          onSave={handleSaveMeal}
          isUpdating={isUpdating}
          isPosting={isPosting}
        />

        {/* Ingredients List */}
        <IngredientsList
          ingredients={
            editedIngredients.length > 0
              ? editedIngredients
              : analysisData.ingredients || []
          }
          onEditIngredient={handleEditIngredient}
          onRemoveIngredient={handleRemoveIngredient}
          onAddIngredient={handleAddIngredient}
        />

        {/* Health Insights */}
        <HealthInsights
          recommendations={analysisData.recommendations}
          healthNotes={analysisData.healthNotes}
        />
      </View>
    );
  };

  const renderScanningInterface = () => {
    if (!selectedImage || hasBeenAnalyzed) return null;

    return (
      <View style={styles.scanningContainer}>
        {/* Header */}
        <LinearGradient
          colors={["#10B981", "#059669"]}
          style={styles.scanHeader}
        >
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              setSelectedImage(null);
              setSelectedMealType(null);
              setShowMealTypeSelector(true);
            }}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Food</Text>
          <TouchableOpacity style={styles.headerButton}>
            <Info size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Scanning Area */}
        <View style={styles.scanArea}>
          <View style={styles.phoneFrame}>
            <Animated.View
              style={[
                styles.imageContainer,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <SelectedImage
                imageUri={selectedImage}
                userComment={userComment}
                isAnalyzing={isAnalyzing}
                hasBeenAnalyzed={hasBeenAnalyzed}
                onRemoveImage={() => {
                  resetAnalysisState();
                  setSelectedImage(null);
                  setShowResults(false);
                  setSelectedMealType(null);
                  setShowMealTypeSelector(true);
                }}
                onRetakePhoto={handleTakePhoto}
                onAnalyze={handleAnalyzeImage}
                onCommentChange={setUserComment}
              />

              {/* Scanning Lines Overlay */}
              <View style={styles.scanOverlay}>
                <View style={styles.scanFrame}>
                  <View style={styles.cornerTopLeft} />
                  <View style={styles.cornerTopRight} />
                  <View style={styles.cornerBottomLeft} />
                  <View style={styles.cornerBottomRight} />

                  <Animated.View
                    style={[
                      styles.scanLine,
                      {
                        transform: [
                          {
                            translateY: scanLineAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-50, 200],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                </View>
              </View>
            </Animated.View>
          </View>

          {/* Bottom Info */}
          <View style={styles.scanInfo}>
            <Text style={styles.scanTitle}>Nutritional Analysis</Text>
            <Text style={styles.scanSubtitle}>
              Hold your food inside the frame. It will be scanned automatically.
            </Text>
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.analyzeButton}
            onPress={handleAnalyzeImage}
            disabled={isAnalyzing}
          >
            <LinearGradient
              colors={["#10B981", "#059669"]}
              style={styles.analyzeButtonGradient}
            >
              <Zap size={24} color="#FFFFFF" />
              <Text style={styles.analyzeButtonText}>
                {isAnalyzing ? "Analyzing..." : "Analyze Food"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setSelectedImage(null);
                setSelectedMealType(null);
                setShowMealTypeSelector(true);
              }}
            >
              <RotateCcw size={20} color="#10B981" />
              <Text style={styles.secondaryButtonText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleSelectFromGallery}
            >
              <ImageIcon size={20} color="#10B981" />
              <Text style={styles.secondaryButtonText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderMealTypeSelection = () => {
    if (!showMealTypeSelector) return null;

    return (
      <View style={styles.mealTypeContainer}>
        <View style={styles.mealTypeContent}>
          <MealTypeSelector
            onSelect={(mealType) => {
              setSelectedMealType(mealType);
              setShowMealTypeSelector(false);
            }}
          />
        </View>
      </View>
    );
  };

  const renderEditModal = () => (
    <Modal
      visible={showEditModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowEditModal(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingIndex >= 0 ? "Edit" : "Add"} Ingredient
            </Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.modalInput}
                value={editingIngredient?.name || ""}
                onChangeText={(text) =>
                  setEditingIngredient((prev) =>
                    prev ? { ...prev, name: text } : null
                  )
                }
                placeholder="Enter ingredient name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Calories</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editingIngredient?.calories?.toString() || "0"}
                  onChangeText={(text) =>
                    setEditingIngredient((prev) =>
                      prev ? { ...prev, calories: parseFloat(text) || 0 } : null
                    )
                  }
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Protein (g)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editingIngredient?.protein?.toString() || "0"}
                  onChangeText={(text) =>
                    setEditingIngredient((prev) =>
                      prev ? { ...prev, protein: parseFloat(text) || 0 } : null
                    )
                  }
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Carbs (g)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editingIngredient?.carbs?.toString() || "0"}
                  onChangeText={(text) =>
                    setEditingIngredient((prev) =>
                      prev ? { ...prev, carbs: parseFloat(text) || 0 } : null
                    )
                  }
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Fat (g)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editingIngredient?.fat?.toString() || "0"}
                  onChangeText={(text) =>
                    setEditingIngredient((prev) =>
                      prev ? { ...prev, fat: parseFloat(text) || 0 } : null
                    )
                  }
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Fiber (g)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editingIngredient?.fiber?.toString() || "0"}
                  onChangeText={(text) =>
                    setEditingIngredient((prev) =>
                      prev ? { ...prev, fiber: parseFloat(text) || 0 } : null
                    )
                  }
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Sugar (g)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editingIngredient?.sugar?.toString() || "0"}
                  onChangeText={(text) =>
                    setEditingIngredient((prev) =>
                      prev ? { ...prev, sugar: parseFloat(text) || 0 } : null
                    )
                  }
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Sodium (mg)</Text>
              <TextInput
                style={styles.modalInput}
                value={editingIngredient?.sodium_mg?.toString() || "0"}
                onChangeText={(text) =>
                  setEditingIngredient((prev) =>
                    prev ? { ...prev, sodium_mg: parseFloat(text) || 0 } : null
                  )
                }
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowEditModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleSaveIngredient}
            >
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderDeleteConfirmModal = () => (
    <Modal
      visible={showDeleteConfirm}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowDeleteConfirm(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.confirmModalContent}>
          <AlertTriangle size={48} color="#EF4444" />
          <Text style={styles.confirmTitle}>Delete Analysis</Text>
          <Text style={styles.confirmMessage}>
            Are you sure you want to delete this meal analysis?
          </Text>

          <View style={styles.confirmActions}>
            <TouchableOpacity
              style={styles.confirmCancelButton}
              onPress={() => setShowDeleteConfirm(false)}
            >
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmDeleteButton}
              onPress={confirmDeleteMeal}
            >
              <Text style={styles.confirmDeleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#10B981" />

      {/* Show meal type selector first */}
      {showMealTypeSelector && renderMealTypeSelection()}

      {/* Show scanning interface when image is selected but not analyzed */}
      {selectedImage && !hasBeenAnalyzed && renderScanningInterface()}

      {/* Show analysis results */}
      {showResults && analysisData && (
        <ScrollView
          ref={scrollViewRef}
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={true}
          alwaysBounceVertical={true}
        >
          {renderAnalysisResults()}
        </ScrollView>
      )}

      {/* Show camera options when meal type is selected but no image */}
      {selectedMealType && !selectedImage && !showMealTypeSelector && (
        <View style={styles.cameraOptionsContainer}>
          <LinearGradient
            colors={["#10B981", "#059669"]}
            style={styles.cameraHeader}
          >
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                setSelectedMealType(null);
                setShowMealTypeSelector(true);
              }}
            >
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              Capture {selectedMealType.label}
            </Text>
            <View style={styles.headerButton} />
          </LinearGradient>

          <View style={styles.cameraOptionsContent}>
            <TouchableOpacity
              style={styles.primaryCameraButton}
              onPress={handleTakePhoto}
            >
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={styles.primaryButtonGradient}
              >
                <Camera size={32} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Take Photo</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryCameraButton}
              onPress={handleSelectFromGallery}
            >
              <ImageIcon size={24} color="#10B981" />
              <Text style={styles.secondaryCameraButtonText}>
                Choose from Gallery
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {renderEditModal()}
      {renderDeleteConfirmModal()}

      {/* Enhanced Scanning Animation */}
      <ScanningAnimation
        visible={showScanAnimation}
        onComplete={handleScanComplete}
        progress={analysisProgress}
        isAnalyzing={false}
      />
    </SafeAreaView>
  );
}

// Error boundary wrapper with enhanced error handling
class CameraErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Camera screen error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Camera temporarily unavailable</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => this.setState({ hasError: false })}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

export default function CameraScreen() {
  return (
    <CameraErrorBoundary>
      <CameraScreenContent />
    </CameraErrorBoundary>
  );
}

const processImage = async (imageUri: string): Promise<string | null> => {
  try {
    console.log("Processing image:", imageUri);

    if (!imageUri || imageUri.trim() === "") {
      console.error("Invalid image URI provided");
      return null;
    }

    try {
      // Try to use the optimization utility first
      const { optimizeImageForUpload } = await import(
        "@/src/utils/imageOptimiztion"
      );

      const optimizedBase64 = await optimizeImageForUpload(imageUri, {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.8,
        format: "jpeg",
      });

      if (optimizedBase64 && optimizedBase64.length > 100) {
        console.log(
          "Image optimized successfully, base64 length:",
          optimizedBase64.length
        );
        return optimizedBase64;
      }
    } catch (optimizeError) {
      console.warn(
        "Image optimization failed, falling back to direct conversion:",
        optimizeError
      );
    }

    // Fallback: Direct base64 conversion using new File API
    try {
      // Use the new File API instead of deprecated readAsStringAsync
      const file = new File(imageUri);
      const base64 = await file.text();

      if (!base64 || base64.length < 100) {
        console.error("Failed to convert image to base64 or result too small");
        return null;
      }

      // Check size limit (10MB base64 ≈ 7.5MB binary)
      if (base64.length > 10 * 1024 * 1024) {
        console.error("Image too large for processing");
        return null;
      }

      console.log("Image converted to base64, length:", base64.length);
      return base64;
    } catch (fileError) {
      console.error("Failed to read image file:", fileError);

      // Final fallback: Try legacy API if new API fails
      try {
        const { readAsStringAsync, EncodingType } = await import(
          "expo-file-system/legacy"
        );
        const base64 = await readAsStringAsync(imageUri, {
          encoding: EncodingType.Base64,
        });

        if (!base64 || base64.length < 100) {
          console.error(
            "Failed to convert image to base64 or result too small"
          );
          return null;
        }

        console.log("Image converted using legacy API, length:", base64.length);
        return base64;
      } catch (legacyError) {
        console.error("Legacy API also failed:", legacyError);
        return null;
      }
    }
  } catch (error) {
    console.error("Error processing image:", error);
    return null;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingBottom: 34,
  },

  // Meal Type Selection
  mealTypeContainer: {
    flex: 1,
  },
  mealTypeHeader: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  mealTypeTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  mealTypeSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  mealTypeContent: {
    flex: 1,
    paddingHorizontal: 24,
  },

  // Camera Options
  cameraOptionsContainer: {
    flex: 1,
  },
  cameraHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  cameraOptionsContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 24,
  },
  primaryCameraButton: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 12,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  secondaryCameraButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderWidth: 2,
    borderColor: "#10B981",
    borderRadius: 16,
    gap: 12,
    backgroundColor: "#FFFFFF",
  },
  secondaryCameraButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#10B981",
  },

  // Scanning Interface
  scanningContainer: {
    flex: 1,
  },
  scanHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  scanArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  phoneFrame: {
    width: screenWidth - 80,
    height: screenWidth - 80,
    backgroundColor: "#1F2937",
    borderRadius: 24,
    padding: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  imageContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  scanOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    width: 200,
    height: 200,
    position: "relative",
  },
  cornerTopLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#10B981",
  },
  cornerTopRight: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: "#10B981",
  },
  cornerBottomLeft: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#10B981",
  },
  cornerBottomRight: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: "#10B981",
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  scanInfo: {
    alignItems: "center",
    marginTop: 32,
    paddingHorizontal: 24,
  },
  scanTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  scanSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
  },
  bottomActions: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 16,
  },
  analyzeButton: {
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  analyzeButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 22,
    gap: 14,
  },
  analyzeButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#10B981",
    borderRadius: 16,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#10B981",
  },

  // Results
  resultsContainer: {
    flex: 1,
    backgroundColor: "#FAFBFC",
  },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingVertical: 18,
    backgroundColor: "#007AFF",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: screenWidth - 40,
    maxHeight: "80%",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: "row",
    gap: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#F9FAFB",
    color: "#1F2937",
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 16,
  },
  modalCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6B7280",
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  confirmModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginHorizontal: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  confirmMessage: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
  },
  confirmCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  confirmCancelText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6B7280",
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  confirmDeleteText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#10B981",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});