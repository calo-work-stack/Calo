import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../lib/database";
import { SignUpInput, SignInInput } from "../types/auth";
import {
  encrypt,
  decrypt,
  hashEmail,
  isEncrypted,
  decryptUserData,
} from "./encryption";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = "7d";
const SESSION_EXPIRES_DAYS = 7;
const PASSWORD_RESET_EXPIRES = "15m";

// Token cache for performance - avoid DB hit on every request
const TOKEN_CACHE_TTL_MS = 300000; // 5 minutes cache (increased from 60s for better performance)
const tokenCache = new Map<
  string,
  { user: any; expiresAt: number; sessionVerified: boolean }
>();

// Cleanup expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of tokenCache.entries()) {
    if (entry.expiresAt < now) {
      tokenCache.delete(token);
    }
  }
}, 60000); // Clean up every 60 seconds

const userSelectFields = {
  user_id: true,
  email: true,
  email_hash: true,
  name: true,
  phone_number: true,
  avatar_url: true,
  subscription_type: true,
  birth_date: true,
  ai_requests_count: true,
  ai_requests_reset_at: true,
  created_at: true,
  email_verified: true,
  is_questionnaire_completed: true,
  is_admin: true,
  is_super_admin: true,
  level: true,
  total_points: true,
  current_xp: true,
  current_streak: true,
  best_streak: true,
  total_complete_days: true,
  last_complete_date: true,
  active_meal_plan_id: true,
  active_menu_id: true,
  signup_date: true,
  subscription_start: true,
  subscription_end: true,
};

// Helper to process user data - decrypt sensitive fields before returning
function processUserForResponse(user: any): any {
  if (!user) return user;
  return decryptUserData(user);
}

function generatePasswordResetToken(email: string) {
  return jwt.sign(
    {
      email,
      type: "password_reset",
      timestamp: Date.now(), // Add timestamp for extra security
    },
    JWT_SECRET,
    { expiresIn: PASSWORD_RESET_EXPIRES },
  );
}

function verifyPasswordResetToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      email: string;
      type: string;
      timestamp: number;
    };

    if (decoded.type !== "password_reset") {
      throw new Error("Invalid token type");
    }

    return decoded;
  } catch (error) {
    throw new Error("Invalid or expired password reset token");
  }
}

function generateToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function getSessionExpiryDate() {
  const date = new Date();
  date.setDate(date.getDate() + SESSION_EXPIRES_DAYS);
  return date;
}

