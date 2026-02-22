import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
  Animated,
  Easing,
  Pressable,
  I18nManager,
  Platform,
  KeyboardAvoidingView,
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
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Package,
  Timer,
  Minus,
  Heart,
  Zap,
  Filter,
} from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { useShoppingList } from "@/hooks/useShoppingList";
import { api } from "@/src/services/api";
import { EnhancedErrorDisplay } from "../EnhancedErrorDisplay";
import { useSelector } from "react-redux";
import type { RootState } from "@/src/store";
import { errorMessageIncludesAny } from "@/src/utils/errorHandler";

const { width, height } = Dimensions.get("window");
const isRTL = I18nManager.isRTL;

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

// ============ SKELETON COMPONENTS ============
const SkeletonPulse = React.memo(({ style, colors }: { style?: any; colors: any }) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        { backgroundColor: colors.border, opacity: pulseAnim },
        style,
      ]}
    />
  );
});

// ============ ANIMATED STEP INDICATOR ============
const StepIndicator = React.memo(({
  currentStep,
  totalSteps,
  colors,
  t,
}: {
  currentStep: number;
  totalSteps: number;
  colors: any;
  t: any;
}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const stepLabels = [
    t("menuCreator.steps.ingredients"),
    t("menuCreator.steps.preferences"),
    t("menuCreator.steps.review"),
  ];

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (currentStep / (totalSteps - 1)) * 100,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.stepIndicatorContainer}>
      <View style={styles.stepLabelsRow}>
        {stepLabels.map((label, index) => (
          <View key={index} style={styles.stepLabelItem}>
            <View
              style={[
                styles.stepCircle,
                {
                  backgroundColor: index <= currentStep ? colors.emerald500 : colors.border,
                  borderColor: index <= currentStep ? colors.emerald500 : colors.border,
                },
              ]}
            >
              {index < currentStep ? (
                <Check size={14} color="#fff" strokeWidth={3} />
              ) : (
                <Text
                  style={[
                    styles.stepNumber,
                    { color: index <= currentStep ? "#fff" : colors.icon },
                  ]}
                >
                  {index + 1}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                {
                  color: index <= currentStep ? colors.text : colors.icon,
                  fontWeight: index === currentStep ? "700" : "500",
                },
              ]}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <Animated.View
          style={[
            styles.progressFill,
            { width: progressWidth, backgroundColor: colors.emerald500 },
          ]}
        />
      </View>
    </View>
  );
});

// ============ INGREDIENT CARD ============
const IngredientCard = React.memo(({
  item,
  isSelected,
  onToggle,
  colors,
  isDark,
}: {
  item: any;
  isSelected: boolean;
  onToggle: () => void;
  colors: any;
  isDark: boolean;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
    ]).start();
    onToggle();
  }, [onToggle]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.ingredientCard,
          {
            backgroundColor: isSelected
              ? colors.emerald500 + "15"
              : isDark
              ? colors.surface
              : "#fff",
            borderColor: isSelected ? colors.emerald500 : colors.border,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <View style={styles.ingredientCardContent}>
          <View
            style={[
              styles.ingredientIcon,
              {
                backgroundColor: isSelected
                  ? colors.emerald500 + "20"
                  : colors.border + "50",
              },
            ]}
          >
            <Package
              size={18}
              color={isSelected ? colors.emerald500 : colors.icon}
            />
          </View>
          <View style={styles.ingredientInfo}>
            <Text
              style={[
                styles.ingredientName,
                { color: isSelected ? colors.emerald600 : colors.text },
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text style={[styles.ingredientDetails, { color: colors.icon }]}>
              {item.quantity} {item.unit}
              {item.estimated_cost ? ` • ₪${item.estimated_cost.toFixed(0)}` : ""}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.checkCircle,
            {
              backgroundColor: isSelected ? colors.emerald500 : "transparent",
              borderColor: isSelected ? colors.emerald500 : colors.border,
            },
          ]}
        >
          {isSelected && <Check size={14} color="#fff" strokeWidth={3} />}
        </View>
      </Pressable>
    </Animated.View>
  );
});

