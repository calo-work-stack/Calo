/**
 * Israeli Market Pricing Utility (Client-side)
 * Provides realistic price estimates for food items based on Israeli supermarket prices (2024)
 * All prices are in Israeli Shekels (₪/ILS)
 */

// Price per 100g/100ml unless otherwise specified
const ISRAELI_MARKET_PRICES: Record<
  string,
  { pricePerUnit: number; unit: string; unitSize: number }
> = {
  // === PROTEINS ===
  "chicken breast": { pricePerUnit: 45, unit: "kg", unitSize: 1000 },
  "chicken thigh": { pricePerUnit: 35, unit: "kg", unitSize: 1000 },
  "chicken drumstick": { pricePerUnit: 28, unit: "kg", unitSize: 1000 },
  "ground chicken": { pricePerUnit: 40, unit: "kg", unitSize: 1000 },
  "turkey breast": { pricePerUnit: 55, unit: "kg", unitSize: 1000 },
  beef: { pricePerUnit: 80, unit: "kg", unitSize: 1000 },
  "ground beef": { pricePerUnit: 55, unit: "kg", unitSize: 1000 },
  "beef steak": { pricePerUnit: 120, unit: "kg", unitSize: 1000 },
  salmon: { pricePerUnit: 100, unit: "kg", unitSize: 1000 },
  "salmon fillet": { pricePerUnit: 110, unit: "kg", unitSize: 1000 },
  tuna: { pricePerUnit: 90, unit: "kg", unitSize: 1000 },
  tilapia: { pricePerUnit: 50, unit: "kg", unitSize: 1000 },
  fish: { pricePerUnit: 60, unit: "kg", unitSize: 1000 },
  shrimp: { pricePerUnit: 120, unit: "kg", unitSize: 1000 },
  egg: { pricePerUnit: 1.5, unit: "piece", unitSize: 50 },
  eggs: { pricePerUnit: 18, unit: "dozen", unitSize: 600 },
  tofu: { pricePerUnit: 20, unit: "pack", unitSize: 350 },

  // === DAIRY ===
  milk: { pricePerUnit: 7, unit: "liter", unitSize: 1000 },
  "cottage cheese": { pricePerUnit: 8, unit: "container", unitSize: 250 },
  yogurt: { pricePerUnit: 6, unit: "container", unitSize: 200 },
  "greek yogurt": { pricePerUnit: 8, unit: "container", unitSize: 200 },
  cheese: { pricePerUnit: 45, unit: "kg", unitSize: 1000 },
  mozzarella: { pricePerUnit: 40, unit: "kg", unitSize: 1000 },
  butter: { pricePerUnit: 12, unit: "pack", unitSize: 200 },

  // === GRAINS & CARBS ===
  rice: { pricePerUnit: 12, unit: "kg", unitSize: 1000 },
  pasta: { pricePerUnit: 8, unit: "pack", unitSize: 500 },
  bread: { pricePerUnit: 12, unit: "loaf", unitSize: 500 },
  oats: { pricePerUnit: 15, unit: "kg", unitSize: 1000 },

  // === VEGETABLES ===
  tomato: { pricePerUnit: 8, unit: "kg", unitSize: 1000 },
  cucumber: { pricePerUnit: 6, unit: "kg", unitSize: 1000 },
  onion: { pricePerUnit: 5, unit: "kg", unitSize: 1000 },
  potato: { pricePerUnit: 6, unit: "kg", unitSize: 1000 },
  carrot: { pricePerUnit: 6, unit: "kg", unitSize: 1000 },
  "bell pepper": { pricePerUnit: 15, unit: "kg", unitSize: 1000 },
  broccoli: { pricePerUnit: 12, unit: "kg", unitSize: 1000 },
  spinach: { pricePerUnit: 20, unit: "kg", unitSize: 1000 },
  lettuce: { pricePerUnit: 8, unit: "head", unitSize: 300 },
  avocado: { pricePerUnit: 8, unit: "piece", unitSize: 200 },
  mushroom: { pricePerUnit: 25, unit: "kg", unitSize: 1000 },

  // === FRUITS ===
  apple: { pricePerUnit: 10, unit: "kg", unitSize: 1000 },
  banana: { pricePerUnit: 8, unit: "kg", unitSize: 1000 },
  orange: { pricePerUnit: 8, unit: "kg", unitSize: 1000 },
  strawberry: { pricePerUnit: 25, unit: "kg", unitSize: 1000 },
  blueberries: { pricePerUnit: 50, unit: "kg", unitSize: 1000 },
  grapes: { pricePerUnit: 20, unit: "kg", unitSize: 1000 },

  // === NUTS & SEEDS ===
  almonds: { pricePerUnit: 80, unit: "kg", unitSize: 1000 },
  walnuts: { pricePerUnit: 100, unit: "kg", unitSize: 1000 },
  peanuts: { pricePerUnit: 40, unit: "kg", unitSize: 1000 },
  "peanut butter": { pricePerUnit: 25, unit: "jar", unitSize: 350 },
  tahini: { pricePerUnit: 20, unit: "jar", unitSize: 400 },

  // === OILS ===
  "olive oil": { pricePerUnit: 40, unit: "liter", unitSize: 1000 },
  "vegetable oil": { pricePerUnit: 15, unit: "liter", unitSize: 1000 },

  // === CONDIMENTS ===
  hummus: { pricePerUnit: 10, unit: "container", unitSize: 400 },
  honey: { pricePerUnit: 25, unit: "jar", unitSize: 350 },

  // === BEVERAGES ===
  coffee: { pricePerUnit: 40, unit: "pack", unitSize: 250 },
  juice: { pricePerUnit: 12, unit: "liter", unitSize: 1000 },

  // === SNACKS ===
  chocolate: { pricePerUnit: 12, unit: "bar", unitSize: 100 },
  chips: { pricePerUnit: 12, unit: "bag", unitSize: 200 },
  "granola bar": { pricePerUnit: 3, unit: "bar", unitSize: 30 },
};

