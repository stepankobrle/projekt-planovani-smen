/*
  Warnings:

  - The `status` column on the `ScheduleGroup` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[locationId,year,month]` on the table `ScheduleGroup` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('DRAFT', 'PREFERENCES', 'GENERATED', 'PUBLISHED');

-- AlterEnum
ALTER TYPE "ShiftStatus" ADD VALUE 'GENERATED';

-- AlterTable
ALTER TABLE "ScheduleGroup" ALTER COLUMN "name" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "ScheduleStatus" NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleGroup_locationId_year_month_key" ON "ScheduleGroup"("locationId", "year", "month");

-- AddForeignKey
ALTER TABLE "ScheduleGroup" ADD CONSTRAINT "ScheduleGroup_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
