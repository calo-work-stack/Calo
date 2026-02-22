import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { AuthService } from "../services/auth";
import { signUpSchema, signInSchema } from "../types/auth";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/database";
import { PushNotificationService } from "../services/pushNotificationService";

const router = Router();

// Strict rate limiter for login — 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many login attempts. Please try again in 15 minutes." },
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Rate limiter for password reset — 5 per hour per IP
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many password reset requests. Please try again in 1 hour." },
});

// Rate limiter for email verification — 10 per 15 minutes per IP
const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many verification attempts. Please try again in 15 minutes." },
});

// Rate limiter for signup — 5 per hour per IP
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many signup attempts. Please try again in 1 hour." },
});

router.post("/signup", signupLimiter, async (req, res, next) => {
  try {
    console.log("🔄 Processing signup request...");
    console.log("📱 Request body:", { ...req.body, password: "***" });

    const validatedData = signUpSchema.parse(req.body);
    const result = await AuthService.signUp(validatedData);

    console.log("✅ Signup successful - email verification required");
    console.log("📧 Verification process initiated for:", validatedData.email);

    const message =
      process.env.NODE_ENV === "production"
        ? "Account created successfully! Please check your email for verification code."
        : "Account created successfully! Please check your email for verification code (or check console for development).";

    res.status(201).json({
      success: true,
      user: result.user,
      needsEmailVerification: result.needsEmailVerification,
      message: message,
    });
  } catch (error) {
    console.error("💥 Signup error:", error);

    if (error instanceof z.ZodError) {
      // Extract the first user-friendly validation message from ZodError
      const firstIssue = error.issues[0];
      const fieldName = firstIssue.path.join(".");
      const friendlyMessage = fieldName
        ? `${fieldName}: ${firstIssue.message}`
        : firstIssue.message;

      console.error("💥 Validation error:", friendlyMessage);
      res.status(400).json({
        success: false,
        error: friendlyMessage,
      });
    } else if (error instanceof Error) {
      console.error("💥 Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });

      res.status(400).json({
        success: false,
        error: error.message,
      });
    } else {
      console.error("💥 Unknown error type:", error);
      next(error);
    }
  }
});

router.post("/verify-email", verificationLimiter, async (req, res, next) => {
  try {
    console.log("🔄 Processing email verification request...");
    console.log("📧 Request body:", req.body);

    const { email, code } = req.body;

    if (!email || !code) {
      console.log("❌ Missing email or code");
      return res.status(400).json({
        success: false,
        error: "Email and verification code are required",
      });
    }

    console.log(`🔒 Verifying code ${code} for email: ${email}`);
    const result = await AuthService.verifyEmail(email, code);

    // Set secure HTTP-only cookie for web clients
    const isWebClient =
      req.headers.origin?.includes("localhost:19006") ||
      req.headers.origin?.includes("localhost:8081") ||
      req.headers["user-agent"]?.includes("Mozilla");

    if (isWebClient) {
      const cookieOptions = AuthService.getCookieOptions();
      res.cookie("auth_token", result.token, cookieOptions);
      console.log("🍪 Cookie set for web client");
    }

    console.log("✅ Email verification successful for:", email);
    console.log("👤 Updated user:", result.user);

    res.json({
      success: true,
      user: result.user,
      token: result.token,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("💥 Email verification error:", error);
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    } else {
      next(error);
    }
  }
});

// FIXED: This endpoint should NOT require authentication
// Users need to resend verification codes BEFORE they're logged in
router.post("/resend-verification", verificationLimiter, async (req, res) => {
  try {
    console.log("🔄 Processing resend verification request...");
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    console.log("📧 Resending verification to:", email);

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        email_verified: true,
        name: true,
      },
    });

    // Return a generic response to prevent email enumeration
    const genericResponse = {
      success: true,
      message: "If this email is registered and unverified, a new code has been sent.",
    };

    if (!user || user.email_verified) {
      return res.json(genericResponse);
    }

    // Generate new 6-digit verification code
    const emailVerificationCode = crypto.randomInt(100000, 999999).toString();

    await prisma.user.update({
      where: { email },
      data: {
        email_verification_code: emailVerificationCode,
        email_verification_expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    });

    // Send new verification email
    await AuthService.sendVerificationEmail(
      email,
      emailVerificationCode,
      user.name || "User",
    );

    res.json(genericResponse);
  } catch (error) {
    console.error("💥 Resend verification error:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to resend verification code",
    });
  }
});