// ============ CUISINE CARD ============
const CuisineCard = React.memo(({
  cuisine,
  isSelected,
  onSelect,
  colors,
  isDark,
}: {
  cuisine: any;
  isSelected: boolean;
  onSelect: () => void;
  colors: any;
  isDark: boolean;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(glowAnim, {
      toValue: isSelected ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isSelected]);

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 400,
        friction: 10,
      }),
    ]).start();
    onSelect();
  }, [onSelect]);

  const shadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.cuisineCard,
          {
            backgroundColor: isSelected
              ? cuisine.color + "15"
              : isDark
              ? colors.surface
              : "#fff",
            borderColor: isSelected ? cuisine.color : colors.border,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <Text style={styles.cuisineEmoji}>{cuisine.icon}</Text>
        <Text
          style={[
            styles.cuisineName,
            { color: isSelected ? cuisine.color : colors.text },
          ]}
        >
          {cuisine.name}
        </Text>
        <Text
          style={[styles.cuisineDesc, { color: colors.icon }]}
          numberOfLines={2}
        >
          {cuisine.description}
        </Text>
        {isSelected && (
          <View
            style={[
              styles.cuisineSelectedBadge,
              { backgroundColor: cuisine.color },
            ]}
          >
            <Check size={12} color="#fff" strokeWidth={3} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
});

// ============ DIETARY OPTION CHIP ============
const DietaryChip = React.memo(({
  option,
  isSelected,
  onToggle,
  colors,
}: {
  option: any;
  isSelected: boolean;
  onToggle: () => void;
  colors: any;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const IconComponent = option.icon;

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 400,
        friction: 10,
      }),
    ]).start();
    onToggle();
  }, [onToggle]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.dietaryChip,
          {
            backgroundColor: isSelected
              ? option.color + "15"
              : "transparent",
            borderColor: isSelected ? option.color : colors.border,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <IconComponent
          size={16}
          color={isSelected ? option.color : colors.icon}
        />
        <Text
          style={[
            styles.dietaryChipText,
            { color: isSelected ? option.color : colors.text },
          ]}
        >
          {option.name}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

// ============ DURATION CARD ============
const DurationCard = React.memo(({
  days,
  isSelected,
  onSelect,
  colors,
  t,
}: {
  days: number;
  isSelected: boolean;
  onSelect: () => void;
  colors: any;
  t: any;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 400,
        friction: 10,
      }),
    ]).start();
    onSelect();
  }, [onSelect]);

  const getDurationLabel = () => {
    switch (days) {
      case 3: return t("menuCreator.durations.short");
      case 7: return t("menuCreator.durations.week");
      case 14: return t("menuCreator.durations.twoWeeks");
      default: return `${days} ${t("menuCreator.days")}`;
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.durationCard,
          {
            backgroundColor: isSelected
              ? colors.emerald500 + "15"
              : colors.surface,
            borderColor: isSelected ? colors.emerald500 : colors.border,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.durationIconContainer,
            {
              backgroundColor: isSelected
                ? colors.emerald500 + "20"
                : colors.border + "50",
            },
          ]}
        >
          <Calendar
            size={22}
            color={isSelected ? colors.emerald500 : colors.icon}
          />
        </View>
        <Text
          style={[
            styles.durationDays,
            { color: isSelected ? colors.emerald500 : colors.text },
          ]}
        >
          {days}
        </Text>
        <Text
          style={[
            styles.durationLabel,
            { color: isSelected ? colors.emerald600 : colors.icon },
          ]}
        >
          {getDurationLabel()}
        </Text>
        {isSelected && (
          <View
            style={[
              styles.durationCheck,
              { backgroundColor: colors.emerald500 },
            ]}
          >
            <Check size={10} color="#fff" strokeWidth={3} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
});

// ============ SELECTED INGREDIENT CHIP ============
const SelectedIngredientChip = React.memo(({
  ingredient,
  onUpdateQuantity,
  onRemove,
  colors,
}: {
  ingredient: SelectedIngredient;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  colors: any;
}) => {
  return (
    <View
      style={[
        styles.selectedChip,
        { backgroundColor: colors.emerald500 + "12" },
      ]}
    >
      <Text style={[styles.selectedChipName, { color: colors.emerald600 }]}>
        {ingredient.name}
      </Text>
      <View style={styles.quantityControls}>
        <TouchableOpacity
          onPress={() => onUpdateQuantity(ingredient.id, ingredient.quantity - 1)}
          style={[styles.quantityBtn, { backgroundColor: colors.emerald500 + "20" }]}
        >
          <Minus size={14} color={colors.emerald600} />
        </TouchableOpacity>
        <Text style={[styles.quantityValue, { color: colors.emerald600 }]}>
          {ingredient.quantity}
        </Text>
        <TouchableOpacity
          onPress={() => onUpdateQuantity(ingredient.id, ingredient.quantity + 1)}
          style={[styles.quantityBtn, { backgroundColor: colors.emerald500 + "20" }]}
        >
          <Plus size={14} color={colors.emerald600} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        onPress={() => onRemove(ingredient.id)}
        style={styles.removeChipBtn}
      >
        <X size={16} color={colors.emerald500} />
      </TouchableOpacity>
    </View>
  );
});

// ============ SUMMARY CARD ============
const SummaryCard = React.memo(({
  icon,
  title,
  value,
  subtitle,
  color,
  colors,
  isDark,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle?: string;
  color?: string;
  colors: any;
  isDark: boolean;
}) => {
  return (
    <View
      style={[
        styles.summaryCard,
        {
          backgroundColor: isDark ? colors.surface : "#fff",
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.summaryIconContainer,
          { backgroundColor: (color || colors.emerald500) + "15" },
        ]}
      >
        {icon}
      </View>
      <View style={styles.summaryCardContent}>
        <Text style={[styles.summaryCardTitle, { color: colors.icon }]}>
          {title}
        </Text>
        <Text
          style={[
            styles.summaryCardValue,
            { color: color || colors.text },
          ]}
        >
          {value}
        </Text>
        {subtitle && (
          <Text style={[styles.summaryCardSubtitle, { color: colors.icon }]}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
});

// ============ MAIN COMPONENT ============
export const EnhancedMenuCreator: React.FC<MenuCreatorProps> = ({
  onCreateMenu,
  onClose,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { shoppingList } = useShoppingList();

  // Get questionnaire data from Redux store
  const questionnaire = useSelector(
    (state: RootState) => state.questionnaire.questionnaire
  );
  const userBudget = questionnaire?.daily_food_budget;
  const cookingPreference = questionnaire?.cooking_preference;
  const availableCookingMethods = questionnaire?.available_cooking_methods || [];
  const dailyCookingTime = questionnaire?.daily_cooking_time;

  // Build initial dietary restrictions from questionnaire
  const getInitialDietaryRestrictions = useCallback((): string[] => {
    const restrictions: string[] = [];
    const style = questionnaire?.dietary_style?.toLowerCase() || "";
    if (style.includes("vegan")) restrictions.push("vegan");
    else if (style.includes("vegetarian")) restrictions.push("vegetarian");
    if (style.includes("gluten")) restrictions.push("gluten_free");
    if (style.includes("keto")) restrictions.push("keto");
    if (style.includes("low_carb") || style.includes("lowcarb")) restrictions.push("low_carb");
    if (style.includes("paleo")) restrictions.push("paleo");
    if (style.includes("dairy_free") || style.includes("dairy free")) restrictions.push("dairy_free");
    if (questionnaire?.kosher) restrictions.push("kosher");
    // Check halal in allergies_text or dietary_style
    const allergiesTextArr = Array.isArray(questionnaire?.allergies_text)
      ? questionnaire.allergies_text
      : [];
    const allergiesText = allergiesTextArr.join(" ").toLowerCase();
    if (style.includes("halal") || allergiesText.includes("halal")) restrictions.push("halal");
    return restrictions;
  }, [questionnaire]);

  // States
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedIngredients, setSelectedIngredients] = useState<
    SelectedIngredient[]
  >([]);
  const [customIngredient, setCustomIngredient] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [menuPreferences, setMenuPreferences] = useState<MenuPreferences>({
    cuisine: "mediterranean",
    dietary_restrictions: getInitialDietaryRestrictions(),
    meal_count: questionnaire?.meals_per_day || 3,
    duration_days: 7,
    budget_amount: userBudget || "",
    cooking_difficulty: "easy",
  });
  const [customMenuName, setCustomMenuName] = useState("");
  const [totalEstimatedCost, setTotalEstimatedCost] = useState(0);
  const [errorInfo, setErrorInfo] = useState<{
    visible: boolean;
    error: any;
  }>({ visible: false, error: null });

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const stepTransitionAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    stepTransitionAnim.setValue(0);
    Animated.timing(stepTransitionAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [currentStep]);

  // Calculate total cost when ingredients change
  useEffect(() => {
    const total = selectedIngredients.reduce(
      (sum, ing) => sum + (ing.estimated_cost || 0),
      0
    );
    setTotalEstimatedCost(total);
  }, [selectedIngredients]);

  // Cuisine options
  const cuisineOptions = useMemo(
    () => [
      {
        id: "mediterranean",
        name: t("menuCreator.cuisines.mediterranean"),
        icon: "🌿",
        color: "#059669",
        description: t("menuCreator.cuisines.mediterranean_desc"),
      },
      {
        id: "asian",
        name: t("menuCreator.cuisines.asian"),
        icon: "🥢",
        color: "#dc2626",
        description: t("menuCreator.cuisines.asian_desc"),
      },
      {
        id: "american",
        name: t("menuCreator.cuisines.american"),
        icon: "🍔",
        color: "#f59e0b",
        description: t("menuCreator.cuisines.american_desc"),
      },
      {
        id: "italian",
        name: t("menuCreator.cuisines.italian"),
        icon: "🍝",
        color: "#65a30d",
        description: t("menuCreator.cuisines.italian_desc"),
      },
      {
        id: "mexican",
        name: t("menuCreator.cuisines.mexican"),
        icon: "🌮",
        color: "#ea580c",
        description: t("menuCreator.cuisines.mexican_desc"),
      },
      {
        id: "indian",
        name: t("menuCreator.cuisines.indian"),
        icon: "🍛",
        color: "#9333ea",
        description: t("menuCreator.cuisines.indian_desc"),
      },
      {
        id: "japanese",
        name: t("menuCreator.cuisines.japanese"),
        icon: "🍣",
        color: "#e11d48",
        description: t("menuCreator.cuisines.japanese_desc"),
      },
      {
        id: "middle_eastern",
        name: t("menuCreator.cuisines.middle_eastern"),
        icon: "🥙",
        color: "#b45309",
        description: t("menuCreator.cuisines.middle_eastern_desc"),
      },
      {
        id: "french",
        name: t("menuCreator.cuisines.french"),
        icon: "🥐",
        color: "#2563eb",
        description: t("menuCreator.cuisines.french_desc"),
      },
    ],
    [t]
  );

  // Dietary options
  const dietaryOptions = useMemo(
    () => [
      { id: "vegetarian", name: t("menuCreator.dietary.vegetarian"), icon: Leaf, color: "#16a34a" },
      { id: "vegan", name: t("menuCreator.dietary.vegan"), icon: Leaf, color: "#15803d" },
      { id: "gluten_free", name: t("menuCreator.dietary.gluten_free"), icon: Wheat, color: "#ca8a04" },
      { id: "keto", name: t("menuCreator.dietary.keto"), icon: Flame, color: "#dc2626" },
      { id: "low_carb", name: t("menuCreator.dietary.low_carb"), icon: Zap, color: "#ea580c" },
      { id: "dairy_free", name: t("menuCreator.dietary.dairy_free"), icon: X, color: "#7c3aed" },
      { id: "paleo", name: t("menuCreator.dietary.paleo"), icon: Flame, color: "#92400e" },
      { id: "halal", name: t("menuCreator.dietary.halal"), icon: Check, color: "#047857" },
      { id: "kosher", name: t("menuCreator.dietary.kosher"), icon: Check, color: "#1d4ed8" },
    ],
    [t]
  );

  // Filter shopping list
  const filteredShoppingList = useMemo(() => {
    if (!searchQuery.trim()) return shoppingList;
    return shoppingList.filter((item: any) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [shoppingList, searchQuery]);

  // Handlers
  const toggleIngredient = useCallback((item: any) => {
    setSelectedIngredients((prev) => {
      const existingIndex = prev.findIndex((ing) => ing.id === item.id);
      if (existingIndex >= 0) {
        return prev.filter((_, index) => index !== existingIndex);
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          from_shopping_list: true,
          estimated_cost: item.estimated_cost || 0,
        },
      ];
    });
  }, []);

  const addCustomIngredient = useCallback(() => {
    if (!customIngredient.trim()) return;
    const newIngredient: SelectedIngredient = {
      id: `custom_${Date.now()}`,
      name: customIngredient.trim(),
      quantity: 1,
      unit: "piece",
      from_shopping_list: false,
      estimated_cost: 5,
    };
    setSelectedIngredients((prev) => [...prev, newIngredient]);
    setCustomIngredient("");
  }, [customIngredient]);

  const updateIngredientQuantity = useCallback((id: string, quantity: number) => {
    if (quantity < 1) return;
    setSelectedIngredients((prev) =>
      prev.map((ing) => (ing.id === id ? { ...ing, quantity } : ing))
    );
  }, []);

  const removeIngredient = useCallback((id: string) => {
    setSelectedIngredients((prev) => prev.filter((ing) => ing.id !== id));
  }, []);

  const toggleDietary = useCallback((id: string) => {
    setMenuPreferences((prev) => ({
      ...prev,
      dietary_restrictions: prev.dietary_restrictions.includes(id)
        ? prev.dietary_restrictions.filter((r) => r !== id)
        : [...prev.dietary_restrictions, id],
    }));
  }, []);

  const selectCuisine = useCallback((id: string) => {
    setMenuPreferences((prev) => ({ ...prev, cuisine: id }));
  }, []);

  const selectDuration = useCallback((days: number) => {
    setMenuPreferences((prev) => ({ ...prev, duration_days: days }));
  }, []);

  // Navigation
  const goNext = useCallback(() => {
    if (currentStep < 2) setCurrentStep((prev) => prev + 1);
  }, [currentStep]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  }, [currentStep]);

  // Generate menu
  const isGeneratingRef = useRef(false);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startProgressSimulation = useCallback(() => {
    setGeneratingProgress(0);
    // Simulate progress up to 90% over ~45 seconds
    let progress = 0;
    progressIntervalRef.current = setInterval(() => {
      progress += Math.random() * 3 + 1;
      if (progress >= 90) {
        progress = 90;
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      }
      setGeneratingProgress(Math.round(progress));
    }, 1000);
  }, []);

  const stopProgressSimulation = useCallback((success: boolean) => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (success) {
      setGeneratingProgress(100);
    } else {
      setGeneratingProgress(0);
    }
  }, []);

  const generateMenu = useCallback(async () => {
    if (isGenerating || isGeneratingRef.current) return;

    setIsGenerating(true);
    isGeneratingRef.current = true;
    startProgressSimulation();

    try {
      const enhancedPrompt = customMenuName
        ? `USER SPECIFIED EXACT MENU NAME: "${customMenuName}"`
        : `Create a catchy 2-3 word menu name that captures the essence of this ${menuPreferences.cuisine} ${menuPreferences.duration_days}-day plan.`;

      const menuData = {
        preferences: {
          ...menuPreferences,
          custom_name: customMenuName,
          enhanced_prompt: enhancedPrompt,
          // Include questionnaire context for better AI generation
          cooking_preference: cookingPreference,
          available_cooking_methods: availableCookingMethods,
          daily_cooking_time: dailyCookingTime,
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
        menuData,
        { timeout: 90000 } // Increased to 90s for complex menus
      );

      if (response.data.success) {
        stopProgressSimulation(true);
        setTimeout(() => {
          setIsGenerating(false);
          onCreateMenu(response.data.data);
          onClose();

          if (response.data.data?.is_generating) {
            Alert.alert(
              t("menuCreator.menuCreated"),
              t("menuCreator.menuCreatedDesc"),
              [{ text: t("common.gotIt") }]
            );
          }
        }, 400); // Brief pause to show 100%
      } else {
        throw new Error(response.data.error || t("menuCreator.failedToGenerate"));
      }
    } catch (error: any) {
      stopProgressSimulation(false);
      const isNetworkError =
        errorMessageIncludesAny(error, ["Network", "network"]) ||
        error?.code === "ERR_NETWORK" ||
        !error?.response;

      let errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        t("menuCreator.failedToGenerate");

      if (isNetworkError) {
        errorMessage = t("menuCreator.networkError");
      }

      setErrorInfo({
        visible: true,
        error: {
          ...error,
          message: errorMessage,
          isNetworkError,
        },
      });
    } finally {
      isGeneratingRef.current = false;
    }
  }, [
    isGenerating,
    customMenuName,
    menuPreferences,
    selectedIngredients,
    cookingPreference,
    availableCookingMethods,
    dailyCookingTime,
    onCreateMenu,
    onClose,
    startProgressSimulation,
    stopProgressSimulation,
    t,
  ]);

  // Get cooking preference label
  const getCookingPreferenceLabel = useCallback(
    (pref: string | undefined) => {
      switch (pref) {
        case "cooked":
          return t("menuCreator.cookingLevels.cooked");
        case "easy_prep":
          return t("menuCreator.cookingLevels.easyPrep");
        case "ready_made":
          return t("menuCreator.cookingLevels.readyMade");
        case "no_cooking":
          return t("menuCreator.cookingLevels.noCooking");
        default:
          return t("menuCreator.cookingLevels.notSet");
      }
    },
    [t]
  );

  // ============ STEP 1: INGREDIENTS ============
  const renderIngredientStep = () => (
    <Animated.View
      style={[
        styles.stepContent,
        {
          opacity: stepTransitionAnim,
          transform: [
            {
              translateX: stepTransitionAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [isRTL ? -20 : 20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.stepHeader}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          {t("menuCreator.selectIngredients")}
        </Text>
        <Text style={[styles.stepSubtitle, { color: colors.icon }]}>
          {t("menuCreator.selectIngredientsDesc")}
        </Text>
      </View>

      {/* Cost Summary */}
      <View
        style={[
          styles.costSummary,
          {
            backgroundColor: colors.emerald500 + "10",
            borderColor: colors.emerald500 + "30",
          },
        ]}
      >
        <View style={styles.costSummaryContent}>
          <DollarSign size={20} color={colors.emerald500} />
          <View>
            <Text style={[styles.costLabel, { color: colors.icon }]}>
              {t("menuCreator.estimatedCost")}
            </Text>
            <Text style={[styles.costValue, { color: colors.emerald600 }]}>
              ₪{totalEstimatedCost.toFixed(0)}
            </Text>
          </View>
        </View>
        {userBudget && (
          <View style={styles.budgetInfo}>
            <Text style={[styles.budgetInfoText, { color: colors.icon }]}>
              {t("menuCreator.dailyBudget")}: ₪{userBudget}
            </Text>
          </View>
        )}
      </View>

      {/* Search */}
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: isDark ? colors.surface : "#fff",
            borderColor: colors.border,
          },
        ]}
      >
        <Search size={20} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={t("menuCreator.searchIngredients")}
          placeholderTextColor={colors.icon}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <X size={18} color={colors.icon} />
          </TouchableOpacity>
        )}
      </View>

      {/* Shopping List */}
      <View style={styles.sectionHeader}>
        <ShoppingCart size={18} color={colors.emerald500} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t("menuCreator.fromShoppingList")}
        </Text>
        <View style={[styles.countBadge, { backgroundColor: colors.emerald500 + "15" }]}>
          <Text style={[styles.countText, { color: colors.emerald600 }]}>
            {filteredShoppingList.length}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.ingredientsList}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {filteredShoppingList.map((item: any) => (
          <IngredientCard
            key={item.id}
            item={item}
            isSelected={selectedIngredients.some((ing) => ing.id === item.id)}
            onToggle={() => toggleIngredient(item)}
            colors={colors}
            isDark={isDark}
          />
        ))}
        {filteredShoppingList.length === 0 && (
          <View style={styles.emptyList}>
            <Package size={32} color={colors.icon} />
            <Text style={[styles.emptyListText, { color: colors.icon }]}>
              {searchQuery
                ? t("menuCreator.noMatchingIngredients")
                : t("menuCreator.emptyShoppingList")}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Custom */}
      <View style={styles.sectionHeader}>
        <Plus size={18} color={colors.emerald500} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t("menuCreator.addCustomIngredient")}
        </Text>
      </View>

      <View style={styles.customInputRow}>
        <TextInput
          style={[
            styles.customInput,
            {
              backgroundColor: isDark ? colors.surface : "#fff",
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          placeholder={t("menuCreator.enterIngredientName")}
          placeholderTextColor={colors.icon}
          value={customIngredient}
          onChangeText={setCustomIngredient}
          onSubmitEditing={addCustomIngredient}
          returnKeyType="done"
        />
        <TouchableOpacity
          onPress={addCustomIngredient}
          style={[
            styles.addBtn,
            {
              backgroundColor: customIngredient.trim()
                ? colors.emerald500
                : colors.border,
            },
          ]}
          disabled={!customIngredient.trim()}
        >
          <Plus size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Selected Ingredients */}
      {selectedIngredients.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Check size={18} color={colors.emerald500} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("menuCreator.selected")}
            </Text>
            <View
              style={[
                styles.countBadge,
                { backgroundColor: colors.emerald500 + "15" },
              ]}
            >
              <Text style={[styles.countText, { color: colors.emerald600 }]}>
                {selectedIngredients.length}
              </Text>
            </View>
          </View>

          <View style={styles.selectedList}>
            {selectedIngredients.map((ingredient) => (
              <SelectedIngredientChip
                key={ingredient.id}
                ingredient={ingredient}
                onUpdateQuantity={updateIngredientQuantity}
                onRemove={removeIngredient}
                colors={colors}
              />
            ))}
          </View>
        </>
      )}
    </Animated.View>
  );

  // ============ STEP 2: PREFERENCES ============
  const renderPreferencesStep = () => (
    <Animated.View
      style={[
        styles.stepContent,
        {
          opacity: stepTransitionAnim,
          transform: [
            {
              translateX: stepTransitionAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [isRTL ? -20 : 20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.stepHeader}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          {t("menuCreator.menuPreferences")}
        </Text>
        <Text style={[styles.stepSubtitle, { color: colors.icon }]}>
          {t("menuCreator.customizeMenuDesc")}
        </Text>
      </View>

      {/* Custom Name */}
      <View style={styles.sectionHeader}>
        <Edit3 size={18} color={colors.emerald500} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t("menuCreator.customMenuName")}
        </Text>
        <Text style={[styles.optionalBadge, { color: colors.icon }]}>
          {t("menuCreator.optional")}
        </Text>
      </View>

      <TextInput
        style={[
          styles.nameInput,
          {
            backgroundColor: isDark ? colors.surface : "#fff",
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
        placeholder={t("menuCreator.menuNamePlaceholder")}
        placeholderTextColor={colors.icon}
        value={customMenuName}
        onChangeText={setCustomMenuName}
        maxLength={30}
      />

      {/* Cuisine */}
      <View style={styles.sectionHeader}>
        <Globe size={18} color={colors.emerald500} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t("menuCreator.cuisineType")}
        </Text>
      </View>

      <View style={styles.cuisineGrid}>
        {cuisineOptions.map((cuisine) => (
          <CuisineCard
            key={cuisine.id}
            cuisine={cuisine}
            isSelected={menuPreferences.cuisine === cuisine.id}
            onSelect={() => selectCuisine(cuisine.id)}
            colors={colors}
            isDark={isDark}
          />
        ))}
      </View>

      {/* Dietary */}
      <View style={styles.sectionHeader}>
        <Leaf size={18} color={colors.emerald500} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t("menuCreator.dietaryPreferences")}
        </Text>
      </View>

      {/* Auto-applied from questionnaire notice */}
      {getInitialDietaryRestrictions().length > 0 && (
        <View
          style={[
            styles.autoAppliedNotice,
            { backgroundColor: colors.emerald500 + "10", borderColor: colors.emerald500 + "30" },
          ]}
        >
          <Sparkles size={14} color={colors.emerald500} />
          <Text style={[styles.autoAppliedText, { color: colors.emerald600 }]}>
            {t("menuCreator.autoAppliedFromProfile", {
              count: getInitialDietaryRestrictions().length,
              fallback: `${getInitialDietaryRestrictions().length} dietary preferences auto-applied from your profile`,
            })}
          </Text>
        </View>
      )}

      <View style={styles.dietaryGrid}>
        {dietaryOptions.map((option) => (
          <DietaryChip
            key={option.id}
            option={option}
            isSelected={menuPreferences.dietary_restrictions.includes(option.id)}
            onToggle={() => toggleDietary(option.id)}
            colors={colors}
          />
        ))}
      </View>

      {/* Duration */}
      <View style={styles.sectionHeader}>
        <Calendar size={18} color={colors.emerald500} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t("menuCreator.menuDuration")}
        </Text>
      </View>

      <View style={styles.durationGrid}>
        {[3, 7, 14].map((days) => (
          <DurationCard
            key={days}
            days={days}
            isSelected={menuPreferences.duration_days === days}
            onSelect={() => selectDuration(days)}
            colors={colors}
            t={t}
          />
        ))}
      </View>

      {/* Budget */}
      <View style={styles.sectionHeader}>
        <DollarSign size={18} color={colors.emerald500} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t("menuCreator.dailyBudget")}
        </Text>
      </View>

      <View
        style={[
          styles.budgetInputContainer,
          {
            backgroundColor: isDark ? colors.surface : "#fff",
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.currencySymbol, { color: colors.emerald500 }]}>₪</Text>
        <TextInput
          style={[styles.budgetInput, { color: colors.text }]}
          value={menuPreferences.budget_amount}
          onChangeText={(text) =>
            setMenuPreferences((prev) => ({
              ...prev,
              budget_amount: text.replace(/[^0-9]/g, ""),
            }))
          }
          placeholder={t("menuCreator.enterBudgetAmount")}
          placeholderTextColor={colors.icon}
          keyboardType="numeric"
          maxLength={5}
        />
        <Text style={[styles.perDayLabel, { color: colors.icon }]}>
          /{t("menuCreator.day")}
        </Text>
      </View>

      {userBudget && menuPreferences.budget_amount !== userBudget && (
        <TouchableOpacity
          onPress={() =>
            setMenuPreferences((prev) => ({ ...prev, budget_amount: userBudget }))
          }
          style={[styles.useBudgetBtn, { backgroundColor: colors.emerald500 + "10" }]}
        >
          <Text style={[styles.useBudgetText, { color: colors.emerald600 }]}>
            {t("menuCreator.useQuestionnaireBudget", { budget: userBudget })}
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  // ============ STEP 3: REVIEW ============
  const renderReviewStep = () => {
    const selectedCuisine = cuisineOptions.find(
      (c) => c.id === menuPreferences.cuisine
    );

    return (
      <Animated.View
        style={[
          styles.stepContent,
          {
            opacity: stepTransitionAnim,
            transform: [
              {
                translateX: stepTransitionAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [isRTL ? -20 : 20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.stepHeader}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>
            {t("menuCreator.reviewAndGenerate")}
          </Text>
          <Text style={[styles.stepSubtitle, { color: colors.icon }]}>
            {t("menuCreator.reviewDescription")}
          </Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <SummaryCard
            icon={<Package size={20} color={colors.emerald500} />}
            title={t("menuCreator.ingredients")}
            value={`${selectedIngredients.length} ${t("menuCreator.items")}`}
            subtitle={`₪${totalEstimatedCost.toFixed(0)} ${t("menuCreator.estimated")}`}
            colors={colors}
            isDark={isDark}
          />
          <SummaryCard
            icon={
              <Text style={{ fontSize: 20 }}>{selectedCuisine?.icon || "🍽"}</Text>
            }
            title={t("menuCreator.cuisine")}
            value={selectedCuisine?.name || ""}
            color={selectedCuisine?.color}
            colors={colors}
            isDark={isDark}
          />
          <SummaryCard
            icon={<Calendar size={20} color={colors.blue500 || "#3b82f6"} />}
            title={t("menuCreator.duration")}
            value={`${menuPreferences.duration_days} ${t("menuCreator.days")}`}
            color={colors.blue500 || "#3b82f6"}
            colors={colors}
            isDark={isDark}
          />
          <SummaryCard
            icon={<DollarSign size={20} color="#f59e0b" />}
            title={t("menuCreator.budget")}
            value={`₪${menuPreferences.budget_amount || "0"}/${t("menuCreator.day")}`}
            color="#f59e0b"
            colors={colors}
            isDark={isDark}
          />
        </View>

        {/* Dietary Restrictions */}
        {menuPreferences.dietary_restrictions.length > 0 && (
          <View
            style={[
              styles.dietarySummary,
              { backgroundColor: isDark ? colors.surface : "#fff", borderColor: colors.border },
            ]}
          >
            <Text style={[styles.dietarySummaryTitle, { color: colors.text }]}>
              {t("menuCreator.dietaryRestrictions")}
            </Text>
            <View style={styles.dietarySummaryTags}>
              {menuPreferences.dietary_restrictions.map((id) => {
                const option = dietaryOptions.find((o) => o.id === id);
                return (
                  <View
                    key={id}
                    style={[
                      styles.dietaryTag,
                      { backgroundColor: (option?.color || colors.emerald500) + "15" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dietaryTagText,
                        { color: option?.color || colors.emerald500 },
                      ]}
                    >
                      {option?.name}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Custom Name */}
        {customMenuName && (
          <View
            style={[
              styles.customNameSummary,
              { backgroundColor: colors.emerald500 + "10", borderColor: colors.emerald500 + "30" },
            ]}
          >
            <Edit3 size={18} color={colors.emerald500} />
            <View style={styles.customNameContent}>
              <Text style={[styles.customNameLabel, { color: colors.icon }]}>
                {t("menuCreator.customName")}
              </Text>
              <Text style={[styles.customNameValue, { color: colors.emerald600 }]}>
                "{customMenuName}"
              </Text>
            </View>
          </View>
        )}

        {/* Questionnaire Preferences */}
        <View
          style={[
            styles.preferencesCard,
            { backgroundColor: isDark ? colors.surface : "#fff", borderColor: colors.border },
          ]}
        >
          <Text style={[styles.preferencesTitle, { color: colors.text }]}>
            {t("menuCreator.preferencesApplied")}
          </Text>

          <View style={styles.preferenceItem}>
            <Text style={styles.preferenceIcon}>👨‍🍳</Text>
            <Text style={[styles.preferenceText, { color: colors.text }]}>
              {getCookingPreferenceLabel(cookingPreference)}
            </Text>
            <Check size={16} color={colors.emerald500} />
          </View>

          {availableCookingMethods.length > 0 && (
            <View style={styles.preferenceItem}>
              <Text style={styles.preferenceIcon}>🍳</Text>
              <Text style={[styles.preferenceText, { color: colors.text }]}>
                {availableCookingMethods.length} {t("menuCreator.cookingMethods")}
              </Text>
              <Check size={16} color={colors.emerald500} />
            </View>
          )}

          {dailyCookingTime && (
            <View style={styles.preferenceItem}>
              <Text style={styles.preferenceIcon}>⏱️</Text>
              <Text style={[styles.preferenceText, { color: colors.text }]}>
                {dailyCookingTime} {t("menuCreator.minutesPerDay")}
              </Text>
              <Check size={16} color={colors.emerald500} />
            </View>
          )}

          <View style={[styles.preferencesNote, { backgroundColor: colors.emerald500 + "10" }]}>
            <Info size={14} color={colors.emerald500} />
            <Text style={[styles.preferencesNoteText, { color: colors.emerald600 }]}>
              {t("menuCreator.preferencesNote")}
            </Text>
          </View>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          onPress={generateMenu}
          disabled={isGenerating}
          activeOpacity={0.9}
          style={styles.generateButton}
        >
          <LinearGradient
            colors={
              isGenerating
                ? [colors.emerald600, colors.emerald500]
                : [colors.emerald500, colors.emerald600]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.generateGradient}
          >
            {isGenerating ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.generateText}>
                  {t("menuCreator.creatingMenu")}
                </Text>
                <Text style={styles.generateSubtext}>
                  {generatingProgress}% — {t("menuCreator.aiCraftingRecipes")}
                </Text>
                {/* Progress bar */}
                <View style={styles.generateProgressTrack}>
                  <Animated.View
                    style={[
                      styles.generateProgressFill,
                      { width: `${generatingProgress}%` },
                    ]}
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.generateIconContainer}>
                  <ChefHat size={28} color="#fff" />
                  <Sparkles
                    size={14}
                    color="#fff"
                    style={styles.sparkleIcon}
                  />
                </View>
                <Text style={styles.generateText}>
                  {t("menuCreator.generateMenu")}
                </Text>
                <Text style={styles.generateSubtext}>
                  {t("menuCreator.poweredByAI")}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Step content renderer
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderIngredientStep();
      case 1:
        return renderPreferencesStep();
      case 2:
        return renderReviewStep();
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <Animated.View
          style={[
            styles.container,
            { backgroundColor: isDark ? colors.background : "#f8fafc" },
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                backgroundColor: isDark ? colors.surface : "#fff",
                borderBottomColor: colors.border,
              },
            ]}
          >
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.border + "50" }]}
            >
              <X size={22} color={colors.icon} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t("menuCreator.createMenu")}
            </Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Step Indicator */}
          <StepIndicator
            currentStep={currentStep}
            totalSteps={3}
            colors={colors}
            t={t}
          />

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderStepContent()}
          </ScrollView>

          {/* Navigation */}
          <View
            style={[
              styles.navigation,
              {
                backgroundColor: isDark ? colors.surface : "#fff",
                borderTopColor: colors.border,
              },
            ]}
          >
            {currentStep > 0 ? (
              <TouchableOpacity
                onPress={goPrev}
                style={[
                  styles.navBtn,
                  styles.prevBtn,
                  { borderColor: colors.border },
                ]}
              >
                <ArrowLeft size={18} color={colors.text} />
                <Text style={[styles.prevBtnText, { color: colors.text }]}>
                  {t("menuCreator.previous")}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            {currentStep < 2 && (
              <TouchableOpacity
                onPress={goNext}
                style={[styles.navBtn, styles.nextBtn, { backgroundColor: colors.emerald500 }]}
              >
                <Text style={styles.nextBtnText}>{t("menuCreator.next")}</Text>
                <ArrowRight size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Error Display */}
          <EnhancedErrorDisplay
            visible={errorInfo.visible}
            error={errorInfo.error}
            onClose={() => setErrorInfo({ visible: false, error: null })}
            onRetry={generateMenu}
            context={t("menuCreator.menuGeneration")}
          />
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ============ STYLES ============
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  // Step Indicator
  stepIndicatorContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  stepLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  stepLabelItem: {
    alignItems: "center",
    flex: 1,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    borderWidth: 2,
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: "700",
  },
  stepLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  stepContent: {
    paddingHorizontal: 20,
  },
  stepHeader: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  // Cost Summary
  costSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  costSummaryContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  costLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 2,
  },
  costValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  budgetInfo: {
    padding: 8,
    borderRadius: 8,
  },
  budgetInfoText: {
    fontSize: 12,
    fontWeight: "600",
  },
  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  // Section Headers
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    marginTop: 8,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 13,
    fontWeight: "700",
  },
  optionalBadge: {
    fontSize: 12,
    fontWeight: "500",
  },
  // Ingredient List
  ingredientsList: {
    maxHeight: 240,
    marginBottom: 16,
  },
  ingredientCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  ingredientCardContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  ingredientIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 3,
  },
  ingredientDetails: {
    fontSize: 13,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyList: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyListText: {
    fontSize: 14,
    textAlign: "center",
  },
  // Custom Input
  customInputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  customInput: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "500",
  },
  addBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  // Selected Chips
  selectedList: {
    gap: 10,
    marginBottom: 20,
  },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  selectedChipName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: 12,
  },
  quantityBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityValue: {
    fontSize: 15,
    fontWeight: "700",
    minWidth: 24,
    textAlign: "center",
  },
  removeChipBtn: {
    padding: 4,
  },
  // Name Input
  nameInput: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 24,
  },
  // Cuisine Grid
  cuisineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  cuisineCard: {
    width: (width - 52) / 2,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
  },
  cuisineEmoji: {
    fontSize: 32,
    marginBottom: 10,
  },
  cuisineName: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  cuisineDesc: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
  cuisineSelectedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  // Dietary Grid
  dietaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  dietaryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  dietaryChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  // Duration Grid
  durationGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  durationCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
  },
  durationIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  durationDays: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 4,
  },
  durationLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  durationCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  // Budget Input
  budgetInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: "700",
  },
  budgetInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
  },
  perDayLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  useBudgetBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  useBudgetText: {
    fontSize: 14,
    fontWeight: "600",
  },
  // Summary Cards
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    width: (width - 52) / 2,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  summaryIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCardContent: {
    flex: 1,
  },
  summaryCardTitle: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  summaryCardValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  summaryCardSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  // Dietary Summary
  dietarySummary: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  dietarySummaryTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 12,
  },
  dietarySummaryTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dietaryTag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dietaryTagText: {
    fontSize: 12,
    fontWeight: "600",
  },
  // Custom Name Summary
  customNameSummary: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    gap: 14,
  },
  customNameContent: {
    flex: 1,
  },
  customNameLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  customNameValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  // Preferences Card
  preferencesCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
  },
  preferencesTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  preferenceItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
  },
  preferenceIcon: {
    fontSize: 20,
  },
  preferenceText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  preferencesNote: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    gap: 10,
  },
  preferencesNoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  // Generate Button
  generateButton: {
    borderRadius: 20,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  generateGradient: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 32,
  },
  generateIconContainer: {
    position: "relative",
    marginBottom: 8,
  },
  sparkleIcon: {
    position: "absolute",
    top: -4,
    right: -8,
  },
  generateText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  generateSubtext: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  autoAppliedNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  autoAppliedText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  generateProgressTrack: {
    width: "80%",
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 4,
  },
  generateProgressFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  // Navigation
  navigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    borderTopWidth: 1,
    gap: 12,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 8,
  },
  prevBtn: {
    borderWidth: 1.5,
    flex: 1,
    justifyContent: "center",
  },
  nextBtn: {
    flex: 1,
    justifyContent: "center",
  },
  prevBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
