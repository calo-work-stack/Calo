import OpenAI from "openai";
import { prisma } from "../lib/database";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

/**
 * Result of an async questionnaire field validation
 */
export interface ValidationResult {
  isValid: boolean;
  fieldName: string;
  originalValue: string;
  reason?: string;
  suggestion?: string;
  isFittingContext?: boolean;
  contextFeedback?: string;
}

/**
 * Context-aware validation result for checking if responses fit the user's situation
 */
export interface ContextValidationResult {
  isAppropriate: boolean;
  fitsUserGoal: boolean;
  fitsUserHealth: boolean;
  fitsUserDiet: boolean;
  overallScore: number; // 0-100
  feedback: string;
  suggestions?: string[];
}

/**
 * Fields that are open-text and should be validated for appropriateness
 */
const OPEN_TEXT_FIELDS = [
  "additional_personal_info",
  "main_goal_text",
  "specific_goal",
  "most_important_outcome",
  "special_personal_goal",
  "medications",
  "health_goals",
  "functional_issues",
  "food_related_medical_issues",
  "disliked_foods",
  "liked_foods",
  "dietary_restrictions",
  "upcoming_events",
  "personalized_tips",
  "family_medical_history",
  "medical_conditions_text",
  "allergies_text",
  "additional_activity_info",
] as const;

/**
 * QuestionnaireValidationService
 *
 * Provides asynchronous, AI-powered validation of open-text questionnaire fields
 * to ensure user inputs align with the app's health and nutrition goals.
 *
 * The validation runs in the background without blocking user interactions.
 */
export class QuestionnaireValidationService {
  /**
   * Validate a single open-text field asynchronously
   * This should be called in the background (e.g., via setImmediate or process.nextTick)
   */
  static async validateField(
    userId: string,
    fieldName: string,
    fieldValue: string | string[],
    questionContext?: string
  ): Promise<ValidationResult> {
    const valueToValidate = Array.isArray(fieldValue)
      ? fieldValue.join(", ")
      : fieldValue;

    // Skip validation for empty or very short values
    if (!valueToValidate || valueToValidate.trim().length < 3) {
      return {
        isValid: true,
        fieldName,
        originalValue: valueToValidate,
      };
    }

    console.log(
      `🔍 Validating questionnaire field: ${fieldName} for user: ${userId}`
    );

    // If no OpenAI key, use rule-based validation
    if (!openai || !process.env.OPENAI_API_KEY) {
      console.log("⚠️ No OpenAI API key, using rule-based validation");
      return this.ruleBasedValidation(fieldName, valueToValidate);
    }

    try {
      const result = await this.aiValidation(
        fieldName,
        valueToValidate,
        questionContext
      );

      // If validation failed, log it and optionally handle the invalid input
      if (!result.isValid) {
        await this.handleInvalidInput(userId, fieldName, valueToValidate, result);
      }

      return result;
    } catch (error) {
      console.error(`❌ AI validation failed for ${fieldName}:`, error);
      // Fall back to rule-based validation on error
      return this.ruleBasedValidation(fieldName, valueToValidate);
    }
  }

  /**
   * Validate all open-text fields in a questionnaire asynchronously
   * This runs in the background and doesn't block the main request
   */
  static async validateQuestionnaireAsync(
    userId: string,
    questionnaireData: Record<string, any>
  ): Promise<void> {
    console.log(`🔄 Starting async questionnaire validation for user: ${userId}`);

    const validationPromises: Promise<ValidationResult>[] = [];

    for (const fieldName of OPEN_TEXT_FIELDS) {
      const fieldValue = questionnaireData[fieldName];
      if (fieldValue && (typeof fieldValue === "string" || Array.isArray(fieldValue))) {
        const context = this.getFieldContext(fieldName);
        validationPromises.push(
          this.validateField(userId, fieldName, fieldValue, context)
        );
      }
    }

    // Run all validations concurrently
    const results = await Promise.allSettled(validationPromises);

    // Log validation summary
    const successfulResults = results.filter(
      (r): r is PromiseFulfilledResult<ValidationResult> => r.status === "fulfilled"
    );
    const invalidFields = successfulResults
      .map((r) => r.value)
      .filter((v) => !v.isValid);

    console.log(
      `✅ Questionnaire validation complete: ${successfulResults.length} fields checked, ${invalidFields.length} invalid`
    );

    if (invalidFields.length > 0) {
      console.log("⚠️ Invalid fields:", invalidFields.map((f) => f.fieldName).join(", "));
    }
  }

