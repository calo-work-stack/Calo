import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Modal,
  Dimensions,
  Animated,
  Platform,
  Image,
  Switch,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Camera, CameraType, CameraView } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import {
  QrCode,
  Camera as CameraIcon,
  Plus,
  X,
  BarChart3,
  History,
  ShoppingCart,
  Package,
  ArrowLeft,
  ScanLine,
  Search,
  Flame,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { api } from "@/src/services/api";
import { Ionicons } from "@expo/vector-icons";
import LoadingScreen from "@/components/LoadingScreen";
import ElementLoader from "@/components/ElementLoader";
import ButtonLoader from "@/components/ButtonLoader";
import { ToastService } from "@/src/services/totastService";
import { useTheme } from "@/src/context/ThemeContext";
import ScannedProducts from "@/components/ScannedProducts";
import { PriceEstimate, ProductData, ScanResult } from "@/src/types/statistics";

const { width, height } = Dimensions.get("window");

export default function FoodScannerScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { theme, colors, isDark } = useTheme();
  const isRTL = language === "he";

  // Camera and scanning states
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<"barcode" | "image">("barcode");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");

  // Product and analysis states
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(
    null,
  );
  const [showResults, setShowResults] = useState(false);

  // Input states
  const [barcodeInput, setBarcodeInput] = useState("");
  const [quantity, setQuantity] = useState(100);
  const [isBeverage, setIsBeverage] = useState(false);

  // UI states
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showProductsGallery, setShowProductsGallery] = useState(false);

  // Meal type state for mandatory/snack selection
  const [isMandatoryMeal, setIsMandatoryMeal] = useState(false); // false = snack, true = mandatory meal

  // Manual product search states
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Animation values
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const scanLineAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  // Add this helper function before the component
  const analyzeNutrition = (nutrition: any) => {
    const protein = nutrition.protein || 0;
    const fiber = nutrition.fiber || 0;
    const sugar = nutrition.sugar || 0;
    const sodium = nutrition.sodium || 0;
    const vitaminC = nutrition.vitamin_c || 0;
    const vitaminD = nutrition.vitamin_d || 0;
    const calcium = nutrition.calcium || 0;
    const iron = nutrition.iron || 0;

    const indicators = [];

    // High Protein: >= 10g per 100g
    if (protein >= 10) {
      indicators.push({
        type: "protein",
        color: "success",
        label: "richInProteins",
      });
    }

    // High Fiber: >= 5g per 100g
    if (fiber >= 5) {
      indicators.push({
        type: "fiber",
        color: "success",
        label: "richInFiber",
      });
    }

    // Rich in Vitamins/Minerals: Has significant amounts
    const hasVitamins =
      vitaminC > 0 || vitaminD > 0 || calcium > 100 || iron > 2;
    if (hasVitamins) {
      indicators.push({
        type: "vitamins",
        color: "success",
        label: "richInVitaminsMinerals",
      });
    }

    // Antioxidants: High vitamin C or presence of certain nutrients
    if (vitaminC >= 10 || fiber >= 3) {
      indicators.push({
        type: "antioxidants",
        color: "success",
        label: "richInAntiOxidants",
      });
    }

    // Warnings
    // High Sugar: >= 15g per 100g
    if (sugar >= 15) {
      indicators.push({
        type: "sugar",
        color: "warning",
        label: "highInSugar",
      });
    }

    // High Sodium: >= 500mg per 100g
    if (sodium >= 500) {
      indicators.push({
        type: "sodium",
        color: "warning",
        label: "highInSodium",
      });
    }

    return indicators;
  };

  useEffect(() => {
    getCameraPermissions();
    loadScanHistory();

    // Animate screen entrance
    Animated.parallel([
      Animated.timing(slideAnimation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Start scanning animation
    startScanAnimation();
  }, []);

  const startScanAnimation = () => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Scan line animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnimation, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const getCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === "granted");
    if (status !== "granted") {
      ToastService.error(
        t("common.permissionRequired"),
        t("foodScanner.cameraPermissionNeeded"),
      );
    }
  };

  const loadScanHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await api.get("/food-scanner/history");
      if (response.data.success) {
        setScanHistory(response.data.data);
      }
    } catch (error) {
      console.error("Error loading scan history:", error);
      ToastService.handleError(error, "Load Scan History");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const saveProductToHistory = async (product: ProductData) => {
    try {
      console.log("💾 Attempting to save product:", product.name);

      const response = await api.post("/food-scanner/search/save", {
        product: product,
      });

      console.log("📡 Save response:", response.data);

      if (response.data.success) {
        console.log("✅ Product saved to scan history!");
        await loadScanHistory();
        ToastService.success(
          t("foodScanner.productSaved"),
          `${product.name} ${t("foodScanner.addedToHistory")}`,
        );
      } else {
        console.error("❌ Failed to save:", response.data);
      }
    } catch (error) {
      console.error("❌ Error saving product to history:", error);
      ToastService.handleError(error, "Save Product to History");
    }
  };

  const estimatePrice = async (
    productData: ProductData,
  ): Promise<PriceEstimate | null> => {
    try {
      setLoadingText(t("foodScanner.estimatingPrice"));
      const basePrice = getBasePriceByCategory(productData.category);
      const sizeMultiplier = quantity > 100 ? 1.5 : 1;
      const estimatedPrice = Math.round(basePrice * sizeMultiplier);

      return {
        estimated_price: estimatedPrice,
        price_range: `${estimatedPrice - 2}-${estimatedPrice + 5} ${t(
          "common.shekels",
        )}`,
        currency: "ILS",
        confidence: "medium",
        market_context: "Estimated based on category and size",
      };
    } catch (error) {
      console.error("Price estimation error:", error);
      ToastService.handleError(error, "Price Estimation");
    }
    return null;
  };

  const getBasePriceByCategory = (category: string): number => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes("dairy") || lowerCategory.includes("milk"))
      return 8;
    if (lowerCategory.includes("meat") || lowerCategory.includes("protein"))
      return 25;
    if (lowerCategory.includes("vegetable") || lowerCategory.includes("fruit"))
      return 6;
    if (lowerCategory.includes("snack") || lowerCategory.includes("candy"))
      return 5;
    if (lowerCategory.includes("beverage") || lowerCategory.includes("drink"))
      return 4;
    if (lowerCategory.includes("bread") || lowerCategory.includes("bakery"))
      return 7;
    return 10;
  };

  const handleBarcodeSearch = async () => {
    if (!barcodeInput.trim()) {
      ToastService.error(
        t("foodScanner.scanError"),
        t("foodScanner.pleaseEnterBarcode"),
      );
      return;
    }

    setIsLoading(true);
    setLoadingText(t("foodScanner.scanning"));

    try {
      const response = await api.post("/food-scanner/barcode", {
        barcode: barcodeInput.trim(),
      });

      if (response.data.success) {
        setScanResult(response.data.data);
        const price = await estimatePrice(response.data.data.product);
        setPriceEstimate(price);
        animateResultAppearance();
        setShowResults(true);
        await loadScanHistory();
      } else {
        ToastService.handleError(
          response.data.error || t("foodScanner.noResults"),
          "Barcode Search",
        );
      }
    } catch (error) {
      console.error("Barcode scan error:", error);
      ToastService.handleError(error, "Barcode Search");
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
  };

  const handleBarcodeScan = async (scanningResult: any) => {
    if (isLoading) return;

    setIsLoading(true);
    setLoadingText(t("foodScanner.analyzing"));
    setIsScanning(false);

    try {
      const response = await api.post("/food-scanner/barcode", {
        barcode: scanningResult.data,
      });

      if (response.data.success && response.data.data) {
        setScanResult(response.data.data);
        const price = await estimatePrice(response.data.data.product);
        setPriceEstimate(price);
        animateResultAppearance();
        setShowResults(true);
        await loadScanHistory();
      } else {
        ToastService.error(
          t("foodScanner.scanError"),
          t("foodScanner.productNotFound"),
        );
      }
    } catch (error) {
      console.error("Barcode scan error:", error);
      ToastService.handleError(error, "Barcode Scan");
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
  };

  const handleImageScan = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        ToastService.error(
          t("common.permissionRequired"),
          t("foodScanner.cameraPermissionNeeded"),
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setIsLoading(true);
        setLoadingText(t("foodScanner.analyzing"));

        try {
          const response = await api.post("/food-scanner/image", {
            imageBase64: result.assets[0].base64,
          });

          if (response.data.success && response.data.data) {
            setScanResult(response.data.data);
            const price = await estimatePrice(response.data.data.product);
            setPriceEstimate(price);
            animateResultAppearance();
            setShowResults(true);
            await loadScanHistory();
            ToastService.success(
              t("foodScanner.scanSuccess"),
              t("foodScanner.productIdentifiedSuccessfully"),
            );
          } else {
            ToastService.error(
              t("foodScanner.scanError"),
              t("foodScanner.couldNotIdentifyProduct"),
            );
          }
        } catch (error) {
          console.error("Image scan error:", error);
          ToastService.handleError(error, "Image Scan");
        } finally {
          setIsLoading(false);
          setLoadingText("");
        }
      }
    } catch (error) {
      console.error("Camera error:", error);
      ToastService.error(
        t("foodScanner.scanError"),
        t("foodScanner.couldNotOpenCamera"),
      );
    }
  };

  const animateResultAppearance = () => {
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleAddToShoppingList = async () => {
    if (!scanResult) return;

    setIsLoading(true);
    try {
      const response = await api.post("/shopping-lists", {
        name: scanResult.product.name,
        quantity: quantity,
        unit: isBeverage
          ? t("common.milliliters")
          : t("home.nutrition.units.grams"),
        category: scanResult.product.category,
        added_from: "scanner",
        product_barcode: scanResult.product.barcode,
        estimated_price: priceEstimate?.estimated_price,
      });

      if (response.data.success) {
        ToastService.success(
          t("foodScanner.shoppingListUpdated"),
          t("foodScanner.addedToShoppingList", {
            product: scanResult.product.name,
          }),
        );
      } else {
        ToastService.handleError(response.data.error, "Add to Shopping List");
      }
    } catch (error) {
      console.error("Add to shopping list error:", error);
      ToastService.handleError(error, "Add to Shopping List");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToMealHistory = async () => {
    if (!scanResult) return;

    setIsLoading(true);
    try {
      const response = await api.post("/food-scanner/add-to-meal", {
        productData: scanResult.product,
        quantity,
        mealTiming: "SNACK",
      });

      if (response.data.success) {
        ToastService.mealAdded(scanResult.product.name);
      } else {
        ToastService.handleError(response.data.error, "Log Meal");
      }
    } catch (error) {
      console.error("Add to meal history error:", error);
      ToastService.handleError(error, "Log Meal");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRescan = () => {
    setScanResult(null);
    setPriceEstimate(null);
    setShowResults(false);
    setBarcodeInput("");
    setQuantity(100);
    setIsBeverage(false);
  };

  // Manual product search handler
  const handleProductSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      ToastService.error(
        t("foodScanner.searchError"),
        t("foodScanner.searchQueryTooShort"),
      );
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.get("/food-scanner/search", {
        params: { q: searchQuery.trim() },
      });

      if (response.data.success && response.data.data) {
        setSearchResults(response.data.data);
        if (response.data.data.length === 0) {
          ToastService.info(
            t("foodScanner.noResults"),
            t("foodScanner.tryDifferentSearch"),
          );
        }
      }
    } catch (error) {
      console.error("Product search error:", error);
      ToastService.handleError(error, "Product Search");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = async (product: any) => {
    setIsLoading(true);
    setLoadingText(t("foodScanner.loadingProduct"));
    try {
      console.log("🔍 Selected product:", product); // Debug log

      // Save the selected product to scan history
      await saveProductToHistory(product);

      // Create a scan result from the search result
      const scanData = {
        product: {
          ...product,
          nutrition_per_100g: product.nutrition_per_100g || {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          },
        },
        user_analysis: {
          compatibility_score: 70,
          daily_contribution: {
            calories_percent: 0,
            protein_percent: 0,
            carbs_percent: 0,
            fat_percent: 0,
          },
          alerts: [],
          recommendations: [],
          health_assessment: t("foodScanner.productSelected"),
        },
      };

      setScanResult(scanData);
      const price = await estimatePrice(scanData.product);
      setPriceEstimate(price);
      setShowManualSearch(false);
      setSearchQuery("");
      setSearchResults([]);
      animateResultAppearance();
      setShowResults(true);
    } catch (error) {
      console.error("Error selecting product:", error);
      ToastService.handleError(error, "Select Product");
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return colors.success;
    if (score >= 60) return colors.warning;
    if (score >= 40) return colors.error;
    return colors.destructive;
  };

  const scanLineTranslateY = scanLineAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  if (hasPermission === null) {
    return (
      <LoadingScreen text={t("foodScanner.requestingCameraPermissions")} />
    );
  }

  if (hasPermission === false) {
    return (
      <View
        style={[
          styles.noPermissionContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <Ionicons name="camera" size={48} color={colors.textSecondary} />
        <Text
          style={[styles.noPermissionText, { color: colors.textSecondary }]}
        >
          {t("foodScanner.cameraPermissionRequired")}
        </Text>
        <TouchableOpacity
          style={[styles.permissionButton, { backgroundColor: colors.primary }]}
          onPress={getCameraPermissions}
        >
          <Text
            style={[styles.permissionButtonText, { color: colors.onPrimary }]}
          >
            {t("common.grantPermission")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.modernHeader}>
        <View style={styles.headerTop}>
          <View
            style={[
              styles.headerIconContainer,
              { backgroundColor: colors.glass },
            ]}
          >
            <ScanLine size={28} color={colors.text} strokeWidth={2.5} />
          </View>

          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t("foodScanner.title")}
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                {
                  color: colors.text,
                  opacity: 0.75,
                },
              ]}
            >
              {t("foodScanner.subtitle")}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.galleryButton,
              { backgroundColor: colors.glass, marginRight: 8 },
            ]}
            onPress={() => setShowManualSearch(true)}
            activeOpacity={0.7}
          >
            <Search size={24} color={colors.text} strokeWidth={2.5} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.galleryButton, { backgroundColor: colors.glass }]}
            onPress={() => setShowProductsGallery(true)}
            activeOpacity={0.7}
          >
            <Package size={24} color={colors.text} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {!showResults ? (
        <>
          {/* Camera Scanner */}
          <View style={styles.scannerContainer}>
            {/* Mode Switcher */}
            <View style={styles.cameraWrapper}>
              {scanMode === "image" ? (
                <TouchableOpacity
                  style={styles.cameraView}
                  onPress={handleImageScan}
                >
                  <View style={styles.cameraOverlay}>
                    <View
                      style={[styles.scanFrame, { borderColor: colors.glass }]}
                    >
                      <View style={styles.cornerTopLeft} />
                      <View style={styles.cornerTopRight} />
                      <View style={styles.cornerBottomLeft} />
                      <View style={styles.cornerBottomRight} />

                      <Animated.View
                        style={[
                          styles.scanLine,
                          {
                            backgroundColor: colors.emerald100,
                            transform: [{ translateY: scanLineTranslateY }],
                          },
                        ]}
                      />
                    </View>

                    <Animated.View
                      style={[
                        styles.scanIcon,
                        {
                          transform: [{ scale: pulseAnimation }],
                        },
                      ]}
                    >
                      <CameraIcon size={40} color={colors.onPrimary} />
                    </Animated.View>
                  </View>
                </TouchableOpacity>
              ) : (
                <CameraView
                  style={styles.cameraView}
                  onBarcodeScanned={handleBarcodeScan}
                  barcodeScannerSettings={{
                    barcodeTypes: [
                      "ean13",
                      "ean8",
                      "upc_a",
                      "code128",
                      "code39",
                    ],
                  }}
                >
                  <View style={styles.cameraOverlay}>
                    <View
                      style={[styles.scanFrame, { borderColor: colors.glass }]}
                    >
                      <View style={styles.cornerTopLeft} />
                      <View style={styles.cornerTopRight} />
                      <View style={styles.cornerBottomLeft} />
                      <View style={styles.cornerBottomRight} />

                      <Animated.View
                        style={[
                          styles.scanLine,
                          {
                            backgroundColor: colors.success,
                            transform: [{ translateY: scanLineTranslateY }],
                          },
                        ]}
                      />
                    </View>

                    <Animated.View
                      style={[
                        styles.scanIcon,
                        {
                          transform: [{ scale: pulseAnimation }],
                        },
                      ]}
                    >
                      <QrCode size={40} color={colors.onPrimary} />
                    </Animated.View>
                  </View>
                </CameraView>
              )}
            </View>

            <Text
              style={[styles.scanInstructions, { color: colors.textSecondary }]}
            >
              {t("foodScanner.alignFood")}
            </Text>
          </View>

          {/* Manual Input */}
          {scanMode === "barcode" && (
            <View style={styles.manualInputContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[
                    styles.barcodeInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder={t("foodScanner.enterBarcode")}
                  placeholderTextColor={colors.textSecondary}
                  value={barcodeInput}
                  onChangeText={setBarcodeInput}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={[
                    styles.scanButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleBarcodeSearch}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.onPrimary} />
                  ) : (
                    <Text
                      style={[
                        styles.scanButtonText,
                        { color: colors.onPrimary },
                      ]}
                    >
                      {t("foodScanner.scan")}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      ) : (
        <ScrollView
          style={[
            styles.resultsContainer,
            { backgroundColor: colors.background },
          ]}
        >
          {/* Header */}
          <View style={styles.resultsHeader}>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: colors.surface }]}
              onPress={handleRescan}
            >
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t("foodScanner.details")}
            </Text>
            <TouchableOpacity
              style={[
                styles.historyButton,
                { backgroundColor: colors.surface },
              ]}
              onPress={() => setShowHistoryModal(true)}
            >
              <History size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Product Card */}
          {scanResult && (
            <View
              style={[styles.productCard, { backgroundColor: colors.surface }]}
            >
              <Image
                source={{
                  uri:
                    scanResult.product.image_url ||
                    "https://via.placeholder.com/120",
                }}
                style={styles.productImage}
              />
              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: colors.text }]}>
                  {scanResult.product.name}
                </Text>
                <Text
                  style={[
                    styles.productCalories,
                    { color: colors.textSecondary },
                  ]}
                >
                  {Math.round(
                    (scanResult.product.nutrition_per_100g.calories *
                      quantity) /
                      100,
                  )}{" "}
                  {t("foodScanner.kcal")}
                </Text>
                <Text
                  style={[styles.productWeight, { color: colors.textTertiary }]}
                >
                  {quantity} {t("foodScanner.")}
                </Text>
              </View>
            </View>
          )}

          {/* Health Indicators */}
          {scanResult && (
            <View
              style={[
                styles.healthIndicators,
                { backgroundColor: colors.surface },
              ]}
            >
              {(() => {
                const nutritionIndicators = analyzeNutrition(
                  scanResult.product.nutrition_per_100g,
                );

                if (nutritionIndicators.length === 0) {
                  return (
                    <View style={styles.healthIndicator}>
                      <View
                        style={[
                          styles.healthDot,
                          { backgroundColor: colors.textTertiary },
                        ]}
                      />
                      <Text style={[styles.healthText, { color: colors.text }]}>
                        {t("foodScanner.standardProduct")}
                      </Text>
                    </View>
                  );
                }

                return nutritionIndicators.map((indicator, index) => (
                  <View key={index} style={styles.healthIndicator}>
                    <View
                      style={[
                        styles.healthDot,
                        {
                          backgroundColor:
                            indicator.color === "success"
                              ? colors.success
                              : colors.warning,
                        },
                      ]}
                    />
                    <Text style={[styles.healthText, { color: colors.text }]}>
                      {t(`foodScanner.${indicator.label}`)}
                    </Text>
                  </View>
                ));
              })()}
            </View>
          )}

          {/* Nutrition Values */}
          {scanResult && (
            <View
              style={[
                styles.nutritionSection,
                { backgroundColor: colors.surface },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("foodScanner.nutritionValues")}
              </Text>
              <View style={styles.nutritionValues}>
                {/* Protein */}
                {(() => {
                  const proteinValue = Math.round(
                    (scanResult.product.nutrition_per_100g.protein * quantity) /
                      100,
                  );
                  const proteinPercent = Math.min(
                    (scanResult.product.nutrition_per_100g.protein / 30) * 100, // 30g is considered high protein
                    100,
                  );
                  const proteinColor =
                    scanResult.product.nutrition_per_100g.protein >= 10
                      ? colors.success
                      : scanResult.product.nutrition_per_100g.protein >= 5
                        ? colors.warning
                        : colors.textTertiary;

                  return (
                    <View style={styles.nutritionRow}>
                      <Text
                        style={[styles.nutritionLabel, { color: colors.text }]}
                      >
                        {t("foodScanner.protein")}
                      </Text>
                      <View
                        style={[
                          styles.nutritionBarContainer,
                          { backgroundColor: colors.border },
                        ]}
                      >
                        <View
                          style={[
                            styles.nutritionBar,
                            {
                              width: `${proteinPercent}%`,
                              backgroundColor: proteinColor,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[styles.nutritionValue, { color: colors.text }]}
                      >
                        {proteinValue} {t("home.nutrition.units.grams")}
                      </Text>
                    </View>
                  );
                })()}

                {/* Carbs */}
                {(() => {
                  const carbsValue = Math.round(
                    (scanResult.product.nutrition_per_100g.carbs * quantity) /
                      100,
                  );
                  const carbsPercent = Math.min(
                    (scanResult.product.nutrition_per_100g.carbs / 50) * 100, // 50g reference
                    100,
                  );
                  const carbsColor =
                    scanResult.product.nutrition_per_100g.carbs >= 30
                      ? colors.warning
                      : colors.primary;

                  return (
                    <View style={styles.nutritionRow}>
                      <Text
                        style={[styles.nutritionLabel, { color: colors.text }]}
                      >
                        {t("foodScanner.carbs")}
                      </Text>
                      <View
                        style={[
                          styles.nutritionBarContainer,
                          { backgroundColor: colors.border },
                        ]}
                      >
                        <View
                          style={[
                            styles.nutritionBar,
                            {
                              width: `${carbsPercent}%`,
                              backgroundColor: carbsColor,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[styles.nutritionValue, { color: colors.text }]}
                      >
                        {carbsValue} {t("home.nutrition.units.grams")}
                      </Text>
                    </View>
                  );
                })()}

                {/* Fat */}
                {(() => {
                  const fatValue = Math.round(
                    (scanResult.product.nutrition_per_100g.fat * quantity) /
                      100,
                  );
                  const fatPercent = Math.min(
                    (scanResult.product.nutrition_per_100g.fat / 30) * 100, // 30g reference
                    100,
                  );
                  const fatColor =
                    scanResult.product.nutrition_per_100g.fat >= 20
                      ? colors.warning
                      : colors.primary;

                  return (
                    <View style={styles.nutritionRow}>
                      <Text
                        style={[styles.nutritionLabel, { color: colors.text }]}
                      >
                        {t("foodScanner.fat")}
                      </Text>
                      <View
                        style={[
                          styles.nutritionBarContainer,
                          { backgroundColor: colors.border },
                        ]}
                      >
                        <View
                          style={[
                            styles.nutritionBar,
                            {
                              width: `${fatPercent}%`,
                              backgroundColor: fatColor,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[styles.nutritionValue, { color: colors.text }]}
                      >
                        {fatValue} {t("home.nutrition.units.grams")}
                      </Text>
                    </View>
                  );
                })()}

                {/* Fiber */}
                {(() => {
                  const fiberValue = Math.round(
                    ((scanResult.product.nutrition_per_100g.fiber || 0) *
                      quantity) /
                      100,
                  );
                  const fiberPercent = Math.min(
                    ((scanResult.product.nutrition_per_100g.fiber || 0) / 10) *
                      100, // 10g is high fiber
                    100,
                  );
                  const fiberColor =
                    (scanResult.product.nutrition_per_100g.fiber || 0) >= 5
                      ? colors.success
                      : (scanResult.product.nutrition_per_100g.fiber || 0) >= 2
                        ? colors.primary
                        : colors.textTertiary;

                  return (
                    <View style={styles.nutritionRow}>
                      <Text
                        style={[styles.nutritionLabel, { color: colors.text }]}
                      >
                        {t("foodScanner.fibers")}
                      </Text>
                      <View
                        style={[
                          styles.nutritionBarContainer,
                          { backgroundColor: colors.border },
                        ]}
                      >
                        <View
                          style={[
                            styles.nutritionBar,
                            {
                              width: `${fiberPercent}%`,
                              backgroundColor: fiberColor,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[styles.nutritionValue, { color: colors.text }]}
                      >
                        {fiberValue} {t("home.nutrition.units.grams")}
                      </Text>
                    </View>
                  );
                })()}

                {/* Sugar */}
                {(() => {
                  const sugarValue = Math.round(
                    ((scanResult.product.nutrition_per_100g.sugar || 0) *
                      quantity) /
                      100,
                  );
                  const sugarPercent = Math.min(
                    ((scanResult.product.nutrition_per_100g.sugar || 0) / 25) *
                      100, // 25g reference (WHO daily limit ~50g)
                    100,
                  );
                  const sugarColor =
                    (scanResult.product.nutrition_per_100g.sugar || 0) >= 15
                      ? colors.error
                      : (scanResult.product.nutrition_per_100g.sugar || 0) >= 10
                        ? colors.warning
                        : colors.success;

                  return (
                    <View style={styles.nutritionRow}>
                      <Text
                        style={[styles.nutritionLabel, { color: colors.text }]}
                      >
                        {t("foodScanner.sugar")}
                      </Text>
                      <View
                        style={[
                          styles.nutritionBarContainer,
                          { backgroundColor: colors.border },
                        ]}
                      >
                        <View
                          style={[
                            styles.nutritionBar,
                            {
                              width: `${sugarPercent}%`,
                              backgroundColor: sugarColor,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[styles.nutritionValue, { color: colors.text }]}
                      >
                        {sugarValue} {t("home.nutrition.units.grams")}
                      </Text>
                    </View>
                  );
                })()}

                {/* Sodium */}
                {(() => {
                  const sodiumValue = Math.round(
                    ((scanResult.product.nutrition_per_100g.sodium || 0) *
                      quantity) /
                      100,
                  );
                  const sodiumPercent = Math.min(
                    ((scanResult.product.nutrition_per_100g.sodium || 0) /
                      1000) *
                      100, // 1000mg reference
                    100,
                  );
                  const sodiumColor =
                    (scanResult.product.nutrition_per_100g.sodium || 0) >= 500
                      ? colors.error
                      : (scanResult.product.nutrition_per_100g.sodium || 0) >=
                          300
                        ? colors.warning
                        : colors.success;

                  return (
                    <View style={styles.nutritionRow}>
                      <Text
                        style={[styles.nutritionLabel, { color: colors.text }]}
                      >
                        {t("foodScanner.sodium")}
                      </Text>
                      <View
                        style={[
                          styles.nutritionBarContainer,
                          { backgroundColor: colors.border },
                        ]}
                      >
                        <View
                          style={[
                            styles.nutritionBar,
                            {
                              width: `${sodiumPercent}%`,
                              backgroundColor: sodiumColor,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[styles.nutritionValue, { color: colors.text }]}
                      >
                        {sodiumValue} mg
                      </Text>
                    </View>
                  );
                })()}
              </View>
            </View>
          )}
          {scanResult && scanResult.product.ingredients.length > 0 && (
            <View
              style={[
                styles.ingredientsSection,
                { backgroundColor: colors.surface },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("foodScanner.ingredientsIdentified")}
              </Text>
              <View style={styles.ingredientsList}>
                {scanResult.product.ingredients
                  .slice(0, 2)
                  .map((ingredient, index) => (
                    <View key={index} style={styles.ingredientItem}>
                      <Image
                        source={{ uri: "https://via.placeholder.com/40" }}
                        style={styles.ingredientImage}
                      />
                      <View style={styles.ingredientInfo}>
                        <Text
                          style={[
                            styles.ingredientName,
                            { color: colors.text },
                          ]}
                        >
                          {ingredient}
                        </Text>
                        <Text
                          style={[
                            styles.ingredientDescription,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {t("foodScanner.richInProteins")}
                        </Text>
                      </View>
                    </View>
                  ))}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={handleAddToMealHistory}
            >
              <Plus size={20} color={colors.onPrimary} />
              <Text style={[styles.addButtonText, { color: colors.onPrimary }]}>
                {t("foodScanner.addToMeal")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shopButton, { backgroundColor: colors.surface }]}
              onPress={handleAddToShoppingList}
            >
              <ShoppingCart size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Bottom Spacing */}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <Modal visible={isLoading} transparent animationType="fade">
          <View style={styles.loadingOverlay}>
            <View
              style={[
                styles.loadingContent,
                { backgroundColor: colors.surface },
              ]}
            >
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.text }]}>
                {loadingText}
              </Text>
            </View>
          </View>
        </Modal>
      )}

      {/* History Modal */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <SafeAreaView
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <View
            style={[styles.modalHeader, { borderBottomColor: colors.border }]}
          >
            <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t("foodScanner.history")}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.historyContent}>
            {isLoadingHistory ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : scanHistory.length > 0 ? (
              scanHistory.map((item, index) => (
                <View
                  key={index}
                  style={[
                    styles.historyItem,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <View style={styles.historyItemContent}>
                    <Text
                      style={[styles.historyItemName, { color: colors.text }]}
                    >
                      {item.product_name || item.name}
                    </Text>
                    <Text
                      style={[
                        styles.historyItemBrand,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {item.brand}
                    </Text>
                    <Text
                      style={[
                        styles.historyItemDate,
                        { color: colors.textTertiary },
                      ]}
                    >
                      {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyHistory}>
                <BarChart3 size={64} color={colors.muted} />
                <Text
                  style={[
                    styles.emptyHistoryText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("foodScanner.noScanHistory")}
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Products Gallery */}
      <ScannedProducts
        visible={showProductsGallery}
        onClose={() => setShowProductsGallery(false)}
      />

      {/* Manual Product Search Modal */}
      <Modal
        visible={showManualSearch}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowManualSearch(false)}
      >
        <SafeAreaView
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <View
            style={[styles.modalHeader, { borderBottomColor: colors.border }]}
          >
            <TouchableOpacity onPress={() => setShowManualSearch(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t("foodScanner.searchProducts")}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <View
              style={[
                styles.searchInputContainer,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Search size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={t("foodScanner.searchPlaceholder")}
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleProductSearch}
                returnKeyType="search"
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.searchButton, { backgroundColor: colors.primary }]}
              onPress={handleProductSearch}
              disabled={isSearching}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Text
                  style={[styles.searchButtonText, { color: colors.onPrimary }]}
                >
                  {t("foodScanner.search")}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Search Results */}
          <ScrollView style={styles.searchResultsContainer}>
            {isSearching ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text
                  style={[styles.loadingText, { color: colors.textSecondary }]}
                >
                  {t("foodScanner.searching")}
                </Text>
              </View>
            ) : searchResults.length > 0 ? (
              searchResults.map((product, index) => (
                <TouchableOpacity
                  key={`${product.barcode || index}`}
                  style={[
                    styles.searchResultItem,
                    { backgroundColor: colors.surface },
                  ]}
                  onPress={() => handleSelectSearchResult(product)}
                  activeOpacity={0.7}
                >
                  {product.image_url ? (
                    <Image
                      source={{ uri: product.image_url }}
                      style={styles.searchResultImage}
                    />
                  ) : (
                    <View
                      style={[
                        styles.searchResultImagePlaceholder,
                        { backgroundColor: colors.border },
                      ]}
                    >
                      <Package size={24} color={colors.textTertiary} />
                    </View>
                  )}
                  <View style={styles.searchResultInfo}>
                    <Text
                      style={[styles.searchResultName, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {product.name}
                    </Text>
                    {product.brand && (
                      <Text
                        style={[
                          styles.searchResultBrand,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {product.brand}
                      </Text>
                    )}
                    <View style={styles.searchResultNutrition}>
                      <View style={styles.nutritionItem}>
                        <Flame size={12} color={colors.warning} />
                        <Text
                          style={[
                            styles.nutritionItemText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {product.nutrition_per_100g?.calories || 0}{" "}
                          {t("foodScanner.kcal")}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <ArrowLeft
                    size={20}
                    color={colors.textTertiary}
                    style={{ transform: [{ rotate: "180deg" }] }}
                  />
                </TouchableOpacity>
              ))
            ) : searchQuery.length > 0 && !isSearching ? (
              <View style={styles.emptySearchResults}>
                <Package size={48} color={colors.muted} />
                <Text
                  style={[
                    styles.emptySearchText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("foodScanner.noResultsFound")}
                </Text>
                <Text
                  style={[
                    styles.emptySearchHint,
                    { color: colors.textTertiary },
                  ]}
                >
                  {t("foodScanner.tryDifferentKeywords")}
                </Text>
              </View>
            ) : (
              <View style={styles.searchHint}>
                <Search size={48} color={colors.muted} />
                <Text
                  style={[
                    styles.searchHintText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("foodScanner.searchHint")}
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* ================= HEADER ================= */
  modernHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  galleryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },

  /* ================= SCANNER ================= */
  scannerContainer: {
    flex: 1,
    paddingTop: 24,
    alignItems: "center",
  },
  cameraWrapper: {
    width: width - 48,
    height: width - 48,
    borderRadius: 28,
    overflow: "hidden",
  },
  cameraView: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  scanFrame: {
    width: 220,
    height: 220,
    borderRadius: 24,
    borderWidth: 1,
  },

  cornerTopLeft: { display: "none" },
  cornerTopRight: { display: "none" },
  cornerBottomLeft: { display: "none" },
  cornerBottomRight: { display: "none" },

  scanLine: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 100,
    height: 2,
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },

  scanIcon: {
    marginTop: 28,
  },

  scanInstructions: {
    marginTop: 20,
    fontSize: 14,
  },

  /* ================= MODE SWITCHER ================= */
  modeSwitcher: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },

  /* ================= INPUT ================= */
  manualInputContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: "row",
    gap: 10,
  },
  barcodeInput: {
    flex: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  scanButton: {
    borderRadius: 14,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  scanButtonText: {
    fontWeight: "700",
    fontSize: 16,
  },

  /* ================= RESULTS ================= */
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  backButton: {
    borderRadius: 12,
    padding: 8,
  },
  historyButton: {
    borderRadius: 12,
    padding: 8,
  },

  /* ================= PRODUCT CARD ================= */
  productCard: {
    margin: 20,
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 4,
  },
  productImage: {
    width: 72,
    height: 72,
    borderRadius: 14,
    marginRight: 14,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: "700",
  },
  productCalories: {
    fontSize: 14,
    marginTop: 4,
  },
  productWeight: {
    fontSize: 13,
  },

  /* ================= NUTRITION ================= */
  nutritionSection: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  nutritionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  nutritionLabel: {
    width: 70,
    fontSize: 13,
  },
  nutritionBarContainer: {
    flex: 1,
    height: 8,
    borderRadius: 8,
    marginHorizontal: 10,
  },
  nutritionBar: {
    height: "100%",
    borderRadius: 8,
  },
  nutritionValue: {
    width: 50,
    textAlign: "right",
    fontWeight: "600",
  },

  /* ================= ACTIONS ================= */
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
  },
  addButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  addButtonText: {
    fontWeight: "700",
    fontSize: 16,
  },
  shopButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },

  /* ================= MODALS ================= */
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    padding: 28,
    borderRadius: 20,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
  },

  /* ================= HISTORY ================= */
  historyItem: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  historyItemName: {
    fontSize: 15,
    fontWeight: "600",
  },
  historyItemBrand: {
    fontSize: 13,
  },
  historyItemDate: {
    fontSize: 12,
  },
  healthIndicators: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  healthIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  healthText: {
    fontSize: 14,
  },
  nutritionValues: {
    gap: 16,
  },
  ingredientsSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  ingredientsList: {
    gap: 12,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  ingredientImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  ingredientDescription: {
    fontSize: 12,
  },
  noPermissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  noPermissionText: {
    fontSize: 16,
    textAlign: "center",
    marginVertical: 20,
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  historyContent: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  historyItemContent: {
    gap: 4,
  },
  emptyHistory: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyHistoryText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: "center",
  },

  /* ================= MANUAL SEARCH ================= */
  searchContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 10,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  searchButton: {
    borderRadius: 14,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  searchButtonText: {
    fontWeight: "700",
    fontSize: 15,
  },
  searchResultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    gap: 12,
  },
  searchResultImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  searchResultImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  searchResultInfo: {
    flex: 1,
    gap: 4,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: "600",
  },
  searchResultBrand: {
    fontSize: 13,
  },
  searchResultNutrition: {
    flexDirection: "row",
    marginTop: 4,
  },
  nutritionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  nutritionItemText: {
    fontSize: 12,
  },
  emptySearchResults: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptySearchText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySearchHint: {
    fontSize: 14,
    textAlign: "center",
  },
  searchHint: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    gap: 16,
  },
  searchHintText: {
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
