import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { authAPI } from "../services/api";
// 🔔 LOGIN NOTIFICATION — import for on-device popup (like WhatsApp) on every login
import { NotificationService } from "../services/notifications";
import type { User, SignUpData, SignInData, AuthResponse } from "../types";

// Import clearAllQueries dynamically to avoid cycles
const clearQueries = async () => {
  const { clearAllQueries } = await import("../services/queryClient");
  clearAllQueries();
};

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  isQuestionnaireCompleted: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  isEmailVerified: false,
  isQuestionnaireCompleted: false,
  error: null,
  isAuthenticated: false,
};

export const signUp = createAsyncThunk(
  "auth/signup",
  async (data: SignUpData, { rejectWithValue }) => {
    try {
      console.log("🔄 Starting sign up process...");
      const response = await authAPI.signUp(data);

      if (response.success) {
        console.log("✅ Sign up successful");
        return response;
      }

      return rejectWithValue(response.error || "Signup failed");
    } catch (error: any) {
      console.error("💥 Sign up error:", error);

      let errorMessage = "Signup failed";
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return rejectWithValue(errorMessage);
    }
  },
);

export const signIn = createAsyncThunk(
  "auth/signIn",
  async (data: SignInData, { rejectWithValue }) => {
    try {
      console.log("🔄 Starting sign in process...");
      const response = await authAPI.signIn(data);

      if (response.success && response.token && response.user) {
        console.log("✅ Sign in successful");

        // ============================================================
        // 🔔 LOGIN NOTIFICATION — pops up on device immediately
        //    (like a WhatsApp message) every time a user logs in.
        //    Uses expo-notifications (local, no Firebase needed).
        //    Fire-and-forget: never blocks or delays login.
        // ============================================================
        const userName = (response.user as any).name || "";
        const userLang = (response.user as any).preferred_lang === "HE" ? "he" : "en";
        const notifTitle =
          userLang === "he" ? "ברוך שובך! 👋" : `Welcome back${userName ? `, ${userName}` : ""}! 👋`;
        const notifBody =
          userLang === "he"
            ? "היום היא הזדמנות נהדרת להמשיך את המסע שלך!"
            : "Today is a great opportunity to continue your journey!";
        NotificationService.sendInstantNotification(notifTitle, notifBody, {
          type: "LOGIN",
          screen: "home",
        }).catch(() => {
          // Silently ignore — never block login on notification failure
        });
        // ============================================================

        return response;
      }

      return rejectWithValue(response.error || "Login failed");
    } catch (error: any) {
      console.error("💥 Sign in error:", error);

      let errorMessage = "Login failed";
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return rejectWithValue(errorMessage);
    }
  },
);

export const verifyEmail = createAsyncThunk(
  "auth/verifyEmail",
  async (data: { email: string; code: string }, { rejectWithValue }) => {
    try {
      console.log("🔄 Starting email verification process...");
      const response = await authAPI.verifyEmail(data.email, data.code);

      if (response.success && response.token && response.user) {
        console.log("✅ Email verification successful");
        return response;
      }

      return rejectWithValue(response.error || "Email verification failed");
    } catch (error: any) {
      console.error("💥 Email verification error:", error);

      let errorMessage = "Email verification failed";
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return rejectWithValue(errorMessage);
    }
  },
);

