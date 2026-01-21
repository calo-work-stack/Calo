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
        await this.validateQuestionnaireAsync(userId, questionnaireData);
      } catch (error) {
        console.error("Background questionnaire validation failed:", error);
      }
    });
  }
}
