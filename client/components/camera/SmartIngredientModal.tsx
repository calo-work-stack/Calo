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
  FlatList,
} from "react-native";
import { X, Search, ChevronDown, AlertCircle } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { Ingredient } from "@/src/types/camera";
import {
  ingredientAPI,
  ParsedIngredient,
  IngredientSearchResult,
  UnitOption,
  PreparationOption,
  CalculatedNutrition,
} from "@/src/services/ingredientAPI";

const { width: screenWidth } = Dimensions.get("window");

interface SmartIngredientModalProps {
  visible: boolean;
  ingredient?: Ingredient | null;
  isEditing: boolean;
  onClose: () => void;
  onSave: (ingredient: Ingredient) => void;
}

export function SmartIngredientModal({
  visible,
  ingredient,
  isEditing,
  onClose,
  onSave,
}: SmartIngredientModalProps) {
  const { t } = useTranslation();
  const { isRTL, currentLanguage } = useLanguage();
  const language = currentLanguage === "he" ? "he" : "en";

  // State
  const [inputText, setInputText] = useState("");
  const [quantity, setQuantity] = useState("100");
  const [selectedUnit, setSelectedUnit] = useState<UnitOption | null>(null);
  const [selectedPreparation, setSelectedPreparation] =
    useState<PreparationOption | null>(null);
  const [parsedIngredient, setParsedIngredient] =
    useState<ParsedIngredient | null>(null);
  const [searchResults, setSearchResults] = useState<IngredientSearchResult[]>(
    []
  );
  const [calculatedNutrition, setCalculatedNutrition] =
    useState<CalculatedNutrition | null>(null);

  // Loading states
  const [isParsing, setIsParsing] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [showPrepPicker, setShowPrepPicker] = useState(false);

  // Options
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [preparations, setPreparations] = useState<PreparationOption[]>([]);

  // Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const calculateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load options on mount
  useEffect(() => {
    const loadOptions = async () => {
      const [unitsData, prepsData] = await Promise.all([
        ingredientAPI.getUnits(),
        ingredientAPI.getPreparations(),
      ]);
      setUnits(unitsData);
      setPreparations(prepsData);

      // Set default unit
      const defaultUnit = unitsData.find((u) => u.key === "g");
      if (defaultUnit) {
        setSelectedUnit(defaultUnit);
      }
    };
    loadOptions();
  }, []);

  // Initialize when editing existing ingredient
  useEffect(() => {
    if (visible && ingredient && isEditing) {
      setInputText(ingredient.name);
      setQuantity(String(ingredient.estimated_portion_g || 100));
      // Set nutrition from existing ingredient
      setCalculatedNutrition({
        calories: ingredient.calories,
        protein_g: ingredient.protein_g || ingredient.protein || 0,
        carbs_g: ingredient.carbs_g || ingredient.carbs || 0,
        fats_g: ingredient.fats_g || ingredient.fat || 0,
        fiber_g: ingredient.fiber_g || ingredient.fiber || 0,
        sugar_g: ingredient.sugar_g || ingredient.sugar || 0,
        sodium_mg: ingredient.sodium_mg || ingredient.sodium || 0,
        quantity_g: ingredient.estimated_portion_g || 100,
        preparation_method: null,
        is_estimated: false,
      });
    } else if (visible && !isEditing) {
      // Reset for new ingredient
      setInputText("");
      setQuantity("100");
      setParsedIngredient(null);
      setSearchResults([]);
      setCalculatedNutrition(null);
      setSelectedPreparation(null);
    }
  }, [visible, ingredient, isEditing]);

  // Search/parse as user types
  const handleInputChange = useCallback(
    (text: string) => {
      setInputText(text);
      setShowSuggestions(true);

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (text.length < 2) {
        setSearchResults([]);
        return;
      }

      // Debounce search
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await ingredientAPI.search(text, language, 5);
          setSearchResults(results);
        } catch (error) {
          console.error("Search error:", error);
        }
      }, 300);
    },
    [language]
  );

  // Parse full input with AI
  const handleParseInput = useCallback(async () => {
    if (!inputText.trim()) return;

    setIsParsing(true);
    try {
      const parsed = await ingredientAPI.parse(inputText, language);
      setParsedIngredient(parsed);

      // Update quantity and unit from parsed result
      if (parsed.quantity) {
        setQuantity(String(parsed.quantity));
      }
      if (parsed.unit) {
        const matchedUnit = units.find(
          (u) =>
            u.key === parsed.unit ||
            u.name_en.toLowerCase() === parsed.unit.toLowerCase() ||
            u.name_he === parsed.unit
        );
        if (matchedUnit) {
          setSelectedUnit(matchedUnit);
        }
      }
      if (parsed.preparation_method) {
        const matchedPrep = preparations.find(
          (p) => p.key === parsed.preparation_method
        );
        if (matchedPrep) {
          setSelectedPreparation(matchedPrep);
        }
      }

      // Set nutrition preview
      if (parsed.nutrition_preview) {
        setCalculatedNutrition(parsed.nutrition_preview);
      }

      setShowSuggestions(false);
    } catch (error) {
      console.error("Parse error:", error);
    } finally {
      setIsParsing(false);
    }
  }, [inputText, language, units, preparations]);

  // Select a search suggestion
  const handleSelectSuggestion = useCallback(
    async (result: IngredientSearchResult) => {
      const displayName = language === "he" ? result.name_he : result.name_en;
      setInputText(displayName);
      setParsedIngredient({
        ingredient_key: result.key,
        ingredient_name_en: result.name_en,
        ingredient_name_he: result.name_he,
        preparation_method: null,
        quantity: parseFloat(quantity) || 100,
        unit: selectedUnit?.key || "g",
        is_estimated: false,
      });
      setShowSuggestions(false);

      // Calculate nutrition
      await recalculateNutrition(
        result.key,
        parseFloat(quantity) || 100,
        selectedUnit?.key || "g",
        selectedPreparation?.key || null
      );
    },
    [language, quantity, selectedUnit, selectedPreparation]
  );

  // Recalculate nutrition when parameters change
  const recalculateNutrition = useCallback(
    async (
      ingredientKey: string | null,
      qty: number,
      unit: string,
      prep: string | null,
      estimatedNutrition?: any
    ) => {
      if (!ingredientKey && !estimatedNutrition) return;

      setIsCalculating(true);
      try {
        const result = await ingredientAPI.calculate({
          ingredient_key: ingredientKey,
          quantity: qty,
          unit,
          preparation_method: prep,
          estimated_nutrition: estimatedNutrition,
        });
        setCalculatedNutrition(result.nutrition);
      } catch (error) {
        console.error("Calculate error:", error);
      } finally {
        setIsCalculating(false);
      }
    },
    []
  );

  // Recalculate when quantity, unit, or preparation changes
  useEffect(() => {
    if (calculateTimeoutRef.current) {
      clearTimeout(calculateTimeoutRef.current);
    }

    if (parsedIngredient?.ingredient_key || parsedIngredient?.estimated_nutrition) {
      calculateTimeoutRef.current = setTimeout(() => {
        recalculateNutrition(
          parsedIngredient.ingredient_key,
          parseFloat(quantity) || 100,
          selectedUnit?.key || "g",
          selectedPreparation?.key || null,
          parsedIngredient.estimated_nutrition
        );
      }, 300);
    }
  }, [quantity, selectedUnit, selectedPreparation, parsedIngredient]);

  // Handle save
  const handleSave = useCallback(() => {
    if (!inputText.trim()) {
      return;
    }

    const nutrition = calculatedNutrition || {
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fats_g: 0,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 0,
      quantity_g: parseFloat(quantity) || 100,
      preparation_method: null,
      is_estimated: true,
    };

    const newIngredient: Ingredient = {
      name: inputText,
      calories: Math.round(nutrition.calories),
      protein: Math.round(nutrition.protein_g * 10) / 10,
      protein_g: Math.round(nutrition.protein_g * 10) / 10,
      carbs: Math.round(nutrition.carbs_g * 10) / 10,
      carbs_g: Math.round(nutrition.carbs_g * 10) / 10,
      fat: Math.round(nutrition.fats_g * 10) / 10,
      fats_g: Math.round(nutrition.fats_g * 10) / 10,
      fiber: Math.round(nutrition.fiber_g * 10) / 10,
      fiber_g: Math.round(nutrition.fiber_g * 10) / 10,
      sugar: Math.round(nutrition.sugar_g * 10) / 10,
      sugar_g: Math.round(nutrition.sugar_g * 10) / 10,
      sodium_mg: Math.round(nutrition.sodium_mg),
      estimated_portion_g: nutrition.quantity_g,
    };

    onSave(newIngredient);
    onClose();
  }, [inputText, calculatedNutrition, quantity, onSave, onClose]);

  // Render unit picker
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
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerTitle}>{t("smartIngredient.selectUnit")}</Text>
          {units.map((unit) => (
            <TouchableOpacity
              key={unit.key}
              style={[
                styles.pickerOption,
                selectedUnit?.key === unit.key && styles.pickerOptionSelected,
              ]}
              onPress={() => {
                setSelectedUnit(unit);
                setShowUnitPicker(false);
              }}
            >
              <Text
                style={[
                  styles.pickerOptionText,
                  selectedUnit?.key === unit.key &&
                    styles.pickerOptionTextSelected,
                ]}
              >
                {language === "he" ? unit.name_he : unit.name_en}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Render preparation picker
  const renderPrepPicker = () => (
    <Modal
      visible={showPrepPicker}
      transparent
      animationType="fade"
      onRequestClose={() => setShowPrepPicker(false)}
    >
      <TouchableOpacity
        style={styles.pickerOverlay}
        activeOpacity={1}
        onPress={() => setShowPrepPicker(false)}
      >
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerTitle}>
            {t("smartIngredient.selectPreparation")}
          </Text>
          <TouchableOpacity
            style={[
              styles.pickerOption,
              !selectedPreparation && styles.pickerOptionSelected,
            ]}
            onPress={() => {
              setSelectedPreparation(null);
              setShowPrepPicker(false);
            }}
          >
            <Text
              style={[
                styles.pickerOptionText,
                !selectedPreparation && styles.pickerOptionTextSelected,
              ]}
            >
              {t("smartIngredient.none")}
            </Text>
          </TouchableOpacity>
          {preparations.map((prep) => (
            <TouchableOpacity
              key={prep.key}
              style={[
                styles.pickerOption,
                selectedPreparation?.key === prep.key &&
                  styles.pickerOptionSelected,
              ]}
              onPress={() => {
                setSelectedPreparation(prep);
                setShowPrepPicker(false);
              }}
            >
              <Text
                style={[
                  styles.pickerOptionText,
                  selectedPreparation?.key === prep.key &&
                    styles.pickerOptionTextSelected,
                ]}
              >
                {language === "he" ? prep.name_he : prep.name_en}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Render nutrition preview
  const renderNutritionPreview = () => {
    if (!calculatedNutrition && !isCalculating) return null;

    return (
      <View style={styles.nutritionPreview}>
        <Text style={styles.nutritionTitle}>
          {t("smartIngredient.nutritionPreview")}
        </Text>
        {isCalculating ? (
          <ActivityIndicator size="small" color="#10B981" />
        ) : calculatedNutrition ? (
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>
                {Math.round(calculatedNutrition.calories)}
              </Text>
              <Text style={styles.nutritionLabel}>{t("home.nutrition.calories")}</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>
                {calculatedNutrition.protein_g.toFixed(1)}g
              </Text>
              <Text style={styles.nutritionLabel}>{t("home.nutrition.protein")}</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>
                {calculatedNutrition.carbs_g.toFixed(1)}g
              </Text>
              <Text style={styles.nutritionLabel}>{t("home.nutrition.carbs")}</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>
                {calculatedNutrition.fats_g.toFixed(1)}g
              </Text>
              <Text style={styles.nutritionLabel}>{t("home.nutrition.fat")}</Text>
            </View>
          </View>
        ) : null}
        {calculatedNutrition?.is_estimated && (
          <View style={styles.estimatedBadge}>
            <AlertCircle size={14} color="#F59E0B" />
            <Text style={styles.estimatedText}>
              {t("smartIngredient.estimated")}
            </Text>
          </View>
        )}
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
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isEditing
                ? t("smartIngredient.editIngredient")
                : t("smartIngredient.addIngredient")}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Input with search */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t("smartIngredient.ingredientName")} *
              </Text>
              <View style={styles.searchInputContainer}>
                <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                  style={[styles.searchInput, isRTL && styles.rtlInput]}
                  value={inputText}
                  onChangeText={handleInputChange}
                  placeholder={t("smartIngredient.inputPlaceholder")}
                  placeholderTextColor="#9CA3AF"
                  textAlign={isRTL ? "right" : "left"}
                  onBlur={() => {
                    // Delay hiding suggestions to allow tap
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  onSubmitEditing={handleParseInput}
                />
                {isParsing && (
                  <ActivityIndicator
                    size="small"
                    color="#10B981"
                    style={styles.parseLoader}
                  />
                )}
              </View>

              {/* Suggestions dropdown */}
              {showSuggestions && searchResults.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {searchResults.map((result) => (
                    <TouchableOpacity
                      key={result.key}
                      style={styles.suggestionItem}
                      onPress={() => handleSelectSuggestion(result)}
                    >
                      <Text style={styles.suggestionText}>
                        {language === "he" ? result.name_he : result.name_en}
                      </Text>
                      <Text style={styles.suggestionSubtext}>
                        {language === "he" ? result.name_en : result.name_he}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Quantity and Unit */}
            <View style={styles.rowContainer}>
              <View style={styles.quantityContainer}>
                <Text style={styles.inputLabel}>
                  {t("smartIngredient.quantity")}
                </Text>
                <TextInput
                  style={styles.quantityInput}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  placeholder="100"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.unitContainer}>
                <Text style={styles.inputLabel}>
                  {t("smartIngredient.unit")}
                </Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowUnitPicker(true)}
                >
                  <Text style={styles.dropdownText}>
                    {selectedUnit
                      ? language === "he"
                        ? selectedUnit.name_he
                        : selectedUnit.name_en
                      : t("smartIngredient.select")}
                  </Text>
                  <ChevronDown size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Preparation method */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t("smartIngredient.preparation")} ({t("common.optional")})
              </Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowPrepPicker(true)}
              >
                <Text style={styles.dropdownText}>
                  {selectedPreparation
                    ? language === "he"
                      ? selectedPreparation.name_he
                      : selectedPreparation.name_en
                    : t("smartIngredient.none")}
                </Text>
                <ChevronDown size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Nutrition Preview */}
            {renderNutritionPreview()}
          </ScrollView>

          {/* Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveButton,
                !inputText.trim() && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!inputText.trim()}
            >
              <Text style={styles.saveButtonText}>
                {isEditing
                  ? t("common.save")
                  : t("smartIngredient.addIngredient")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {renderUnitPicker()}
        {renderPrepPicker()}
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
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: screenWidth - 32,
    maxHeight: "85%",
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1F2937",
  },
  rtlInput: {
    textAlign: "right",
  },
  parseLoader: {
    marginLeft: 8,
  },
  suggestionsContainer: {
    position: "absolute",
    top: 76,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 100,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  suggestionText: {
    fontSize: 15,
    color: "#1F2937",
    fontWeight: "500",
  },
  suggestionSubtext: {
    fontSize: 13,
    color: "#6B7280",
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
    borderColor: "#D1D5DB",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1F2937",
  },
  unitContainer: {
    flex: 1,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownText: {
    fontSize: 16,
    color: "#1F2937",
  },
  nutritionPreview: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  nutritionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#166534",
    marginBottom: 12,
  },
  nutritionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  nutritionItem: {
    alignItems: "center",
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#166534",
  },
  nutritionLabel: {
    fontSize: 12,
    color: "#15803D",
    marginTop: 2,
  },
  estimatedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    gap: 4,
  },
  estimatedText: {
    fontSize: 12,
    color: "#F59E0B",
    fontWeight: "500",
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6B7280",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#9CA3AF",
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
  },
  pickerContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: screenWidth - 64,
    maxHeight: "60%",
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
    textAlign: "center",
  },
  pickerOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  pickerOptionSelected: {
    backgroundColor: "#DCFCE7",
  },
  pickerOptionText: {
    fontSize: 16,
    color: "#374151",
    textAlign: "center",
  },
  pickerOptionTextSelected: {
    color: "#166534",
    fontWeight: "600",
  },
});
