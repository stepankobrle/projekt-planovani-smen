/*
  Warnings:

  - You are about to drop the column `positionId` on the `Profile` table. All the data in the column will be lost.
  - Added the required column `positionId` to the `Shift` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Profile" DROP CONSTRAINT "Profile_positionId_fkey";

-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "positionId",
ADD COLUMN     "jobPositionId" INTEGER;

-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "isMarketplace" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "positionId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_jobPositionId_fkey" FOREIGN KEY ("jobPositionId") REFERENCES "JobPosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "JobPosition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
