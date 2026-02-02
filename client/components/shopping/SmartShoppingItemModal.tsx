import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import {
  X,
  Search,
  ChevronDown,
  ShoppingCart,
  Flame,
  Dumbbell,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import {
  ingredientAPI,
  IngredientSearchResult,
  UnitOption,
  CalculatedNutrition,
} from "@/src/services/ingredientAPI";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface ShoppingItemData {
  name: string;
  quantity: number;
  unit: string;
  category?: string;
  estimated_cost?: number;
  metadata?: {
    ing_emoji?: string;
    ing_color?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    [key: string]: any;
  };
}

interface SmartShoppingItemModalProps {
  visible: boolean;
  editingItem?: ShoppingItemData | null;
  onClose: () => void;
  onSave: (item: ShoppingItemData) => void;
}

// Emoji mapping for ingredients
const getIngredientEmoji = (name: string): string => {
  const lowerName = name.toLowerCase();
  const emojiMap: { [key: string]: string } = {
    chicken: "🍗",
    beef: "🥩",
    fish: "🐟",
    salmon: "🍣",
    egg: "🥚",
    turkey: "🦃",
    milk: "🥛",
    cheese: "🧀",
    yogurt: "🥛",
    butter: "🧈",
    cream: "🥛",
    bread: "🍞",
    rice: "🍚",
    pasta: "🍝",
    oats: "🌾",
    flour: "🌾",
    apple: "🍎",
    banana: "🍌",
    orange: "🍊",
    tomato: "🍅",
    lemon: "🍋",
    carrot: "🥕",
    broccoli: "🥦",
    lettuce: "🥬",
    onion: "🧅",
    spinach: "🥬",
    potato: "🥔",
    garlic: "🧄",
    pepper: "🌶️",
    cucumber: "🥒",
    avocado: "🥑",
    salt: "🧂",
    sugar: "🍬",
    honey: "🍯",
    oil: "🫒",
    olive: "🫒",
    coffee: "☕",
    tea: "🍵",
    juice: "🧃",
    water: "💧",
    chocolate: "🍫",
    nuts: "🥜",
    peanut: "🥜",
    almond: "🥜",
  };

  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (lowerName.includes(key)) return emoji;
  }
  return "🛒";
};

