export interface NutritionIndicator {
  type: string;
  color: "success" | "warning";
  label: string;
}

export const analyzeNutrition = (nutrition: any): NutritionIndicator[] => {
  const protein = nutrition.protein || 0;
  const fiber = nutrition.fiber || 0;
  const sugar = nutrition.sugar || 0;
  const sodium = nutrition.sodium || 0;
  const vitaminC = nutrition.vitamin_c || 0;
  const vitaminD = nutrition.vitamin_d || 0;
  const calcium = nutrition.calcium || 0;
  const iron = nutrition.iron || 0;

  const indicators: NutritionIndicator[] = [];

  // High Protein: >= 10g per 100g
  if (protein >= 10) {
    indicators.push({
      type: "protein",
      color: "success",
      label: "richInProteins",
    });
  }

  // High Fiber: >= 5g per 100g
  if (fiber >= 5) {
    indicators.push({
      type: "fiber",
      color: "success",
      label: "richInFiber",
    });
  }

  // Rich in Vitamins/Minerals
  const hasVitamins = vitaminC > 0 || vitaminD > 0 || calcium > 100 || iron > 2;
  if (hasVitamins) {
    indicators.push({
      type: "vitamins",
      color: "success",
      label: "richInVitaminsMinerals",
    });
  }

  // Antioxidants
  if (vitaminC >= 10 || fiber >= 3) {
    indicators.push({
      type: "antioxidants",
      color: "success",
      label: "richInAntiOxidants",
    });
  }

  // Warnings - High Sugar
  if (sugar >= 15) {
    indicators.push({
      type: "sugar",
      color: "warning",
      label: "highInSugar",
    });
  }

  // High Sodium
  if (sodium >= 500) {
    indicators.push({
      type: "sodium",
      color: "warning",
      label: "highInSodium",
    });
  }

  return indicators;
};

export const calculateNutrientBar = (
  value: number,
  referenceValue: number,
  highThreshold: number,
  midThreshold?: number
) => {
  const percent = Math.min((value / referenceValue) * 100, 100);
  
  let color: "success" | "warning" | "error" | "primary" | "tertiary";
  
  if (midThreshold !== undefined) {
    if (value >= highThreshold) color = "success";
    else if (value >= midThreshold) color = "warning";
    else color = "tertiary";
  } else {
    color = value >= highThreshold ? "warning" : "primary";
  }

  return { percent, color };
};