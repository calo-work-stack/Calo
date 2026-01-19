import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  StatusBar,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { router, useLocalSearchParams } from "expo-router";
import { RootState, AppDispatch, store } from "@/src/store";
import {
  saveQuestionnaire,
  fetchQuestionnaire,
  clearError,
} from "@/src/store/questionnaireSlice";
import {
  ChevronLeft,
  Target,
  Activity,
  Heart,
  Utensils,
  Leaf,
  Moon,
  Settings,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/context/ThemeContext";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { LinearGradient } from "expo-linear-gradient";

// Components
import ProgressIndicator from "@/components/questionnaire/ProgressIndicator";
import StepContainer from "@/components/questionnaire/StepContainer";
import OptionGroup from "@/components/questionnaire/OptionGroup";
import CustomTextInput from "@/components/questionnaire/CustomTextInput";
import WeightScale from "@/components/questionnaire/WeightScale";
import DynamicListInput from "@/components/questionnaire/DynamicListInput";
import CheckboxGroup from "@/components/questionnaire/CheckBoxGroup";
import CustomSwitch from "@/components/questionnaire/CustomSwitch";
import LoadingScreen from "@/components/LoadingScreen";

// Screen dimensions - used in styles

interface QuestionnaireData {
  age: string;
  gender: string;
  height_cm: string;
  weight_kg: string;
  target_weight_kg: string | null;
  additional_personal_info: string[];
  main_goal: string;
  secondary_goal: string | null;
  goal_timeframe_days: string | null;
  commitment_level: string;
  physical_activity_level: string;
  sport_frequency: string;
  medical_conditions_text: string[];
  medications: string[];
  meals_per_day: string;
  cooking_preference: string;
  available_cooking_methods: string[];
  daily_food_budget: string | null;
  kosher: boolean;
  allergies: string[];
  dietary_style: string;
  sleep_hours_per_night: string | null;
  smoking_status: "YES" | "NO" | null;
  program_duration: string;
  upload_frequency: string;
  willingness_to_follow: boolean;
  personalized_tips: boolean;
  notifications_preference: "DAILY" | "WEEKLY" | "NONE" | null;
}

// Known allergens list for validation
const KNOWN_ALLERGENS = [
  "gluten",
  "dairy",
  "eggs",
  "nuts",
  "peanuts",
  "fish",
  "shellfish",
  "soy",
  "wheat",
  "sesame",
  "milk",
  "lactose",
  "tree nuts",
  "almonds",
  "cashews",
  "walnuts",
  "pistachios",
  "hazelnuts",
  "pecans",
  "macadamia",
  "brazil nuts",
  "pine nuts",
  "shrimp",
  "crab",
  "lobster",
  "oysters",
  "clams",
  "mussels",
  "scallops",
  "squid",
  "octopus",
  "salmon",
  "tuna",
  "cod",
  "halibut",
  "sardines",
  "anchovies",
  "celery",
  "mustard",
  "sulfites",
  "corn",
  "gelatin",
  "lupin",
  "molluscs",
  "chicken",
  "beef",
  "pork",
  "lamb",
  "אגוזים",
  "בוטנים",
  "חלב",
  "גלוטן",
  "ביצים",
  "דגים",
  "רכיכות",
  "סויה",
  "חיטה",
  "שומשום",
  "סלרי",
  "חרדל",
  "סולפיטים",
  "תירס",
  "ג'לטין",
  "לופין",
];

const QuestionnaireScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const isRTL = currentLanguage === "he";
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const { user } = useSelector((state: RootState) => state.auth);
  const { questionnaire, isSaving, isLoading, error } = useSelector(
    (state: RootState) => state.questionnaire
  );
  const searchParams = useLocalSearchParams();
  const isEditMode = searchParams?.mode === "edit";

  const [currentStep, setCurrentStep] = useState(1);
  const [showTip, setShowTip] = useState("");
  const [dataLoaded, setDataLoaded] = useState(false);
  const formInitialized = useRef(false);
  const totalSteps = 8;

  // Default slider values for new users
  const DEFAULT_HEIGHT = "170";
  const DEFAULT_WEIGHT = "70";
  const DEFAULT_TARGET_WEIGHT = "70";
  const DEFAULT_SLEEP_HOURS = "8";

  const [formData, setFormData] = useState<QuestionnaireData>({
    age: "",
    gender: "",
    height_cm: DEFAULT_HEIGHT,
    weight_kg: DEFAULT_WEIGHT,
    target_weight_kg: DEFAULT_TARGET_WEIGHT,
    additional_personal_info: [],
    main_goal: "",
    secondary_goal: null,
    goal_timeframe_days: null,
    commitment_level: "",
    physical_activity_level: "",
    sport_frequency: "",
    medical_conditions_text: [],
    medications: [],
    meals_per_day: "3",
    cooking_preference: "",
    available_cooking_methods: [],
    daily_food_budget: null,
    kosher: false,
    allergies: [],
    dietary_style: "",
    sleep_hours_per_night: DEFAULT_SLEEP_HOURS,
    smoking_status: null,
    program_duration: "",
    upload_frequency: "",
    willingness_to_follow: true,
    personalized_tips: true,
    notifications_preference: null,
  });

  // Validate allergen with detailed feedback
  const validateAllergen = (
    allergen: string
  ): { valid: boolean; errorKey?: string } => {
    const normalized = allergen.toLowerCase().trim();

    // Check minimum length
    if (normalized.length < 2) {
      return { valid: false, errorKey: "allergenTooShort" };
    }

    // Check for invalid characters (random keyboard mashing)
    const hasInvalidPattern =
      /^[^aeiouאוי]*$/i.test(normalized) && normalized.length > 4;
    if (hasInvalidPattern && !/^[\u0590-\u05FF]+$/.test(normalized)) {
      return { valid: false, errorKey: "allergenInvalidChars" };
    }

    // Check if it's a known allergen
    const isKnown = KNOWN_ALLERGENS.some(
      (known) => known.toLowerCase() === normalized
    );
    if (isKnown) {
      return { valid: true };
    }

    // For Hebrew text, check if it has valid Hebrew letters
    const isHebrew = /^[\u0590-\u05FF\s]+$/.test(normalized);
    if (isHebrew && normalized.length >= 2) {
      return { valid: true };
    }

    // For English text, check if it has vowels (real words have vowels)
    const hasVowels = /[aeiouáéíóúàèìòùâêîôûäëïöü]/i.test(normalized);
    if (hasVowels && normalized.length >= 3) {
      return { valid: true };
    }

    return { valid: false, errorKey: "allergenNotRecognized" };
  };

  // Load existing questionnaire data
  useEffect(() => {
    const shouldFetchData =
      isEditMode || (user?.is_questionnaire_completed && !dataLoaded);
    if (shouldFetchData && !isLoading) {
      dispatch(fetchQuestionnaire()).finally(() => setDataLoaded(true));
    } else if (!isEditMode && !user?.is_questionnaire_completed) {
      setDataLoaded(true);
    }
  }, [
    dispatch,
    isEditMode,
    user?.is_questionnaire_completed,
    dataLoaded,
    isLoading,
  ]);

  // Map questionnaire data to form - only once when data is first loaded
  useEffect(() => {
    // Only initialize form data once when questionnaire is loaded
    if (questionnaire && dataLoaded && !formInitialized.current) {
      formInitialized.current = true;

      const safeString = (value: any, defaultVal = "") =>
        value?.toString() || defaultVal;
      const safeArray = (value: any) => (Array.isArray(value) ? value : []);
      const safeBoolean = (value: any) => Boolean(value);
      const mapGenderToKey = (hebrewGender: string) => {
        const genderMap: { [key: string]: string } = {
          זכר: "male",
          נקבה: "female",
          אחר: "other",
        };
        return genderMap[hebrewGender] || hebrewGender;
      };

      setFormData({
        age: safeString(questionnaire.age),
        gender: mapGenderToKey(safeString(questionnaire.gender)),
        height_cm: safeString(questionnaire.height_cm, DEFAULT_HEIGHT),
        weight_kg: safeString(questionnaire.weight_kg, DEFAULT_WEIGHT),
        target_weight_kg: safeString(
          questionnaire.target_weight_kg,
          DEFAULT_TARGET_WEIGHT
        ),
        additional_personal_info: safeArray(
          questionnaire.additional_personal_info
        ),
        main_goal: safeString(questionnaire.main_goal),
        secondary_goal: safeString(questionnaire.secondary_goal) || null,
        goal_timeframe_days: safeString(questionnaire.goal_timeframe_days),
        commitment_level: safeString(questionnaire.commitment_level),
        physical_activity_level: safeString(
          questionnaire.physical_activity_level
        ),
        sport_frequency: safeString(questionnaire.sport_frequency),
        medical_conditions_text: safeArray(
          questionnaire.medical_conditions_text
        ),
        medications: safeArray(questionnaire.medications),
        meals_per_day: safeString(questionnaire.meals_per_day) || "3",
        cooking_preference: safeString(questionnaire.cooking_preference),
        available_cooking_methods: safeArray(
          questionnaire.available_cooking_methods
        ),
        daily_food_budget: safeString(questionnaire.daily_food_budget),
        kosher: safeBoolean(questionnaire.kosher),
        allergies: safeArray(questionnaire.allergies),
        dietary_style: safeString(questionnaire.dietary_style),
        sleep_hours_per_night: safeString(
          questionnaire.sleep_hours_per_night,
          DEFAULT_SLEEP_HOURS
        ),
        smoking_status: questionnaire.smoking_status as "YES" | "NO" | null,
        program_duration: safeString(questionnaire.program_duration),
        upload_frequency: safeString(questionnaire.upload_frequency),
        willingness_to_follow:
          questionnaire.willingness_to_follow !== undefined
            ? safeBoolean(questionnaire.willingness_to_follow)
            : true,
        personalized_tips:
          questionnaire.personalized_tips !== undefined
            ? safeBoolean(questionnaire.personalized_tips)
            : true,
        notifications_preference: questionnaire.notifications_preference as
          | "DAILY"
          | "WEEKLY"
          | "NONE"
          | null,
      });
    }
  }, [questionnaire, dataLoaded]);

  const handleArrayToggle = (
    array: string[],
    item: string,
    key: keyof QuestionnaireData
  ) => {
    const newArray = array.includes(item)
      ? array.filter((i) => i !== item)
      : [...array, item];
    setFormData((prev) => ({ ...prev, [key]: newArray }));
  };

  // ==========================================
  // REPLACE handleSubmit in questionnaire.tsx
  // This FORCES the state update IMMEDIATELY
  // ==========================================

  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (
        !formData.age ||
        !formData.gender ||
        !formData.height_cm ||
        !formData.weight_kg ||
        !formData.main_goal ||
        !formData.commitment_level ||
        !formData.physical_activity_level ||
        !formData.sport_frequency ||
        !formData.cooking_preference ||
        !formData.dietary_style
      ) {
        Alert.alert(t("questionnaire.error"), t("validation.requiredFields"));
        return;
      }

      // Validate allergies
      const invalidAllergies = formData.allergies.filter(
        (allergen) => !validateAllergen(allergen).valid
      );
      if (invalidAllergies.length > 0) {
        Alert.alert(
          t("validation.invalidAllergen"),
          t("validation.pleaseRemoveInvalid") +
            ": " +
            invalidAllergies.join(", ")
        );
        return;
      }

      const cleanFormData = { ...formData };

      // Convert empty strings to null
      if (cleanFormData.target_weight_kg === "")
        cleanFormData.target_weight_kg = null;
      if (cleanFormData.secondary_goal === "")
        cleanFormData.secondary_goal = null;
      if (cleanFormData.goal_timeframe_days === "")
        cleanFormData.goal_timeframe_days = null;
      if (cleanFormData.daily_food_budget === "")
        cleanFormData.daily_food_budget = null;
      if (cleanFormData.sleep_hours_per_night === "")
        cleanFormData.sleep_hours_per_night = null;

      const dataToSubmit = {
        ...cleanFormData,
        isEditMode: isEditMode,
      };

      console.log("📝 [Questionnaire] Submitting...");
      console.log("📝 [Questionnaire] Current user state:", {
        is_questionnaire_completed: user?.is_questionnaire_completed,
        subscription_type: user?.subscription_type,
      });

      const result = await dispatch(saveQuestionnaire(dataToSubmit as any));

      if (saveQuestionnaire.fulfilled.match(result)) {
        console.log("✅ [Questionnaire] API save successful");

        // ✅ CRITICAL FIX 1: FORCE update the state IMMEDIATELY
        // Don't wait for the thunk to do it
        if (!isEditMode) {
          console.log("🔄 [Questionnaire] FORCING state update...");

          // Method 1: Direct dispatch
          store.dispatch({
            type: "auth/updateUserField",
            payload: {
              field: "is_questionnaire_completed",
              value: true,
            },
          });

          // Method 2: Also update full user object
          store.dispatch({
            type: "auth/updateUser",
            payload: {
              is_questionnaire_completed: true,
            },
          });

          console.log("✅ [Questionnaire] State FORCED to true");
        }

        // ✅ CRITICAL FIX 2: Wait longer for state propagation
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // ✅ CRITICAL FIX 3: Verify state was updated
        const currentState = store.getState();
        const updatedUser = currentState?.auth?.user;

        console.log("🔍 [Questionnaire] State verification:", {
          is_questionnaire_completed: updatedUser?.is_questionnaire_completed,
          subscription_type: updatedUser?.subscription_type,
        });

        // ✅ CRITICAL FIX 4: If state didn't update, FORCE it again
        if (!updatedUser?.is_questionnaire_completed && !isEditMode) {
          console.log(
            "⚠️ [Questionnaire] State didn't update! FORCING AGAIN..."
          );

          store.dispatch({
            type: "auth/setUser",
            payload: {
              ...updatedUser,
              is_questionnaire_completed: true,
            },
          });

          // Wait again
          await new Promise((resolve) => setTimeout(resolve, 500));

          const recheck = store.getState()?.auth?.user;
          console.log("🔍 [Questionnaire] Recheck:", {
            is_questionnaire_completed: recheck?.is_questionnaire_completed,
          });
        }

        if (isEditMode) {
          // Edit mode - go back to profile
          Alert.alert(
            t("questionnaire.success"),
            t("questionnaire.dataUpdated"),
            [
              {
                text: t("questionnaire.backToProfile"),
                onPress: () => {
                  console.log(
                    "🚀 [Questionnaire] Edit mode - going to profile"
                  );
                  router.replace("/(tabs)/profile");
                },
              },
            ],
            { cancelable: false }
          );
        } else {
          // First time completion
          const finalUser = store.getState()?.auth?.user;
          const hasSubscription =
            finalUser?.subscription_type &&
            finalUser.subscription_type !== null &&
            finalUser.subscription_type !== "null";

          console.log("🔍 [Questionnaire] Final check:", {
            hasSubscription,
            subscription_type: finalUser?.subscription_type,
            is_questionnaire_completed: finalUser?.is_questionnaire_completed,
          });

          // ✅ CRITICAL: Navigate WITHOUT alert to prevent delay
          if (hasSubscription) {
            console.log(
              "🚀 [Questionnaire] Has subscription - going to tabs NOW"
            );
            router.replace("/(tabs)");
          } else {
            console.log(
              "🚀 [Questionnaire] No subscription - going to payment NOW"
            );
            router.replace("/payment-plan");
          }
        }
      } else {
        // Save failed
        console.error("❌ [Questionnaire] Save failed:", result);
        Alert.alert(
          t("questionnaire.error"),
          (result as any)?.payload || t("questionnaire.saveError")
        );
      }
    } catch (error: any) {
      console.error("💥 [Questionnaire] Submit error:", error);
      Alert.alert(t("questionnaire.error"), t("questionnaire.saveError"));
    }
  };

  // ✅ ALSO ADD THIS: Monitor state changes for debugging
  useEffect(() => {
    console.log("🔍 [Questionnaire] State Monitor:", {
      currentStep,
      isEditMode,
      isSaving,
      user_questionnaire_completed: user?.is_questionnaire_completed,
      user_subscription: user?.subscription_type,
    });
  }, [
    currentStep,
    isEditMode,
    isSaving,
    user?.is_questionnaire_completed,
    user?.subscription_type,
  ]);

  useEffect(() => {
    if (error) {
      Alert.alert(t("questionnaire.error"), error);
      dispatch(clearError());
    }
  }, [error, t, dispatch]);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return (
          formData.age &&
          formData.gender &&
          formData.height_cm &&
          formData.weight_kg
        );
      case 2:
        return formData.main_goal && formData.commitment_level;
      case 3:
        return formData.physical_activity_level && formData.sport_frequency;
      case 4:
        return true;
      case 5:
        return (
          formData.cooking_preference &&
          formData.available_cooking_methods.length > 0
        );
      case 6:
        return formData.dietary_style;
      case 7:
        return true;
      case 8:
        return true;
      default:
        return true;
    }
  };

  // Fixed handleBack function in QuestionnaireScreen
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const handleBack = () => {
    if (currentStep > 1) {
      // If not on first step, go to previous step
      setCurrentStep(currentStep - 1);
    } else {
      // On first step - check authentication and user state
      if (!isAuthenticated || !user) {
        // Not authenticated - go to sign in
        console.log("🔙 Not authenticated - redirecting to sign in");
        router.replace("/(auth)/signin");
      } else if (isEditMode) {
        // Edit mode - go back to profile
        console.log("🔙 Edit mode - going back to profile");
        router.back();
      } else if (user?.is_questionnaire_completed) {
        // User has completed questionnaire before - go back
        console.log("🔙 Questionnaire already completed - going back");
        router.back();
      } else {
        // First time completing questionnaire - go to sign in
        console.log("🔙 First time questionnaire - redirecting to sign in");
        router.replace("/(auth)/signin");
      }
    }
  };
  const getStepIcon = (step: number) => {
    const iconProps = { size: 24, color: colors.primary };
    switch (step) {
      case 1:
        return <Target {...iconProps} />;
      case 2:
        return <Target {...iconProps} />;
      case 3:
        return <Activity {...iconProps} />;
      case 4:
        return <Heart {...iconProps} />;
      case 5:
        return <Utensils {...iconProps} />;
      case 6:
        return <Leaf {...iconProps} />;
      case 7:
        return <Moon {...iconProps} />;
      case 8:
        return <Settings {...iconProps} />;
      default:
        return <Target {...iconProps} />;
    }
  };

  const renderStep = () => {
    const mainGoalOptions = [
      {
        key: "WEIGHT_LOSS",
        label: t("questionnaire.loseWeight"),
        description: t("questionnaire.loseWeightDesc"),
        icon: <Text style={styles.emoji}>🏃‍♀️</Text>,
      },
      {
        key: "WEIGHT_GAIN",
        label: t("questionnaire.gainWeight"),
        description: t("questionnaire.gainWeightDesc"),
        icon: <Text style={styles.emoji}>💪</Text>,
      },
      {
        key: "WEIGHT_MAINTENANCE",
        label: t("questionnaire.maintainWeight"),
        description: t("questionnaire.maintainWeightDesc"),
        icon: <Text style={styles.emoji}>⚖️</Text>,
      },
      {
        key: "MEDICAL_CONDITION",
        label: t("questionnaire.improveHealth"),
        description: t("questionnaire.improveHealthDesc"),
        icon: <Text style={styles.emoji}>🏥</Text>,
      },
      {
        key: "SPORTS_PERFORMANCE",
        label: t("questionnaire.buildMuscle"),
        description: t("questionnaire.buildMuscleDesc"),
        icon: <Text style={styles.emoji}>🏆</Text>,
      },
    ];

    const activityLevels = [
      {
        key: "NONE",
        label: t("questionnaire.notActive"),
        description: t("questionnaire.notActiveDesc"),
        icon: <Text style={styles.emoji}>🪑</Text>,
      },
      {
        key: "LIGHT",
        label: t("questionnaire.lightlyActive"),
        description: t("questionnaire.lightlyActiveDesc"),
        icon: <Text style={styles.emoji}>🚶‍♀️</Text>,
      },
      {
        key: "MODERATE",
        label: t("questionnaire.moderatelyActive"),
        description: t("questionnaire.moderatelyActiveDesc"),
        icon: <Text style={styles.emoji}>🏃‍♀️</Text>,
      },
      {
        key: "HIGH",
        label: t("questionnaire.veryActive"),
        description: t("questionnaire.veryActiveDesc"),
        icon: <Text style={styles.emoji}>🏋️‍♀️</Text>,
      },
    ];

    const sportFrequencies = [
      {
        key: "NONE",
        label: t("questionnaire.notActive"),
        icon: <Text style={styles.emoji}>😴</Text>,
      },
      {
        key: "ONCE_A_WEEK",
        label: "1x " + t("common.weekly"),
        icon: <Text style={styles.emoji}>🚶</Text>,
      },
      {
        key: "TWO_TO_THREE",
        label: "2-3x " + t("common.weekly"),
        icon: <Text style={styles.emoji}>🏃</Text>,
      },
      {
        key: "FOUR_TO_FIVE",
        label: "4-5x " + t("common.weekly"),
        icon: <Text style={styles.emoji}>💪</Text>,
      },
      {
        key: "MORE_THAN_FIVE",
        label: "5+x " + t("common.weekly"),
        icon: <Text style={styles.emoji}>🏆</Text>,
      },
    ];

    const cookingPrefs = [
      {
        key: "cooked",
        label: t("questionnaire.cooked"),
        description: t("questionnaire.cookedDesc"),
        icon: <Text style={styles.emoji}>👨‍🍳</Text>,
      },
      {
        key: "easy_prep",
        label: t("questionnaire.easyPrep"),
        description: t("questionnaire.easyPrepDesc"),
        icon: <Text style={styles.emoji}>⚡</Text>,
      },
      {
        key: "ready_made",
        label: t("questionnaire.readyMade"),
        description: t("questionnaire.readyMadeDesc"),
        icon: <Text style={styles.emoji}>📦</Text>,
      },
      {
        key: "no_cooking",
        label: t("questionnaire.noCooking"),
        description: t("questionnaire.noCookingDesc"),
        icon: <Text style={styles.emoji}>🥗</Text>,
      },
    ];

    const cookingMethods = [
      t("questionnaire.microwave"),
      t("questionnaire.oven"),
      t("questionnaire.stove"),
      t("questionnaire.pressureCooker"),
      t("questionnaire.pan"),
      t("questionnaire.grill"),
    ];

    const commonAllergens = [
      t("questionnaire.gluten"),
      t("questionnaire.dairy"),
      t("questionnaire.eggs"),
      t("questionnaire.nuts"),
      t("questionnaire.peanuts"),
      t("questionnaire.fish"),
      t("questionnaire.shellfish"),
      t("questionnaire.soy"),
    ];

    const dietaryStyles = [
      {
        key: "regular",
        label: t("questionnaire.omnivore"),
        description: t("questionnaire.omnivoreDesc"),
        icon: <Text style={styles.emoji}>🍽️</Text>,
      },
      {
        key: "low_carb",
        label: t("questionnaire.lowCarb"),
        description: t("questionnaire.lowCarbDesc"),
        icon: <Text style={styles.emoji}>🥩</Text>,
      },
      {
        key: "keto",
        label: t("questionnaire.keto"),
        description: t("questionnaire.ketoDesc"),
        icon: <Text style={styles.emoji}>🥑</Text>,
      },
      {
        key: "vegetarian",
        label: t("questionnaire.vegetarian"),
        description: t("questionnaire.vegetarianDesc"),
        icon: <Text style={styles.emoji}>🌱</Text>,
      },
      {
        key: "vegan",
        label: t("questionnaire.vegan"),
        description: t("questionnaire.veganDesc"),
        icon: <Text style={styles.emoji}>🌿</Text>,
      },
      {
        key: "mediterranean",
        label: t("questionnaire.mediterranean"),
        description: t("questionnaire.mediterraneanDesc"),
        icon: <Text style={styles.emoji}>🫒</Text>,
      },
    ];

    const commitmentLevels = [
      {
        key: "easy",
        label: t("questionnaire.easy"),
        description: t("questionnaire.easyDesc"),
        icon: <Text style={styles.emoji}>😌</Text>,
      },
      {
        key: "moderate",
        label: t("questionnaire.moderate"),
        description: t("questionnaire.moderateDesc"),
        icon: <Text style={styles.emoji}>💪</Text>,
      },
      {
        key: "strict",
        label: t("questionnaire.strict"),
        description: t("questionnaire.strictDesc"),
        icon: <Text style={styles.emoji}>🎯</Text>,
      },
    ];

    const genderOptions = [
      {
        key: "male",
        label: t("questionnaire.male"),
        icon: <Text style={styles.emoji}>👨</Text>,
      },
      {
        key: "female",
        label: t("questionnaire.female"),
        icon: <Text style={styles.emoji}>👩</Text>,
      },
      {
        key: "other",
        label: t("questionnaire.other"),
        icon: <Text style={styles.emoji}>👤</Text>,
      },
    ];

    switch (currentStep) {
      case 1:
        return (
          <StepContainer
            title={t("questionnaire.steps.personal.title")}
            description={t("questionnaire.steps.personal.subtitle")}
          >
            <CustomTextInput
              label={t("questionnaire.age")}
              value={formData.age}
              onChangeText={(text: any) =>
                setFormData((prev) => ({ ...prev, age: text }))
              }
              placeholder={t("questionnaire.enterAge")}
              keyboardType="numeric"
              required
            />

            <OptionGroup
              label={t("questionnaire.gender")}
              options={genderOptions}
              selectedValue={formData.gender}
              onSelect={(value) =>
                setFormData((prev) => ({ ...prev, gender: value }))
              }
              required
            />

            <WeightScale
              label={t("questionnaire.height")}
              value={parseInt(formData.height_cm) || parseInt(DEFAULT_HEIGHT)}
              onValueChange={(value: number) =>
                setFormData((prev) => ({
                  ...prev,
                  height_cm: value.toString(),
                }))
              }
              min={120}
              max={220}
              unit="cm"
            />

            <WeightScale
              label={t("questionnaire.weight")}
              value={parseInt(formData.weight_kg) || parseInt(DEFAULT_WEIGHT)}
              onValueChange={(value: number) =>
                setFormData((prev) => ({
                  ...prev,
                  weight_kg: value.toString(),
                }))
              }
              min={30}
              max={200}
              unit="kg"
            />

            <WeightScale
              label={t("questionnaire.targetWeight")}
              value={
                parseInt(formData.target_weight_kg || DEFAULT_TARGET_WEIGHT) ||
                parseInt(DEFAULT_TARGET_WEIGHT)
              }
              onValueChange={(value: number) =>
                setFormData((prev) => ({
                  ...prev,
                  target_weight_kg: value.toString(),
                }))
              }
              min={30}
              max={200}
              unit="kg"
            />
          </StepContainer>
        );

      case 2:
        return (
          <StepContainer
            title={t("questionnaire.steps.goals.title")}
            description={t("questionnaire.steps.goals.subtitle")}
          >
            <OptionGroup
              label={t("questionnaire.mainGoal")}
              options={mainGoalOptions}
              selectedValue={formData.main_goal}
              onSelect={(value) =>
                setFormData((prev) => ({ ...prev, main_goal: value }))
              }
              required
            />

            <CustomTextInput
              label={t("questionnaire.secondaryGoal")}
              value={formData.secondary_goal || ""}
              onChangeText={(text: any) =>
                setFormData((prev) => ({
                  ...prev,
                  secondary_goal: text || null,
                }))
              }
              placeholder={t("questionnaire.secondaryGoalPlaceholder")}
              multiline
            />

            <CustomTextInput
              label={t("questionnaire.goalTimeframe")}
              value={formData.goal_timeframe_days || ""}
              onChangeText={(text: any) =>
                setFormData((prev) => ({
                  ...prev,
                  goal_timeframe_days: text || null,
                }))
              }
              placeholder={t("questionnaire.example90Days")}
              keyboardType="numeric"
            />

            <OptionGroup
              label={t("questionnaire.commitmentLevel")}
              options={commitmentLevels}
              selectedValue={formData.commitment_level}
              onSelect={(value) =>
                setFormData((prev) => ({ ...prev, commitment_level: value }))
              }
              required
            />
          </StepContainer>
        );

      case 3:
        return (
          <StepContainer
            title={t("questionnaire.steps.activity.title")}
            description={t("questionnaire.steps.activity.subtitle")}
          >
            <OptionGroup
              label={t("questionnaire.activityLevel")}
              options={activityLevels}
              selectedValue={formData.physical_activity_level}
              onSelect={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  physical_activity_level: value,
                }))
              }
              required
            />

            <OptionGroup
              label={t("questionnaire.sportFrequency")}
              options={sportFrequencies}
              selectedValue={formData.sport_frequency}
              onSelect={(value) =>
                setFormData((prev) => ({ ...prev, sport_frequency: value }))
              }
              required
            />
          </StepContainer>
        );

      case 4:
        return (
          <StepContainer
            title={t("questionnaire.steps.health.title")}
            description={t("questionnaire.steps.health.subtitle")}
          >
            <DynamicListInput
              label={t("questionnaire.medicalConditions")}
              placeholder={t("questionnaire.addItem")}
              items={formData.medical_conditions_text}
              onItemsChange={(items) =>
                setFormData((prev) => ({
                  ...prev,
                  medical_conditions_text: items,
                }))
              }
              maxItems={10}
            />

            <DynamicListInput
              label={t("questionnaire.medications")}
              placeholder={t("questionnaire.addItem")}
              items={formData.medications}
              onItemsChange={(items) =>
                setFormData((prev) => ({ ...prev, medications: items }))
              }
              maxItems={10}
            />
          </StepContainer>
        );

      case 5:
        return (
          <StepContainer
            title={t("questionnaire.steps.means.title")}
            description={t("questionnaire.steps.means.subtitle")}
          >
            <OptionGroup
              label={t("questionnaire.cookingPreference")}
              options={cookingPrefs}
              selectedValue={formData.cooking_preference}
              onSelect={(value) =>
                setFormData((prev) => ({ ...prev, cooking_preference: value }))
              }
              required
            />

            <CheckboxGroup
              label={t("questionnaire.availableCookingMethods")}
              options={cookingMethods}
              selectedValues={formData.available_cooking_methods}
              onToggle={(value: string) =>
                handleArrayToggle(
                  formData.available_cooking_methods,
                  value,
                  "available_cooking_methods"
                )
              }
            />

            <CustomTextInput
              label={t("questionnaire.dailyFoodBudget")}
              value={formData.daily_food_budget || ""}
              onChangeText={(text: any) =>
                setFormData((prev) => ({
                  ...prev,
                  daily_food_budget: text || null,
                }))
              }
              placeholder={t("questionnaire.example50Budget")}
              keyboardType="numeric"
              prefix="₪"
            />
          </StepContainer>
        );

      case 6:
        return (
          <StepContainer
            title={t("questionnaire.steps.dietary.title")}
            description={t("questionnaire.steps.dietary.subtitle")}
          >
            <CustomSwitch
              label={t("questionnaire.kosher")}
              description={t("questionnaire.kosherDesc")}
              value={formData.kosher}
              onValueChange={(value: any) =>
                setFormData((prev) => ({ ...prev, kosher: value }))
              }
            />

            <CheckboxGroup
              label={t("questionnaire.commonAllergies")}
              options={commonAllergens}
              selectedValues={formData.allergies}
              onToggle={(value: string) =>
                handleArrayToggle(formData.allergies, value, "allergies")
              }
            />

            <DynamicListInput
              label={t("questionnaire.otherAllergies")}
              placeholder={t("questionnaire.addAllergyPlaceholder")}
              items={formData.allergies.filter(
                (a) => !commonAllergens.includes(a)
              )}
              onItemsChange={(items) => {
                const commonSelected = formData.allergies.filter((a) =>
                  commonAllergens.includes(a)
                );
                const allAllergies = [...commonSelected, ...items];

                // Validate last added item
                if (items.length > 0) {
                  const lastItem = items[items.length - 1];
                  const validation = validateAllergen(lastItem);
                  if (!validation.valid) {
                    Alert.alert(
                      t("validation.invalidAllergen"),
                      t(
                        `validation.${
                          validation.errorKey || "allergenNotRecognized"
                        }`
                      )
                    );
                    return;
                  }
                }

                setFormData((prev) => ({ ...prev, allergies: allAllergies }));
              }}
              maxItems={20}
            />

            <OptionGroup
              label={t("questionnaire.dietaryStyle")}
              options={dietaryStyles}
              selectedValue={formData.dietary_style}
              onSelect={(value) =>
                setFormData((prev) => ({ ...prev, dietary_style: value }))
              }
              required
            />
          </StepContainer>
        );

      case 7:
        return (
          <StepContainer
            title={t("questionnaire.steps.lifestyle.title")}
            description={t("questionnaire.steps.lifestyle.subtitle")}
          >
            <WeightScale
              label={t("questionnaire.sleepHours")}
              value={
                parseInt(
                  formData.sleep_hours_per_night || DEFAULT_SLEEP_HOURS
                ) || parseInt(DEFAULT_SLEEP_HOURS)
              }
              onValueChange={(value: number) =>
                setFormData((prev) => ({
                  ...prev,
                  sleep_hours_per_night: value.toString(),
                }))
              }
              min={4}
              max={12}
              unit={t("questionnaire.hours")}
            />

            <OptionGroup
              label={t("questionnaire.smokingStatus")}
              options={[
                {
                  key: "NO",
                  label: t("questionnaire.nonSmoker"),
                  icon: <Text style={styles.emoji}>🚭</Text>,
                },
                {
                  key: "YES",
                  label: t("questionnaire.smoker"),
                  icon: <Text style={styles.emoji}>🚬</Text>,
                },
              ]}
              selectedValue={formData.smoking_status || ""}
              onSelect={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  smoking_status: value as "YES" | "NO",
                }))
              }
            />
          </StepContainer>
        );

      case 8:
        return (
          <StepContainer
            title={t("questionnaire.steps.preferences.title")}
            description={t("questionnaire.steps.preferences.subtitle")}
          >
            <OptionGroup
              label={t("questionnaire.uploadFrequency")}
              options={[
                {
                  key: "every_meal",
                  label: t("questionnaire.everyMeal"),
                },
                { key: "daily", label: t("questionnaire.daily") },
                {
                  key: "several_weekly",
                  label: t("questionnaire.severalWeekly"),
                },
                { key: "weekly", label: t("questionnaire.weekly") },
              ]}
              selectedValue={formData.upload_frequency}
              onSelect={(value) =>
                setFormData((prev) => ({ ...prev, upload_frequency: value }))
              }
            />

            <CustomSwitch
              label={t("questionnaire.willingnessToFollow")}
              description={t("questionnaire.willingnessToFollowDesc")}
              value={formData.willingness_to_follow}
              onValueChange={(value: any) =>
                setFormData((prev) => ({
                  ...prev,
                  willingness_to_follow: value,
                }))
              }
            />

            <CustomSwitch
              label={t("questionnaire.personalizedTips")}
              description={t("questionnaire.personalizedTipsDesc")}
              value={formData.personalized_tips}
              onValueChange={(value: any) =>
                setFormData((prev) => ({ ...prev, personalized_tips: value }))
              }
            />

            <OptionGroup
              label={t("questionnaire.notificationsPreference")}
              options={[
                { key: "DAILY", label: t("questionnaire.daily") },
                { key: "WEEKLY", label: t("questionnaire.weekly") },
                { key: "NONE", label: t("common.no") },
              ]}
              selectedValue={formData.notifications_preference || ""}
              onSelect={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  notifications_preference: value as
                    | "DAILY"
                    | "WEEKLY"
                    | "NONE",
                }))
              }
            />
          </StepContainer>
        );

      default:
        return null;
    }
  };

  if (
    (isEditMode || user?.is_questionnaire_completed) &&
    isLoading &&
    !dataLoaded
  ) {
    return <LoadingScreen text={t("loading.questionnaire")} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        backgroundColor={colors.background}
        barStyle={isDark ? "light-content" : "dark-content"}
      />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            paddingTop: Math.max(insets.top, 24),
          },
        ]}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View
            style={[
              styles.stepIcon,
              { backgroundColor: colors.primary + "15" },
            ]}
          >
            {getStepIcon(currentStep)}
          </View>
        </View>

        <TouchableOpacity style={styles.skipButton}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>
            {t("common.skip")}
          </Text>
        </TouchableOpacity>
      </View>

      <ProgressIndicator currentStep={currentStep} totalSteps={totalSteps} />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {renderStep()}
      </ScrollView>

      {/* Navigation - Fixed at bottom */}
      <View
        style={[
          styles.navigation,
          {
            backgroundColor: colors.background,
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}
      >
        {currentStep < totalSteps ? (
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: canProceed() ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setCurrentStep(currentStep + 1)}
            disabled={!canProceed()}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                canProceed()
                  ? [colors.primary, colors.primary + "CC"]
                  : [colors.border, colors.border]
              }
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>{t("common.next")}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: isSaving ? colors.border : colors.success,
              },
            ]}
            onPress={handleSubmit}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                isSaving
                  ? [colors.border, colors.border]
                  : [colors.success, colors.success + "CC"]
              }
              style={styles.buttonGradient}
            >
              {isSaving ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.buttonText}>
                  {isEditMode ? t("common.save") : t("questionnaire.finish")}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {/* Tip Modal */}
      <Modal
        visible={!!showTip}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTip("")}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text
              style={[
                styles.modalText,
                { color: colors.text },
                isRTL && styles.textRTL,
              ]}
            >
              {showTip}
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowTip("")}
            >
              <Text style={styles.modalButtonText}>{t("common.ok")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const isSmallDevice = SCREEN_WIDTH < 375;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: isSmallDevice ? 16 : 24,
    paddingTop: Platform.select({ ios: 8, android: 16 }),
    paddingBottom: 8,
  },
  backButton: {
    width: isSmallDevice ? 36 : 40,
    height: isSmallDevice ? 36 : 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  stepIcon: {
    width: isSmallDevice ? 42 : 48,
    height: isSmallDevice ? 42 : 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  skipButton: {
    paddingHorizontal: isSmallDevice ? 12 : 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: "500",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  navigation: {
    paddingHorizontal: isSmallDevice ? 16 : 24,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  actionButton: {
    borderRadius: isSmallDevice ? 12 : 16,
    overflow: "hidden",
  },
  buttonGradient: {
    paddingVertical: isSmallDevice ? 14 : 18,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "white",
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    maxWidth: 320,
    width: "100%",
  },
  modalText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 24,
  },
  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
  },
  modalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  emoji: {
    fontSize: 24,
  },
  textRTL: {
    textAlign: "right",
  },
});

export default QuestionnaireScreen;
