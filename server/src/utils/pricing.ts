/**
 * Israeli Market Pricing Utility
 * Provides realistic price estimates for food items based on Israeli supermarket prices (2024)
 * All prices are in Israeli Shekels (₪/ILS)
 */

// Price per 100g/100ml unless otherwise specified
const ISRAELI_MARKET_PRICES: Record<
  string,
  { pricePerUnit: number; unit: string; unitSize: number }
> = {
  // === PROTEINS ===
  // Poultry
  "chicken breast": { pricePerUnit: 45, unit: "kg", unitSize: 1000 },
  "chicken thigh": { pricePerUnit: 35, unit: "kg", unitSize: 1000 },
  "chicken drumstick": { pricePerUnit: 28, unit: "kg", unitSize: 1000 },
  "chicken wing": { pricePerUnit: 32, unit: "kg", unitSize: 1000 },
  "ground chicken": { pricePerUnit: 40, unit: "kg", unitSize: 1000 },
  "turkey breast": { pricePerUnit: 55, unit: "kg", unitSize: 1000 },
  "turkey schnitzel": { pricePerUnit: 50, unit: "kg", unitSize: 1000 },

  // Beef
  beef: { pricePerUnit: 80, unit: "kg", unitSize: 1000 },
  "ground beef": { pricePerUnit: 55, unit: "kg", unitSize: 1000 },
  "beef steak": { pricePerUnit: 120, unit: "kg", unitSize: 1000 },
  ribeye: { pricePerUnit: 180, unit: "kg", unitSize: 1000 },
  sirloin: { pricePerUnit: 140, unit: "kg", unitSize: 1000 },
  "beef tenderloin": { pricePerUnit: 200, unit: "kg", unitSize: 1000 },
  brisket: { pricePerUnit: 70, unit: "kg", unitSize: 1000 },

  // Fish & Seafood
  salmon: { pricePerUnit: 100, unit: "kg", unitSize: 1000 },
  "salmon fillet": { pricePerUnit: 110, unit: "kg", unitSize: 1000 },
  tuna: { pricePerUnit: 90, unit: "kg", unitSize: 1000 },
  tilapia: { pricePerUnit: 50, unit: "kg", unitSize: 1000 },
  "sea bass": { pricePerUnit: 80, unit: "kg", unitSize: 1000 },
  cod: { pricePerUnit: 70, unit: "kg", unitSize: 1000 },
  shrimp: { pricePerUnit: 120, unit: "kg", unitSize: 1000 },
  "canned tuna": { pricePerUnit: 8, unit: "can", unitSize: 160 },

  // Eggs
  egg: { pricePerUnit: 1.5, unit: "piece", unitSize: 50 },
  eggs: { pricePerUnit: 18, unit: "dozen", unitSize: 600 },

  // Plant Proteins
  tofu: { pricePerUnit: 20, unit: "pack", unitSize: 350 },
  tempeh: { pricePerUnit: 25, unit: "pack", unitSize: 200 },
  seitan: { pricePerUnit: 30, unit: "pack", unitSize: 250 },
  chickpeas: { pricePerUnit: 8, unit: "can", unitSize: 400 },
  lentils: { pricePerUnit: 12, unit: "kg", unitSize: 1000 },
  "black beans": { pricePerUnit: 8, unit: "can", unitSize: 400 },
  edamame: { pricePerUnit: 18, unit: "pack", unitSize: 400 },

  // === DAIRY ===
  milk: { pricePerUnit: 7, unit: "liter", unitSize: 1000 },
  "skim milk": { pricePerUnit: 7, unit: "liter", unitSize: 1000 },
  "cottage cheese": { pricePerUnit: 8, unit: "container", unitSize: 250 },
  yogurt: { pricePerUnit: 6, unit: "container", unitSize: 200 },
  "greek yogurt": { pricePerUnit: 8, unit: "container", unitSize: 200 },
  "cream cheese": { pricePerUnit: 10, unit: "pack", unitSize: 200 },
  cheddar: { pricePerUnit: 45, unit: "kg", unitSize: 1000 },
  mozzarella: { pricePerUnit: 40, unit: "kg", unitSize: 1000 },
  parmesan: { pricePerUnit: 120, unit: "kg", unitSize: 1000 },
  "feta cheese": { pricePerUnit: 50, unit: "kg", unitSize: 1000 },
  butter: { pricePerUnit: 12, unit: "pack", unitSize: 200 },
  "sour cream": { pricePerUnit: 8, unit: "container", unitSize: 200 },
  "heavy cream": { pricePerUnit: 12, unit: "container", unitSize: 250 },
  labane: { pricePerUnit: 10, unit: "container", unitSize: 300 },

  // === GRAINS & CARBS ===
  rice: { pricePerUnit: 12, unit: "kg", unitSize: 1000 },
  "brown rice": { pricePerUnit: 15, unit: "kg", unitSize: 1000 },
  "basmati rice": { pricePerUnit: 18, unit: "kg", unitSize: 1000 },
  quinoa: { pricePerUnit: 35, unit: "kg", unitSize: 1000 },
  pasta: { pricePerUnit: 8, unit: "pack", unitSize: 500 },
  spaghetti: { pricePerUnit: 8, unit: "pack", unitSize: 500 },
  penne: { pricePerUnit: 8, unit: "pack", unitSize: 500 },
  couscous: { pricePerUnit: 10, unit: "pack", unitSize: 500 },
  bulgur: { pricePerUnit: 12, unit: "kg", unitSize: 1000 },
  oats: { pricePerUnit: 15, unit: "kg", unitSize: 1000 },
  bread: { pricePerUnit: 12, unit: "loaf", unitSize: 500 },
  "whole wheat bread": { pricePerUnit: 15, unit: "loaf", unitSize: 500 },
  pita: { pricePerUnit: 8, unit: "pack", unitSize: 400 },
  tortilla: { pricePerUnit: 12, unit: "pack", unitSize: 300 },
  flour: { pricePerUnit: 8, unit: "kg", unitSize: 1000 },
  "whole wheat flour": { pricePerUnit: 10, unit: "kg", unitSize: 1000 },

  // === VEGETABLES ===
  tomato: { pricePerUnit: 8, unit: "kg", unitSize: 1000 },
  tomatoes: { pricePerUnit: 8, unit: "kg", unitSize: 1000 },
  cucumber: { pricePerUnit: 6, unit: "kg", unitSize: 1000 },
  onion: { pricePerUnit: 5, unit: "kg", unitSize: 1000 },
  garlic: { pricePerUnit: 30, unit: "kg", unitSize: 1000 },
  potato: { pricePerUnit: 6, unit: "kg", unitSize: 1000 },
  "sweet potato": { pricePerUnit: 10, unit: "kg", unitSize: 1000 },
  carrot: { pricePerUnit: 6, unit: "kg", unitSize: 1000 },
  "bell pepper": { pricePerUnit: 15, unit: "kg", unitSize: 1000 },
  "red pepper": { pricePerUnit: 15, unit: "kg", unitSize: 1000 },
  broccoli: { pricePerUnit: 12, unit: "kg", unitSize: 1000 },
  cauliflower: { pricePerUnit: 10, unit: "kg", unitSize: 1000 },
  spinach: { pricePerUnit: 20, unit: "kg", unitSize: 1000 },
  lettuce: { pricePerUnit: 8, unit: "head", unitSize: 300 },
  cabbage: { pricePerUnit: 6, unit: "kg", unitSize: 1000 },
  zucchini: { pricePerUnit: 10, unit: "kg", unitSize: 1000 },
  eggplant: { pricePerUnit: 10, unit: "kg", unitSize: 1000 },
  mushroom: { pricePerUnit: 25, unit: "kg", unitSize: 1000 },
  mushrooms: { pricePerUnit: 25, unit: "kg", unitSize: 1000 },
  avocado: { pricePerUnit: 8, unit: "piece", unitSize: 200 },
  corn: { pricePerUnit: 4, unit: "ear", unitSize: 200 },
  peas: { pricePerUnit: 12, unit: "kg", unitSize: 1000 },
  "green beans": { pricePerUnit: 15, unit: "kg", unitSize: 1000 },
  asparagus: { pricePerUnit: 35, unit: "kg", unitSize: 1000 },
  celery: { pricePerUnit: 12, unit: "bunch", unitSize: 400 },
  leek: { pricePerUnit: 12, unit: "kg", unitSize: 1000 },

  // === FRUITS ===
  apple: { pricePerUnit: 10, unit: "kg", unitSize: 1000 },
  banana: { pricePerUnit: 8, unit: "kg", unitSize: 1000 },
  orange: { pricePerUnit: 8, unit: "kg", unitSize: 1000 },
  lemon: { pricePerUnit: 10, unit: "kg", unitSize: 1000 },
  grapefruit: { pricePerUnit: 8, unit: "kg", unitSize: 1000 },
  strawberry: { pricePerUnit: 25, unit: "kg", unitSize: 1000 },
  strawberries: { pricePerUnit: 25, unit: "kg", unitSize: 1000 },
  blueberries: { pricePerUnit: 50, unit: "kg", unitSize: 1000 },
  grapes: { pricePerUnit: 20, unit: "kg", unitSize: 1000 },
  watermelon: { pricePerUnit: 5, unit: "kg", unitSize: 1000 },
  melon: { pricePerUnit: 8, unit: "kg", unitSize: 1000 },
  mango: { pricePerUnit: 15, unit: "kg", unitSize: 1000 },
  pineapple: { pricePerUnit: 15, unit: "piece", unitSize: 1500 },
  peach: { pricePerUnit: 15, unit: "kg", unitSize: 1000 },
  pear: { pricePerUnit: 12, unit: "kg", unitSize: 1000 },
  kiwi: { pricePerUnit: 20, unit: "kg", unitSize: 1000 },
  pomegranate: { pricePerUnit: 12, unit: "piece", unitSize: 300 },
  dates: { pricePerUnit: 40, unit: "kg", unitSize: 1000 },

  // === NUTS & SEEDS ===
  almonds: { pricePerUnit: 80, unit: "kg", unitSize: 1000 },
  walnuts: { pricePerUnit: 100, unit: "kg", unitSize: 1000 },
  cashews: { pricePerUnit: 90, unit: "kg", unitSize: 1000 },
  peanuts: { pricePerUnit: 40, unit: "kg", unitSize: 1000 },
  "peanut butter": { pricePerUnit: 25, unit: "jar", unitSize: 350 },
  tahini: { pricePerUnit: 20, unit: "jar", unitSize: 400 },
  "sunflower seeds": { pricePerUnit: 30, unit: "kg", unitSize: 1000 },
  "pumpkin seeds": { pricePerUnit: 60, unit: "kg", unitSize: 1000 },
  "chia seeds": { pricePerUnit: 80, unit: "kg", unitSize: 1000 },
  "flax seeds": { pricePerUnit: 40, unit: "kg", unitSize: 1000 },

  // === OILS & FATS ===
  "olive oil": { pricePerUnit: 40, unit: "liter", unitSize: 1000 },
  "vegetable oil": { pricePerUnit: 15, unit: "liter", unitSize: 1000 },
  "canola oil": { pricePerUnit: 12, unit: "liter", unitSize: 1000 },
  "coconut oil": { pricePerUnit: 35, unit: "jar", unitSize: 500 },

  // === CONDIMENTS & SAUCES ===
  hummus: { pricePerUnit: 10, unit: "container", unitSize: 400 },
  mayonnaise: { pricePerUnit: 12, unit: "jar", unitSize: 400 },
  ketchup: { pricePerUnit: 10, unit: "bottle", unitSize: 500 },
  mustard: { pricePerUnit: 8, unit: "jar", unitSize: 250 },
  "soy sauce": { pricePerUnit: 12, unit: "bottle", unitSize: 300 },
  honey: { pricePerUnit: 25, unit: "jar", unitSize: 350 },
  "maple syrup": { pricePerUnit: 40, unit: "bottle", unitSize: 250 },
  "tomato sauce": { pricePerUnit: 8, unit: "can", unitSize: 400 },
  salsa: { pricePerUnit: 15, unit: "jar", unitSize: 400 },

  // === SPICES & HERBS ===
  salt: { pricePerUnit: 3, unit: "pack", unitSize: 500 },
  pepper: { pricePerUnit: 8, unit: "jar", unitSize: 50 },
  cumin: { pricePerUnit: 10, unit: "jar", unitSize: 50 },
  paprika: { pricePerUnit: 8, unit: "jar", unitSize: 50 },
  cinnamon: { pricePerUnit: 10, unit: "jar", unitSize: 50 },
  turmeric: { pricePerUnit: 12, unit: "jar", unitSize: 50 },
  oregano: { pricePerUnit: 8, unit: "jar", unitSize: 30 },
  basil: { pricePerUnit: 6, unit: "bunch", unitSize: 30 },
  parsley: { pricePerUnit: 4, unit: "bunch", unitSize: 50 },
  cilantro: { pricePerUnit: 4, unit: "bunch", unitSize: 50 },
  mint: { pricePerUnit: 5, unit: "bunch", unitSize: 30 },
  dill: { pricePerUnit: 5, unit: "bunch", unitSize: 30 },

  // === BEVERAGES ===
  coffee: { pricePerUnit: 40, unit: "pack", unitSize: 250 },
  tea: { pricePerUnit: 15, unit: "box", unitSize: 50 },
  "orange juice": { pricePerUnit: 12, unit: "liter", unitSize: 1000 },
  "apple juice": { pricePerUnit: 10, unit: "liter", unitSize: 1000 },

  // === SNACKS & SWEETS ===
  chocolate: { pricePerUnit: 12, unit: "bar", unitSize: 100 },
  "dark chocolate": { pricePerUnit: 15, unit: "bar", unitSize: 100 },
  "granola bar": { pricePerUnit: 3, unit: "bar", unitSize: 30 },
  crackers: { pricePerUnit: 10, unit: "pack", unitSize: 200 },
  chips: { pricePerUnit: 12, unit: "bag", unitSize: 200 },
};