export const signOut = createAsyncThunk(
  "auth/signOut",
  async (_, { rejectWithValue, dispatch }) => {
    try {
      console.log("🔄 Starting comprehensive sign out process...");

      await clearQueries();
      console.log("✅ TanStack Query cache cleared");

      const AsyncStorage =
        require("@react-native-async-storage/async-storage").default;
      await AsyncStorage.clear();
      console.log("✅ AsyncStorage cleared");

      const { Platform } = require("react-native");
      if (Platform.OS !== "web") {
        try {
          const SecureStore = require("expo-secure-store");
          const keys = ["auth_token_secure", "user_data", "questionnaire_data"];
          for (const key of keys) {
            try {
              await SecureStore.deleteItemAsync(key);
            } catch (e) {
              // Key might not exist, continue
            }
          }
          console.log("✅ SecureStore cleared");
        } catch (error) {
          console.warn("⚠️ SecureStore cleanup failed:", error);
        }
      }

      if (Platform.OS === "web") {
        try {
          localStorage.clear();
          sessionStorage.clear();
          console.log("✅ Web storage cleared");
        } catch (error) {
          console.warn("⚠️ Web storage cleanup failed:", error);
        }
      }

      await authAPI.signOut();
      console.log("✅ API auth cleared");

      if (global.gc) {
        global.gc();
      }

      console.log("✅ Complete sign out successful - all data cleared");
      return true;
    } catch (error: any) {
      console.error("💥 SignOut error:", error);

      try {
        const AsyncStorage =
          require("@react-native-async-storage/async-storage").default;
        await AsyncStorage.clear();
        await clearQueries();
        await authAPI.signOut();

        const { Platform } = require("react-native");
        if (Platform.OS !== "web") {
          const SecureStore = require("expo-secure-store");
          const keys = ["auth_token_secure", "user_data", "questionnaire_data"];
          for (const key of keys) {
            try {
              await SecureStore.deleteItemAsync(key);
            } catch (e) {}
          }
        }

        console.log("✅ Forced cleanup completed despite errors");
      } catch (cleanupError) {
        console.error("💥 Even cleanup failed:", cleanupError);
      }

      return rejectWithValue(
        error instanceof Error ? error.message : "SignOut failed",
      );
    }
  },
);

