import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { QuestionnaireData } from "../types";
import { questionnaireAPI, authAPI } from "../services/api";

interface QuestionnaireState {
  questionnaire: QuestionnaireData | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

const initialState: QuestionnaireState = {
  questionnaire: null,
  isLoading: false,
  isSaving: false,
  error: null,
};

export const fetchQuestionnaire = createAsyncThunk(
  "questionnaire/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const response = await questionnaireAPI.getQuestionnaire();
      const data = response.data?.data || response.data;

      // If no questionnaire data found, return null instead of throwing error
      if (!data && response.data?.message === "No questionnaire found") {
        return null;
      }

      return data;
    } catch (error: any) {
      console.error("Fetch questionnaire error:", error);
      return rejectWithValue(
        error.response?.data?.error ||
          error.message ||
          "Failed to fetch questionnaire"
      );
    }
  }
);

export const saveQuestionnaire = createAsyncThunk(
  "questionnaire/save",
  async (
    questionnaireData: QuestionnaireData & { isEditMode?: boolean },
    { rejectWithValue, dispatch, getState }
  ) => {
    try {
      const state = getState() as { questionnaire: QuestionnaireState };
      const existingQuestionnaire = state.questionnaire.questionnaire;

      console.log("📝 [QuestionnaireSlice] Starting save...", {
        isEditMode: questionnaireData.isEditMode,
        hasExistingData: !!existingQuestionnaire,
      });

      // If in edit mode and we have existing data, merge the changes
      let dataToSave = questionnaireData;
      if (questionnaireData.isEditMode && existingQuestionnaire) {
        dataToSave = {
          ...existingQuestionnaire,
          ...questionnaireData,
          isEditMode: questionnaireData.isEditMode,
        };
      }

      // Save the questionnaire
      const response = await questionnaireAPI.saveQuestionnaire(dataToSave);
      console.log("✅ [QuestionnaireSlice] Questionnaire saved successfully");

      // ✅ CRITICAL FIX: Update auth state immediately after save
      // This ensures the routing logic picks up the change
      if (!questionnaireData.isEditMode) {
        console.log("🔄 [QuestionnaireSlice] Updating user state...");

        try {
          // Method 1: Dispatch action to update user state
          dispatch({
            type: "auth/updateUserField",
            payload: {
              field: "is_questionnaire_completed",
              value: true,
            },
          });

          console.log(
            "✅ [QuestionnaireSlice] User state updated via dispatch"
          );

          // Method 2: Fetch fresh user data from server
          // This ensures we have the latest state
          const userResponse = await authAPI.getCurrentUser();
          if (userResponse.success && userResponse.data) {
            dispatch({
              type: "auth/setUser",
              payload: userResponse.data,
            });
            console.log("✅ [QuestionnaireSlice] Fresh user data fetched:", {
              is_questionnaire_completed:
                userResponse.data.is_questionnaire_completed,
              subscription_type: userResponse.data.subscription_type,
            });
          }
        } catch (updateError) {
          console.error(
            "⚠️ [QuestionnaireSlice] Failed to update user state:",
            updateError
          );
          // Don't throw - questionnaire was saved successfully
          // The user can still proceed
        }
      }

      return response.data?.questionnaire || response.data;
    } catch (error: any) {
      console.error("❌ [QuestionnaireSlice] Save error:", error);
      return rejectWithValue(
        error.response?.data?.error ||
          error.message ||
          "Failed to save questionnaire"
      );
    }
  }
);

const questionnaireSlice = createSlice({
  name: "questionnaire",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateQuestionnaireData: (
      state,
      action: PayloadAction<Partial<QuestionnaireData>>
    ) => {
      if (state.questionnaire) {
        state.questionnaire = { ...state.questionnaire, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch questionnaire
      .addCase(fetchQuestionnaire.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchQuestionnaire.fulfilled, (state, action) => {
        state.isLoading = false;
        state.questionnaire = action.payload;
      })
      .addCase(fetchQuestionnaire.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Save questionnaire
      .addCase(saveQuestionnaire.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(saveQuestionnaire.fulfilled, (state, action) => {
        state.isSaving = false;
        state.questionnaire = action.payload;
        console.log("✅ [QuestionnaireSlice] State updated in Redux");
      })
      .addCase(saveQuestionnaire.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
        console.error("❌ [QuestionnaireSlice] Save rejected:", action.payload);
      });
  },
});

export const { clearError, updateQuestionnaireData } =
  questionnaireSlice.actions;
export default questionnaireSlice.reducer;
