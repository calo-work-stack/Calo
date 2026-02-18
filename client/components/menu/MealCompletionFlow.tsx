import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  Animated,
  Easing,
  Dimensions,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import {
  Star,
  Camera,
  Image as ImageIcon,
  Check,
  Sparkles,
  X,
  ChefHat,
  Scale,
  Zap,
  Brain,
} from "lucide-react-native";
import { api, clearCache } from "@/src/services/api";
import { useImagePicker } from "@/hooks/camera/useImagePicker";
import { NutritionPills } from "./shared/NutritionPills";
import { useMealTypeConfig } from "./shared/MealTypeIcon";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface MealData {
  meal_id: string;
  name: string;
  meal_type: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients?: any[];
  day_number?: number;
  menu_id?: string;
  cooking_method?: string;
  image_url?: string;
}

interface MealCompletionFlowProps {
  visible: boolean;
  meal: MealData | null;
  menuId: string;
  onClose: () => void;
  onComplete: (mealId: string) => void;
}

type Step = "celebration" | "photo" | "rating" | "saving";

const RATING_CATEGORIES = [
  {
    key: "taste",
    labelKey: "meal_completion.taste",
    fallback: "Taste",
    Icon: ChefHat,
    color: "#FF6B6B",
  },
  {
    key: "satiety",
    labelKey: "meal_completion.fullness",
    fallback: "Fullness",
    Icon: Scale,
    color: "#10B981",
  },
  {
    key: "energy",
    labelKey: "meal_completion.energy",
    fallback: "Energy",
    Icon: Zap,
    color: "#F59E0B",
  },
  {
    key: "heaviness",
    labelKey: "meal_completion.heaviness",
    fallback: "Heaviness",
    Icon: Brain,
    color: "#8B5CF6",
  },
];

