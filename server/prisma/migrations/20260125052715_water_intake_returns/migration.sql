-- CreateTable
CREATE TABLE "WaterIntake" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "cups_consumed" INTEGER NOT NULL DEFAULT 0,
    "milliliters_consumed" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaterIntake_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WaterIntake_user_id_date_idx" ON "WaterIntake"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WaterIntake_user_id_date_key" ON "WaterIntake"("user_id", "date");

-- AddForeignKey
ALTER TABLE "WaterIntake" ADD CONSTRAINT "WaterIntake_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