  /**
   * AI-powered validation using OpenAI
   */
  private static async aiValidation(
    fieldName: string,
    fieldValue: string,
    questionContext?: string
  ): Promise<ValidationResult> {
    const systemPrompt = `You are a content moderator for a nutrition and health tracking app called Calo.
Your job is to validate user inputs in health questionnaires.

VALIDATION RULES:
1. The input should be relevant to health, nutrition, fitness, or personal wellness goals
2. The input should NOT contain:
   - Harmful or dangerous health advice (e.g., "I want to eat rocks", "I want to starve myself")
   - Inappropriate content (profanity, hate speech, explicit content)
   - Non-sensical or gibberish text
   - Goals that promote eating disorders or self-harm
3. The input SHOULD be:
   - Genuine health or nutrition goals
   - Realistic personal information
   - Appropriate food preferences or restrictions

Respond with JSON only: {"isValid": boolean, "reason": "string if invalid", "suggestion": "alternative if invalid"}`;

    const userPrompt = `Validate this questionnaire input:
Field: ${fieldName}
Context: ${questionContext || "Health questionnaire open-text field"}
User Input: "${fieldValue}"

Is this input appropriate for a health/nutrition app questionnaire?`;

    const response = await openai!.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 256,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    try {
      const parsed = JSON.parse(content);
      return {
        isValid: Boolean(parsed.isValid),
        fieldName,
        originalValue: fieldValue,
        reason: parsed.reason,
        suggestion: parsed.suggestion,
      };
    } catch {
      console.error("Failed to parse AI validation response:", content);
      // If parsing fails, assume valid to avoid blocking legitimate inputs
      return {
        isValid: true,
        fieldName,
        originalValue: fieldValue,
      };
    }
  }

  /**
   * Rule-based validation fallback when AI is not available
   */
  private static ruleBasedValidation(
    fieldName: string,
    fieldValue: string
  ): ValidationResult {
    const lowerValue = fieldValue.toLowerCase();

    // List of obviously harmful or inappropriate patterns
    const harmfulPatterns = [
      /eat\s*(rocks|glass|metal|poison|bleach|detergent)/i,
      /starve\s*(myself|yourself|me)/i,
      /stop\s*eating\s*(completely|forever|everything)/i,
      /want\s*to\s*die/i,
      /kill\s*(myself|yourself|me)/i,
      /self[\s-]?harm/i,
      /suicide/i,
      /anorex/i,
      /bulim/i,
      /purge/i,
      /laxative\s*abuse/i,
    ];

    // Check for harmful patterns
    for (const pattern of harmfulPatterns) {
      if (pattern.test(lowerValue)) {
        return {
          isValid: false,
          fieldName,
          originalValue: fieldValue,
          reason: "Input contains potentially harmful content related to health",
          suggestion:
            "Please describe healthy and realistic goals. If you're struggling, consider reaching out to a healthcare professional.",
        };
      }
    }

    // Check for gibberish (very low letter ratio or repetitive characters)
    const letterCount = (fieldValue.match(/[a-zA-Z\u0590-\u05FF]/g) || []).length;
    const letterRatio = letterCount / fieldValue.length;
    if (letterRatio < 0.5 && fieldValue.length > 10) {
      return {
        isValid: false,
        fieldName,
        originalValue: fieldValue,
        reason: "Input appears to be gibberish or non-meaningful text",
        suggestion: "Please provide meaningful text related to your health goals",
      };
    }

    // Check for excessive repetition (e.g., "aaaaaaa" or "hahahahaha")
    const repetitionPattern = /(.)\1{5,}/;
    if (repetitionPattern.test(fieldValue)) {
      return {
        isValid: false,
        fieldName,
        originalValue: fieldValue,
        reason: "Input contains excessive character repetition",
        suggestion: "Please provide meaningful text",
      };
    }

    // Passed all checks
    return {
      isValid: true,
      fieldName,
      originalValue: fieldValue,
    };
  }