// Category-based fallback prices (per 100g)
const CATEGORY_FALLBACK_PRICES: Record<string, number> = {
  // Proteins
  protein: 8,
  meat: 9,
  poultry: 5,
  fish: 10,
  seafood: 12,
  eggs: 3,

  // Dairy
  dairy: 4,
  cheese: 5,
  milk: 1,
  yogurt: 3,

  // Carbs
  grains: 2,
  bread: 3,
  pasta: 2,
  rice: 2,
  cereal: 4,

  // Produce
  vegetable: 1.5,
  vegetables: 1.5,
  fruit: 2,
  fruits: 2,
  produce: 1.5,
  "leafy greens": 2,

  // Nuts & Seeds
  nuts: 8,
  seeds: 6,

  // Oils
  oil: 4,
  fats: 4,

  // Condiments
  condiment: 3,
  sauce: 2.5,
  spices: 15,
  herbs: 10,

  // Beverages
  beverage: 1.5,
  drink: 1.5,

  // Snacks
  snack: 5,
  candy: 8,
  sweets: 8,

  // Default
  other: 3,
  default: 3,
};

/**
 * Parse quantity string to get numeric value and unit
 */
function parseQuantity(quantityStr: string): { value: number; unit: string } {
  const match = quantityStr.match(/^([\d.]+)\s*(.*)$/);
  if (match) {
    return {
      value: parseFloat(match[1]) || 100,
      unit: match[2].toLowerCase().trim() || "g",
    };
  }
  return { value: 100, unit: "g" };
}

