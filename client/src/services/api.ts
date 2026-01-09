import axios, { AxiosInstance, AxiosError } from "axios";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  SignUpData,
  SignInData,
  MealAnalysisData,
  QuestionnaireData,
} from "../types";

// ==================== PERFORMANCE OPTIMIZATIONS ====================

// 1. In-memory token cache to avoid async storage reads on every request
let cachedToken: string | null = null;
let tokenCacheTimestamp: number = 0;
const TOKEN_CACHE_DURATION = 60000; // 1 minute cache

// 2. Request queue for batching similar requests
const requestQueue: Map<string, Promise<any>> = new Map();

// 3. Response cache with TTL
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}
const responseCache: Map<string, CacheEntry> = new Map();

// 4. Parallel request limiter to prevent overwhelming the server
const MAX_PARALLEL_REQUESTS = 6;
let activeRequests = 0;
const requestQueue2: Array<() => Promise<any>> = [];

// ==================== HELPER FUNCTIONS ====================

// Fast token retrieval with cache
const getStoredToken = async (): Promise<string | null> => {
  const now = Date.now();

  // Return cached token if still valid
  if (cachedToken && now - tokenCacheTimestamp < TOKEN_CACHE_DURATION) {
    return cachedToken;
  }

  try {
    const token =
      Platform.OS === "web"
        ? localStorage.getItem("auth_token")
        : await SecureStore.getItemAsync("auth_token_secure");

    // Update cache
    cachedToken = token;
    tokenCacheTimestamp = now;

    return token;
  } catch (error) {
    console.error("Error getting stored token:", error);
    return null;
  }
};

const setStoredToken = async (token: string): Promise<void> => {
  try {
    // Update cache immediately
    cachedToken = token;
    tokenCacheTimestamp = Date.now();

    // Store asynchronously without awaiting
    if (Platform.OS === "web") {
      localStorage.setItem("auth_token", token);
    } else {
      SecureStore.setItemAsync("auth_token_secure", token).catch(console.error);
    }
  } catch (error) {
    console.error("Error storing token:", error);
    throw new APIError("Failed to store authentication token");
  }
};

const clearStoredToken = async (): Promise<void> => {
  // Clear cache immediately
  cachedToken = null;
  tokenCacheTimestamp = 0;

  try {
    if (Platform.OS === "web") {
      localStorage.removeItem("auth_token");
    } else {
      await SecureStore.deleteItemAsync("auth_token_secure");
    }
  } catch (error) {
    console.error("Error clearing token:", error);
  }
};

// Generate cache key for requests
const getCacheKey = (method: string, url: string, params?: any): string => {
  return `${method}:${url}:${JSON.stringify(params || {})}`;
};

// Get cached response if valid
const getCachedResponse = (cacheKey: string): any | null => {
  const entry = responseCache.get(cacheKey);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    responseCache.delete(cacheKey);
    return null;
  }

  return entry.data;
};

// Set cached response
const setCachedResponse = (cacheKey: string, data: any, ttl: number): void => {
  responseCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    ttl,
  });
};

// Request deduplication - prevent multiple identical requests
const deduplicateRequest = async <T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> => {
  // If same request is already in flight, return that promise
  if (requestQueue.has(key)) {
    return requestQueue.get(key) as Promise<T>;
  }

  const promise = requestFn().finally(() => {
    requestQueue.delete(key);
  });

  requestQueue.set(key, promise);
  return promise;
};