  /**
   * Handle invalid input - log it and optionally clear/flag the field
   */
  private static async handleInvalidInput(
    userId: string,
    fieldName: string,
    originalValue: string,
    validationResult: ValidationResult
  ): Promise<void> {
    console.warn(
      `⚠️ Invalid questionnaire input detected for user ${userId}:`,
      {
        field: fieldName,
        reason: validationResult.reason,
      }
    );

    // Store the validation failure for audit purposes
    try {
      // Check if there's an existing questionnaire for this user
      const questionnaire = await prisma.userQuestionnaire.findFirst({
        where: { user_id: userId },
      });

      if (questionnaire) {
        // Clear the invalid field by setting it to an empty value
        // This prevents harmful content from being stored
        const updateData: Record<string, any> = {};

        // Determine the appropriate empty value based on field type
        if (OPEN_TEXT_FIELDS.includes(fieldName as any)) {
          // ALL open text fields in the schema are String[] arrays
          // They cannot be set to null - must use empty array []
          const arrayFields = [
            "additional_personal_info",
            "main_goal_text",
            "specific_goal",
            "most_important_outcome",
            "special_personal_goal",
            "medical_conditions_text",
            "allergies_text",
            "additional_activity_info",
            // These are also String[] in the schema
            "medications",
            "health_goals",
            "functional_issues",
            "food_related_medical_issues",
            "disliked_foods",
            "liked_foods",
            "dietary_restrictions",
            "upcoming_events",
            "family_medical_history",
          ];

          // All open text fields are arrays - set to empty array
          if (arrayFields.includes(fieldName)) {
            updateData[fieldName] = [];
          } else {
            // For any non-array string fields (if any exist), use empty string
            updateData[fieldName] = "";
          }

          await prisma.userQuestionnaire.update({
            where: { questionnaire_id: questionnaire.questionnaire_id },
            data: updateData,
          });

          console.log(
            `🗑️ Cleared invalid field ${fieldName} for user ${userId}`
          );
        }
      }
    } catch (error) {
      console.error("Failed to handle invalid input:", error);
    }
  }

  /**
   * Get context description for a field to help AI understand validation requirements
   */
  private static getFieldContext(fieldName: string): string {
    const contexts: Record<string, string> = {
      additional_personal_info:
        "Additional personal information relevant to nutrition planning",
      main_goal_text: "User's main health or nutrition goal description",
      specific_goal: "Specific, measurable health goal",
      most_important_outcome: "What the user wants to achieve most",
      special_personal_goal: "Personal health goal with special meaning to the user",
      medications: "Current medications the user is taking",
      health_goals: "Health-related goals and aspirations",
      functional_issues: "Any functional health issues or limitations",
      food_related_medical_issues: "Medical conditions related to food or digestion",
      disliked_foods: "Foods the user dislikes or wants to avoid",
      liked_foods: "Foods the user enjoys and prefers",
      dietary_restrictions: "Dietary restrictions or requirements",
      upcoming_events: "Upcoming events that might affect nutrition goals",
      personalized_tips: "User's preferred type of health tips",
      family_medical_history: "Relevant family medical history",
      medical_conditions_text: "Description of medical conditions",
      allergies_text: "Description of allergies",
      additional_activity_info: "Additional physical activity information",
    };

    return contexts[fieldName] || "Health questionnaire field";
  }