/**
 * Convert quantity to grams for standardized pricing
 */
function convertToGrams(value: number, unit: string): number {
  const unitLower = unit.toLowerCase();

  // Weight conversions
  if (
    unitLower === "kg" ||
    unitLower === "kilogram" ||
    unitLower === "kilograms"
  )
    return value * 1000;
  if (unitLower === "g" || unitLower === "gram" || unitLower === "grams")
    return value;
  if (
    unitLower === "mg" ||
    unitLower === "milligram" ||
    unitLower === "milligrams"
  )
    return value / 1000;
  if (unitLower === "oz" || unitLower === "ounce" || unitLower === "ounces")
    return value * 28.35;
  if (unitLower === "lb" || unitLower === "pound" || unitLower === "pounds")
    return value * 453.6;

  // Volume conversions (approximate for liquids)
  if (unitLower === "l" || unitLower === "liter" || unitLower === "liters")
    return value * 1000;
  if (
    unitLower === "ml" ||
    unitLower === "milliliter" ||
    unitLower === "milliliters"
  )
    return value;
  if (unitLower === "cup" || unitLower === "cups") return value * 240;
  if (
    unitLower === "tbsp" ||
    unitLower === "tablespoon" ||
    unitLower === "tablespoons"
  )
    return value * 15;
  if (
    unitLower === "tsp" ||
    unitLower === "teaspoon" ||
    unitLower === "teaspoons"
  )
    return value * 5;

  // Count-based items (estimate weight)
  if (
    unitLower === "piece" ||
    unitLower === "pieces" ||
    unitLower === "unit" ||
    unitLower === "units"
  )
    return value * 100;
  if (unitLower === "slice" || unitLower === "slices") return value * 30;
  if (unitLower === "serving" || unitLower === "servings") return value * 150;

  // Default: assume grams
  return value;
}