// Category-based fallback prices (per 100g)
const CATEGORY_FALLBACK_PRICES: Record<string, number> = {
  // Proteins - higher prices
  protein: 8,
  meat: 9,
  poultry: 5,
  fish: 10,
  seafood: 12,

  // Dairy
  dairy: 4,
  cheese: 5,
  milk: 1,
  yogurt: 3,

  // Carbs
  grains: 2,
  bread: 3,
  bakery: 3,
  pasta: 2,
  cereal: 4,

  // Produce
  vegetable: 1.5,
  vegetables: 1.5,
  fruit: 2,
  fruits: 2,
  produce: 1.5,

  // Nuts & Seeds
  nuts: 8,
  seeds: 6,

  // Beverages
  beverage: 1.5,
  drink: 1.5,
  drinks: 1.5,

  // Snacks
  snack: 5,
  snacks: 5,
  candy: 8,

  // Default
  other: 3,
  default: 3,
};

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
  estimated_price: number;
  price_per_100g: number; // ✅ ADD THIS
  price_range: string;
  currency: string;
  confidence: "high" | "medium" | "low";
  market_context: string;
}

/**
 * Estimate price for a product from the food scanner
 * @param productName - Product name
 * @param category - Product category
 * @param quantityGrams - Quantity in grams
 * @returns Price estimate in Israeli Shekels
 */
export function estimateProductPrice(
  productName: string,
  category: string,
  quantityGrams: number = 100,
): PriceEstimate {
  const priceEntry = findPriceEntry(productName);

  if (priceEntry) {
    // Calculate price based on the market data
    const pricePerGram = priceEntry.pricePerUnit / priceEntry.unitSize;
    const pricePer100g = Math.round(pricePerGram * 100 * 100) / 100; // ✅ Calculate per 100g
    const estimatedPrice = Math.round(pricePerGram * quantityGrams * 100) / 100;
    const lowPrice = Math.round(estimatedPrice * 0.85);
    const highPrice = Math.round(estimatedPrice * 1.15);

    return {
      estimated_price: estimatedPrice,
      price_per_100g: pricePer100g, // ✅ ADD THIS
      price_range: `₪${lowPrice}-${highPrice}`,
      currency: "ILS",
      confidence: "high",
      market_context: "Based on Israeli supermarket prices",
    };
  }

  // Use category-based pricing
  const categoryPricePer100g = getCategoryPrice(category);
  const estimatedPrice =
    Math.round((categoryPricePer100g / 100) * quantityGrams * 100) / 100;
  const lowPrice = Math.round(estimatedPrice * 0.8);
  const highPrice = Math.round(estimatedPrice * 1.2);

  return {
    estimated_price: estimatedPrice,
    price_per_100g: categoryPricePer100g, // ✅ ADD THIS - already per 100g for categories
    price_range: `₪${lowPrice}-${highPrice}`,
    currency: "ILS",
    confidence: "medium",
    market_context: "Estimated based on category",
  };
}

/**
 * Get a formatted price string
 */
export function formatPrice(price: number): string {
  return `₪${price.toFixed(2)}`;
}

/**
 * Estimate total price for a list of ingredients
 * @param ingredients - Array of ingredients with name, quantity, unit, category
 * @returns Total estimated price in Israeli Shekels
 */
export function estimateTotalPrice(
  ingredients: Array<{
    name: string;
    quantity?: number;
    unit?: string;
    category?: string;
  }>,
): number {
  if (!ingredients || ingredients.length === 0) return 0;

  let total = 0;

  for (const ingredient of ingredients) {
    const priceEntry = findPriceEntry(ingredient.name);
    const quantity = ingredient.quantity || 100;

    if (priceEntry) {
      // Calculate price based on the market data
      const pricePerGram = priceEntry.pricePerUnit / priceEntry.unitSize;
      total += pricePerGram * quantity;
    } else {
      // Use category-based pricing
      const categoryPricePer100g = getCategoryPrice(
        ingredient.category || "other",
      );
      total += (categoryPricePer100g / 100) * quantity;
    }
  }

  return Math.round(total * 100) / 100;
}

/**
 * Estimate price for a single ingredient
 * @param name - Ingredient name
 * @param quantity - Amount (default 100g)
 * @param unit - Unit of measurement (default 'g')
 * @param category - Optional category for fallback pricing
 * @returns Price estimate in Israeli Shekels
 */
export function estimateIngredientPrice(
  name: string,
  quantity: number = 100,
  unit: string = "g",
  category: string = "other",
): { estimated_price: number; confidence: "high" | "medium" | "low" } {
  const priceEntry = findPriceEntry(name);

  if (priceEntry) {
    const pricePerGram = priceEntry.pricePerUnit / priceEntry.unitSize;
    const estimatedPrice = pricePerGram * quantity;
    return {
      estimated_price: Math.round(estimatedPrice * 100) / 100,
      confidence: "high",
    };
  }

  // Use category-based pricing
  const categoryPricePer100g = getCategoryPrice(category);
  const estimatedPrice = (categoryPricePer100g / 100) * quantity;
  return {
    estimated_price: Math.round(estimatedPrice * 100) / 100,
    confidence: "medium",
  };
}