  /**
   * Schedule validation for a questionnaire update
   * This is the main entry point - it runs validation in the background
   */
  static scheduleValidation(
    userId: string,
    questionnaireData: Record<string, any>
  ): void {
    // Use setImmediate to run validation in the next event loop iteration
    // This ensures the main request is not blocked
    setImmediate(async () => {
      try {
        // Run standard field validation
        await this.validateQuestionnaireAsync(userId, questionnaireData);

        // Run context-aware validation for all open text fields
        await this.validateContextFitting(userId, questionnaireData);

        // Specifically validate secondary goal if present
        if (questionnaireData.secondary_goal) {
          const mainGoal = questionnaireData.main_goal || "";
          const secondaryGoal = questionnaireData.secondary_goal;

          const secondaryValidation = await this.validateSecondaryGoal(
            userId,
            mainGoal,
            secondaryGoal,
            {
              age: questionnaireData.age,
              weight: questionnaireData.weight_kg,
              targetWeight: questionnaireData.target_weight_kg,
              medicalConditions: questionnaireData.medical_conditions || [],
            }
          );

          if (!secondaryValidation.isValid || !secondaryValidation.isFittingContext) {
            console.warn(
              `⚠️ Secondary goal validation issue for user ${userId}:`,
              secondaryValidation.reason
            );
          }
        }

        console.log(`✅ Complete questionnaire validation finished for user ${userId}`);
      } catch (error) {
        console.error("Background questionnaire validation failed:", error);
      }
    });
  }

  /**
   * Validate that open text responses and secondary goals fit the user's context
   * This performs a holistic check to ensure responses are appropriate for the user's situation
   */
  static async validateContextFitting(
    userId: string,
    questionnaireData: Record<string, any>
  ): Promise<ContextValidationResult> {
    console.log(`🔍 Starting context-aware validation for user: ${userId}`);

    const defaultResult: ContextValidationResult = {
      isAppropriate: true,
      fitsUserGoal: true,
      fitsUserHealth: true,
      fitsUserDiet: true,
      overallScore: 80,
      feedback: "Responses appear appropriate for your situation.",
    };

    if (!openai || !process.env.OPENAI_API_KEY) {
      console.log("⚠️ No OpenAI API key for context validation");
      return defaultResult;
    }

    try {
      // Extract key context fields
      const userContext = {
        mainGoal: questionnaireData.main_goal || "",
        secondaryGoal: questionnaireData.secondary_goal || "",
        mainGoalText: this.arrayToString(questionnaireData.main_goal_text),
        specificGoal: this.arrayToString(questionnaireData.specific_goal),
        specialPersonalGoal: this.arrayToString(questionnaireData.special_personal_goal),
        mostImportantOutcome: this.arrayToString(questionnaireData.most_important_outcome),
        age: questionnaireData.age || 0,
        gender: questionnaireData.gender || "",
        weight: questionnaireData.weight_kg || 0,
        targetWeight: questionnaireData.target_weight_kg || 0,
        activityLevel: questionnaireData.physical_activity_level || "",
        medicalConditions: this.arrayToString(questionnaireData.medical_conditions_text),
        dietaryStyle: questionnaireData.dietary_style || "",
        allergies: this.arrayToString(questionnaireData.allergies_text),
        healthGoals: this.arrayToString(questionnaireData.health_goals),
        dislikedFoods: this.arrayToString(questionnaireData.disliked_foods),
        likedFoods: this.arrayToString(questionnaireData.liked_foods),
      };

      const result = await this.aiContextValidation(userContext);

      // Handle inappropriate responses
      if (!result.isAppropriate || result.overallScore < 60) {
        await this.handleInappropriateContext(userId, userContext, result);
      }

      return result;
    } catch (error) {
      console.error("❌ Context validation failed:", error);
      return defaultResult;
    }
  }

