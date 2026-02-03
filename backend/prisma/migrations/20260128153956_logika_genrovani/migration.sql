/*
  Warnings:

  - You are about to drop the column `targetHoursPerWeek` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `minEmployees` on the `StaffingRequirement` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "ShiftStatus" ADD VALUE 'OFFERED';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'PART_TIMER';

-- AlterTable
ALTER TABLE "Availability" ADD COLUMN     "shiftTypeId" INTEGER;

-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "targetHoursPerWeek",
ADD COLUMN     "targetHoursPerMonth" DECIMAL(65,30) NOT NULL DEFAULT 160;

-- AlterTable
ALTER TABLE "ShiftType" ALTER COLUMN "startTime" DROP NOT NULL,
ALTER COLUMN "endTime" DROP NOT NULL;

-- AlterTable
ALTER TABLE "StaffingRequirement" DROP COLUMN "minEmployees",
ADD COLUMN     "countAny" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "countFullTime" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "countPartTime" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "date" TIMESTAMP(3),
ALTER COLUMN "dayOfWeek" DROP NOT NULL;

-- CreateTable
CREATE TABLE "OrganizationSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "workOnWeekends" BOOLEAN NOT NULL DEFAULT false,
    "workOnHolidays" BOOLEAN NOT NULL DEFAULT false,
    "minRestBetweenShifts" INTEGER NOT NULL DEFAULT 11,

    CONSTRAINT "OrganizationSettings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_shiftTypeId_fkey" FOREIGN KEY ("shiftTypeId") REFERENCES "ShiftType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
