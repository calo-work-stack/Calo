
/*
  Warnings:

  - You are about to drop the column `age` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `height_cm` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `weight_kg` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "age",
DROP COLUMN "height_cm",
DROP COLUMN "weight_kg",
ADD COLUMN     "birth_date" TIMESTAMP(3);
