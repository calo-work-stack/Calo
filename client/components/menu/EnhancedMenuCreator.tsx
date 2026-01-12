import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Animated,
} from "react-native";
import {
  Coffee,
  Utensils,
  Cookie,
  Flame,
  Star,
  Plus,
  ChefHat,
  Clock,
  ShoppingCart,
  Search,
  X,
  Check,
  Globe,
  Leaf,
  Wheat,
  Calendar,
  Edit3,
  Save,
  DollarSign,
  AlertCircle,
  Info,
} from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { useShoppingList } from "@/hooks/useShoppingList";
import { api } from "@/src/services/api";
import { EnhancedErrorDisplay } from "../EnhancedErrorDisplay";
import { useSelector } from "react-redux";
import type { RootState } from "@/src/store";

const { width } = Dimensions.get("window");

interface MenuCreatorProps {
  onCreateMenu: (menuData: any) => void;
  onClose: () => void;
}

interface SelectedIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  from_shopping_list: boolean;
  estimated_cost?: number;
}

interface MenuPreferences {
  cuisine: string;
  dietary_restrictions: string[];
  meal_count: number;
  duration_days: number;
  budget_amount: string;
  cooking_difficulty: string;
}

export const EnhancedMenuCreator: React.FC<MenuCreatorProps> = ({
  onCreateMenu,
  onClose,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { shoppingList } = useShoppingList();

  // Get questionnaire data from Redux store
  const questionnaire = useSelector((state: RootState) => state.questionnaire.questionnaire);
  const userBudget = questionnaire?.daily_food_budget;
  const cookingPreference = questionnaire?.cooking_preference;
  const availableCookingMethods = questionnaire?.available_cooking_methods || [];
  const dailyCookingTime = questionnaire?.daily_cooking_time;

  // States
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedIngredients, setSelectedIngredients] = useState<
    SelectedIngredient[]
  >([]);
  const [customIngredient, setCustomIngredient] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [menuPreferences, setMenuPreferences] = useState<MenuPreferences>({
    cuisine: "mediterranean",
    dietary_restrictions: [],
    meal_count: 3,
    duration_days: 7,
    budget_amount: userBudget || "",
    cooking_difficulty: "easy",
  });

  // New states for enhanced features
  const [customMenuName, setCustomMenuName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [totalEstimatedCost, setTotalEstimatedCost] = useState(0);
  const [errorInfo, setErrorInfo] = useState<{
    visible: boolean;
    error: any;
  }>({ visible: false, error: null });
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [tempBudget, setTempBudget] = useState(userBudget || "");

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();
  }, []);

  // Calculate total cost when ingredients change
  useEffect(() => {
    const total = selectedIngredients.reduce(
      (sum, ing) => sum + (ing.estimated_cost || 0),
      0
    );
    setTotalEstimatedCost(total);
  }, [selectedIngredients]);

  // Expanded cuisine options with enhanced styling
  const cuisineOptions = [
    {
      id: "mediterranean",
      name: "Mediterranean",
      icon: "🌿",
      color: "#059669",
      description: "Fresh, healthy, olive oil-based",
    },
    {
      id: "asian",
      name: "Asian",
      icon: "🥢",
      color: "#dc2626",
      description: "Soy-based, rice, vegetables",
    },
    {
      id: "american",
      name: "American",
      icon: "🍔",
      color: "#1f2937",
      description: "Comfort food, hearty meals",
    },
    {
      id: "italian",
      name: "Italian",
      icon: "🍝",
      color: "#65a30d",
      description: "Pasta, tomatoes, herbs",
    },
    {
      id: "mexican",
      name: "Mexican",
      icon: "🌮",
      color: "#ea580c",
      description: "Spicy, beans, corn-based",
    },
    {
      id: "indian",
      name: "Indian",
      icon: "🍛",
      color: "#7c2d12",
      description: "Rich spices, lentils, rice",
    },
    {
      id: "japanese",
      name: "Japanese",
      icon: "🍣",
      color: "#b91c1c",
      description: "Seafood, rice, umami flavors",
    },
    {
      id: "middle_eastern",
      name: "Middle Eastern",
      icon: "🥙",
      color: "#92400e",
      description: "Hummus, pita, aromatic spices",
    },
    {
      id: "french",
      name: "French",
      icon: "🥐",
      color: "#1e40af",
      description: "Elegant, butter, wine-based",
    },
  ];

  // Expanded dietary restrictions
  const dietaryOptions = [
    { id: "vegetarian", name: "Vegetarian", icon: Leaf, color: "#16a34a" },
    { id: "vegan", name: "Vegan", icon: Leaf, color: "#15803d" },
    { id: "gluten_free", name: "Gluten Free", icon: Wheat, color: "#ca8a04" },
    { id: "keto", name: "Keto", icon: Flame, color: "#dc2626" },
    { id: "low_carb", name: "Low Carb", icon: Flame, color: "#ea580c" },
    { id: "dairy_free", name: "Dairy Free", icon: X, color: "#7c3aed" },
    { id: "paleo", name: "Paleo", icon: Flame, color: "#92400e" },
    { id: "pescatarian", name: "Pescatarian", icon: Utensils, color: "#0891b2" },
    { id: "halal", name: "Halal", icon: Check, color: "#047857" },
    { id: "kosher", name: "Kosher", icon: Check, color: "#1d4ed8" },
  ];

  // Filter shopping list based on search
  const filteredShoppingList = shoppingList.filter((item: any) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleIngredientFromShoppingList = (item: any) => {
    const existingIndex = selectedIngredients.findIndex(
      (ing) => ing.id === item.id
    );

    if (existingIndex >= 0) {
      setSelectedIngredients((prev) =>
        prev.filter((_, index) => index !== existingIndex)
      );
    } else {
      setSelectedIngredients((prev) => [
        ...prev,
        {
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          from_shopping_list: true,
          estimated_cost: item.estimated_cost || 0,
        },
      ]);
    }
  };

  const addCustomIngredient = () => {
    if (!customIngredient.trim()) return;

    const newIngredient: SelectedIngredient = {
      id: `custom_${Date.now()}`,
      name: customIngredient.trim(),
      quantity: 1,
      unit: "piece",
      from_shopping_list: false,
      estimated_cost: 3, // Default cost for custom ingredients
    };

    setSelectedIngredients((prev) => [...prev, newIngredient]);
    setCustomIngredient("");
  };

  const updateIngredientQuantity = (id: string, quantity: number) => {
    setSelectedIngredients((prev) =>
      prev.map((ing) =>
        ing.id === id ? { ...ing, quantity: Math.max(1, quantity) } : ing
      )
    );
  };

  const toggleDietaryRestriction = (restriction: string) => {
    setMenuPreferences((prev) => ({
      ...prev,
      dietary_restrictions: prev.dietary_restrictions.includes(restriction)
        ? prev.dietary_restrictions.filter((r) => r !== restriction)
        : [...prev.dietary_restrictions, restriction],
    }));
  };

  // Add ref to prevent duplicate requests
  const isGeneratingRef = useRef(false);

  const generateMenu = async () => {
    // Prevent duplicate requests using both state and ref
    if (isGenerating || isGeneratingRef.current) {
      console.log(
        "Menu generation already in progress, ignoring duplicate request"
      );
      return;
    }

    setIsGenerating(true);
    isGeneratingRef.current = true;
    try {
      // Enhanced prompt optimized for quality and speed
      const enhancedPrompt = customMenuName
        ? `USER SPECIFIED EXACT MENU NAME: "${customMenuName}"`
        : `Create a catchy 2-3 word menu name that captures the essence of this ${menuPreferences.cuisine} ${menuPreferences.duration_days}-day plan.`;

      console.log("🎯 Starting menu generation with enhanced prompt...");

      const menuData = {
        preferences: {
          ...menuPreferences,
          custom_name: customMenuName,
          enhanced_prompt: enhancedPrompt,
        },
        ingredients: selectedIngredients,
        user_ingredients: selectedIngredients.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          from_shopping_list: ing.from_shopping_list,
        })),
      };

      const response = await api.post(
        "/recommended-menus/generate-with-ingredients",
        menuData
      );

      if (response.data.success) {
        Alert.alert(
          "Success!",
          "Your personalized menu has been generated successfully!",
          [
            {
              text: "View Menu",
              onPress: () => {
                setIsGenerating(false);
                onCreateMenu(response.data.data);
                onClose();
              },
            },
          ]
        );
      } else {
        throw new Error(response.data.error || "Failed to generate menu");
      }
    } catch (error: any) {
      console.error("Error generating menu:", error);

      // Enhanced error context with network detection
      const isNetworkError =
        error?.message?.includes("Network") ||
        error?.message?.includes("network") ||
        error?.code === "ERR_NETWORK" ||
        !error?.response;

      // Provide context-specific error information
      const contextualError = {
        ...error,
        message: isNetworkError,
        ingredients: selectedIngredients.map((i) => i.name),
        preferences: menuPreferences,
      };

      setErrorInfo({ visible: true, error: contextualError });
    } finally {
      setIsGenerating(false);
      isGeneratingRef.current = false;
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[0, 1, 2].map((step) => (
        <View key={step} style={styles.stepIndicatorContainer}>
          <View
            style={[
              styles.stepDot,
              {
                backgroundColor:
                  step <= currentStep ? colors.emerald500 : colors.border,
              },
            ]}
          >
            {step < currentStep && <Check size={12} color="#ffffff" />}
          </View>
          {step < 2 && (
            <View
              style={[
                styles.stepLine,
                {
                  backgroundColor:
                    step < currentStep ? colors.emerald500 : colors.border,
                },
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  // Helper function to get cooking preference label
  const getCookingPreferenceLabel = (pref: string | undefined) => {
    switch (pref) {
      case "cooked": return t("menuCreator.cookingLevels.cooked");
      case "easy_prep": return t("menuCreator.cookingLevels.easyPrep");
      case "ready_made": return t("menuCreator.cookingLevels.readyMade");
      case "no_cooking": return t("menuCreator.cookingLevels.noCooking");
      default: return t("menuCreator.cookingLevels.notSet");
    }
  };

  // Helper function to get cooking preference icon
  const getCookingPreferenceIcon = (pref: string | undefined) => {
    switch (pref) {
      case "cooked": return "👨‍🍳";
      case "easy_prep": return "⚡";
      case "ready_made": return "📦";
      case "no_cooking": return "🥗";
      default: return "❓";
    }
  };

  const renderIngredientSelection = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        {t("menuCreator.selectIngredients")}
      </Text>
      <Text style={[styles.stepDescription, { color: colors.icon }]}>
        {t("menuCreator.selectIngredientsDesc")}
      </Text>

      {/* Budget Reminder */}
      {userBudget && (
        <TouchableOpacity
          style={[
            styles.budgetReminder,
            { backgroundColor: "#f59e0b15", borderColor: "#f59e0b40" },
          ]}
          onPress={() => setShowBudgetModal(true)}
        >
          <View style={styles.budgetReminderContent}>
            <AlertCircle size={20} color="#d97706" />
            <View style={styles.budgetReminderText}>
              <Text style={[styles.budgetReminderTitle, { color: "#b45309" }]}>
                {t("menuCreator.budgetReminder")}
              </Text>
              <Text style={[styles.budgetReminderValue, { color: colors.text }]}>
                {t("menuCreator.dailyBudgetIs", { budget: userBudget })}
              </Text>
            </View>
          </View>
          <Text style={[styles.budgetChangeLink, { color: "#d97706" }]}>
            {t("menuCreator.changeBudget")}
          </Text>
        </TouchableOpacity>
      )}

      {/* Cost Display */}
      <View
        style={[
          styles.costDisplay,
          { backgroundColor: colors.emerald500 + "20" },
        ]}
      >
        <DollarSign size={20} color={colors.emerald500} />
        <Text style={[styles.costText, { color: colors.emerald500 }]}>
          {t("menuCreator.estimatedCost")}: ₪{totalEstimatedCost.toFixed(2)}
        </Text>
      </View>

      {/* Search Bar */}
      <View
        style={[styles.searchContainer, { backgroundColor: colors.surface }]}
      >
        <Search size={20} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search shopping list..."
          placeholderTextColor={colors.icon}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Shopping List Items */}
      <Text style={[styles.sectionLabel, { color: colors.text }]}>
        From Shopping List ({filteredShoppingList.length})
      </Text>
      <ScrollView
        style={styles.ingredientsList}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        bounces={true}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {filteredShoppingList.map((item: any) => {
          const isSelected = selectedIngredients.some(
            (ing) => ing.id === item.id
          );
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.ingredientItem,
                {
                  backgroundColor: isSelected
                    ? colors.emerald500 + "20"
                    : colors.surface,
                  borderColor: isSelected ? colors.emerald500 : colors.border,
                },
              ]}
              onPress={() => toggleIngredientFromShoppingList(item)}
            >
              <View style={styles.ingredientInfo}>
                <Text style={[styles.ingredientName, { color: colors.text }]}>
                  {item.name}
                </Text>
                <Text
                  style={[styles.ingredientDetails, { color: colors.icon }]}
                >
                  {item.quantity} {item.unit}
                  {item.estimated_cost &&
                    ` • $${item.estimated_cost.toFixed(2)}`}
                </Text>
              </View>
              {isSelected && <Check size={20} color={colors.emerald500} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Custom Ingredient Input */}
      <Text style={[styles.sectionLabel, { color: colors.text }]}>
        Add Custom Ingredient
      </Text>
      <View style={styles.customIngredientContainer}>
        <TextInput
          style={[
            styles.customIngredientInput,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="Enter ingredient name..."
          placeholderTextColor={colors.icon}
          value={customIngredient}
          onChangeText={setCustomIngredient}
        />
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.emerald500 }]}
          onPress={addCustomIngredient}
        >
          <Plus size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Selected Ingredients with Quantity Controls */}
      {selectedIngredients.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            Selected ({selectedIngredients.length})
          </Text>
          <View style={styles.selectedIngredients}>
            {selectedIngredients.map((ingredient) => (
              <View
                key={ingredient.id}
                style={[
                  styles.selectedChip,
                  { backgroundColor: colors.emerald500 + "20" },
                ]}
              >
                <View style={styles.selectedChipContent}>
                  <Text
                    style={[
                      styles.selectedChipText,
                      { color: colors.emerald500 },
                    ]}
                  >
                    {ingredient.name}
                  </Text>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() =>
                        updateIngredientQuantity(
                          ingredient.id,
                          ingredient.quantity - 1
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.quantityButtonText,
                          { color: colors.emerald500 },
                        ]}
                      >
                        -
                      </Text>
                    </TouchableOpacity>
                    <Text
                      style={[
                        styles.quantityText,
                        { color: colors.emerald500 },
                      ]}
                    >
                      {ingredient.quantity}
                    </Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() =>
                        updateIngredientQuantity(
                          ingredient.id,
                          ingredient.quantity + 1
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.quantityButtonText,
                          { color: colors.emerald500 },
                        ]}
                      >
                        +
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    setSelectedIngredients((prev) =>
                      prev.filter((ing) => ing.id !== ingredient.id)
                    )
                  }
                >
                  <X size={14} color={colors.emerald500} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );

  const renderPreferences = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Menu Preferences
      </Text>
      <Text style={[styles.stepDescription, { color: colors.icon }]}>
        Customize your menu based on your preferences
      </Text>

      {/* Custom Menu Name */}
      <Text style={[styles.sectionLabel, { color: colors.text }]}>
        Custom Menu Name (Optional)
      </Text>
      <View style={styles.customNameContainer}>
        <TextInput
          style={[
            styles.customNameInput,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="e.g., 'Fresh Week', 'Comfort Classics'..."
          placeholderTextColor={colors.icon}
          value={customMenuName}
          onChangeText={setCustomMenuName}
          maxLength={20}
        />
      </View>

      {/* Cuisine Selection */}
      <Text style={[styles.sectionLabel, { color: colors.text }]}>
        Cuisine Type
      </Text>
      <View style={styles.optionsGrid}>
        {cuisineOptions.map((cuisine) => (
          <TouchableOpacity
            key={cuisine.id}
            style={[
              styles.optionCard,
              {
                backgroundColor:
                  menuPreferences.cuisine === cuisine.id
                    ? cuisine.color + "20"
                    : colors.surface,
                borderColor:
                  menuPreferences.cuisine === cuisine.id
                    ? cuisine.color
                    : colors.border,
              },
            ]}
            onPress={() =>
              setMenuPreferences((prev) => ({ ...prev, cuisine: cuisine.id }))
            }
          >
            <Text style={styles.optionEmoji}>{cuisine.icon}</Text>
            <Text
              style={[
                styles.optionText,
                {
                  color:
                    menuPreferences.cuisine === cuisine.id
                      ? cuisine.color
                      : colors.text,
                },
              ]}
            >
              {cuisine.name}
            </Text>
            <Text style={[styles.optionDescription, { color: colors.icon }]}>
              {cuisine.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Dietary Restrictions */}
      <Text style={[styles.sectionLabel, { color: colors.text }]}>
        Dietary Preferences
      </Text>
      <View style={styles.optionsGrid}>
        {dietaryOptions.map((option) => {
          const isSelected = menuPreferences.dietary_restrictions.includes(
            option.id
          );
          const IconComponent = option.icon;
          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                {
                  backgroundColor: isSelected
                    ? option.color + "20"
                    : colors.surface,
                  borderColor: isSelected ? option.color : colors.border,
                },
              ]}
              onPress={() => toggleDietaryRestriction(option.id)}
            >
              <IconComponent
                size={20}
                color={isSelected ? option.color : colors.icon}
              />
              <Text
                style={[
                  styles.optionText,
                  {
                    color: isSelected ? option.color : colors.text,
                  },
                ]}
              >
                {option.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Menu Duration */}
      <Text style={[styles.sectionLabel, { color: colors.text }]}>
        Menu Duration
      </Text>
      <View style={styles.durationContainer}>
        {[3, 7, 14].map((days) => (
          <TouchableOpacity
            key={days}
            style={[
              styles.durationOption,
              {
                backgroundColor:
                  menuPreferences.duration_days === days
                    ? colors.emerald500 + "20"
                    : colors.surface,
                borderColor:
                  menuPreferences.duration_days === days
                    ? colors.emerald500
                    : colors.border,
              },
            ]}
            onPress={() =>
              setMenuPreferences((prev) => ({ ...prev, duration_days: days }))
            }
          >
            <Calendar
              size={20}
              color={
                menuPreferences.duration_days === days
                  ? colors.emerald500
                  : colors.icon
              }
            />
            <Text
              style={[
                styles.durationText,
                {
                  color:
                    menuPreferences.duration_days === days
                      ? colors.emerald500
                      : colors.text,
                },
              ]}
            >
              {days} Days
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Budget Amount */}
      <Text style={[styles.sectionLabel, { color: colors.text }]}>
        {t("menuCreator.dailyBudget")}
      </Text>
      <View style={styles.budgetInputContainer}>
        <View style={[styles.budgetInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.budgetCurrency, { color: colors.emerald500 }]}>₪</Text>
          <TextInput
            style={[styles.budgetInput, { color: colors.text }]}
            value={menuPreferences.budget_amount}
            onChangeText={(text) =>
              setMenuPreferences((prev) => ({ ...prev, budget_amount: text.replace(/[^0-9]/g, "") }))
            }
            placeholder={t("menuCreator.enterBudgetAmount") || "Enter amount"}
            placeholderTextColor={colors.icon}
            keyboardType="numeric"
            maxLength={5}
          />
          <Text style={[styles.budgetPerDay, { color: colors.icon }]}>
            {t("menuCreator.perDay")}
          </Text>
        </View>
        {userBudget && menuPreferences.budget_amount !== userBudget && (
          <TouchableOpacity
            style={[styles.useQuestionnaireBtn, { backgroundColor: colors.emerald500 + "15" }]}
            onPress={() => setMenuPreferences((prev) => ({ ...prev, budget_amount: userBudget }))}
          >
            <Text style={[styles.useQuestionnaireBtnText, { color: colors.emerald500 }]}>
              {t("menuCreator.useQuestionnaireBudget", { budget: userBudget })}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderSummary = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        {t("menuCreator.reviewAndGenerate")}
      </Text>
      <Text style={[styles.stepDescription, { color: colors.icon }]}>
        {t("menuCreator.reviewDescription")}
      </Text>

      {/* Summary Cards */}
      <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.summaryTitle, { color: colors.text }]}>
          {t("menuCreator.ingredients")}
        </Text>
        <Text style={[styles.summaryValue, { color: colors.icon }]}>
          {selectedIngredients.length} {t("menuCreator.selected")} ({t("menuCreator.est")}. ₪
          {totalEstimatedCost.toFixed(2)})
        </Text>
        <Text style={[styles.summaryDetail, { color: colors.icon }]}>
          {selectedIngredients.filter((i) => i.from_shopping_list).length} {t("menuCreator.fromShoppingList")}
        </Text>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.summaryTitle, { color: colors.text }]}>
          {t("menuCreator.menuStyle")}
        </Text>
        <Text style={[styles.summaryValue, { color: colors.icon }]}>
          {cuisineOptions.find((c) => c.id === menuPreferences.cuisine)?.name}{" "}
          {t("menuCreator.cuisine")}
        </Text>
        {menuPreferences.dietary_restrictions.length > 0 && (
          <Text style={[styles.summaryDetail, { color: colors.icon }]}>
            {menuPreferences.dietary_restrictions.join(", ")}
          </Text>
        )}
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.summaryTitle, { color: colors.text }]}>
          {t("menuCreator.durationAndBudget")}
        </Text>
        <Text style={[styles.summaryValue, { color: colors.icon }]}>
          {menuPreferences.duration_days} {t("menuCreator.days")} • ₪{menuPreferences.budget_amount || "0"}{" "}
          {t("menuCreator.perDay")}
        </Text>
        <Text style={[styles.summaryDetail, { color: colors.icon }]}>
          {menuPreferences.meal_count} {t("menuCreator.mealsPerDay")}
        </Text>
      </View>

      {customMenuName && (
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.emerald500 + "10" },
          ]}
        >
          <Text style={[styles.summaryTitle, { color: colors.emerald500 }]}>
            {t("menuCreator.customName")}
          </Text>
          <Text style={[styles.summaryValue, { color: colors.emerald500 }]}>
            "{customMenuName}"
          </Text>
        </View>
      )}

      {/* Questionnaire Preferences Confirmation */}
      <View
        style={[
          styles.preferencesConfirmCard,
          { backgroundColor: colors.emerald500 + "10" },
        ]}
      >
        <Text style={[styles.preferencesConfirmTitle, { color: colors.text }]}>
          {t("menuCreator.preferencesApplied")}
        </Text>

        {/* Cooking Level */}
        <View style={styles.preferencesConfirmItem}>
          <Text style={styles.summaryIndicatorIcon}>
            {getCookingPreferenceIcon(cookingPreference)}
          </Text>
          <Text style={[styles.preferencesConfirmText, { color: colors.text }]}>
            {t("menuCreator.cookingLevel")}: {getCookingPreferenceLabel(cookingPreference)}
          </Text>
          <Check size={16} color={colors.emerald500} />
        </View>

        {/* Available Cooking Methods */}
        {availableCookingMethods.length > 0 && (
          <View style={styles.preferencesConfirmItem}>
            <Text style={styles.summaryIndicatorIcon}>🍳</Text>
            <Text style={[styles.preferencesConfirmText, { color: colors.text }]}>
              {t("menuCreator.cookingMethods")}: {availableCookingMethods.length} {t("menuCreator.available")}
            </Text>
            <Check size={16} color={colors.emerald500} />
          </View>
        )}

        {/* Daily Cooking Time */}
        {dailyCookingTime && (
          <View style={styles.preferencesConfirmItem}>
            <Text style={styles.summaryIndicatorIcon}>⏱️</Text>
            <Text style={[styles.preferencesConfirmText, { color: colors.text }]}>
              {t("menuCreator.cookingTime")}: {dailyCookingTime} {t("menuCreator.minutes")}
            </Text>
            <Check size={16} color={colors.emerald500} />
          </View>
        )}

        {/* Budget */}
        {userBudget && (
          <View style={styles.preferencesConfirmItem}>
            <Text style={styles.summaryIndicatorIcon}>💰</Text>
            <Text style={[styles.preferencesConfirmText, { color: colors.text }]}>
              {t("menuCreator.dailyBudget")}: ₪{userBudget}
            </Text>
            <Check size={16} color={colors.emerald500} />
          </View>
        )}

        <View style={[styles.summaryIndicator, { backgroundColor: colors.emerald500 + "15", marginTop: 8 }]}>
          <Info size={16} color={colors.emerald500} />
          <Text style={[styles.summaryIndicatorLabel, { color: colors.emerald600, flex: 1 }]}>
            {t("menuCreator.preferencesNote")}
          </Text>
        </View>
      </View>

      {/* Generate Button with Progress */}
      <TouchableOpacity
        style={[
          styles.generateButton,
          {
            backgroundColor: colors.emerald500,
            opacity: isGenerating ? 0.9 : 1,
          },
        ]}
        onPress={generateMenu}
        disabled={isGenerating}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={
            isGenerating
              ? [colors.emerald600, colors.emerald500]
              : [colors.emerald500, colors.emerald600]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.generateButtonGradient}
        >
          {isGenerating ? (
            <>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={styles.generateButtonText}>
                Creating Your Menu...
              </Text>
              <Text style={styles.generateButtonSubtext}>
                AI is crafting restaurant-quality recipes
              </Text>
            </>
          ) : (
            <>
              <ChefHat size={24} color="#ffffff" />
              <Text style={styles.generateButtonText}>Generate Menu</Text>
              <Text style={styles.generateButtonSubtext}>
                Powered by AI • ~10-15 seconds
              </Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const stepContent = [
    renderIngredientSelection,
    renderPreferences,
    renderSummary,
  ];

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: colors.background },
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.icon} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Create Menu
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {stepContent[currentStep]()}
        </ScrollView>

        {/* Navigation */}
        <View style={[styles.navigation, { backgroundColor: colors.surface }]}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={[
                styles.navButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setCurrentStep((prev) => prev - 1)}
            >
              <Text style={[styles.navButtonText, { color: colors.text }]}>
                Previous
              </Text>
            </TouchableOpacity>
          )}

          {currentStep < 2 && (
            <TouchableOpacity
              style={[
                styles.navButton,
                { backgroundColor: colors.emerald500, marginLeft: "auto" },
              ]}
              onPress={() => setCurrentStep((prev) => prev + 1)}
            >
              <Text style={styles.navButtonText}>Next</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Error Display */}
        <EnhancedErrorDisplay
          visible={errorInfo.visible}
          error={errorInfo.error}
          onClose={() => setErrorInfo({ visible: false, error: null })}
          onRetry={generateMenu}
          context={t("menu.generation") || "Menu Generation"}
        />

        {/* Budget Change Modal */}
        <Modal
          visible={showBudgetModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowBudgetModal(false)}
        >
          <View style={styles.budgetModalOverlay}>
            <View style={[styles.budgetModalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.budgetModalTitle, { color: colors.text }]}>
                {t("menuCreator.changeDailyBudget")}
              </Text>
              <Text style={[styles.budgetModalSubtitle, { color: colors.icon }]}>
                {t("menuCreator.budgetModalDescription")}
              </Text>
              <TextInput
                style={[
                  styles.budgetModalInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border
                  }
                ]}
                value={tempBudget}
                onChangeText={setTempBudget}
                keyboardType="numeric"
                placeholder={t("menuCreator.enterBudget")}
                placeholderTextColor={colors.icon}
              />
              <View style={styles.budgetModalButtons}>
                <TouchableOpacity
                  style={[
                    styles.budgetModalButton,
                    { backgroundColor: colors.border }
                  ]}
                  onPress={() => {
                    setTempBudget(userBudget || "");
                    setShowBudgetModal(false);
                  }}
                >
                  <Text style={[styles.budgetModalButtonText, { color: colors.text }]}>
                    {t("common.cancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.budgetModalButton,
                    { backgroundColor: colors.emerald500 }
                  ]}
                  onPress={() => {
                    // Note: This only updates the local display.
                    // To persist, you'd need to update the questionnaire
                    Alert.alert(
                      t("menuCreator.budgetUpdated"),
                      t("menuCreator.budgetUpdatedMessage", { budget: tempBudget }),
                      [{ text: t("common.ok") }]
                    );
                    setShowBudgetModal(false);
                  }}
                >
                  <Text style={[styles.budgetModalButtonText, { color: "#ffffff" }]}>
                    {t("common.save")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  stepIndicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  stepLine: {
    width: 30,
    height: 2,
    marginHorizontal: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContent: {
    paddingBottom: 100,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  stepDescription: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 24,
    opacity: 0.8,
  },
  costDisplay: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  costText: {
    fontSize: 16,
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  ingredientsList: {
    maxHeight: 250,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    borderRadius: 8,
    padding: 8,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  ingredientDetails: {
    fontSize: 14,
  },
  customIngredientContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  customIngredientInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedIngredients: {
    gap: 8,
    marginBottom: 20,
  },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  selectedChipContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  quantityButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  quantityButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  quantityText: {
    fontSize: 14,
    fontWeight: "600",
    marginHorizontal: 8,
    minWidth: 20,
    textAlign: "center",
  },
  customNameContainer: {
    marginBottom: 24,
  },
  customNameInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    width: (width - 60) / 2,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  optionEmoji: {
    fontSize: 24,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  optionDescription: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 14,
  },
  durationContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  durationOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  durationText: {
    fontSize: 14,
    fontWeight: "600",
  },
  budgetInputContainer: {
    marginBottom: 24,
    gap: 12,
  },
  budgetInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  budgetCurrency: {
    fontSize: 20,
    fontWeight: "700",
  },
  budgetInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
  },
  budgetPerDay: {
    fontSize: 14,
    fontWeight: "500",
  },
  useQuestionnaireBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  useQuestionnaireBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  summaryDetail: {
    fontSize: 12,
    marginTop: 2,
  },
  generateButton: {
    borderRadius: 16,
    marginTop: 20,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  generateButtonGradient: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 24,
    gap: 8,
  },
  generateButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  generateButtonSubtext: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "500",
  },
  navigation: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
  },
  navButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  // Budget reminder styles
  budgetReminder: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  budgetReminderContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  budgetReminderText: {
    flex: 1,
  },
  budgetReminderTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  budgetReminderValue: {
    fontSize: 15,
    fontWeight: "500",
  },
  budgetChangeLink: {
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  // Budget modal styles
  budgetModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  budgetModalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    padding: 24,
  },
  budgetModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  budgetModalSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  budgetModalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
  },
  budgetModalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  budgetModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  budgetModalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  // Summary indicator styles
  summaryIndicator: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    gap: 10,
  },
  summaryIndicatorIcon: {
    fontSize: 20,
  },
  summaryIndicatorContent: {
    flex: 1,
  },
  summaryIndicatorLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 2,
  },
  summaryIndicatorValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  summaryIndicatorCheck: {
    marginLeft: "auto",
  },
  // Preferences confirmation card
  preferencesConfirmCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  preferencesConfirmTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
  },
  preferencesConfirmItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  preferencesConfirmText: {
    fontSize: 14,
    flex: 1,
  },
});
