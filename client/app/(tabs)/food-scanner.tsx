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
import { LinearGradient } from "expo-linear-gradient";
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
    null
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

  // Animation values
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const scanLineAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  const texts = {
    title: t("food_scanner.title") || "Food Scanner",
    subtitle: t("food_scanner.subtitle") || "Scan and analyze your food",
    scanBarcode: t("food_scanner.scan_food") || "Scan Barcode",
    scanImage: t("food_scanner.take_picture") || "Scan Image",
    enterBarcode: t("food_scanner.enter_barcode") || "Enter barcode",
    scan: t("food_scanner.scan") || "Scan",
    quantity: t("food_scanner.quantity") || "Quantity",
    isBeverage: t("food_scanner.is_beverage") || "Is Beverage",
    addToShoppingList:
      t("food_scanner.add_to_shopping_list") || "Add to Shopping List",
    addToMealHistory:
      t("food_scanner.add_to_meal_history") || "Add to Meal History",
    rescan: t("food_scanner.rescan") || "Scan Again",
    scanning: t("food_scanner.scanning") || "Scanning...",
    analyzing: t("food_scanner.analyzing") || "Analyzing...",
    estimatingPrice:
      t("food_scanner.estimating_price") || "Estimating price...",
    scanSuccess: t("food_scanner.scan_success") || "Scan successful",
    scanError: t("food_scanner.scan_error") || "Scan failed",
    noResults: t("food_scanner.no_results") || "No results found",
    history: t("food_scanner.history") || "History",
    close: t("food_scanner.close") || "Close",
    added: t("food_scanner.added") || "Added",
    g: t("common.grams") || "g",
    ml: t("common.milliliters") || "ml",
    nis: t("common.shekels") || "₪",
    calories: t("common.calories") || "Calories",
    protein: t("common.protein") || "Protein",
    carbs: t("common.carbs") || "Carbs",
    fat: t("common.fat") || "Fat",
    fiber: t("food_scanner.fiber") || "Fiber",
    sugar: t("food_scanner.sugar") || "Sugar",
    sodium: t("food_scanner.sodium") || "Sodium",
    ingredients: t("food_scanner.ingredients") || "Ingredients",
    allergens: t("food_scanner.allergens") || "Allergens",
    healthScore: t("food_scanner.health_score") || "Health Score",
    priceEstimate: t("food_scanner.price_estimate") || "Price Estimate",
    compatibility: t("food_scanner.compatibility") || "Compatibility",
    productPreview: t("food_scanner.product_preview") || "Product Preview",
    detailedAnalysis:
      t("food_scanner.detailed_analysis") || "Detailed Analysis",
    alignFood: "Please align food with the scanner",
    scanningProgress: "Scanning in progress...",
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
      ])
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
      ])
    ).start();
  };

  const getCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === "granted");
    if (status !== "granted") {
      ToastService.error(
        t("common.permission_required") || "Permission Required",
        t("food_scanner.camera_permission_needed") ||
          "Camera permission is needed to scan food"
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

  const estimatePrice = async (
    productData: ProductData
  ): Promise<PriceEstimate | null> => {
    try {
      setLoadingText(texts.estimatingPrice);
      const basePrice = getBasePriceByCategory(productData.category);
      const sizeMultiplier = quantity > 100 ? 1.5 : 1;
      const estimatedPrice = Math.round(basePrice * sizeMultiplier);

      return {
        estimated_price: estimatedPrice,
        price_range: `${estimatedPrice - 2}-${estimatedPrice + 5} ₪`,
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
        texts.scanError,
        isRTL ? "אנא הכנס ברקוד" : "Please enter a barcode"
      );
      return;
    }

    setIsLoading(true);
    setLoadingText(texts.scanning);

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
          response.data.error || texts.noResults,
          "Barcode Search"
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
    setLoadingText(texts.analyzing);
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
          texts.scanError,
          isRTL ? "מוצר לא נמצא במאגר" : "Product not found"
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
          "Permission Required",
          isRTL ? "נדרשת הרשאת מצלמה" : "Camera permission is required"
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
        setLoadingText(texts.analyzing);

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
              texts.scanSuccess,
              isRTL ? "המוצר זוהה בהצלחה" : "Product identified successfully"
            );
          } else {
            ToastService.error(
              texts.scanError,
              isRTL
                ? "לא הצלחנו לזהות את המוצר בתמונה"
                : "Could not identify product in image"
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
        texts.scanError,
        isRTL ? "לא הצלחנו לפתוח את המצלמה" : "Could not open camera"
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
        unit: isBeverage ? "ml" : "g",
        category: scanResult.product.category,
        added_from: "scanner",
        product_barcode: scanResult.product.barcode,
        estimated_price: priceEstimate?.estimated_price,
      });

      if (response.data.success) {
        ToastService.success(
          "Shopping List Updated",
          `${scanResult.product.name} added to shopping list!`
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
      <LoadingScreen
        text={
          t("food_scanner.requesting_camera_permissions") ||
          "Requesting camera permissions..."
        }
      />
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
          {t("food_scanner.camera_permission_required") ||
            "Camera permission is required"}
        </Text>
        <TouchableOpacity
          style={[styles.permissionButton, { backgroundColor: colors.primary }]}
          onPress={getCameraPermissions}
        >
          <Text
            style={[styles.permissionButtonText, { color: colors.onPrimary }]}
          >
            {t("common.grant_permission") || "Grant Permission"}
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
          {/* Icon Container with theme-aware background */}
          <View
            style={[
              styles.headerIconContainer,
              { backgroundColor: colors.glass },
            ]}
          >
            <ScanLine size={28} color={colors.text} strokeWidth={2.5} />
          </View>

          {/* Text Container */}
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t("food_scanner.title")}
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
              {t("food_scanner.subtitle")}
            </Text>
          </View>

          {/* Gallery Button with theme-aware styling */}
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
            <View
              style={[styles.modeSwitcher, { backgroundColor: colors.card }]}
            >
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  scanMode === "image" && { backgroundColor: colors.primary },
                ]}
                onPress={() => setScanMode("image")}
              >
                <CameraIcon
                  size={20}
                  color={
                    scanMode === "image"
                      ? colors.onPrimary
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.modeButtonText,
                    {
                      color:
                        scanMode === "image"
                          ? colors.onPrimary
                          : colors.textSecondary,
                    },
                  ]}
                >
                  {texts.scanImage}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeButton,
                  scanMode === "barcode" && { backgroundColor: colors.primary },
                ]}
                onPress={() => setScanMode("barcode")}
              >
                <QrCode
                  size={20}
                  color={
                    scanMode === "barcode"
                      ? colors.onPrimary
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.modeButtonText,
                    {
                      color:
                        scanMode === "barcode"
                          ? colors.onPrimary
                          : colors.textSecondary,
                    },
                  ]}
                >
                  {texts.scanBarcode}
                </Text>
              </TouchableOpacity>
            </View>
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
              {texts.alignFood}
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
                  placeholder={texts.enterBarcode}
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
                      {texts.scan}
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
              Details
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
                      100
                  )}{" "}
                  Kcal
                </Text>
                <Text
                  style={[styles.productWeight, { color: colors.textTertiary }]}
                >
                  {quantity} grams
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
              <View style={styles.healthIndicator}>
                <View
                  style={[
                    styles.healthDot,
                    { backgroundColor: colors.success },
                  ]}
                />
                <Text style={[styles.healthText, { color: colors.text }]}>
                  Rich in proteins
                </Text>
              </View>
              <View style={styles.healthIndicator}>
                <View
                  style={[
                    styles.healthDot,
                    { backgroundColor: colors.success },
                  ]}
                />
                <Text style={[styles.healthText, { color: colors.text }]}>
                  Rich in Vitamins & Minerals
                </Text>
              </View>
              <View style={styles.healthIndicator}>
                <View
                  style={[
                    styles.healthDot,
                    { backgroundColor: colors.warning },
                  ]}
                />
                <Text style={[styles.healthText, { color: colors.text }]}>
                  Rich in Anti Oxidants
                </Text>
              </View>
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
                Nutrition values
              </Text>
              <View style={styles.nutritionValues}>
                <View style={styles.nutritionRow}>
                  <Text style={[styles.nutritionLabel, { color: colors.text }]}>
                    Protein
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
                        { width: "70%", backgroundColor: colors.success },
                      ]}
                    />
                  </View>
                  <Text style={[styles.nutritionValue, { color: colors.text }]}>
                    {Math.round(
                      (scanResult.product.nutrition_per_100g.fat * quantity) /
                        100
                    )}{" "}
                    gm
                  </Text>
                </View>

                <View style={styles.nutritionRow}>
                  <Text style={[styles.nutritionLabel, { color: colors.text }]}>
                    Fibers
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
                        { width: "30%", backgroundColor: colors.success },
                      ]}
                    />
                  </View>
                  <Text style={[styles.nutritionValue, { color: colors.text }]}>
                    {Math.round(
                      ((scanResult.product.nutrition_per_100g.fiber || 0) *
                        quantity) /
                        100
                    )}{" "}
                    gm
                  </Text>
                </View>

                <View style={styles.nutritionRow}>
                  <Text style={[styles.nutritionLabel, { color: colors.text }]}>
                    Sugar
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
                        { width: "50%", backgroundColor: colors.warning },
                      ]}
                    />
                  </View>
                  <Text style={[styles.nutritionValue, { color: colors.text }]}>
                    {Math.round(
                      ((scanResult.product.nutrition_per_100g.sugar || 0) *
                        quantity) /
                        100
                    )}{" "}
                    gm
                  </Text>
                </View>

                <View style={styles.nutritionRow}>
                  <Text style={[styles.nutritionLabel, { color: colors.text }]}>
                    Vitamins
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
                        { width: "35%", backgroundColor: colors.success },
                      ]}
                    />
                  </View>
                  <Text style={[styles.nutritionValue, { color: colors.text }]}>
                    4 gm
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Ingredients */}
          {scanResult && scanResult.product.ingredients.length > 0 && (
            <View
              style={[
                styles.ingredientsSection,
                { backgroundColor: colors.surface },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Ingredients Identified
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
                          Rich in Proteins
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
                Add to Meal
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
              {texts.history}
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
                  {t("food_scanner.no_scan_history") || "No scan history"}
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
    backgroundColor: "#000",
    elevation: 10,
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
});
