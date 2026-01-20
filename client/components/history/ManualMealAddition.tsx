import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  Image,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/context/ThemeContext";
import { nutritionAPI } from "@/src/services/api";
import {
  X,
  Check,
  Utensils,
  Flame,
  Info,
  Activity,
  Wheat,
  Droplet,
  Camera,
  Image as ImageIcon,
  Trash2,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";

const { width } = Dimensions.get("window");

interface ManualMealAdditionProps {
  visible: boolean;
  onClose: () => void;
  onMealAdded: () => void;
}

const MEAL_PERIODS = [
  {
    value: "breakfast",
    label: "history.mealPeriods.breakfast",
    icon: "🌅",
    gradient: ["#FFA726", "#FF7043"],
  },
  {
    value: "lunch",
    label: "history.mealPeriods.lunch",
    icon: "☀️",
    gradient: ["#FFCA28", "#FFA726"],
  },
  {
    value: "dinner",
    label: "history.mealPeriods.dinner",
    icon: "🌙",
    gradient: ["#5C6BC0", "#3949AB"],
  },
  {
    value: "snack",
    label: "history.mealPeriods.snack",
    icon: "🍎",
    gradient: ["#EC407A", "#D81B60"],
  },
  {
    value: "late_night",
    label: "history.mealPeriods.lateNight",
    icon: "🌃",
    gradient: ["#7E57C2", "#5E35B1"],
  },
  {
    value: "other",
    label: "history.mealPeriods.other",
    icon: "🍽️",
    gradient: ["#26A69A", "#00897B"],
  },
];

const MACRO_FIELDS = [
  {
    key: "protein",
    label: "nutrition.protein",
    unit: "g",
    IconComponent: Activity,
    color: "#EF4444",
  },
  {
    key: "carbs",
    label: "nutrition.carbs",
    unit: "g",
    IconComponent: Wheat,
    color: "#F59E0B",
  },
  {
    key: "fat",
    label: "nutrition.fat",
    unit: "g",
    IconComponent: Droplet,
    color: "#10B981",
  },
];

const MICRO_FIELDS = [
  { key: "fiber", label: "nutrition.fiber", unit: "g" },
  { key: "sugar", label: "nutrition.sugar", unit: "g" },
  { key: "sodium", label: "nutrition.sodium", unit: "mg" },
];

export default function ManualMealAddition({
  visible,
  onClose,
  onMealAdded,
}: ManualMealAdditionProps) {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();

  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false); // Prevent double submissions
  const [mealData, setMealData] = useState({
    mealName: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    fiber: "",
    sugar: "",
    sodium: "",
    ingredients: "",
    mealPeriod: "other",
    imageUrl: "",
  });

  const requestPermissions = async () => {
    if (Platform.OS !== "web") {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("common.error"),
          "Sorry, we need camera roll permissions to make this work!"
        );
        return false;
      }
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        updateField("imageUrl", result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert(t("common.error"), "Failed to pick image");
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        updateField("imageUrl", result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert(t("common.error"), "Failed to take photo");
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    updateField("imageUrl", "");
  };

  const showImageOptions = () => {
    if (Platform.OS === "web") {
      pickImage();
    } else {
      Alert.alert(
        "Add Image",
        "Choose an option",
        [
          { text: "Take Photo", onPress: takePhoto },
          { text: "Choose from Library", onPress: pickImage },
          { text: "Cancel", style: "cancel" },
        ],
        { cancelable: true }
      );
    }
  };

  const handleSubmit = async () => {
    // Prevent double submissions
    if (isSubmittingRef.current || isLoading) {
      return;
    }

    if (!mealData.mealName.trim() || !mealData.calories.trim()) {
      Alert.alert(
        t("common.error"),
        t("history.manualMeal.error.nameAndCaloriesRequired")
      );
      return;
    }

    const caloriesNum = parseFloat(mealData.calories);
    if (isNaN(caloriesNum) || caloriesNum < 0) {
      Alert.alert(
        t("common.error"),
        t("history.manualMeal.error.invalidCalories")
      );
      return;
    }

    try {
      isSubmittingRef.current = true;
      setIsLoading(true);

      const ingredientsArray = mealData.ingredients
        .split(",")
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      const response = await nutritionAPI.addManualMeal({
        mealName: mealData.mealName,
        calories: mealData.calories,
        protein: mealData.protein || "0",
        carbs: mealData.carbs || "0",
        fat: mealData.fat || "0",
        fiber: mealData.fiber,
        sugar: mealData.sugar,
        sodium: mealData.sodium,
        ingredients: ingredientsArray.length > 0 ? ingredientsArray : undefined,
        mealPeriod: mealData.mealPeriod,
        imageUrl: mealData.imageUrl,
        date: new Date().toISOString(),
      });

      if (response.status === 200 && response.data.success) {
        Alert.alert(
          t("common.success"),
          t("history.manualMeal.success.mealAdded")
        );
        setMealData({
          mealName: "",
          calories: "",
          protein: "",
          carbs: "",
          fat: "",
          fiber: "",
          sugar: "",
          sodium: "",
          ingredients: "",
          mealPeriod: "other",
          imageUrl: "",
        });
        setSelectedImage(null);
        onMealAdded();
        onClose();
      } else {
        throw new Error(response.data.error || "Failed to add meal");
      }
    } catch (error) {
      console.error("Failed to add manual meal:", error);
      Alert.alert(t("common.error"), t("history.manualMeal.error.addFailed"));
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const updateField = (field: string, value: string) => {
    setMealData((prev) => ({ ...prev, [field]: value }));
  };

  const selectedPeriod = MEAL_PERIODS.find(
    (p) => p.value === mealData.mealPeriod
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <View
            style={[
              styles.modalHeader,
              { borderBottomWidth: 1, borderBottomColor: colors.border },
            ]}
          >
            <View style={styles.headerContent}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t("history.manualMeal.title")}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              disabled={isLoading}
            >
              <X size={20} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Meal Image
              </Text>

              {selectedImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: selectedImage }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={[
                      styles.removeImageButton,
                      { backgroundColor: colors.background },
                    ]}
                    onPress={removeImage}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={16} color="#EF4444" strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.imagePlaceholder,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={showImageOptions}
                  activeOpacity={0.7}
                >
                  <View style={styles.imagePlaceholderContent}>
                    <Camera
                      size={32}
                      color={colors.textSecondary}
                      strokeWidth={1.5}
                    />
                    <Text
                      style={[
                        styles.imagePlaceholderText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Add Photo
                    </Text>
                    <Text
                      style={[
                        styles.imagePlaceholderHint,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Tap to take or choose photo
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("history.manualMeal.basicInfo")}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {t("history.manualMeal.mealName")}{" "}
                  <Text style={styles.required}>*</Text>
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: colors.card,
                      borderColor:
                        focusedField === "mealName"
                          ? colors.text
                          : colors.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={mealData.mealName}
                    onChangeText={(text) => updateField("mealName", text)}
                    onFocus={() => setFocusedField("mealName")}
                    onBlur={() => setFocusedField(null)}
                    placeholder={t("history.manualMeal.placeholders.mealName")}
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {t("history.manualMeal.mealPeriod")}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.periodContainer}
                >
                  {MEAL_PERIODS.map((period) => {
                    const isSelected = mealData.mealPeriod === period.value;
                    return (
                      <TouchableOpacity
                        key={period.value}
                        onPress={() => updateField("mealPeriod", period.value)}
                        activeOpacity={0.7}
                        style={styles.periodChipWrapper}
                      >
                        {isSelected ? (
                          <LinearGradient
                            colors={period.gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.periodChipGradient}
                          >
                            <Text style={styles.periodEmoji}>
                              {period.icon}
                            </Text>
                            <Text style={styles.periodTextSelected}>
                              {t(period.label)}
                            </Text>
                          </LinearGradient>
                        ) : (
                          <View
                            style={[
                              styles.periodChip,
                              {
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                              },
                            ]}
                          >
                            <Text style={styles.periodEmojiUnselected}>
                              {period.icon}
                            </Text>
                            <Text
                              style={[
                                styles.periodText,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {t(period.label)}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Calories <Text style={styles.required}>*</Text>
              </Text>

              <View
                style={[
                  styles.caloriesInputWrapper,
                  {
                    backgroundColor: colors.card,
                    borderColor:
                      focusedField === "calories" ? colors.text : colors.border,
                  },
                ]}
              >
                <Flame size={18} color={colors.textSecondary} strokeWidth={2} />
                <TextInput
                  style={[styles.caloriesInput, { color: colors.text }]}
                  value={mealData.calories}
                  onChangeText={(text) => updateField("calories", text)}
                  onFocus={() => setFocusedField("calories")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text
                  style={[styles.caloriesUnit, { color: colors.textSecondary }]}
                >
                  kcal
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Macronutrients
              </Text>

              <View style={styles.macroGrid}>
                {MACRO_FIELDS.map((macro) => (
                  <View key={macro.key} style={styles.macroCard}>
                    <View
                      style={[
                        styles.macroInputWrapper,
                        {
                          backgroundColor: colors.card,
                          borderColor:
                            focusedField === macro.key
                              ? colors.text
                              : colors.border,
                        },
                      ]}
                    >
                      <macro.IconComponent
                        size={16}
                        color={colors.textSecondary}
                        strokeWidth={2}
                      />
                      <View style={styles.macroInputContainer}>
                        <Text
                          style={[
                            styles.macroLabel,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {t(macro.label)}
                        </Text>
                        <View style={styles.macroInputRow}>
                          <TextInput
                            style={[styles.macroInput, { color: colors.text }]}
                            value={mealData[macro.key as keyof typeof mealData]}
                            onChangeText={(text) =>
                              updateField(macro.key, text)
                            }
                            onFocus={() => setFocusedField(macro.key)}
                            onBlur={() => setFocusedField(null)}
                            placeholder="0"
                            keyboardType="decimal-pad"
                            placeholderTextColor={colors.textSecondary}
                          />
                          <Text
                            style={[
                              styles.macroUnit,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {macro.unit}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Additional Info
                <Text
                  style={[
                    styles.optionalBadge,
                    { color: colors.textSecondary },
                  ]}
                >
                  {" "}
                  (optional)
                </Text>
              </Text>

              <View style={styles.microGrid}>
                {MICRO_FIELDS.map((micro) => (
                  <View
                    key={micro.key}
                    style={[
                      styles.microInputWrapper,
                      {
                        backgroundColor: colors.card,
                        borderColor:
                          focusedField === micro.key
                            ? colors.text
                            : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.microLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t(micro.label)}
                    </Text>
                    <View style={styles.microInputRow}>
                      <TextInput
                        style={[styles.microInput, { color: colors.text }]}
                        value={mealData[micro.key as keyof typeof mealData]}
                        onChangeText={(text) => updateField(micro.key, text)}
                        onFocus={() => setFocusedField(micro.key)}
                        onBlur={() => setFocusedField(null)}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        placeholderTextColor={colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.microUnit,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {micro.unit}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("history.ingredients")}
              </Text>

              <View
                style={[
                  styles.textAreaWrapper,
                  {
                    backgroundColor: colors.card,
                    borderColor:
                      focusedField === "ingredients"
                        ? colors.text
                        : colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.textArea, { color: colors.text }]}
                  value={mealData.ingredients}
                  onChangeText={(text) => updateField("ingredients", text)}
                  onFocus={() => setFocusedField("ingredients")}
                  onBlur={() => setFocusedField(null)}
                  placeholder={t("history.manualMeal.placeholders.ingredients")}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
              <View style={styles.helperContainer}>
                <Info size={12} color={colors.textSecondary} />
                <Text
                  style={[styles.helperText, { color: colors.textSecondary }]}
                >
                  {t("history.manualMeal.helpers.separateWithCommas")}
                </Text>
              </View>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          <View
            style={[styles.modalFooter, { backgroundColor: colors.background }]}
          >
            <TouchableOpacity
              style={[
                styles.cancelButton,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={onClose}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelText, { color: colors.text }]}>
                {t("common.cancel")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.text },
                isLoading && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <>
                  <Check
                    size={18}
                    color={colors.background}
                    strokeWidth={2.5}
                  />
                  <Text
                    style={[styles.submitText, { color: colors.background }]}
                  >
                    {t("common.save")}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    height: "92%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerContent: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  optionalBadge: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "none",
  },
  imagePlaceholder: {
    height: 180,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  imagePlaceholderContent: {
    alignItems: "center",
    gap: 8,
  },
  imagePlaceholderText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  imagePlaceholderHint: {
    fontSize: 12,
    fontWeight: "400",
  },
  imagePreviewContainer: {
    position: "relative",
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  removeImageButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  required: {
    color: "#EF4444",
    fontWeight: "700",
  },
  inputWrapper: {
    borderWidth: 1,
    borderRadius: 12,
  },
  input: {
    padding: 14,
    fontSize: 15,
    fontWeight: "500",
  },
  periodContainer: {
    paddingVertical: 2,
    gap: 8,
  },
  periodChipWrapper: {
    marginRight: 0,
  },
  periodChipGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  periodChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  periodEmoji: {
    fontSize: 16,
  },
  periodEmojiUnselected: {
    fontSize: 16,
    opacity: 0.6,
  },
  periodText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0,
  },
  periodTextSelected: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0,
    color: "#FFFFFF",
  },
  caloriesInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  caloriesInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  caloriesUnit: {
    fontSize: 14,
    fontWeight: "500",
  },
  macroGrid: {
    gap: 10,
  },
  macroCard: {
    marginBottom: 0,
  },
  macroInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  macroInputContainer: {
    flex: 1,
  },
  macroLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  macroInputRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  macroInput: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    letterSpacing: -0.3,
  },
  macroUnit: {
    fontSize: 13,
    fontWeight: "500",
  },
  microGrid: {
    gap: 10,
  },
  microInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  microLabel: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    minWidth: 60,
  },
  microInputRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    flex: 1,
  },
  microInput: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    letterSpacing: -0.3,
  },
  microUnit: {
    fontSize: 12,
    fontWeight: "500",
  },
  textAreaWrapper: {
    borderWidth: 1,
    borderRadius: 12,
  },
  textArea: {
    padding: 14,
    fontSize: 14,
    fontWeight: "500",
    minHeight: 90,
    lineHeight: 20,
  },
  helperContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 2,
  },
  helperText: {
    fontSize: 11,
    fontWeight: "400",
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    paddingTop: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.05)",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  submitButton: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