export class AuthService {
  static async signUp(data: SignUpInput) {
    const { email, name, password, birth_date } = data;

    // Check for existing user - single query with OR for both email_hash and plain email
    const emailHashValue = hashEmail(email);
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email_hash: emailHashValue },
          { email: email }, // Backwards compatibility
        ],
      },
      select: {
        user_id: true,
        email_verified: true,
        email: true,
        name: true,
      },
    });

    if (existingUser) {
      if (existingUser.email_verified) {
        throw new Error(
          "Email already registered and verified. Please sign in instead.",
        );
      } else {
        // User exists but email not verified - resend verification code
        const emailVerificationCode = crypto
          .randomInt(100000, 999999)
          .toString();
        const hashedVerificationCode = await bcrypt.hash(emailVerificationCode, 10);

        await prisma.user.update({
          where: { user_id: existingUser.user_id },
          data: {
            email_verification_code: hashedVerificationCode,
            email_verification_expires: new Date(Date.now() + 15 * 60 * 1000),
          },
        });

        // Decrypt name for display if it's encrypted
        const displayName = existingUser.name
          ? isEncrypted(existingUser.name)
            ? decrypt(existingUser.name)
            : existingUser.name
          : name;

        // ASYNC: Send email in background - don't block response
        this.sendVerificationEmail(
          email,
          emailVerificationCode,
          displayName,
        ).catch((err) =>
          console.error("📧 Background email send failed:", err),
        );

        return {
          user: { email, name: displayName },
          needsEmailVerification: true,
        };
      }
    }

    // Hash password with lower cost for faster signup (10 instead of 12)
    const hashedPassword = await bcrypt.hash(password, 10);
    const emailVerificationCode = crypto.randomInt(100000, 999999).toString();
    const hashedVerificationCode = await bcrypt.hash(emailVerificationCode, 10);

    // Encrypt sensitive data
    const encryptedEmail = encrypt(email);
    const encryptedName = name ? encrypt(name) : null;

    const user = await prisma.user.create({
      data: {
        email: encryptedEmail,
        email_hash: emailHashValue,
        name: encryptedName,
        password_hash: hashedPassword,
        subscription_type: "FREE",
        birth_date: new Date(),
        ai_requests_count: 0,
        ai_requests_reset_at: new Date(),
        email_verified: false,
        email_verification_code: hashedVerificationCode,
        email_verification_expires: new Date(Date.now() + 15 * 60 * 1000),
      },
      select: {
        ...userSelectFields,
        email_verified: true,
        email_verification_code: true,
      },
    });

    if (process.env.NODE_ENV !== "production") {
      console.log("✅ Created user:", user.user_id);
    }

    // ASYNC: Send verification email in background - don't block response
    this.sendVerificationEmail(
      email,
      emailVerificationCode,
      name || "User",
    ).catch((err) => console.error("📧 Background email send failed:", err));

    // Don't include sensitive data in response
    const { email_verification_code, ...userResponse } = user;

    // Decrypt user data and return original email for verification flow
    const decryptedUser = processUserForResponse(userResponse);

    return { user: decryptedUser, needsEmailVerification: true };
  }

  static async sendVerificationEmail(
    email: string,
    code: string,
    name: string,
  ) {
    try {
      console.log("📧 Attempting to send verification email to:", email);

      // Check if email credentials are configured
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.error(
          "❌ Email credentials not configured in environment variables",
        );
        throw new Error(
          "Email service not configured. Please contact support.",
        );
      }

      // Remove any whitespace from password (just in case)
      const cleanPassword = process.env.EMAIL_PASSWORD.replace(/\s+/g, "");

      console.log("🔍 Email config check:", {
        user: process.env.EMAIL_USER,
        hasPassword: !!process.env.EMAIL_PASSWORD,
        passwordLength: cleanPassword.length,
        expectedLength: 16, // Gmail App Passwords are 16 characters
      });

      const nodemailer = require("nodemailer");

      const transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // Use STARTTLS
        auth: {
          user: process.env.EMAIL_USER,
          pass: cleanPassword, // Use cleaned password
        },
        tls: {
          rejectUnauthorized: false,
        },
        // Add timeout settings
        connectionTimeout: 60000, // 60 seconds
        greetingTimeout: 30000, // 30 seconds
        socketTimeout: 60000, // 60 seconds
        debug: true, // Always enable debug for troubleshooting
        logger: true, // Always enable logger
      });

      // Test the connection with better error handling
      console.log("🔍 Testing email connection...");
      try {
        await transporter.verify();
        console.log("✅ Email connection successful");
      } catch (verifyError: any) {
        console.error("❌ Email verification failed:", verifyError);
        console.error("Error code:", verifyError.code);
        console.error("Error message:", verifyError.message);

        // Provide specific guidance based on error
        if (verifyError.code === "EAUTH") {
          throw new Error(
            "Gmail authentication failed. Please check:\n" +
              "1. You're using an App Password (not your regular Gmail password)\n" +
              "2. The App Password has no spaces\n" +
              "3. Two-factor authentication is enabled on your Gmail account",
          );
        }
        throw verifyError;
      }

      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || "Calo - תזונה וכושר"}" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "אימות כתובת המייל - Calo",
        html: `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>אימות מייל - Calo</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Heebo', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 16px !important;
      }
      
      .content {
        padding: 32px 20px !important;
      }
      
      .code-display {
        font-size: 32px !important;
        letter-spacing: 6px !important;
      }
      
      .header {
        padding: 40px 24px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafb; font-family: 'Heebo', sans-serif; direction: rtl;">
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafb;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Main Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 2px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td class="header" style="background-color: #0d9488; padding: 48px 40px; text-align: center;">
              
              <div style="width: 64px; height: 64px; background-color: rgba(255, 255, 255, 0.12); border-radius: 50%; margin: 0 auto 20px; display: inline-flex; align-items: center; justify-content: center;">
                <div style="font-size: 32px;">🔐</div>
              </div>
              
              <h1 style="color: #ffffff; font-size: 32px; font-weight: 600; margin: 0 0 8px 0; letter-spacing: -0.3px;">
                Calo
              </h1>
              <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 0; font-weight: 400;">
                תזונה וכושר
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td class="content" style="padding: 48px 40px;">
              
              <h2 style="color: #0f172a; font-size: 26px; font-weight: 600; margin: 0 0 16px 0; line-height: 1.3;">
                שלום ${name}! 👋
              </h2>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 36px 0;">
                תודה שהצטרפת ל-Calo! אנא אמתו את כתובת המייל שלכם באמצעות הקוד למטה.
              </p>
              
              <!-- Code Section -->
              <div style="background-color: #f1f5f9; border: 2px solid #cbd5e1; border-radius: 1px; padding: 40px 32px; margin: 36px 0; text-align: center;">
                
                <p style="color: #64748b; font-size: 13px; font-weight: 600; text-align: center; margin: 0 0 20px 0; text-transform: uppercase; letter-spacing: 1px;">
                  קוד אימות
                </p>
                
                <div class="code-display" style="font-family: 'Courier New', Consolas, monospace; font-size: 42px; font-weight: 700; color: #0d9488; letter-spacing: 10px; text-align: center; line-height: 1; direction: ltr; margin: 20px 0;">
                  ${code}
                </div>
                
                <p style="color: #64748b; font-size: 14px; margin: 20px 0 0 0;">
                  הקוד תקף ל-<strong style="color: #475569; font-weight: 600;">15 דקות</strong>
                </p>
              </div>
              
              <div style="background-color: #f8fafc; border-right: 3px solid #0d9488; padding: 20px 24px; margin: 36px 0 0 0; border-radius: 0;">
                <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0;">
                  <strong style="color: #0f172a; font-weight: 600;">לא ביקשתם קוד זה?</strong><br>
                  אם לא יצרתם חשבון, אנא התעלמו ממייל זה.
                </p>
              </div>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafb; padding: 32px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              
              <p style="color: #0f172a; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">
                Calo
              </p>
              <p style="color: #64748b; font-size: 14px; margin: 0 0 20px 0;">
                המלווה האישי שלכם לתזונה ואימונים
              </p>
              
              <div style="margin: 20px 0;">
                <a href="#" style="color: #0d9488; text-decoration: none; font-size: 13px; margin: 0 12px; font-weight: 500;">מדיניות פרטיות</a>
                <span style="color: #cbd5e1;">|</span>
                <a href="#" style="color: #0d9488; text-decoration: none; font-size: 13px; margin: 0 12px; font-weight: 500;">תנאי שימוש</a>
                <span style="color: #cbd5e1;">|</span>
                <a href="#" style="color: #0d9488; text-decoration: none; font-size: 13px; margin: 0 12px; font-weight: 500;">תמיכה</a>
              </div>
              
              <p style="color: #94a3b8; font-size: 12px; margin: 20px 0 0 0;">
                © 2025 Calo. כל הזכויות שמורות.
              </p>
              
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
`,
      };
      console.log("📤 Sending email...");
      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ Verification email sent successfully`);
      console.log("📧 Message ID:", result.messageId);
      console.log("📧 Response:", result.response);

      // Log to console for development
      if (process.env.NODE_ENV !== "production") {
        console.log(`📧 Verification email for ${email}`);
        console.log(`👤 Name: ${name}`);
        console.log(`🔑 Verification Code: ${code}`);
        console.log(`⏰ Code expires in 15 minutes`);
      }

      return true;
    } catch (error: any) {
      console.error("❌ Failed to send verification email:", error);

      // Detailed error logging
      if (error.code === "EAUTH") {
        console.error("🔐 Gmail Authentication Failed!");
        console.error("Solutions:");
        console.error("1. Enable 2-Factor Authentication on Gmail");
        console.error(
          "2. Generate an App Password at: https://myaccount.google.com/apppasswords",
        );
        console.error(
          "3. Use the 16-character App Password (remove all spaces)",
        );
        console.error("4. Update EMAIL_PASSWORD in .env");
      } else if (error.code === "ECONNECTION" || error.code === "ETIMEDOUT") {
        console.error("🌐 Connection issue - check internet/firewall");
      } else if (error.code === "ESOCKET") {
        console.error("🔌 Socket error - network issue");
      } else {
        console.error("🚨 Error details:", {
          code: error.code,
          message: error.message,
          command: error.command,
        });
      }

      // Fallback to console logging
      console.log(`📧 FALLBACK - Verification code: ${code}`);

      // In production, throw error so signup knows email failed
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "Failed to send verification email. Please try again or contact support.",
        );
      }

      return true;
    }
  }

  static async verifyEmail(email: string, code: string) {
    console.log(`🔒 Verifying email ${email} with code ${code}`);

    // Single query with OR for both email_hash and plain email
    const emailHashValue = hashEmail(email);
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email_hash: emailHashValue }, { email: email }],
      },
      select: {
        ...userSelectFields,
        email_verified: true,
        email_verification_code: true,
        email_verification_expires: true,
      },
    });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      throw new Error("User not found");
    }

    console.log("🔍 User found:", {
      email: user.email,
      email_verified: user.email_verified,
      has_code: !!user.email_verification_code,
      code_expires: user.email_verification_expires,
    });

    if (user.email_verified) {
      console.log(`⚠️ Email already verified: ${email}`);
      throw new Error("Email already verified");
    }

    if (
      !user.email_verification_expires ||
      user.email_verification_expires < new Date()
    ) {
      console.log(`❌ Verification code expired for: ${email}`);
      throw new Error("Verification code expired");
    }

    const isCodeValid = await bcrypt.compare(code, user.email_verification_code);
    if (!isCodeValid) {
      console.log(
        `❌ Invalid verification code for: ${email}`,
      );
      throw new Error("Invalid verification code");
    }

    console.log(`✅ Code verified, updating user: ${email}`);

    const updatedUser = await prisma.user.update({
      where: { user_id: user.user_id }, // Use user_id for update (works with encrypted email)
      data: {
        email_verified: true,
        email_verification_code: null,
        email_verification_expires: null,
        // Initialize gamification fields if null
        level: user.level ?? 1,
        total_points: user.total_points ?? 0,
        current_xp: user.current_xp ?? 0,
        current_streak: user.current_streak ?? 0,
        best_streak: user.best_streak ?? 0,
        total_complete_days: user.total_complete_days ?? 0,
      },
      select: userSelectFields,
    });

    console.log("✅ User updated with gamification defaults:", updatedUser);

    // Use the original email for the token (not encrypted)
    const token = generateToken({
      user_id: updatedUser.user_id,
      email: email, // Use original email passed in, not encrypted version
    });

    await prisma.session.create({
      data: {
        user_id: updatedUser.user_id,
        token,
        expiresAt: getSessionExpiryDate(),
      },
    });

    console.log(`✅ Session created for user: ${email}`);

    // Decrypt sensitive fields before returning
    const decryptedUser = processUserForResponse(updatedUser);

    return { user: decryptedUser, token };
  }

  static async signIn(data: SignInInput) {
    const { email, password } = data;

    // Single query with OR for both email_hash and plain email (backwards compatibility)
    const emailHashValue = hashEmail(email);
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email_hash: emailHashValue }, { email: email }],
      },
    });

    if (!user) throw new Error("Invalid email or password");

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) throw new Error("Invalid email or password");

    // Generate token and create session in parallel
    const token = generateToken({ user_id: user.user_id, email });

    // Create session async - don't block response for session creation
    prisma.session
      .create({
        data: {
          user_id: user.user_id,
          token,
          expiresAt: getSessionExpiryDate(),
        },
      })
      .catch((err) => console.error("📧 Session creation failed:", err));

    const { password_hash: _, ...userWithoutPassword } = user;

    // Decrypt sensitive fields before returning
    const decryptedUser = processUserForResponse(userWithoutPassword);

    return { user: decryptedUser, token };
  }

  static async verifyToken(token: string) {
    try {
      // Check cache first to avoid DB hit - FAST PATH
      const cached = tokenCache.get(token);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.user;
      }

      // Verify JWT first (fast, no DB)
      const decoded = jwt.verify(token, JWT_SECRET) as {
        user_id: string;
        email: string;
      };

      if (
        !decoded ||
        typeof decoded !== "object" ||
        !("user_id" in decoded) ||
        !("email" in decoded)
      ) {
        throw new Error("Invalid token payload");
      }

      // If we had a cached entry that just expired, refresh from DB in background
      // but return the cached user immediately for better UX
      if (cached && cached.sessionVerified) {
        // Refresh cache in background (fire and forget)
        this.refreshTokenCache(token).catch(() => {});
        return cached.user;
      }

      // First time verification - must hit DB
      const session = await prisma.session.findUnique({
        where: { token },
        include: {
          user: { select: userSelectFields },
        },
      });

      if (!session || session.expiresAt < new Date()) {
        tokenCache.delete(token);
        throw new Error("Session expired");
      }

      // Decrypt sensitive fields
      const decryptedUser = processUserForResponse(session.user);

      // Cache the result
      tokenCache.set(token, {
        user: decryptedUser,
        expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
        sessionVerified: true,
      });

      return decryptedUser;
    } catch {
      tokenCache.delete(token);
      throw new Error("Invalid token");
    }
  }

  // Background refresh of token cache
  private static async refreshTokenCache(token: string): Promise<void> {
    try {
      const session = await prisma.session.findUnique({
        where: { token },
        include: {
          user: { select: userSelectFields },
        },
      });

      if (session && session.expiresAt > new Date()) {
        const decryptedUser = processUserForResponse(session.user);
        tokenCache.set(token, {
          user: decryptedUser,
          expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
          sessionVerified: true,
        });
      } else {
        tokenCache.delete(token);
      }
    } catch {
      // Silent fail - cache will expire naturally
    }
  }

  static async signOut(token: string) {
    // Clear from cache immediately
    tokenCache.delete(token);
    await prisma.session.deleteMany({ where: { token } });
  }
  static async sendPasswordResetEmail(email: string): Promise<void> {
    console.log("🔄 Sending password reset email to:", email);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Generate reset code (same as email verification)
    const resetCode = crypto.randomInt(100000, 999999).toString();
    const hashedResetCode = await bcrypt.hash(resetCode, 10);
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes (same as email verification)

    // Store hashed reset code in database
    await prisma.user.update({
      where: { email },
      data: {
        password_reset_code: hashedResetCode,
        password_reset_expires: resetExpires,
      },
    });

    // Send password reset email
    await this.sendPasswordResetEmailTemplate(
      email,
      resetCode,
      user.name || "User",
    );

    console.log("✅ Password reset code generated and sent");
  }

  static async sendPasswordResetEmailTemplate(
    email: string,
    code: string,
    name: string,
  ) {
    try {
      const nodemailer = require("nodemailer");

      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false,
        },
        debug: process.env.NODE_ENV !== "production",
        logger: process.env.NODE_ENV !== "production",
      });

      // Test the connection
      console.log("🔍 Testing email connection...");
      await transporter.verify();
      console.log("✅ Email connection verified");

      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || "Calo - תזונה וכושר"}" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "קוד לאיפוס סיסמה - Calo",
        html: `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>איפוס סיסמה - Calo</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Heebo', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 16px !important;
      }
      
      .content {
        padding: 32px 20px !important;
      }
      
      .code-display {
        font-size: 32px !important;
        letter-spacing: 6px !important;
      }
      
      .header {
        padding: 40px 24px !important;
      }
      
      .footer-links a {
        display: block !important;
        margin: 8px 0 !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafb; font-family: 'Heebo', sans-serif; direction: rtl;">
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafb;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Main Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 2px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td class="header" style="background-color: #0d9488; padding: 48px 40px; text-align: center;">
              
              <div style="width: 64px; height: 64px; background-color: rgba(255, 255, 255, 0.12); border-radius: 50%; margin: 0 auto 20px; display: inline-flex; align-items: center; justify-content: center;">
                <div style="font-size: 32px;">🔐</div>
              </div>
              
              <h1 style="color: #ffffff; font-size: 32px; font-weight: 600; margin: 0 0 8px 0; letter-spacing: -0.3px;">
                Calo
              </h1>
              <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 0; font-weight: 400;">
                איפוס סיסמה
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td class="content" style="padding: 48px 40px;">
              
              <h2 style="color: #0f172a; font-size: 26px; font-weight: 600; margin: 0 0 16px 0; line-height: 1.3;">
                שלום ${name}! 👋
              </h2>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 36px 0;">
                קיבלנו בקשה לאיפוס הסיסמה שלך. השתמשו בקוד למטה כדי ליצור סיסמה חדשה לחשבון שלכם.
              </p>
              
              <!-- Code Section -->
              <div style="background-color: #f1f5f9; border: 2px solid #cbd5e1; border-radius: 1px; padding: 40px 32px; margin: 36px 0; text-align: center;">
                
                <p style="color: #64748b; font-size: 13px; font-weight: 600; text-align: center; margin: 0 0 20px 0; text-transform: uppercase; letter-spacing: 1px;">
                  קוד האיפוס שלך
                </p>
                
                <div class="code-display" style="font-family: 'Courier New', Consolas, monospace; font-size: 42px; font-weight: 700; color: #0d9488; letter-spacing: 10px; text-align: center; line-height: 1; direction: ltr; margin: 20px 0;">
                  ${code}
                </div>
                
                <p style="color: #64748b; font-size: 14px; margin: 20px 0 0 0;">
                  הקוד תקף ל-<strong style="color: #475569; font-weight: 600;">15 דקות</strong>
                </p>
              </div>
              
              <!-- Instructions -->
              <div style="background-color: #f8fafc; border-right: 3px solid #0d9488; padding: 24px; margin: 36px 0; border-radius: 0;">
                <h3 style="color: #0f172a; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
                  איך להשתמש בקוד?
                </h3>
                <ol style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0; padding-right: 20px;">
                  <li style="margin-bottom: 8px;">פתחו את אפליקציית Calo במכשיר שלכם</li>
                  <li style="margin-bottom: 8px;">הזינו את קוד בן 6 הספרות</li>
                  <li style="margin-bottom: 8px;">צרו סיסמה חדשה ומאובטחת</li>
                  <li>התחילו להשתמש בחשבון שלכם מיד!</li>
                </ol>
              </div>
              
              <!-- Security Notice -->
              <div style="background-color: #fef2f2; border-right: 3px solid #ef4444; padding: 24px; margin: 36px 0 0 0; border-radius: 0;">
                <h3 style="color: #dc2626; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">
                  הודעת אבטחה חשובה
                </h3>
                <p style="color: #991b1b; font-size: 15px; line-height: 1.6; margin: 0;">
                  אם <strong>לא ביקשתם</strong> לאפס את הסיסמה - אנא התעלמו ממייל זה וצרו איתנו קשר. לעולם אל תשתפו את הקוד עם אף אחד.
                </p>
              </div>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafb; padding: 32px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              
              <p style="color: #0f172a; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">
                Calo
              </p>
              <p style="color: #64748b; font-size: 14px; margin: 0 0 20px 0;">
                המלווה האישי שלכם לתזונה ואימונים
              </p>
              
              <div class="footer-links" style="margin: 20px 0;">
                <a href="#" style="color: #0d9488; text-decoration: none; font-size: 13px; margin: 0 12px; font-weight: 500;">מדיניות פרטיות</a>
                <span style="color: #cbd5e1;">|</span>
                <a href="#" style="color: #0d9488; text-decoration: none; font-size: 13px; margin: 0 12px; font-weight: 500;">תנאי שימוש</a>
                <span style="color: #cbd5e1;">|</span>
                <a href="#" style="color: #0d9488; text-decoration: none; font-size: 13px; margin: 0 12px; font-weight: 500;">תמיכה</a>
              </div>
              
              <p style="color: #94a3b8; font-size: 12px; margin: 20px 0 0 0;">
                © 2025 Calo. כל הזכויות שמורות.
              </p>
              
              <p style="color: #cbd5e1; font-size: 12px; margin: 16px 0 0 0; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                זקוקים לעזרה? <a href="mailto:support@calo.com" style="color: #0d9488; text-decoration: none;">support@calo.com</a>
              </p>
              
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
`,
      };

      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent to ${email}`);
      console.log("📧 Message ID:", result.messageId);

      // Fallback to console logging for development
      if (process.env.NODE_ENV !== "production") {
        console.log(`📧 Password reset email for ${email}`);
        console.log(`👤 Name: ${name}`);
        console.log(`🔑 Reset Code: ${code}`);
        console.log(`⏰ Code expires in 15 minutes`);
      }

      return true;
    } catch (error: any) {
      console.error("❌ Failed to send password reset email:", error);

      // Fallback to console logging if email fails
      console.log(`📧 FALLBACK - Password reset code for ${email}`);
      console.log(`👤 Name: ${name}`);
      console.log(`🔑 Reset Code: ${code}`);
      console.log(`⏰ Code expires in 15 minutes`);

      // Don't throw error - let the process continue even if email fails
      return true;
    }
  }

  static async verifyResetCode(email: string, code: string): Promise<string> {
    console.log("🔒 Verifying reset code for:", email);

    if (!code || code.trim() === "") {
      throw new Error("Reset code is required");
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.password_reset_code || !user.password_reset_expires) {
      throw new Error("No reset code found");
    }

    const isResetCodeValid = await bcrypt.compare(code.trim(), user.password_reset_code);
    if (!isResetCodeValid) {
      throw new Error("Invalid reset code");
    }

    if (new Date() > user.password_reset_expires) {
      throw new Error("Reset code has expired");
    }

    // Generate simple reset token (like email verification)
    const resetToken = jwt.sign(
      { userId: user.user_id, email: user.email, type: "password_reset" },
      JWT_SECRET,
      { expiresIn: "15m" },
    );

    console.log("✅ Reset code verified, token generated");
    return resetToken;
  }

  static async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<void> {
    console.log("🔑 Resetting password with token");

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      if (decoded.type !== "password_reset") {
        throw new Error("Invalid reset token");
      }

      const user = await prisma.user.findUnique({
        where: { email: decoded.email },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password and clear reset fields (like email verification clears verification fields)
      await prisma.user.update({
        where: { email: decoded.email },
        data: {
          password_hash: hashedPassword,
          password_reset_code: null,
          password_reset_expires: null,
        },
      });

      // Invalidate all existing sessions for security
      await prisma.session.deleteMany({
        where: { user_id: user.user_id },
      });

      console.log("✅ Password reset successfully for:", decoded.email);
    } catch (error) {
      console.error("💥 Password reset error:", error);
      throw new Error("Invalid or expired reset token");
    }
  }

  // Add method to verify token validity (for frontend validation)
  static async verifyPasswordResetToken(token: string) {
    try {
      const decoded = verifyPasswordResetToken(token);

      // Optional: Check if user still exists
      const user = await prisma.user.findUnique({
        where: { email: decoded.email },
        select: { email: true, email_verified: true },
      });

      if (!user || !user.email_verified) {
        throw new Error("User not found or email not verified");
      }

      return { valid: true, email: decoded.email };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Invalid token",
      };
    }
  }
  static async getRolePermissions(role: string) {
    const permissions = {
      FREE: { dailyRequests: 10 },
      PREMIUM: { dailyRequests: 50 },
      GOLD: { dailyRequests: -1 },
    };

    return permissions[role as keyof typeof permissions] ?? permissions.FREE;
  }

  static getCookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: SESSION_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
      path: "/",
    };
  }
}