export const MealCompletionFlow = React.memo(
  ({ visible, meal, menuId, onClose, onComplete }: MealCompletionFlowProps) => {
    const { colors, isDark } = useTheme();
    const { t } = useTranslation();
    const { getMealTypeConfig } = useMealTypeConfig();
    const { takePhoto, selectFromGallery } = useImagePicker();

    const [step, setStep] = useState<Step>("celebration");
    const [ratings, setRatings] = useState({
      taste: 0,
      satiety: 0,
      energy: 0,
      heaviness: 0,
    });
    const [notes, setNotes] = useState("");
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const scaleAnim = useRef(new Animated.Value(0)).current;
    const sparkleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (visible) {
        setStep("celebration");
        setRatings({ taste: 0, satiety: 0, energy: 0, heaviness: 0 });
        setNotes("");
        setPhotoUri(null);
        setIsSaving(false);

        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.loop(
            Animated.sequence([
              Animated.timing(sparkleAnim, {
                toValue: 1,
                duration: 1500,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(sparkleAnim, {
                toValue: 0,
                duration: 1500,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
            ])
          ),
        ]).start();
      } else {
        scaleAnim.setValue(0);
        sparkleAnim.setValue(0);
      }
    }, [visible]);

    if (!meal) return null;

    const mealConfig = getMealTypeConfig(meal.meal_type);

    const handleTakePhoto = async () => {
      const uri = await takePhoto();
      if (uri) {
        setPhotoUri(uri);
        setStep("rating");
      }
    };

    const handlePickFromGallery = async () => {
      const uri = await selectFromGallery();
      if (uri) {
        setPhotoUri(uri);
        setStep("rating");
      }
    };

    const handleSkipPhoto = () => {
      setStep("rating");
    };

    const setRatingValue = (key: string, value: number) => {
      setRatings((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
      setStep("saving");
      setIsSaving(true);

      try {
        const totalCost = meal.ingredients?.reduce(
          (sum: number, ing: any) => sum + (ing.estimated_cost || 0),
          0
        ) || 0;

        // Use user photo if taken, otherwise fall back to AI-generated image
        const finalImageUrl = photoUri || meal.image_url || null;

        await api.post("/meal-completions/complete", {
          menu_id: menuId,
          meal_name: meal.name,
          meal_type: meal.meal_type,
          day_number: meal.day_number || 1,
          calories: meal.calories,
          protein_g: meal.protein,
          carbs_g: meal.carbs,
          fats_g: meal.fat,
          rating: ratings.taste > 0 ? ratings.taste : null,
          taste_rating: ratings.taste > 0 ? ratings.taste : null,
          satiety_rating: ratings.satiety > 0 ? ratings.satiety : null,
          energy_rating: ratings.energy > 0 ? ratings.energy : null,
          heaviness_rating: ratings.heaviness > 0 ? ratings.heaviness : null,
          notes: notes.trim() || null,
          image_url: finalImageUrl,
          meal_id_ref: meal.meal_id,
          ingredients: meal.ingredients || null,
          cooking_method: meal.cooking_method || null,
          estimated_cost: totalCost > 0 ? totalCost : null,
        });

        clearCache();

        setTimeout(() => {
          onComplete(meal.meal_id);
          onClose();
        }, 1200);
      } catch (error) {
        console.error("Error completing meal:", error);
        setIsSaving(false);
        setStep("rating");
      }
    };

    const renderCelebration = () => (
      <Animated.View
        style={[
          styles.stepContainer,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <LinearGradient
          colors={[colors.warmOrange, "#D97706"]}
          style={styles.celebrationGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Animated.View
            style={{
              opacity: sparkleAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.6, 1],
              }),
            }}
          >
            <Sparkles size={64} color="#FFFFFF" />
          </Animated.View>
          <Text style={styles.celebrationTitle}>
            {t("meal_completion.great_job")}
          </Text>

          <View style={[styles.mealSummaryCard, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Text style={styles.mealSummaryEmoji}>{mealConfig.emoji}</Text>
            <Text style={styles.mealSummaryName}>{meal.name}</Text>
            <View style={styles.mealSummaryPills}>
              <NutritionPills
                calories={meal.calories}
                protein={meal.protein}
                carbs={meal.carbs}
                fat={meal.fat}
                compact
              />
            </View>
          </View>

          <Pressable
            onPress={() => setStep("photo")}
            style={styles.continueButton}
          >
            <Text style={styles.continueButtonText}>
              {t("common.continue", "Continue")}
            </Text>
          </Pressable>
        </LinearGradient>
      </Animated.View>
    );

    const renderPhotoStep = () => (
      <View style={styles.stepContainer}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          {t("meal_completion.capture_meal")}
        </Text>
        <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
          {t("meal_completion.capture_meal_desc", "Share a photo of your meal")}
        </Text>

        <View style={styles.photoOptions}>
          <Pressable
            onPress={handleTakePhoto}
            style={[styles.photoButton, { backgroundColor: colors.warmOrange + "12", borderColor: colors.warmOrange + "25", borderWidth: 1 }]}
          >
            <View style={[styles.photoIconCircle, { backgroundColor: colors.warmOrange + "20" }]}>
              <Camera size={28} color={colors.warmOrange} />
            </View>
            <Text style={[styles.photoButtonText, { color: colors.warmOrange }]}>
              {t("meal_completion.take_photo")}
            </Text>
          </Pressable>

          <Pressable
            onPress={handlePickFromGallery}
            style={[styles.photoButton, { backgroundColor: isDark ? colors.surface : "#F0F4FF", borderColor: "#6366F1" + "25", borderWidth: 1 }]}
          >
            <View style={[styles.photoIconCircle, { backgroundColor: "#6366F1" + "20" }]}>
              <ImageIcon size={28} color="#6366F1" />
            </View>
            <Text style={[styles.photoButtonText, { color: "#6366F1" }]}>
              {t("meal_completion.from_gallery", "Gallery")}
            </Text>
          </Pressable>
        </View>

        <Pressable onPress={handleSkipPhoto} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>
            {t("meal_completion.skip_photo")}
          </Text>
        </Pressable>
      </View>
    );

    const renderRatingStep = () => (
      <ScrollView
        style={styles.ratingScroll}
        contentContainerStyle={styles.ratingScrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Photo preview */}
        {photoUri && (
          <Image source={{ uri: photoUri }} style={styles.photoPreview} />
        )}

        <Text style={[styles.stepTitle, { color: colors.text }]}>
          {t("meal_completion.rate_meal")}
        </Text>

        {/* Rating categories */}
        <View style={styles.ratingsContainer}>
          {RATING_CATEGORIES.map((cat) => (
            <View key={cat.key} style={[styles.ratingCategory, { backgroundColor: isDark ? colors.surface : "#FAFAFA", borderColor: colors.border + "30" }]}>
              <View style={styles.ratingCategoryHeader}>
                <View style={[styles.ratingIconCircle, { backgroundColor: cat.color + "15" }]}>
                  <cat.Icon size={16} color={cat.color} />
                </View>
                <Text style={[styles.ratingCategoryLabel, { color: colors.text }]}>
                  {t(cat.labelKey, cat.fallback)}
                </Text>
              </View>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable
                    key={star}
                    onPress={() => setRatingValue(cat.key, star)}
                    hitSlop={4}
                    style={styles.ratingStarBtn}
                  >
                    <Star
                      size={24}
                      color={star <= (ratings as any)[cat.key] ? cat.color : colors.border}
                      fill={star <= (ratings as any)[cat.key] ? cat.color : "transparent"}
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Notes */}
        <TextInput
          style={[
            styles.notesInput,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          placeholder={t("meal_completion.add_notes")}
          placeholderTextColor={colors.textSecondary}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Save button */}
        <Pressable onPress={handleSave} style={styles.saveButtonWrapper}>
          <LinearGradient
            colors={[colors.warmOrange, "#D97706"]}
            style={styles.saveButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Check size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>
              {t("meal_completion.complete_meal")}
            </Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    );

    const renderSaving = () => (
      <View style={[styles.stepContainer, styles.savingContainer]}>
        {isSaving ? (
          <>
            <ActivityIndicator size="large" color={colors.warmOrange} />
            <Text style={[styles.savingText, { color: colors.text }]}>
              {t("meal_completion.saving")}
            </Text>
          </>
        ) : (
          <>
            <View style={[styles.successCircle, { backgroundColor: colors.success + "20" }]}>
              <Check size={48} color={colors.success} />
            </View>
            <Text style={[styles.successText, { color: colors.text }]}>
              {t("meal_completion.meal_completed")}
            </Text>
            <Text style={[styles.savedText, { color: colors.textSecondary }]}>
              {t("meal_completion.saved_to_history")}
            </Text>
          </>
        )}
      </View>
    );

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background },
            ]}
          >
            {step !== "celebration" && step !== "saving" && (
              <Pressable onPress={onClose} style={styles.closeButton}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            )}

            {step === "celebration" && renderCelebration()}
            {step === "photo" && renderPhotoStep()}
            {step === "rating" && renderRatingStep()}
            {step === "saving" && renderSaving()}
          </View>
        </View>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: SCREEN_WIDTH - 40,
    maxWidth: 420,
    maxHeight: "85%",
    borderRadius: 28,
    overflow: "hidden",
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  stepContainer: {
    alignItems: "center",
  },
  celebrationGradient: {
    padding: 32,
    alignItems: "center",
    gap: 20,
  },
  celebrationTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  mealSummaryCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    width: "100%",
    gap: 8,
  },
  mealSummaryEmoji: {
    fontSize: 40,
  },
  mealSummaryName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  mealSummaryPills: {
    marginTop: 8,
  },
  continueButton: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
    marginTop: 20,
    letterSpacing: -0.3,
    paddingHorizontal: 20,
  },
  stepSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  photoOptions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  photoButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    borderRadius: 20,
    gap: 10,
  },
  photoIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  skipButton: {
    paddingVertical: 16,
    paddingBottom: 32,
  },
  skipText: {
    fontSize: 15,
    fontWeight: "600",
  },
  ratingScroll: {
    maxHeight: 520,
  },
  ratingScrollContent: {
    alignItems: "center",
    paddingBottom: 32,
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 18,
    marginTop: 20,
  },
  ratingsContainer: {
    width: "100%",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  ratingCategory: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  ratingCategoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ratingIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  ratingCategoryLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  ratingStars: {
    flexDirection: "row",
    gap: 4,
  },
  ratingStarBtn: {
    padding: 2,
  },
  notesInput: {
    width: SCREEN_WIDTH - 80,
    maxWidth: 380,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    minHeight: 70,
    marginBottom: 16,
  },
  saveButtonWrapper: {
    width: SCREEN_WIDTH - 80,
    maxWidth: 380,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  savingContainer: {
    paddingVertical: 60,
    gap: 20,
  },
  savingText: {
    fontSize: 18,
    fontWeight: "700",
  },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  successText: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  savedText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
