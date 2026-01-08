-- Add image_url and language to recommended_meals
ALTER TABLE "recommended_meals" ADD COLUMN "image_url" VARCHAR(500);
ALTER TABLE "recommended_meals" ADD COLUMN "language" VARCHAR(10) DEFAULT 'en';

-- Create ingredient_checks table
CREATE TABLE "ingredient_checks" (
    "check_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "meal_id" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "checked_at" TIMESTAMP(3),

    CONSTRAINT "ingredient_checks_pkey" PRIMARY KEY ("check_id")
);

-- Add type, feedback, and reason fields to MenuReview
ALTER TABLE "MenuReview" ADD COLUMN "type" TEXT DEFAULT 'completed';
ALTER TABLE "MenuReview" ADD COLUMN "feedback" TEXT;
ALTER TABLE "MenuReview" ADD COLUMN "reason" TEXT;

-- Create unique constraint on ingredient_checks
CREATE UNIQUE INDEX "ingredient_checks_user_id_ingredient_id_meal_id_key" ON "ingredient_checks"("user_id", "ingredient_id", "meal_id");

-- Create indexes on ingredient_checks
CREATE INDEX "ingredient_checks_user_id_idx" ON "ingredient_checks"("user_id");
CREATE INDEX "ingredient_checks_meal_id_idx" ON "ingredient_checks"("meal_id");

-- Add foreign keys to ingredient_checks
ALTER TABLE "ingredient_checks" ADD CONSTRAINT "ingredient_checks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ingredient_checks" ADD CONSTRAINT "ingredient_checks_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "recommended_ingredients"("ingredient_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ingredient_checks" ADD CONSTRAINT "ingredient_checks_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "recommended_meals"("meal_id") ON DELETE CASCADE ON UPDATE CASCADE;