/**
 * Find the best matching price entry for an ingredient name
 */
function findPriceEntry(
  name: string,
): { pricePerUnit: number; unit: string; unitSize: number } | null {
  const nameLower = name.toLowerCase().trim();

  // Exact match
  if (ISRAELI_MARKET_PRICES[nameLower]) {
    return ISRAELI_MARKET_PRICES[nameLower];
  }

  // Partial match - check if any key is contained in the name
  for (const [key, value] of Object.entries(ISRAELI_MARKET_PRICES)) {
    if (nameLower.includes(key) || key.includes(nameLower)) {
      return value;
    }
  }

  // Word-based match
  const words = nameLower.split(/\s+/);
  for (const word of words) {
    if (word.length > 3 && ISRAELI_MARKET_PRICES[word]) {
      return ISRAELI_MARKET_PRICES[word];
    }
  }

  return null;
}

/**
 * Get category-based fallback price per 100g
 */
function getCategoryPrice(category: string): number {
  const categoryLower = category.toLowerCase().trim();

  // Direct match
  if (CATEGORY_FALLBACK_PRICES[categoryLower]) {
    return CATEGORY_FALLBACK_PRICES[categoryLower];
  }

  // Partial match
  for (const [key, value] of Object.entries(CATEGORY_FALLBACK_PRICES)) {
    if (categoryLower.includes(key) || key.includes(categoryLower)) {
      return value;
    }
  }

  return CATEGORY_FALLBACK_PRICES["default"];
}

