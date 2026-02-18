import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Modal,
  Dimensions,
} from "react-native";
import { ToastService } from "@/src/services/totastService";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/store";
import { userAPI } from "@/src/services/api";
import { useTranslation } from "react-i18next";
import {
  CreditCard,
  Lock,
  X,
  Check,
  Star,
  Zap,
  Crown,
  ArrowLeft,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width: screenWidth } = Dimensions.get("window");

type PlanType = "FREE" | "GOLD" | "PREMIUM";

interface PlanConfig {
  id: PlanType;
  translationKey: string;
  price: string;
  color: string;
  gradient: string[];
  icon: React.ComponentType<any>;
  recommended?: boolean;
}

const planConfigs: PlanConfig[] = [
  {
    id: "FREE",
    translationKey: "free",
    price: "Free",
    color: "#4CAF50",
    gradient: ["#4CAF50", "#66BB6A"],
    icon: Check,
  },
  {
    id: "GOLD",
    translationKey: "gold",
    price: "₪99",
    color: "#FF9800",
    gradient: ["#FF9800", "#FFB74D"],
    icon: Crown,
    recommended: true,
  },
  {
    id: "PREMIUM",
    translationKey: "premium",
    price: "₪49",
    color: "#2196F3",
    gradient: ["#2196F3", "#42A5F5"],
    icon: Zap,
  },
];