router.post("/signin", loginLimiter, async (req, res, next) => {
  try {
    console.log("🔄 Processing signin request...");

    const validatedData = signInSchema.parse(req.body);
    const result = await AuthService.signIn(validatedData);

    // Set secure HTTP-only cookie for web clients
    const isWebClient =
      req.headers.origin?.includes("localhost:19006") ||
      req.headers.origin?.includes("localhost:8081") ||
      req.headers["user-agent"]?.includes("Mozilla");

    if (isWebClient) {
      const cookieOptions = AuthService.getCookieOptions();
      res.cookie("auth_token", result.token, cookieOptions);
      console.log("🍪 Cookie set for web client");
    }

    console.log("✅ Signin successful");

    // Get questionnaire data for meals_per_day
    const questionnaire = await prisma.userQuestionnaire.findFirst({
      where: { user_id: result.user.user_id },
      select: { meals_per_day: true },
    });

    const userData = {
      user_id: result.user.user_id,
      name: result.user.name,
      email: result.user.email,
      email_verified: result.user.email_verified,
      subscription_type: result.user.subscription_type,
      is_questionnaire_completed: result.user.is_questionnaire_completed,
      avatar_url: result.user.avatar_url,
      meals_per_day: questionnaire?.meals_per_day || 3,
      created_at: result.user.created_at,
      is_admin: result.user.is_admin,
      is_super_admin: result.user.is_super_admin,
      level: result.user.level,
      total_points: result.user.total_points,
      current_xp: result.user.current_xp,
      current_streak: result.user.current_streak,
      best_streak: result.user.best_streak,
      total_complete_days: result.user.total_complete_days,
      last_complete_date: result.user.last_complete_date,
      active_meal_plan_id: result.user.active_meal_plan_id,
      active_menu_id: result.user.active_menu_id,
      birth_date: result.user.birth_date,
      signup_date: result.user.signup_date,
      subscription_start: result.user.subscription_start,
      subscription_end: result.user.subscription_end,
      ai_requests_count: result.user.ai_requests_count,
      ai_requests_reset_at: result.user.ai_requests_reset_at,
    };

    res.json({
      success: true,
      user: userData,
      token: result.token,
    });

    // ============================================================
    // 🔔 LOGIN NOTIFICATION - fires on every successful user login
    // Sent asynchronously so it never blocks the signin response
    // ============================================================
    setImmediate(async () => {
      try {
        const userId = result.user.user_id;
        const userName = (result.user as any).name || "there";
        const lang = (result.user as any).preferred_lang === "HE" ? "he" : "en";

        const title = lang === "he" ? "ברוך שובך! 👋" : `Welcome back, ${userName}! 👋`;
        const body  = lang === "he"
          ? "היום היא הזדמנות נהדרת להמשיך את המסע שלך!"
          : "Today is a great opportunity to continue your journey!";

        await PushNotificationService.sendToUser(
          userId,
          { title, body, data: { type: "LOGIN", screen: "home" } },
          "SYSTEM"
        );
        console.log(`🔔 Login notification sent to user ${userId}`);
      } catch (notifErr) {
        // Non-critical — never propagate
        console.warn("⚠️ Login notification failed (non-critical):", notifErr);
      }
    });
  } catch (error) {
    console.error("💥 Signin error:", error);
    if (error instanceof Error) {
      res.status(401).json({
        success: false,
        error: error.message,
      });
    } else {
      next(error);
    }
  }
});

