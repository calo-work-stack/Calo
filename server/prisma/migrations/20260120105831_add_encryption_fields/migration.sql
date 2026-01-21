/*
  Warnings:

  - A unique constraint covering the columns `[email_hash]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Meal" ADD COLUMN     "description" TEXT,
ADD COLUMN     "energy_rating" INTEGER DEFAULT 0,
ADD COLUMN     "heaviness_rating" INTEGER DEFAULT 0,
ADD COLUMN     "is_favorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "satiety_rating" INTEGER DEFAULT 0,
ADD COLUMN     "taste_rating" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "email_hash" TEXT,
ADD COLUMN     "first_name" TEXT,
ADD COLUMN     "last_name" TEXT,
ADD COLUMN     "phone_number" TEXT;

-- AlterTable
ALTER TABLE "recommended_meals" ADD COLUMN     "dietary_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "image_url" SET DATA TYPE TEXT,
ALTER COLUMN "language" SET DATA TYPE TEXT;

-- CreateIndex
CREATE INDEX "Meal_user_id_upload_time_idx" ON "Meal"("user_id", "upload_time");

-- CreateIndex
CREATE INDEX "Meal_meal_period_idx" ON "Meal"("meal_period");

-- CreateIndex
CREATE INDEX "Meal_is_favorite_idx" ON "Meal"("is_favorite");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_hash_key" ON "User"("email_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");