export default function PaymentPlan() {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
  });
  const [cardType, setCardType] = useState("");
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { mode, currentPlan } = useLocalSearchParams();

  // Check if user has completed questionnaire
  useEffect(() => {
    if (user && !user.is_questionnaire_completed && mode !== "change") {
      ToastService.warning(
        t("payment.completeQuestionnaire"),
        t("payment.completeQuestionnaireMessage")
      );
      router.replace("/questionnaire");
    }
  }, [user, mode, router, t]);

  // Filter plans based on mode
  const availablePlans = useMemo(() => {
    if (mode === "change" && currentPlan) {
      return planConfigs.filter((plan) => plan.id !== currentPlan);
    }
    return planConfigs;
  }, [mode, currentPlan]);

  const detectCardType = (cardNumber: string) => {
    const number = cardNumber.replace(/\s/g, "");

    if (number.startsWith("4")) return "Visa";
    if (
      number.startsWith("5") ||
      (number.startsWith("2") &&
        number.length >= 2 &&
        parseInt(number.substring(0, 2)) >= 22 &&
        parseInt(number.substring(0, 2)) <= 27)
    )
      return "Mastercard";
    if (number.startsWith("3")) return "American Express";
    if (number.startsWith("6")) return "Discover";

    return "";
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, "");
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(" ") : cleaned;
  };

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + "/" + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const validatePaymentData = () => {
    const { cardNumber, expiryDate, cvv, cardholderName } = paymentData;

    if (!cardNumber || cardNumber.replace(/\s/g, "").length < 13) {
      Alert.alert(t("payment.error"), t("payment.invalidCardNumber"));
      return false;
    }

    if (!expiryDate || expiryDate.length !== 5) {
      Alert.alert(t("payment.error"), t("payment.invalidExpiryDate"));
      return false;
    }

    if (!cvv || cvv.length < 3) {
      Alert.alert(t("payment.error"), t("payment.invalidCvv"));
      return false;
    }

    if (!cardholderName.trim()) {
      Alert.alert(t("payment.error"), t("payment.cardholderRequired"));
      return false;
    }

    return true;
  };

  const handlePayment = async (planId: PlanType) => {
    if (planId === "FREE") {
      return handlePlanSelection(planId);
    }

    // Get plan details
    const selectedPlanConfig = planConfigs.find((p) => p.id === planId);
    const planName = t(`payment.plans.${selectedPlanConfig?.translationKey}.name`);

    // Navigate to payment page with plan details
    router.push({
      pathname: "/payment",
      params: {
        planType: planId,
        planName: planName || "",
        planPrice: selectedPlanConfig?.price || "",
      },
    });
  };

  const processPayment = async () => {
    if (!validatePaymentData() || !selectedPlan) return;

    try {
      setIsLoading(true);

      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Process the plan selection
      await handlePlanSelection(selectedPlan);

      setShowPaymentModal(false);
      setPaymentData({
        cardNumber: "",
        expiryDate: "",
        cvv: "",
        cardholderName: "",
      });
    } catch (error) {
      Alert.alert(t("payment.error"), t("payment.paymentFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSelection = async (planId: PlanType) => {
    try {
      // Check if user is authenticated
      if (!user) {
        throw new Error("User not authenticated");
      }

      console.log("🔄 Updating subscription to:", planId);
      const response = await userAPI.updateSubscription(planId);
      console.log("✅ Subscription update response:", response);

      if (!response.success) {
        throw new Error(response.error || "Failed to update subscription");
      }

      // Update Redux state
      dispatch({
        type: "auth/updateSubscription",
        payload: { subscription_type: planId },
      });

      // Add small delay to prevent re-render conflicts
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Navigate to main app after plan selection
      // All users (FREE and paid) go to tabs after selecting a plan
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("Plan selection error:", error);
      Alert.alert(t("payment.error"), error.message || t("payment.planUpdateFailed"));
    }
  };

  // Fixed handleGoBack function in payment-plan.tsx
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const handleGoBack = () => {
    if (mode === "change") {
      // Changing subscription from profile
      router.push("/(tabs)/profile");
    } else if (!user || !isAuthenticated) {
      // Not authenticated - go to sign in
      console.log("🔙 Not authenticated - redirecting to sign in");
      router.replace("/(auth)/signin");
    } else if (user.is_questionnaire_completed) {
      // Completed questionnaire - can go back to profile or questionnaire
      router.push("/(tabs)/profile");
    } else {
      // First time - go back to questionnaire
      console.log("🔙 First time user - going back to questionnaire");
      router.push("/questionnaire");
    }
  };

  const renderPlan = (planConfig: PlanConfig) => {
    // Don't render current plan in change mode
    if (mode === "change" && planConfig.id === currentPlan) {
      return null;
    }

    const IconComponent = planConfig.icon;
    const isRecommended = planConfig.recommended;
    const planName = t(`payment.plans.${planConfig.translationKey}.name`);
    const planDescription = t(`payment.plans.${planConfig.translationKey}.description`);
    const features = t(`payment.plans.${planConfig.translationKey}.features`, { returnObjects: true }) as string[];
    const savings = planConfig.recommended ? t(`payment.plans.${planConfig.translationKey}.savings`) : null;

    return (
      <View key={planConfig.id} style={styles.planContainer}>
        {isRecommended && (
          <View style={styles.popularBadge}>
            <Star size={12} color="#FFD700" fill="#FFD700" />
            <Text style={styles.popularText}>{t("payment.mostPopular")}</Text>
          </View>
        )}

        <View
          style={[
            styles.planCard,
            isRecommended && styles.recommendedCard,
            { borderColor: planConfig.color },
          ]}
        >
          <LinearGradient
            colors={[planConfig.color + "15", planConfig.color + "05"]}
            style={styles.cardGradient}
          >
            <View style={styles.planHeader}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: planConfig.color + "20" },
                ]}
              >
                <IconComponent size={24} color={planConfig.color} />
              </View>
              <View style={styles.planTitleContainer}>
                <Text style={styles.planName}>{planName}</Text>
                <Text style={styles.planDescription}>{planDescription}</Text>
              </View>
            </View>

            <View style={styles.priceContainer}>
              <Text style={[styles.planPrice, { color: planConfig.color }]}>
                {planConfig.price}
              </Text>
              {planConfig.id !== "FREE" && (
                <Text style={styles.priceSubtext}>{t("payment.perMonth")}</Text>
              )}
            </View>

            {savings && (
              <View
                style={[
                  styles.savingsBadge,
                  { backgroundColor: planConfig.color + "15" },
                ]}
              >
                <Text style={[styles.savingsText, { color: planConfig.color }]}>
                  {savings}
                </Text>
              </View>
            )}

            <View style={styles.featuresContainer}>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <View
                    style={[
                      styles.checkmarkContainer,
                      { backgroundColor: planConfig.color + "20" },
                    ]}
                  >
                    <Check size={12} color={planConfig.color} />
                  </View>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.selectButton,
                isRecommended && styles.recommendedButton,
                { backgroundColor: planConfig.color },
              ]}
              onPress={() => handlePayment(planConfig.id)}
              accessibilityLabel={`Select ${planName} plan`}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  isRecommended
                    ? [planConfig.color, planConfig.color + "CC"]
                    : [planConfig.color, planConfig.color]
                }
                style={styles.buttonGradient}
              >
                <Text style={styles.selectButtonText}>
                  {planConfig.id === "FREE" ? t("payment.startFree") : t("payment.selectPlan")}
                </Text>
                {isRecommended && <Zap size={16} color="white" fill="white" />}
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    );
  };

  const renderPaymentModal = () => {
    const selectedPlanConfig = planConfigs.find((p) => p.id === selectedPlan);
    const selectedPlanName = selectedPlanConfig ? t(`payment.plans.${selectedPlanConfig.translationKey}.name`) : "";

    return (
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModal}>
            <LinearGradient
              colors={["#f8f9fa", "#ffffff"]}
              style={styles.modalGradient}
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <CreditCard size={24} color="#2196F3" />
                  <Text style={styles.modalTitle}>{t("payment.paymentDetails")}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowPaymentModal(false)}
                  style={styles.closeButton}
                >
                  <X size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.planSummary}>
                  <LinearGradient
                    colors={["#2196F3", "#42A5F5"]}
                    style={styles.summaryGradient}
                  >
                    <Text style={styles.summaryTitle}>
                      {selectedPlanName}
                    </Text>
                    <Text style={styles.summaryPrice}>
                      {selectedPlanConfig?.price}
                    </Text>
                    <Text style={styles.summarySubtext}>{t("payment.monthlyBilling")}</Text>
                  </LinearGradient>
                </View>

                <View style={styles.paymentForm}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>{t("payment.creditCardNumber")}</Text>
                    <View style={styles.cardInputContainer}>
                      <TextInput
                        style={styles.cardInput}
                        value={paymentData.cardNumber}
                        onChangeText={(text) => {
                          const formatted = formatCardNumber(text);
                          if (formatted.replace(/\s/g, "").length <= 16) {
                            setPaymentData({
                              ...paymentData,
                              cardNumber: formatted,
                            });
                            setCardType(detectCardType(formatted));
                          }
                        }}
                        placeholder="1234 5678 9012 3456"
                        keyboardType="numeric"
                        maxLength={19}
                      />
                      {cardType && (
                        <View style={styles.cardTypeBadge}>
                          <Text style={styles.cardTypeText}>{cardType}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.inputRow}>
                    <View
                      style={[
                        styles.inputContainer,
                        { flex: 1, marginRight: 12 },
                      ]}
                    >
                      <Text style={styles.inputLabel}>{t("payment.expiryDate")}</Text>
                      <TextInput
                        style={styles.input}
                        value={paymentData.expiryDate}
                        onChangeText={(text) => {
                          const formatted = formatExpiryDate(text);
                          if (formatted.length <= 5) {
                            setPaymentData({
                              ...paymentData,
                              expiryDate: formatted,
                            });
                          }
                        }}
                        placeholder="MM/YY"
                        keyboardType="numeric"
                        maxLength={5}
                      />
                    </View>

                    <View style={[styles.inputContainer, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>CVV</Text>
                      <TextInput
                        style={styles.input}
                        value={paymentData.cvv}
                        onChangeText={(text) => {
                          if (text.length <= 4) {
                            setPaymentData({ ...paymentData, cvv: text });
                          }
                        }}
                        placeholder="123"
                        keyboardType="numeric"
                        maxLength={4}
                        secureTextEntry
                      />
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>{t("payment.cardholderName")}</Text>
                    <TextInput
                      style={styles.input}
                      value={paymentData.cardholderName}
                      onChangeText={(text) =>
                        setPaymentData({ ...paymentData, cardholderName: text })
                      }
                      placeholder={t("payment.fullNameOnCard")}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.securityNotice}>
                    <Lock size={16} color="#10b981" />
                    <Text style={styles.securityText}>
                      {t("payment.securePayment")}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelPaymentButton}
                  onPress={() => setShowPaymentModal(false)}
                >
                  <Text style={styles.cancelPaymentText}>{t("payment.cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.payButton, isLoading && styles.loadingButton]}
                  onPress={processPayment}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={["#10b981", "#059669"]}
                    style={styles.payButtonGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <>
                        <CreditCard size={16} color="#ffffff" />
                        <Text style={styles.payButtonText}>{t("payment.payNow")}</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.backButtonContainer}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <LinearGradient
        colors={["#f8f9fa", "#ffffff"]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            {mode === "change"
              ? t("payment.changeTitle")
              : t("payment.title")}
          </Text>
          <Text style={styles.subtitle}>
            {mode === "change"
              ? t("payment.changeSubtitle")
              : t("payment.subtitle")}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.plansContainer}>
        {availablePlans.map(renderPlan)}
      </View>

      <View style={styles.footer}>
        <View style={styles.guaranteeContainer}>
          <Check size={16} color="#10b981" />
          <Text style={styles.guaranteeText}>
            {t("payment.noCommitment")}
          </Text>
        </View>
        <Text style={styles.footerText}>
          {t("payment.changeAnytime")}
        </Text>
      </View>

      {renderPaymentModal()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f2f5",
  },
  contentContainer: {
    paddingBottom: 40,
  },
  backButtonContainer: {
    padding: 20,
    paddingTop: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  headerGradient: {
    marginHorizontal: 20,
    borderRadius: 20,
    marginBottom: 30,
  },
  header: {
    alignItems: "center",
    padding: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: "#666",
    textAlign: "center",
    lineHeight: 26,
    paddingHorizontal: 10,
  },
  plansContainer: {
    paddingHorizontal: 20,
    gap: 20,
  },
  planContainer: {
    position: "relative",
  },
  popularBadge: {
    position: "absolute",
    top: -8,
    left: 20,
    right: 20,
    backgroundColor: "#FFD700",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    zIndex: 1,
    gap: 4,
  },
  popularText: {
    color: "#1a1a1a",
    fontSize: 12,
    fontWeight: "700",
  },
  planCard: {
    backgroundColor: "white",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    overflow: "hidden",
  },
  recommendedCard: {
    borderWidth: 3,
  },
  cardGradient: {
    padding: 24,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  planTitleContainer: {
    flex: 1,
  },
  planName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginBottom: 16,
  },
  planPrice: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
  },
  priceSubtext: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
    marginLeft: 4,
  },
  savingsBadge: {
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 20,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  featuresContainer: {
    marginBottom: 24,
    gap: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkmarkContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: "#444",
    flex: 1,
    fontWeight: "500",
  },
  selectButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  recommendedButton: {
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  selectButtonText: {
    color: "white",
    fontSize: 17,
    fontWeight: "700",
  },
  footer: {
    marginTop: 40,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 16,
  },
  guaranteeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  guaranteeText: {
    fontSize: 13,
    color: "#10b981",
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  paymentModal: {
    height: "95%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  modalGradient: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  planSummary: {
    marginBottom: 32,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#2196F3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  summaryGradient: {
    padding: 24,
    alignItems: "center",
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
    marginBottom: 8,
  },
  summaryPrice: {
    fontSize: 32,
    fontWeight: "800",
    color: "white",
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  paymentForm: {
    gap: 20,
  },
  inputContainer: {
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  cardInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  cardInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#fff",
    fontWeight: "500",
  },
  cardTypeBadge: {
    position: "absolute",
    right: 16,
    backgroundColor: "#f0f2f5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  cardTypeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  input: {
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#fff",
    fontWeight: "500",
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  securityNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    padding: 16,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "#10b981",
    borderStyle: "dashed",
  },
  securityText: {
    fontSize: 13,
    color: "#10b981",
    flex: 1,
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 12,
    backgroundColor: "white",
  },
  cancelPaymentButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f8f9fa",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelPaymentText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  payButton: {
    flex: 2,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loadingButton: {
    opacity: 0.7,
  },
  payButtonGradient: {
    flexDirection: "row",
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
});