export const loadStoredAuth = createAsyncThunk(
  "auth/loadStoredAuth",
  async (_, { rejectWithValue, dispatch }) => {
    try {
      console.log("🔄 Loading stored auth...");
      const token = await authAPI.getStoredToken();
      if (token) {
        console.log("✅ Found stored token, fetching user data...");
        try {
          // Fetch current user data to restore session completely
          const userData = await authAPI.getCurrentUser();
          if (userData.success && userData.user) {
            console.log("✅ User data restored:", userData.user.email);
            // Return both token and user for complete session restoration
            return { token, user: userData.user };
          }
        } catch (userError) {
          console.warn("⚠️ Could not fetch user data, token may be expired");
          // Token exists but is invalid/expired - clear it
          return null;
        }
      }
      console.log("ℹ️ No stored token found");
      return null;
    } catch (error) {
      console.error("💥 Load stored auth error:", error);
      return rejectWithValue("Failed to load stored auth");
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    forceSignOut: (state) => {
      console.log("🔄 Force sign out");
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isEmailVerified = false;
      state.isQuestionnaireCompleted = false;
      state.error = null;
    },
    // ✅ NEW: Update email verified status
    updateEmailVerified: (state, action: PayloadAction<boolean>) => {
      state.isEmailVerified = action.payload;
      if (state.user) {
        state.user.email_verified = action.payload;
      }
      console.log(
        "✅ [AuthSlice] Email verified status updated:",
        action.payload,
      );
    },
    // ✅ NEW: Update questionnaire completed status
    updateQuestionnaireCompleted: (state, action: PayloadAction<boolean>) => {
      state.isQuestionnaireCompleted = action.payload;
      if (state.user) {
        state.user.is_questionnaire_completed = action.payload;
      }
      console.log(
        "✅ [AuthSlice] Questionnaire completed status updated:",
        action.payload,
      );
    },
    updateUserSubscription: (
      state,
      action: PayloadAction<{ subscription_type: string }>,
    ) => {
      if (state.user) {
        state.user.subscription_type = action.payload.subscription_type as any;
        console.log(
          "✅ [AuthSlice] Subscription updated:",
          action.payload.subscription_type,
        );
      }
    },
    setQuestionnaireCompleted: (state) => {
      if (state.user) {
        state.user.is_questionnaire_completed = true;
        state.isQuestionnaireCompleted = true;
        console.log("✅ [AuthSlice] Questionnaire marked as completed");
      }
    },
    updateSubscription: (state, action) => {
      if (
        state.user &&
        state.user.subscription_type !== action.payload.subscription_type
      ) {
        state.user.subscription_type = action.payload.subscription_type;
        console.log(
          "✅ [AuthSlice] Subscription updated:",
          action.payload.subscription_type,
        );
      }
    },
    updateUserField: (
      state,
      action: PayloadAction<{ field: string; value: any }>,
    ) => {
      if (state.user) {
        (state.user as any)[action.payload.field] = action.payload.value;
        console.log(
          `✅ [AuthSlice] Updated ${action.payload.field} to:`,
          action.payload.value,
        );
      }
    },
    loginSuccess: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isEmailVerified = action.payload.user?.email_verified ?? false;
      state.isQuestionnaireCompleted =
        action.payload.user?.is_questionnaire_completed ?? false;
      state.isLoading = false;
      state.error = null;
    },
    setUser: (state, action) => {
      const newUserData = action.payload;
      const currentUserData = state.user;

      // Simple comparison for key fields to prevent unnecessary updates
      if (
        !currentUserData ||
        currentUserData.user_id !== newUserData.user_id ||
        currentUserData.email_verified !== newUserData.email_verified ||
        currentUserData.subscription_type !== newUserData.subscription_type ||
        currentUserData.is_questionnaire_completed !==
          newUserData.is_questionnaire_completed ||
        currentUserData.avatar_url !== newUserData.avatar_url ||
        currentUserData.is_admin !== newUserData.is_admin ||
        currentUserData.is_super_admin !== newUserData.is_super_admin ||
        currentUserData.level !== newUserData.level ||
        currentUserData.total_points !== newUserData.total_points ||
        currentUserData.current_xp !== newUserData.current_xp ||
        currentUserData.current_streak !== newUserData.current_streak ||
        currentUserData.best_streak !== newUserData.best_streak ||
        currentUserData.total_complete_days !==
          newUserData.total_complete_days ||
        currentUserData.active_meal_plan_id !==
          newUserData.active_meal_plan_id ||
        currentUserData.active_menu_id !== newUserData.active_menu_id
      ) {
        state.user = newUserData;
        state.isAuthenticated = true;
        state.isEmailVerified = newUserData?.email_verified ?? false;
        state.isQuestionnaireCompleted =
          newUserData?.is_questionnaire_completed ?? false;
        state.isLoading = false;
        state.error = null;
        console.log("✅ [AuthSlice] User object updated:", {
          email: newUserData?.email,
          email_verified: newUserData?.email_verified,
          is_questionnaire_completed: newUserData?.is_questionnaire_completed,
          subscription_type: newUserData?.subscription_type,
        });
      }
    },
    setToken: (state, action) => {
      state.token = action.payload;
    },
    signOut: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isEmailVerified = false;
      state.isQuestionnaireCompleted = false;
      state.isLoading = false;
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        // Sync the flags if these fields are updated
        if ("email_verified" in action.payload) {
          state.isEmailVerified = action.payload.email_verified ?? false;
        }
        if ("is_questionnaire_completed" in action.payload) {
          state.isQuestionnaireCompleted =
            action.payload.is_questionnaire_completed ?? false;
        }
        console.log("✅ [AuthSlice] User partially updated:", action.payload);
      }
    },
    setMealsPerDay: (state, action: PayloadAction<number>) => {
      if (state.user) {
        state.user.meals_per_day = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signUp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signUp.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.needsEmailVerification) {
          state.user = null;
          state.token = null;
          state.isAuthenticated = false;
          state.isEmailVerified = false;
          state.isQuestionnaireCompleted = false;
          console.log("✅ Sign up successful - awaiting email verification");
        } else {
          state.user = action.payload.user || null;
          state.token = action.payload.token || null;
          state.isAuthenticated = true;
          state.isEmailVerified = action.payload.user?.email_verified ?? false;
          state.isQuestionnaireCompleted =
            action.payload.user?.is_questionnaire_completed ?? false;
          console.log("✅ Sign up state updated");
        }
        state.error = null;
      })
      .addCase(signUp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.isEmailVerified = false;
        state.isQuestionnaireCompleted = false;
        console.log("❌ Sign up failed:", action.payload);
      })
      .addCase(signIn.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user || null;
        state.token = action.payload.token || null;
        state.isAuthenticated = true;
        state.isEmailVerified = action.payload.user?.email_verified ?? false;
        state.isQuestionnaireCompleted =
          action.payload.user?.is_questionnaire_completed ?? false;
        state.error = null;
        console.log("✅ Sign in state updated");
        console.log(
          "👤 User data stored in Redux:",
          JSON.stringify(action.payload.user, null, 2),
        );
        console.log("🔑 Admin fields:", {
          is_admin: action.payload.user?.is_admin,
          is_super_admin: action.payload.user?.is_super_admin,
        });
      })
      .addCase(signIn.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.isEmailVerified = false;
        state.isQuestionnaireCompleted = false;
        console.log("❌ Sign in failed:", action.payload);
      })
      .addCase(signOut.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isEmailVerified = false;
        state.isQuestionnaireCompleted = false;
        state.error = null;
        state.isLoading = false;
        console.log("✅ Sign out state updated");
      })
      .addCase(signOut.rejected, (state, action) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isEmailVerified = false;
        state.isQuestionnaireCompleted = false;
        state.isLoading = false;
        state.error = action.payload as string;
        console.log("⚠️ Sign out failed but state cleared:", action.payload);
      })
      .addCase(loadStoredAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadStoredAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload && typeof action.payload === "object") {
          // New format: { token, user }
          state.token = action.payload.token;
          state.user = action.payload.user;
          state.isAuthenticated = true;
          state.isEmailVerified = action.payload.user?.email_verified ?? false;
          state.isQuestionnaireCompleted =
            action.payload.user?.is_questionnaire_completed ?? false;
          console.log("✅ Session fully restored:", {
            email: action.payload.user?.email,
            email_verified: action.payload.user?.email_verified,
            questionnaire: action.payload.user?.is_questionnaire_completed,
          });
        } else if (action.payload) {
          // Legacy format: just token (shouldn't happen now)
          state.token = action.payload as string;
          state.isAuthenticated = true;
          state.isEmailVerified = false;
          state.isQuestionnaireCompleted = false;
          console.log("✅ Token loaded (legacy format)");
        } else {
          // No auth found
          state.isAuthenticated = false;
          state.isEmailVerified = false;
          state.isQuestionnaireCompleted = false;
          console.log("ℹ️ No stored auth found");
        }
      })
      .addCase(loadStoredAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.isEmailVerified = false;
        state.isQuestionnaireCompleted = false;
        state.error = action.payload as string;
        console.log("❌ Load stored auth failed:", action.payload);
      })
      .addCase(verifyEmail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyEmail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user || null;
        state.token = action.payload.token || null;
        state.isAuthenticated = true;
        state.isEmailVerified = true; // Email is now verified!
        state.isQuestionnaireCompleted =
          action.payload.user?.is_questionnaire_completed ?? false;
        state.error = null;
        console.log("✅ Email verification state updated");

        if (action.payload.token) {
          const { Platform } = require("react-native");
          if (Platform.OS !== "web") {
            const SecureStore = require("expo-secure-store");
            SecureStore.setItemAsync("auth_token_secure", action.payload.token)
              .then(() => {
                console.log(
                  "✅ Token stored in SecureStore after verification",
                );
              })
              .catch((error: any) => {
                console.error(
                  "❌ Failed to store token in SecureStore:",
                  error,
                );
              });
          }
        }
      })
      .addCase("auth/forceSignOut" as any, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isEmailVerified = false;
        state.isQuestionnaireCompleted = false;
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.isEmailVerified = false;
        console.log("❌ Email verification failed:", action.payload);
      });
  },
});

export const {
  clearError,
  forceSignOut,
  updateEmailVerified,
  updateQuestionnaireCompleted,
  updateUserSubscription,
  setQuestionnaireCompleted,
  updateSubscription,
  updateUserField,
  loginSuccess,
  setUser,
  setToken,
  updateUser,
  setMealsPerDay,
} = authSlice.actions;

export default authSlice.reducer;