  /**
   * AI-powered context validation to check if responses fit the user's situation
   */
  private static async aiContextValidation(
    userContext: Record<string, any>
  ): Promise<ContextValidationResult> {
    const systemPrompt = `You are a nutrition and health questionnaire validator for the Calo app.
Your job is to check if the user's open-text responses and goals are:
1. Appropriate and realistic for their situation (age, weight, health conditions)
2. Consistent with each other (goals don't contradict)
3. Safe and achievable
4. Fitting their stated dietary preferences and restrictions

VALIDATION RULES:
- Secondary goals should complement the main goal, not contradict it
- Weight loss goals for underweight users are inappropriate
- Extreme goals (lose 20kg in 1 month) are unrealistic
- Goals should consider medical conditions
- Food preferences should be consistent with dietary style
- Personal goals should be health-related and appropriate

Return JSON only:
{
  "isAppropriate": boolean,
  "fitsUserGoal": boolean,
  "fitsUserHealth": boolean,
  "fitsUserDiet": boolean,
  "overallScore": 0-100,
  "feedback": "explanation for user",
  "suggestions": ["suggestion1", "suggestion2"] // only if issues found
}`;

    const userPrompt = `Validate this user's questionnaire responses for consistency and appropriateness:

USER PROFILE:
- Age: ${userContext.age}
- Gender: ${userContext.gender}
- Current Weight: ${userContext.weight}kg
- Target Weight: ${userContext.targetWeight}kg
- Activity Level: ${userContext.activityLevel}
- Medical Conditions: ${userContext.medicalConditions || "None specified"}

GOALS:
- Main Goal: ${userContext.mainGoal}
- Main Goal Description: ${userContext.mainGoalText || "Not specified"}
- Secondary Goal: ${userContext.secondaryGoal || "Not specified"}
- Specific Goals: ${userContext.specificGoal || "Not specified"}
- Special Personal Goal: ${userContext.specialPersonalGoal || "Not specified"}
- Most Important Outcome: ${userContext.mostImportantOutcome || "Not specified"}

DIETARY PREFERENCES:
- Dietary Style: ${userContext.dietaryStyle || "Not specified"}
- Allergies: ${userContext.allergies || "None"}
- Health Goals: ${userContext.healthGoals || "Not specified"}
- Liked Foods: ${userContext.likedFoods || "Not specified"}
- Disliked Foods: ${userContext.dislikedFoods || "Not specified"}

Are these responses appropriate and fitting for this user's situation? Check for contradictions, unrealistic goals, or inappropriate content.`;

    try {
      const response = await openai!.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 500,
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      const parsed = JSON.parse(content);
      console.log(`✅ Context validation complete. Score: ${parsed.overallScore}`);

      return {
        isAppropriate: Boolean(parsed.isAppropriate),
        fitsUserGoal: Boolean(parsed.fitsUserGoal),
        fitsUserHealth: Boolean(parsed.fitsUserHealth),
        fitsUserDiet: Boolean(parsed.fitsUserDiet),
        overallScore: Math.min(100, Math.max(0, Number(parsed.overallScore) || 80)),
        feedback: parsed.feedback || "Responses validated.",
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : undefined,
      };
    } catch (error) {
      console.error("❌ AI context validation error:", error);
      return {
        isAppropriate: true,
        fitsUserGoal: true,
        fitsUserHealth: true,
        fitsUserDiet: true,
        overallScore: 75,
        feedback: "Unable to fully validate responses. Please review your goals.",
      };
    }
  }

  /**
   * Handle cases where user responses don't fit their context
   */
  private static async handleInappropriateContext(
    userId: string,
    userContext: Record<string, any>,
    validationResult: ContextValidationResult
  ): Promise<void> {
    console.warn(
      `⚠️ Context validation issues detected for user ${userId}:`,
      {
        score: validationResult.overallScore,
        feedback: validationResult.feedback,
      }
    );

    // Store validation feedback for the user (could be shown in the app)
    try {
      // Log for analytics/review
      console.log(`📊 Context validation feedback for ${userId}:`, {
        fitsGoal: validationResult.fitsUserGoal,
        fitsHealth: validationResult.fitsUserHealth,
        fitsDiet: validationResult.fitsUserDiet,
        suggestions: validationResult.suggestions,
      });

      // If score is very low, the responses might need manual review
      if (validationResult.overallScore < 40) {
        console.warn(
          `🚨 User ${userId} questionnaire may need review - low context score`
        );
      }
    } catch (error) {
      console.error("Failed to handle inappropriate context:", error);
    }
  }

