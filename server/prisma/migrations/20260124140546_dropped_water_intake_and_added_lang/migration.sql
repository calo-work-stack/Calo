/*
  Warnings:

  - You are about to drop the `WaterIntake` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "LangType" AS ENUM ('EN', 'HE');

-- DropForeignKey
ALTER TABLE "public"."WaterIntake" DROP CONSTRAINT "WaterIntake_user_id_fkey";

-- AlterTable
ALTER TABLE "Meal" ADD COLUMN     "is_mandatory" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "preferred_lang" "LangType" NOT NULL DEFAULT 'HE';

-- DropTable
DROP TABLE "public"."WaterIntake";
