/*
  Warnings:

  - You are about to drop the column `dateFrom` on the `ScheduleGroup` table. All the data in the column will be lost.
  - You are about to drop the column `dateTo` on the `ScheduleGroup` table. All the data in the column will be lost.
  - Added the required column `locationId` to the `ScheduleGroup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `month` to the `ScheduleGroup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `ScheduleGroup` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ScheduleGroup" DROP COLUMN "dateFrom",
DROP COLUMN "dateTo",
ADD COLUMN     "calendarDays" TEXT[],
ADD COLUMN     "locationId" INTEGER NOT NULL,
ADD COLUMN     "month" INTEGER NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "year" INTEGER NOT NULL;