  /**
   * Validate secondary goal specifically
   */
  static async validateSecondaryGoal(
    userId: string,
    mainGoal: string,
    secondaryGoal: string,
    userProfile: {
      age?: number;
      weight?: number;
      targetWeight?: number;
      medicalConditions?: string[];
    }
  ): Promise<ValidationResult> {
    console.log(`🎯 Validating secondary goal for user: ${userId}`);

    if (!secondaryGoal || secondaryGoal.trim().length < 3) {
      return {
        isValid: true,
        fieldName: "secondary_goal",
        originalValue: secondaryGoal,
        isFittingContext: true,
      };
    }

    if (!openai || !process.env.OPENAI_API_KEY) {
      return this.ruleBasedSecondaryGoalValidation(mainGoal, secondaryGoal, userProfile);
    }

    try {
      const prompt = `Validate if this secondary health goal is appropriate:
Main Goal: ${mainGoal}
Secondary Goal: ${secondaryGoal}
User Age: ${userProfile.age || "Unknown"}
User Weight: ${userProfile.weight || "Unknown"}kg
Target Weight: ${userProfile.targetWeight || "Unknown"}kg
Medical Conditions: ${userProfile.medicalConditions?.join(", ") || "None"}

Is the secondary goal:
1. Compatible with the main goal?
2. Safe for this user's profile?
3. Realistic and appropriate?

Return JSON: {"isValid": boolean, "isFitting": boolean, "reason": "string if invalid", "suggestion": "alternative if needed"}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Health goal validator. Return JSON only. Be strict about safety but supportive of realistic goals.",
          },
          { role: "user", content: prompt },
        ],
        max_completion_tokens: 200,
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response");
      }

      const parsed = JSON.parse(content);
      return {
        isValid: Boolean(parsed.isValid),
        fieldName: "secondary_goal",
        originalValue: secondaryGoal,
        reason: parsed.reason,
        suggestion: parsed.suggestion,
        isFittingContext: Boolean(parsed.isFitting),
        contextFeedback: parsed.reason,
      };
    } catch (error) {
      console.error("❌ Secondary goal validation failed:", error);
      return this.ruleBasedSecondaryGoalValidation(mainGoal, secondaryGoal, userProfile);
    }
  }

  /**
   * Rule-based fallback for secondary goal validation
   */
  private static ruleBasedSecondaryGoalValidation(
    mainGoal: string,
    secondaryGoal: string,
    userProfile: { age?: number; weight?: number; targetWeight?: number; medicalConditions?: string[] }
  ): ValidationResult {
    const lowerMain = mainGoal.toLowerCase();
    const lowerSecondary = secondaryGoal.toLowerCase();

    // Check for contradicting goals
    const contradictions = [
      { main: "weight_loss", secondary: ["gain weight", "bulk up", "increase mass"] },
      { main: "weight_gain", secondary: ["lose weight", "cut fat", "slim down"] },
      { main: "lose_weight", secondary: ["gain weight", "bulk up", "increase mass"] },
      { main: "gain_muscle", secondary: ["lose muscle", "stop exercising"] },
    ];

    for (const rule of contradictions) {
      if (lowerMain.includes(rule.main)) {
        for (const conflict of rule.secondary) {
          if (lowerSecondary.includes(conflict)) {
            return {
              isValid: false,
              fieldName: "secondary_goal",
              originalValue: secondaryGoal,
              reason: `Secondary goal "${secondaryGoal}" contradicts your main goal of ${mainGoal}`,
              suggestion: "Please choose a secondary goal that complements your main goal",
              isFittingContext: false,
            };
          }
        }
      }
    }

    // Check for extreme/unsafe goals
    const unsafePatterns = [
      /lose\s*(\d+)\s*kg/i,
      /gain\s*(\d+)\s*kg/i,
    ];

    for (const pattern of unsafePatterns) {
      const match = secondaryGoal.match(pattern);
      if (match) {
        const amount = parseInt(match[1]);
        if (amount > 10) {
          return {
            isValid: false,
            fieldName: "secondary_goal",
            originalValue: secondaryGoal,
            reason: `A goal to change ${amount}kg is quite ambitious and may not be realistic in a short timeframe`,
            suggestion: "Consider setting a more gradual goal (e.g., 2-4kg per month)",
            isFittingContext: false,
          };
        }
      }
    }

    return {
      isValid: true,
      fieldName: "secondary_goal",
      originalValue: secondaryGoal,
      isFittingContext: true,
    };
  }

  /**
   * Helper to convert array fields to string for validation
   */
  private static arrayToString(value: any): string {
    if (Array.isArray(value)) {
      return value.filter(Boolean).join(", ");
    }
    if (typeof value === "string") {
      return value;
    }
    return "";
  }
}