// Color for ingredient background
const getIngredientColor = (name: string): string => {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export function SmartShoppingItemModal({
  visible,
  editingItem,
  onClose,
  onSave,
}: SmartShoppingItemModalProps) {
  const { t } = useTranslation();
  const { isRTL, currentLanguage } = useLanguage();
  const { colors, isDark } = useTheme();
  const language = currentLanguage === "he" ? "he" : "en";

  // State
  const [inputText, setInputText] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [selectedUnit, setSelectedUnit] = useState<UnitOption | null>(null);
  const [searchResults, setSearchResults] = useState<IngredientSearchResult[]>(
    [],
  );
  const [calculatedNutrition, setCalculatedNutrition] =
    useState<CalculatedNutrition | null>(null);

  // Loading states
  const [isSearching, setIsSearching] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  // Options
  const [units, setUnits] = useState<UnitOption[]>([]);

  // Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const calculateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectedIngredientKeyRef = useRef<string | null>(null);

  // Load options on mount
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const unitsData = await ingredientAPI.getUnits();
        setUnits(unitsData);

        // Set default unit
        const defaultUnit =
          unitsData.find((u) => u.key === "g") || unitsData[0];
        if (defaultUnit) {
          setSelectedUnit(defaultUnit);
        }
      } catch (error) {
        console.error("Failed to load units:", error);
        // Fallback units
        setUnits([
          {
            key: "g",
            name_en: "grams",
            name_he: "גרם",
            grams: 0,
          },
          {
            key: "kg",
            name_en: "kilograms",
            name_he: "ק״ג",
            grams: 0,
          },
          {
            key: "pieces",
            name_en: "pieces",
            name_he: "יחידות",
            grams: 0,
          },
          {
            key: "cups",
            name_en: "cups",
            name_he: "כוסות",
            grams: 0,
          },
        ]);
      }
    };
    loadOptions();
  }, []);

  // Initialize when editing or opening
  useEffect(() => {
    if (visible) {
      if (editingItem) {
        setInputText(editingItem.name);
        setQuantity(String(editingItem.quantity || 1));
        // Find matching unit
        const matchedUnit = units.find(
          (u) =>
            u.key === editingItem.unit ||
            u.name_en.toLowerCase() === editingItem.unit.toLowerCase(),
        );
        if (matchedUnit) {
          setSelectedUnit(matchedUnit);
        }
        // Set existing nutrition if available
        if (editingItem.metadata?.calories) {
          setCalculatedNutrition({
            calories: editingItem.metadata.calories,
            protein_g: editingItem.metadata.protein || 0,
            carbs_g: editingItem.metadata.carbs || 0,
            fats_g: editingItem.metadata.fat || 0,
            fiber_g: 0,
            sugar_g: 0,
            sodium_mg: 0,
            quantity_g: editingItem.quantity || 100,
            preparation_method: null,
            is_estimated: true,
          });
        }
      } else {
        // Reset for new item
        setInputText("");
        setQuantity("1");
        setSearchResults([]);
        setCalculatedNutrition(null);
        selectedIngredientKeyRef.current = null;
        // Reset to default unit
        const defaultUnit = units.find((u) => u.key === "pieces") || units[0];
        if (defaultUnit) {
          setSelectedUnit(defaultUnit);
        }
      }
    }
  }, [visible, editingItem, units]);

  // Search as user types
  const handleInputChange = useCallback(
    (text: string) => {
      setInputText(text);
      setShowSuggestions(true);
      selectedIngredientKeyRef.current = null;

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (text.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await ingredientAPI.search(text, language, 6);
          setSearchResults(results);
        } catch (error) {
          console.error("Search error:", error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    },
    [language],
  );

  // Select a search suggestion
  const handleSelectSuggestion = useCallback(
    async (result: IngredientSearchResult) => {
      const displayName = language === "he" ? result.name_he : result.name_en;
      setInputText(displayName);
      setShowSuggestions(false);
      selectedIngredientKeyRef.current = result.key;

      // Calculate nutrition
      await recalculateNutrition(result.key, parseFloat(quantity) || 1);
    },
    [language, quantity],
  );

  // Recalculate nutrition
  const recalculateNutrition = useCallback(
    async (ingredientKey: string | null, qty: number) => {
      if (!ingredientKey) return;

      setIsCalculating(true);
      try {
        const result = await ingredientAPI.calculate({
          ingredient_key: ingredientKey,
          quantity: qty,
          unit: selectedUnit?.key || "g",
          preparation_method: null,
        });
        setCalculatedNutrition(result.nutrition);
      } catch (error) {
        console.error("Calculate error:", error);
      } finally {
        setIsCalculating(false);
      }
    },
    [selectedUnit],
  );

  // Recalculate when quantity or unit changes
  useEffect(() => {
    if (calculateTimeoutRef.current) {
      clearTimeout(calculateTimeoutRef.current);
    }

    if (selectedIngredientKeyRef.current) {
      calculateTimeoutRef.current = setTimeout(() => {
        recalculateNutrition(
          selectedIngredientKeyRef.current,
          parseFloat(quantity) || 1,
        );
      }, 400);
    }
  }, [quantity, selectedUnit, recalculateNutrition]);

  // Handle save
  const handleSave = useCallback(() => {
    if (!inputText.trim()) return;

    const itemData: ShoppingItemData = {
      name: inputText.trim(),
      quantity: parseFloat(quantity) || 1,
      unit: selectedUnit?.name_en || "pieces",
      category: "Manual",
      metadata: {
        ing_emoji: getIngredientEmoji(inputText),
        ing_color: getIngredientColor(inputText),
        ...(calculatedNutrition && {
          calories: Math.round(calculatedNutrition.calories),
          protein: Math.round(calculatedNutrition.protein_g * 10) / 10,
          carbs: Math.round(calculatedNutrition.carbs_g * 10) / 10,
          fat: Math.round(calculatedNutrition.fats_g * 10) / 10,
        }),
      },
    };

    onSave(itemData);
    onClose();
  }, [inputText, quantity, selectedUnit, calculatedNutrition, onSave, onClose]);

  // Render unit picker modal
  const renderUnitPicker = () => (
    <Modal
      visible={showUnitPicker}
      transparent
      animationType="fade"
      onRequestClose={() => setShowUnitPicker(false)}
    >
      <TouchableOpacity
        style={styles.pickerOverlay}
        activeOpacity={1}
        onPress={() => setShowUnitPicker(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.pickerContainer, { backgroundColor: colors.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={[styles.pickerHeader, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.pickerTitle, { color: colors.text }]}>
              {t("smartIngredient.selectUnit") || "Select Unit"}
            </Text>
          </View>
          <ScrollView
            style={styles.pickerScrollView}
            contentContainerStyle={styles.pickerScrollContent}
            showsVerticalScrollIndicator={true}
          >
            {units.map((unit) => (
              <TouchableOpacity
                key={unit.key}
                style={[
                  styles.pickerOption,
                  { backgroundColor: colors.surface },
                  selectedUnit?.key === unit.key && {
                    backgroundColor: colors.primary + "20",
                    borderColor: colors.primary,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => {
                  setSelectedUnit(unit);
                  setShowUnitPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    { color: colors.text },
                    selectedUnit?.key === unit.key && {
                      color: colors.primary,
                      fontWeight: "700",
                    },
                  ]}
                >
                  {language === "he" ? unit.name_he : unit.name_en}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  // Render nutrition preview
  const renderNutritionPreview = () => {
    if (!calculatedNutrition && !isCalculating) return null;

    return (
      <View
        style={[
          styles.nutritionPreview,
          { backgroundColor: colors.primary + "10" },
        ]}
      >
        <Text style={[styles.nutritionTitle, { color: colors.primary }]}>
          {t("smartIngredient.nutritionPreview") || "Nutrition Preview"}
        </Text>
        {isCalculating ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : calculatedNutrition ? (
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <View style={styles.nutritionIconRow}>
                <Flame size={14} color={colors.warning} />
                <Text style={[styles.nutritionValue, { color: colors.text }]}>
                  {Math.round(calculatedNutrition.calories)}
                </Text>
              </View>
              <Text
                style={[styles.nutritionLabel, { color: colors.textSecondary }]}
              >
                {t("home.nutrition.calories") || "Calories"}
              </Text>
            </View>
            <View style={styles.nutritionItem}>
              <View style={styles.nutritionIconRow}>
                <Dumbbell size={14} color={colors.primary} />
                <Text style={[styles.nutritionValue, { color: colors.text }]}>
                  {calculatedNutrition.protein_g.toFixed(1)}g
                </Text>
              </View>
              <Text
                style={[styles.nutritionLabel, { color: colors.textSecondary }]}
              >
                {t("home.nutrition.protein") || "Protein"}
              </Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={[styles.nutritionValue, { color: colors.text }]}>
                {calculatedNutrition.carbs_g.toFixed(1)}g
              </Text>
              <Text
                style={[styles.nutritionLabel, { color: colors.textSecondary }]}
              >
                {t("home.nutrition.carbs") || "Carbs"}
              </Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={[styles.nutritionValue, { color: colors.text }]}>
                {calculatedNutrition.fats_g.toFixed(1)}g
              </Text>
              <Text
                style={[styles.nutritionLabel, { color: colors.textSecondary }]}
              >
                {t("home.nutrition.fat") || "Fat"}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View
            style={[styles.modalHeader, { borderBottomColor: colors.border }]}
          >
            <View style={styles.headerLeft}>
              <ShoppingCart
                size={24}
                color={colors.primary}
                style={{ marginRight: 10 }}
              />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingItem
                  ? t("shopping.edit_item") || "Edit Item"
                  : t("shopping.add_item") || "Add Item"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Input with search */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {t("shopping.item_name") || "Item Name"} *
              </Text>
              <View
                style={[
                  styles.searchInputContainer,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Search
                  size={20}
                  color={colors.textSecondary}
                  style={styles.searchIcon}
                />
                <TextInput
                  style={[
                    styles.searchInput,
                    { color: colors.text },
                    isRTL && styles.rtlInput,
                  ]}
                  value={inputText}
                  onChangeText={handleInputChange}
                  placeholder={
                    t("shopping.search_placeholder") ||
                    "Search or type item name..."
                  }
                  placeholderTextColor={colors.textSecondary}
                  textAlign={isRTL ? "right" : "left"}
                  onBlur={() =>
                    setTimeout(() => setShowSuggestions(false), 200)
                  }
                  autoFocus
                />
                {isSearching && (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                    style={styles.loader}
                  />
                )}
              </View>

              {/* Suggestions dropdown */}
              {showSuggestions && searchResults.length > 0 && (
                <View
                  style={[
                    styles.suggestionsContainer,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {searchResults.map((result) => (
                    <TouchableOpacity
                      key={result.key}
                      style={[
                        styles.suggestionItem,
                        { borderBottomColor: colors.border },
                      ]}
                      onPress={() => handleSelectSuggestion(result)}
                    >
                      <Text style={[styles.suggestionEmoji]}>
                        {getIngredientEmoji(result.name_en)}
                      </Text>
                      <View style={styles.suggestionTextContainer}>
                        <Text
                          style={[
                            styles.suggestionText,
                            { color: colors.text },
                          ]}
                        >
                          {language === "he" ? result.name_he : result.name_en}
                        </Text>
                        <Text
                          style={[
                            styles.suggestionSubtext,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {language === "he" ? result.name_en : result.name_he}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Quantity and Unit */}
            <View style={styles.rowContainer}>
              <View style={styles.quantityContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  {t("smartIngredient.quantity") || "Quantity"}
                </Text>
                <TextInput
                  style={[
                    styles.quantityInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.unitContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  {t("smartIngredient.unit") || "Unit"}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setShowUnitPicker(true)}
                >
                  <Text style={[styles.dropdownText, { color: colors.text }]}>
                    {selectedUnit
                      ? language === "he"
                        ? selectedUnit.name_he
                        : selectedUnit.name_en
                      : t("common.select") || "Select"}
                  </Text>
                  <ChevronDown size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Nutrition Preview */}
            {renderNutritionPreview()}
          </ScrollView>

          {/* Actions */}
          <View
            style={[styles.modalActions, { borderTopColor: colors.border }]}
          >
            <TouchableOpacity
              style={[
                styles.cancelButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={onClose}
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  { color: colors.textSecondary },
                ]}
              >
                {t("common.cancel") || "Cancel"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: colors.primary },
                !inputText.trim() && { backgroundColor: colors.textSecondary },
              ]}
              onPress={handleSave}
              disabled={!inputText.trim()}
            >
              <ShoppingCart
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.saveButtonText}>
                {editingItem
                  ? t("common.save") || "Save"
                  : t("common.add") || "Add"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {renderUnitPicker()}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderRadius: 24,
    width: screenWidth - 32,
    maxHeight: screenHeight * 0.85,
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
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxHeight: screenHeight * 0.5,
  },
  inputGroup: {
    marginBottom: 16,
    zIndex: 10,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },
  rtlInput: {
    textAlign: "right",
  },
  loader: {
    marginLeft: 8,
  },
  suggestionsContainer: {
    position: "absolute",
    top: 80,
    left: 0,
    right: 0,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
    maxHeight: 220,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  suggestionEmoji: {
    fontSize: 22,
    marginRight: 12,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionText: {
    fontSize: 15,
    fontWeight: "600",
  },
  suggestionSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  rowContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  quantityContainer: {
    flex: 1,
  },
  quantityInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  unitContainer: {
    flex: 1,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownText: {
    fontSize: 16,
  },
  nutritionPreview: {
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  nutritionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 14,
  },
  nutritionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  nutritionItem: {
    alignItems: "center",
    flex: 1,
  },
  nutritionIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  nutritionLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  // Picker styles
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  pickerContainer: {
    borderRadius: 20,
    width: screenWidth - 64,
    maxHeight: screenHeight * 0.6,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  pickerHeader: {
    padding: 18,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  pickerScrollView: {
    flexGrow: 0,
  },
  pickerScrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  pickerOption: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  pickerOptionText: {
    fontSize: 16,
    textAlign: "center",
    fontWeight: "500",
  },
});