// Parallel request throttling
const throttleRequest = async <T>(requestFn: () => Promise<T>): Promise<T> => {
  if (activeRequests >= MAX_PARALLEL_REQUESTS) {
    // Queue the request
    return new Promise((resolve, reject) => {
      requestQueue2.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  activeRequests++;

  try {
    const result = await requestFn();
    return result;
  } finally {
    activeRequests--;

    // Process next queued request
    if (requestQueue2.length > 0) {
      const nextRequest = requestQueue2.shift();
      if (nextRequest) {
        nextRequest();
      }
    }
  }
};

// ==================== ERROR HANDLING ====================

class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "APIError";
  }
}

// ==================== API CONFIGURATION ====================

const getApiBaseUrl = (): string => {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;

  console.log("🌐 API Base URL:", baseUrl); // DEBUG

  if (!baseUrl) {
    console.error("❌ EXPO_PUBLIC_API_URL is not set!");
    console.error("Available env vars:", Object.keys(process.env));
    throw new Error("API_URL environment variable is not configured");
  }

  return baseUrl;
};
// ==================== AXIOS INSTANCE ====================

const createApiInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 10000, // Reduced from 15s to 10s for faster failures
    withCredentials: Platform.OS === "web",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    // Enable HTTP/2 multiplexing if available
    httpAgent: undefined,
    httpsAgent: undefined,
  });

  // Optimized request interceptor
  instance.interceptors.request.use(
    async (config) => {
      // Use cached token to avoid async storage read
      const token = await getStoredToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Optimized response interceptor with faster retry logic
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as any;

      // Fast fail for non-retryable errors
      if (error.response?.status === 400 || error.response?.status === 404) {
        return Promise.reject(error);
      }

      // Handle 401 errors
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        await clearStoredToken();

        // Don't await these - fire and forget for speed
        import("../store").then(({ store }) => {
          import("../store/authSlice").then(({ signOut }) => {
            store.dispatch(signOut());
          });
        });

        import("expo-router").then(({ router }) => {
          router.replace("/(auth)/welcome");
        });
      }

      // Single retry for network errors only
      if (!error.response && !originalRequest._retry) {
        originalRequest._retry = true;

        // Immediate retry without delay
        return instance(originalRequest);
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

const api = createApiInstance();

// ==================== API SERVICES ====================

export const authAPI = {
  async signUp(data: SignUpData): Promise<any> {
    const response = await api.post("/auth/signup", data);
    if (!response.data.success) {
      throw new APIError(response.data.error || "Signup failed");
    }
    return response.data;
  },

  async signIn(data: SignInData): Promise<any> {
    const response = await api.post("/auth/signin", data);
    if (response.data.success && response.data.token) {
      // Store token without awaiting
      setStoredToken(response.data.token);
      return response.data;
    }
    throw new APIError(response.data.error || "Signin failed");
  },

  async verifyEmail(email: string, code: string): Promise<any> {
    const response = await api.post("/auth/verify-email", { email, code });
    if (response.data.success && response.data.token) {
      setStoredToken(response.data.token);
      return response.data;
    }
    throw new APIError(response.data.error || "Email verification failed");
  },

  signOut: async (): Promise<void> => {
    await clearStoredToken();
    delete api.defaults.headers.common["Authorization"];
  },

  uploadAvatar: async (base64Image: string): Promise<any> => {
    const response = await api.post("/user/avatar", {
      avatar_base64: base64Image,
    });
    return response.data;
  },

  async getStoredToken(): Promise<string | null> {
    return getStoredToken();
  },

  async getCurrentUser(): Promise<any> {
    // Cache user data for 30 seconds
    const cacheKey = getCacheKey("GET", "/auth/me");
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    const response = await api.get("/auth/me");
    setCachedResponse(cacheKey, response.data, 30000);
    return response.data;
  },
};

// ==================== DAILY GOALS API ====================

export const dailyGoalsAPI = {
  async getDailyGoals(): Promise<any> {
    // Cache for 5 minutes
    const cacheKey = getCacheKey("GET", "/daily-goals");
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    return deduplicateRequest(cacheKey, async () => {
      const response = await api.get("/daily-goals");
      if (!response.data.success) {
        throw new APIError(
          response.data.error || "Failed to fetch daily goals"
        );
      }
      setCachedResponse(cacheKey, response.data, 300000);
      return response.data;
    });
  },

  async getHistoricalGoals(startDate: string, endDate: string): Promise<any> {
    const cacheKey = getCacheKey("GET", "/daily-goals/history", {
      startDate,
      endDate,
    });
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    return deduplicateRequest(cacheKey, async () => {
      const response = await api.get("/daily-goals/history", {
        params: { startDate, endDate },
      });
      if (!response.data.success) {
        throw new APIError(
          response.data.error || "Failed to fetch historical goals"
        );
      }
      setCachedResponse(cacheKey, response.data, 600000); // 10 min cache
      return response.data;
    });
  },

  async getDailyGoalByDate(date: string): Promise<any> {
    const cacheKey = getCacheKey("GET", `/daily-goals/by-date/${date}`);
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    const response = await api.get(`/daily-goals/by-date/${date}`);
    if (!response.data.success) {
      throw new APIError(response.data.error || "Failed to fetch daily goal");
    }
    setCachedResponse(cacheKey, response.data, 300000);
    return response.data;
  },

  async createDailyGoals(): Promise<any> {
    const response = await api.put("/daily-goals");
    if (!response.data.success) {
      throw new APIError(response.data.error || "Failed to create daily goals");
    }
    // Invalidate cache
    responseCache.clear();
    return response.data;
  },

  async verifyDailyGoals(): Promise<any> {
    const response = await api.get("/daily-goals/verify");
    if (!response.data.success) {
      throw new APIError(response.data.error || "Failed to verify daily goals");
    }
    return response.data;
  },
};

// ==================== NUTRITION API ====================

export const nutritionAPI = {
  async analyzeMeal(
    imageBase64: string,
    updateText?: string,
    editedIngredients: any[] = [],
    language: string = "english",
    mealPeriod?: string
  ): Promise<any> {
    if (!imageBase64?.trim()) {
      throw new APIError("Image data is required");
    }

    // No caching for meal analysis - always fresh
    const response = await api.post(
      "/nutrition/analyze",
      {
        imageBase64: imageBase64.trim(),
        updateText,
        editedIngredients,
        language,
        mealPeriod,
      },
      {
        timeout: 30000, // 30s timeout
      }
    );

    if (!response.data.success) {
      throw new APIError(response.data.error || "Analysis failed");
    }
    return response.data;
  },

  isRetryableError(error: any): boolean {
    return (
      error.code === "ERR_NETWORK" ||
      error.message?.includes("Network Error") ||
      error.response?.status >= 500 ||
      error.code === "ECONNABORTED"
    );
  },

  async addShoppingItem(
    name: string,
    quantity: number = 1,
    unit: string = "pieces",
    category: string = "Manual"
  ): Promise<any> {
    const response = await api.post("/shopping-lists", {
      name: name.trim(),
      quantity,
      unit,
      category,
      added_from: "manual",
    });

    if (!response.data.success) {
      throw new APIError(response.data.error || "Failed to add item");
    }
    return response.data;
  },

  async saveMeal(
    mealData: MealAnalysisData,
    imageBase64?: string
  ): Promise<any> {
    const response = await api.post("/nutrition/save", {
      mealData,
      imageBase64,
    });

    if (!response.data.success) {
      throw new APIError(response.data.error || "Failed to save meal");
    }

    // Invalidate meals cache
    Array.from(responseCache.keys())
      .filter((key) => key.includes("/nutrition/meals"))
      .forEach((key) => responseCache.delete(key));

    return response.data.data;
  },

  async getMeals(offset: number = 0, limit: number = 100): Promise<any[]> {
    const cacheKey = getCacheKey("GET", "/nutrition/meals", { offset, limit });
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    return deduplicateRequest(cacheKey, async () => {
      const response = await api.get(
        `/nutrition/meals?offset=${offset}&limit=${limit}`
      );
      if (!response.data.success) {
        throw new APIError(response.data.error || "Failed to fetch meals");
      }
      setCachedResponse(cacheKey, response.data.data, 60000); // 1 min cache
      return response.data.data;
    });
  },

  async updateMeal(mealId: string, updateText: string): Promise<any> {
    const response = await api.put("/nutrition/update", {
      meal_id: mealId,
      updateText,
    });

    if (!response.data.success) {
      throw new APIError(response.data.error || "Failed to update meal");
    }

    // Invalidate cache
    responseCache.clear();
    return response.data;
  },

  async getDailyStats(date: string): Promise<any> {
    const cacheKey = getCacheKey("GET", "/nutrition/stats/daily", { date });
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    try {
      const response = await api.get(`/nutrition/stats/daily?date=${date}`);
      const data = response.data.success
        ? response.data.data
        : {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            meal_count: 0,
          };
      setCachedResponse(cacheKey, data, 60000); // 1 min cache
      return data;
    } catch (error) {
      return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        meal_count: 0,
      };
    }
  },

  async getRangeStatistics(startDate: string, endDate: string): Promise<any> {
    const cacheKey = getCacheKey("GET", "/nutrition/stats/range", {
      startDate,
      endDate,
    });
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    return deduplicateRequest(cacheKey, async () => {
      const response = await api.get("/nutrition/stats/range", {
        params: { startDate, endDate },
        timeout: 20000,
      });
      setCachedResponse(cacheKey, response.data, 300000); // 5 min cache
      return response.data;
    });
  },

  async saveMealFeedback(mealId: string, feedback: any): Promise<any> {
    const response = await api.post(
      `/nutrition/meals/${mealId}/feedback`,
      feedback
    );
    return response.data;
  },

  async toggleMealFavorite(mealId: string): Promise<any> {
    const response = await api.post(`/nutrition/meals/${mealId}/favorite`);
    responseCache.clear();
    return response.data;
  },

  async duplicateMeal(mealId: string, newDate?: string): Promise<any> {
    const response = await api.post(`/nutrition/meals/${mealId}/duplicate`, {
      newDate: newDate || new Date().toISOString().split("T")[0],
    });
    responseCache.clear();
    return response.data;
  },

  async removeMeal(mealId: string): Promise<void> {
    await api.delete(`/nutrition/meals/${mealId}`);
    responseCache.clear();
  },

  async getUsageStats(): Promise<any> {
    const cacheKey = getCacheKey("GET", "/nutrition/usage-stats");
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    try {
      const response = await api.get("/nutrition/usage-stats");
      if (response.data.success) {
        setCachedResponse(cacheKey, response.data.data, 300000);
        return response.data.data;
      }
    } catch (error) {
      // Return default
    }

    return {
      meal_scans_used: 0,
      meal_scans_limit: 100,
      ai_requests_used: 0,
      ai_requests_limit: 1000,
    };
  },

  async trackWaterIntake(cups: number, date?: string): Promise<any> {
    const response = await api.post("/nutrition/water-intake", {
      cups_consumed: cups,
      date: date || new Date().toISOString().split("T")[0],
    });

    if (!response.data.success) {
      throw new APIError(response.data.error || "Failed to track water intake");
    }

    // Invalidate water cache
    Array.from(responseCache.keys())
      .filter((key) => key.includes("/nutrition/water-intake"))
      .forEach((key) => responseCache.delete(key));

    return response.data;
  },

  async getWaterIntake(date: string): Promise<any> {
    const cacheKey = getCacheKey("GET", `/nutrition/water-intake/${date}`);
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    try {
      const response = await api.get(`/nutrition/water-intake/${date}`);
      if (response.data.success) {
        setCachedResponse(cacheKey, response.data.data, 30000);
        return response.data.data;
      }
    } catch (error) {
      // Return default
    }

    return { cups_consumed: 0, milliliters_consumed: 0 };
  },

  async addManualMeal(mealData: any): Promise<any> {
    const response = await api.post("/nutrition/meals/manual", mealData);
    if (!response.data.success) {
      throw new APIError(response.data.error || "Failed to add manual meal");
    }
    responseCache.clear();
    return response;
  },
};

// ==================== USER API ====================

export const userAPI = {
  async updateProfile(profileData: any): Promise<any> {
    const response = await api.put("/user/profile", profileData);
    responseCache.clear();
    return response.data;
  },

  updateSubscription: async (subscriptionType: string) => {
    const response = await api.put("/user/subscription", {
      subscription_type: subscriptionType,
    });
    responseCache.clear();
    return response.data;
  },

  deleteAccount: async () => {
    const response = await api.delete("/user/delete");
    return response.data;
  },

  requestPasswordChange: async () => {
    const response = await api.post("/user/request-password-change");
    return response.data;
  },

  changePassword: async (verificationCode: string, newPassword: string) => {
    const response = await api.post("/user/change-password", {
      verificationCode,
      newPassword,
    });
    return response.data;
  },

  getUserProfile: async (): Promise<any> => {
    const cacheKey = getCacheKey("GET", "/user/profile");
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    const response = await api.get("/user/profile");
    if (!response.data.success) {
      throw new APIError(response.data.error || "Failed to fetch profile");
    }

    const result = {
      success: true,
      data: response.data.data,
    };
    setCachedResponse(cacheKey, result, 300000);
    return result;
  },

  getUserStats: async (): Promise<any> => {
    const cacheKey = getCacheKey("GET", "/user/stats");
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    try {
      const response = await api.get("/user/stats", { timeout: 5000 });
      if (response.data.success) {
        setCachedResponse(cacheKey, response.data.data, 60000);
        return response.data.data;
      }
    } catch (error) {
      // Return defaults
    }

    return {
      totalMeals: 0,
      todayWaterIntake: 0,
      totalAchievements: 0,
      streak: 0,
      memberSince: new Date(),
      subscriptionType: "free",
      questionnaireCompleted: false,
    };
  },

  async uploadAvatar(base64Image: string): Promise<any> {
    const response = await api.post("/user/avatar", {
      avatar_base64: base64Image,
    });
    if (!response.data.success) {
      throw new APIError(response.data.error || "Failed to upload avatar");
    }
    responseCache.clear();
    return response.data;
  },

  async getGlobalStatistics(): Promise<any> {
    const response = await api.get("/user/global-statistics");
    return response.data;
  },

  async getAIRecommendations(): Promise<any> {
    const cacheKey = getCacheKey("GET", "/recommendations/today");
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    const response = await api.get("/recommendations/today");
    setCachedResponse(cacheKey, response.data, 300000);
    return response.data;
  },

  async forgotPassword(email: string): Promise<any> {
    const response = await api.post("/auth/forgot-password", { email });
    if (!response.data.success) {
      throw new APIError(response.data.error || "Failed to send reset email");
    }
    return response.data;
  },

  async verifyResetCode(email: string, code: string): Promise<any> {
    const response = await api.post("/auth/verify-reset-code", { email, code });
    if (!response.data.success) {
      throw new APIError(response.data.error || "Invalid reset code");
    }
    return response.data;
  },

  async resetPassword(token: string, newPassword: string): Promise<any> {
    const response = await api.post("/auth/reset-password", {
      token,
      newPassword,
    });
    if (!response.data.success) {
      throw new APIError(response.data.error || "Failed to reset password");
    }
    return response.data;
  },
};

// ==================== QUESTIONNAIRE API ====================

export const questionnaireAPI = {
  async saveQuestionnaire(data: QuestionnaireData): Promise<any> {
    const response = await api.post("/questionnaire", data);
    if (!response.data.success) {
      throw new APIError(response.data.error || "Failed to save questionnaire");
    }
    return response.data;
  },

  async getQuestionnaire(): Promise<any> {
    const response = await api.get("/questionnaire");
    return response.data;
  },
};

// ==================== CHAT API ====================

export const chatAPI = {
  async sendMessage(
    message: string,
    language: string = "hebrew"
  ): Promise<any> {
    if (!message?.trim()) {
      throw new APIError("Message cannot be empty");
    }

    const response = await api.post("/chat/message", {
      message: message.trim(),
      language,
    });

    if (!response.data.success) {
      throw new APIError(response.data.error || "Failed to send message");
    }
    return response.data;
  },

  async getChatHistory(limit: number = 50): Promise<any> {
    const cacheKey = getCacheKey("GET", "/chat/history", { limit });
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    try {
      const response = await api.get(`/chat/history?limit=${limit}`);
      setCachedResponse(cacheKey, response.data, 60000);
      return response.data;
    } catch (error) {
      return { success: false, data: [] };
    }
  },

  async clearHistory(): Promise<any> {
    const response = await api.delete("/chat/history");
    responseCache.clear();
    return response.data;
  },
};

// ==================== CALENDAR API ====================

export const calendarAPI = {
  async getCalendarData(year: number, month: number): Promise<any> {
    const cacheKey = getCacheKey("GET", `/calendar/data/${year}/${month}`);
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    return throttleRequest(async () => {
      return deduplicateRequest(cacheKey, async () => {
        const response = await api.get(`/calendar/data/${year}/${month}`, {
          timeout: 10000,
        });

        if (!response.data.success) {
          throw new APIError(
            response.data.error || "Failed to fetch calendar data"
          );
        }

        const data = response.data.data || {};
        setCachedResponse(cacheKey, data, 300000); // 5 min cache
        return data;
      });
    });
  },

  async getStatistics(year: number, month: number): Promise<any> {
    const cacheKey = getCacheKey(
      "GET",
      `/calendar/statistics/${year}/${month}`
    );
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    return deduplicateRequest(cacheKey, async () => {
      const response = await api.get(`/calendar/statistics/${year}/${month}`, {
        timeout: 10000,
      });

      if (!response.data.success) {
        throw new APIError(response.data.error || "Failed to fetch statistics");
      }

      setCachedResponse(cacheKey, response.data.data, 300000);
      return response.data.data;
    });
  },

  async addEvent(
    date: string,
    title: string,
    type: string,
    description?: string
  ): Promise<any> {
    const response = await api.post("/calendar/events", {
      date,
      title,
      type,
      description,
    });
    if (!response.data.success) {
      throw new APIError("Failed to add event");
    }

    // Invalidate calendar cache
    Array.from(responseCache.keys())
      .filter((key) => key.includes("/calendar/"))
      .forEach((key) => responseCache.delete(key));

    return response.data.data;
  },

  async getEventsForDate(date: string): Promise<any[]> {
    try {
      const response = await api.get(`/calendar/events/${date}`);
      return response.data.success ? response.data.data : [];
    } catch (error) {
      return [];
    }
  },

  async deleteEvent(eventId: string): Promise<void> {
    await api.delete(`/calendar/events/${eventId}`);
    responseCache.clear();
  },

  async getEnhancedStatistics(year: number, month: number): Promise<any> {
    const cacheKey = getCacheKey(
      "GET",
      `/calendar/statistics/enhanced/${year}/${month}`
    );
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    const response = await api.get(
      `/calendar/statistics/enhanced/${year}/${month}`,
      {
        timeout: 15000,
      }
    );

    if (!response.data.success) {
      throw new APIError(
        response.data.error || "Failed to fetch enhanced statistics"
      );
    }

    setCachedResponse(cacheKey, response.data.data, 300000);
    return response.data.data;
  },
};

// ==================== MEAL API ====================

export const mealAPI = {
  async deleteMeal(mealId: string): Promise<void> {
    await api.delete(`/nutrition/meals/${mealId}`);

    // Invalidate meals cache
    Array.from(responseCache.keys())
      .filter((key) => key.includes("/nutrition/meals"))
      .forEach((key) => responseCache.delete(key));
  },

  async updateMeal(mealId: string, updateData: any): Promise<any> {
    const response = await api.put(`/nutrition/meals/${mealId}`, updateData);

    // Invalidate meals cache
    Array.from(responseCache.keys())
      .filter((key) => key.includes("/nutrition/meals"))
      .forEach((key) => responseCache.delete(key));

    return response.data;
  },
};

// ==================== MEAL PLAN API ====================

export const mealPlanAPI = {
  async getCurrentMealPlan(): Promise<any> {
    const cacheKey = getCacheKey("GET", "/meal-plans/current");
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    return deduplicateRequest(cacheKey, async () => {
      const response = await api.get("/meal-plans/current");
      if (!response.data.success) {
        throw new APIError(
          response.data.error || "Failed to fetch current meal plan"
        );
      }
      setCachedResponse(cacheKey, response.data, 300000); // 5 min cache
      return response.data;
    });
  },

  async getMealPlanById(planId: string): Promise<any> {
    const cacheKey = getCacheKey("GET", `/meal-plans/${planId}`);
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    const response = await api.get(`/meal-plans/${planId}`);
    if (!response.data.success) {
      throw new APIError(response.data.error || "Failed to fetch meal plan");
    }
    setCachedResponse(cacheKey, response.data, 300000);
    return response.data;
  },

  async getRecommendedMenus(): Promise<any> {
    const cacheKey = getCacheKey("GET", "/meal-plans/recommended");
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    const response = await api.get("/meal-plans/recommended");
    if (!response.data.success) {
      throw new APIError(
        response.data.error || "Failed to fetch recommended menus"
      );
    }
    setCachedResponse(cacheKey, response.data, 600000); // 10 min cache
    return response.data;
  },

  async activateMealPlan(planId: string): Promise<any> {
    const response = await api.post(`/meal-plans/${planId}/activate`);
    if (!response.data.success) {
      throw new APIError(response.data.error || "Failed to activate meal plan");
    }

    // Invalidate meal plan cache
    Array.from(responseCache.keys())
      .filter((key) => key.includes("/meal-plans"))
      .forEach((key) => responseCache.delete(key));

    return response.data;
  },

  async replaceMealInPlan(
    planId: string,
    dayOfWeek: number,
    mealTiming: string,
    preferences: any
  ): Promise<any> {
    const response = await api.put(
      `/meal-plans/${planId}/replace`,
      {
        day_of_week: dayOfWeek,
        meal_timing: mealTiming,
        meal_order: 0,
        preferences: preferences,
      },
      {
        timeout: 12000, // 12 second timeout
      }
    );

    if (!response.data.success) {
      throw new APIError(response.data.error || "Failed to replace meal");
    }

    // Invalidate meal plan cache
    responseCache.delete(getCacheKey("GET", `/meal-plans/${planId}`));
    responseCache.delete(getCacheKey("GET", "/meal-plans/current"));

    return response.data;
  },

  async completeMealPlan(planId: string, feedback: any): Promise<any> {
    const response = await api.post(`/meal-plans/${planId}/complete`, feedback);
    if (!response.data.success) {
      throw new APIError(response.data.error || "Failed to complete meal plan");
    }
    responseCache.clear();
    return response.data;
  },

  async swapMeal(planId: string, swapRequest: any): Promise<any> {
    const response = await api.post(
      `/meal-plans/${planId}/swap-meal`,
      swapRequest
    );
    if (!response.data.success) {
      throw new APIError(response.data.error || "Failed to swap meal");
    }

    // Invalidate meal plan cache
    responseCache.delete(getCacheKey("GET", `/meal-plans/${planId}`));
    responseCache.delete(getCacheKey("GET", "/meal-plans/current"));

    return response.data;
  },
};

// ==================== UTILITY FUNCTIONS ====================

// Clear all cache (useful for logout or data refresh)
export const clearCache = (): void => {
  responseCache.clear();
  cachedToken = null;
  tokenCacheTimestamp = 0;
};

// Prefetch data for better UX
export const prefetchData = {
  async dailyGoals(): Promise<void> {
    dailyGoalsAPI.getDailyGoals().catch(console.error);
  },

  async todayStats(): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    nutritionAPI.getDailyStats(today).catch(console.error);
  },

  async userProfile(): Promise<void> {
    userAPI.getUserProfile().catch(console.error);
  },

  async allHomeScreenData(): Promise<void> {
    // Prefetch all data needed for home screen in parallel
    Promise.all([
      this.dailyGoals(),
      this.todayStats(),
      nutritionAPI.getMeals(0, 10),
      userAPI.getUserStats(),
    ]).catch(console.error);
  },
};

// Export main API instance
export { api };

// Export error class
export { APIError };

// Export cache utilities