// User questionnaire cache for /me endpoint
const meCache = new Map<string, { data: any; timestamp: number }>();
const ME_CACHE_TTL = 120000; // 2 minutes cache
const ME_CACHE_MAX = 1000;   // evict oldest entry when exceeded

router.get("/me", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.user_id;

    // Check cache first for instant response
    const cached = meCache.get(userId);
    if (cached && Date.now() - cached.timestamp < ME_CACHE_TTL) {
      // Update user data from token (always fresh from auth cache)
      const cachedData = { ...cached.data };
      Object.assign(cachedData, {
        level: req.user.level,
        total_points: req.user.total_points,
        current_xp: req.user.current_xp,
        current_streak: req.user.current_streak,
      });
      return res.json({ success: true, user: cachedData });
    }

    const questionnaire = await prisma.userQuestionnaire.findFirst({
      where: { user_id: userId },
      select: { meals_per_day: true },
    });

    const userData = {
      user_id: userId,
      name: req.user.name,
      email: req.user.email,
      email_verified: req.user.email_verified,
      subscription_type: req.user.subscription_type,
      is_questionnaire_completed: req.user.is_questionnaire_completed,
      avatar_url: req.user.avatar_url,
      meals_per_day: questionnaire?.meals_per_day || 3,
      created_at: req.user.created_at,
      is_admin: req.user.is_admin,
      is_super_admin: req.user.is_super_admin,
      level: req.user.level,
      total_points: req.user.total_points,
      current_xp: req.user.current_xp,
      current_streak: req.user.current_streak,
      best_streak: req.user.best_streak,
      total_complete_days: req.user.total_complete_days,
      last_complete_date: req.user.last_complete_date,
      active_meal_plan_id: req.user.active_meal_plan_id,
      active_menu_id: req.user.active_menu_id,
      birth_date: req.user.birth_date,
      signup_date: req.user.signup_date,
      subscription_start: req.user.subscription_start,
      subscription_end: req.user.subscription_end,
      ai_requests_count: req.user.ai_requests_count,
      ai_requests_reset_at: req.user.ai_requests_reset_at,
    };

    // Update cache (evict oldest entry if at capacity)
    if (meCache.size >= ME_CACHE_MAX) {
      const oldestKey = meCache.keys().next().value;
      if (oldestKey !== undefined) meCache.delete(oldestKey);
    }
    meCache.set(userId, { data: userData, timestamp: Date.now() });

    res.json({
      success: true,
      user: userData,
    });
  } catch (error) {
    console.error("💥 Error fetching /me:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user data",
    });
  }
});

router.post(
  "/signout",
  authenticateToken,
  async (req: AuthRequest, res, next) => {
    try {
      const token =
        req.cookies.auth_token || req.headers.authorization?.substring(7);

      if (token) {
        await AuthService.signOut(token);
      }

      res.clearCookie("auth_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });

      console.log("✅ Signout successful, cookie cleared");

      res.json({
        success: true,
        message: "Signed out successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    console.log("🔄 Processing forgot password request");

    // Always return generic success to prevent email enumeration
    const genericResponse = {
      success: true,
      message: "If this email is registered, a password reset email has been sent.",
    };

    try {
      await AuthService.sendPasswordResetEmail(email);
    } catch {
      // Silently swallow errors — never reveal whether the email exists
    }

    res.json(genericResponse);
  } catch (error) {
    console.error("💥 Forgot password error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process request",
    });
  }
});

router.post("/verify-reset-code", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: "Email and verification code are required",
      });
    }

    console.log("🔄 Verifying reset code for:", email);

    const resetToken = await AuthService.verifyResetCode(email, code);

    res.json({
      success: true,
      resetToken: resetToken,
      message: "Code verified successfully",
    });
  } catch (error) {
    console.error("💥 Reset code verification error:", error);
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to verify reset code",
      });
    }
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Token and new password are required",
      });
    }

    console.log("🔄 Processing password reset with token");

    await AuthService.resetPassword(token, newPassword);

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("💥 Reset password error:", error);
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to reset password",
      });
    }
  }
});

export { router as authRoutes };
