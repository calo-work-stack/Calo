import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { useRouter, usePathname } from "expo-router";
import { RootState } from "@/src/store";
import { ToastService } from "@/src/services/totastService";

interface QuestionnaireProtectionProps {
  children: React.ReactNode;
}

const QuestionnaireProtection: React.FC<QuestionnaireProtectionProps> = ({
  children,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useSelector((state: RootState) => state.auth);

  // Define routes that require questionnaire completion
  const protectedRoutes = [
    "/payment-plan",
    "/payment",
    "/(tabs)",
    "/(tabs)/camera",
    "/(tabs)/statistics",
    "/(tabs)/calendar",
    "/(tabs)/devices",
    "/(tabs)/recommended-menus",
    "/(tabs)/ai-chat",
    "/(tabs)/food-scanner",
    "/(tabs)/profile",
    "/(tabs)/history",
  ];

  // Define routes that are always accessible
  const allowedRoutes = [
    "/",
    "/signin",
    "/signup",
    "/questionnaire",
    "/(auth)/signin",
    "/(auth)/signup",
    "/(auth)/email-verification",
    "/(auth)/forgotPassword",
    "/(auth)/resetPassword",
    "/(auth)/reset-password-verify",
    "/privacy-policy",
  ];

  useEffect(() => {
    if (!user) return;

    const isProtectedRoute = protectedRoutes.some(
      (route) => pathname.startsWith(route) || pathname === route
    );

    const isAllowedRoute = allowedRoutes.some(
      (route) => pathname.startsWith(route) || pathname === route
    );

    const isQuestionnaireRoute = pathname.includes("/questionnaire");
    const isPaymentRoute = pathname.includes("/payment");

    // Check subscription and questionnaire status
    const hasSubscription = user.subscription_type && user.subscription_type !== "FREE" && user.subscription_type !== null;
    const questionnaireCompleted = user.is_questionnaire_completed === true;

    console.log("🔒 QuestionnaireProtection check:", {
      pathname,
      hasSubscription,
      questionnaireCompleted,
      subscription_type: user.subscription_type,
    });

    // If user has a subscription but hasn't completed questionnaire
    if (
      hasSubscription &&
      !questionnaireCompleted &&
      !isQuestionnaireRoute &&
      !isAllowedRoute
    ) {
      ToastService.info(
        "Complete Your Profile",
        "Please complete the questionnaire to access your premium features"
      );
      router.replace("/questionnaire");
      return;
    }

    // If user hasn't completed questionnaire and is trying to access protected routes (no subscription)
    if (
      !hasSubscription &&
      !questionnaireCompleted &&
      isProtectedRoute &&
      !isAllowedRoute &&
      !isPaymentRoute
    ) {
      ToastService.warning(
        "Complete Questionnaire",
        "Please complete the questionnaire before accessing other features"
      );
      router.replace("/questionnaire");
      return;
    }

    // If user completed questionnaire but has no subscription and is not on payment pages
    if (
      questionnaireCompleted &&
      !hasSubscription &&
      pathname.startsWith("/(tabs)") &&
      pathname !== "/(tabs)/questionnaire" &&
      !isPaymentRoute
    ) {
      ToastService.info(
        "Choose Your Plan",
        "Please select a subscription plan to continue"
      );
      router.replace("/payment-plan");
      return;
    }
  }, [user, pathname, router]);

  return <>{children}</>;
};

export default QuestionnaireProtection;