export interface PriceEstimate {
  price_range: string;
  estimated_price: number;
  price_per_100g: number;
  currency: string;
  confidence: "high" | "medium" | "low";
  source: "exact_match" | "category_match" | "fallback";
}

/**
 * Estimate price for an ingredient
 * @param name - Ingredient name (e.g., "chicken breast", "tomatoes")
 * @param quantity - Amount (e.g., 150)
 * @param unit - Unit of measurement (e.g., "g", "kg", "piece")
 * @param category - Optional category for fallback pricing
 * @returns Price estimate in Israeli Shekels
 */
export function estimateIngredientPrice(
  name: string,
  quantity: number = 100,
  unit: string = "g",
  category: string = "other",
): PriceEstimate {
  const priceEntry = findPriceEntry(name);

  if (priceEntry) {
    // Calculate price based on the market data
    const quantityInGrams = convertToGrams(quantity, unit);
    const pricePerGram = priceEntry.pricePerUnit / priceEntry.unitSize;
    const estimatedPrice = pricePerGram * quantityInGrams;

    return {
      estimated_price: Math.round(estimatedPrice * 100) / 100,
      price_per_100g: Math.round(pricePerGram * 100 * 100) / 100,
      currency: "ILS",
      confidence: "high",
      source: "exact_match",
      price_range: "",
    };
  }

  // Use category-based pricing
  const categoryPricePer100g = getCategoryPrice(category);
  const quantityInGrams = convertToGrams(quantity, unit);
  const estimatedPrice = (categoryPricePer100g / 100) * quantityInGrams;

  return {
    estimated_price: Math.round(estimatedPrice * 100) / 100,
    price_per_100g: categoryPricePer100g,
    currency: "ILS",
    confidence: "medium",
    source: "category_match",
    price_range: "",
  };
}

/**
 * Estimate price for a product from the food scanner
 * @param productName - Product name
 * @param category - Product category
 * @param quantityGrams - Quantity in grams
 * @returns Price estimate
 */
export function estimateProductPrice(
  productName: string,
  category: string,
  quantityGrams: number = 100,
): PriceEstimate {
  return estimateIngredientPrice(productName, quantityGrams, "g", category);
}

/**
 * Estimate total price for a list of ingredients
 * @param ingredients - Array of ingredients with name, quantity, unit, category
 * @returns Total estimated price
 */
export function estimateTotalPrice(
  ingredients: Array<{
    name: string;
    quantity?: number;
    unit?: string;
    category?: string;
  }>,
): number {
  let total = 0;

  for (const ingredient of ingredients) {
    const estimate = estimateIngredientPrice(
      ingredient.name,
      ingredient.quantity || 100,
      ingredient.unit || "g",
      ingredient.category || "other",
    );
    total += estimate.estimated_price;
  }

  return Math.round(total * 100) / 100;
}

/**
 * Get a formatted price string
 */
export function formatPrice(price: number): string {
  return `₪${price.toFixed(2)}`;
}

/**
 * Get price range string (±15%)
 */
export function getPriceRange(price: number): string {
  const low = Math.round(price * 0.85);
  const high = Math.round(price * 1.15);
  return `₪${low}-${high}`;
}
