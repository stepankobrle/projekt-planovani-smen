/*
  Warnings:

  - You are about to drop the column `positionId` on the `Shift` table. All the data in the column will be lost.
  - Added the required column `jobPositionId` to the `Shift` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Shift" DROP CONSTRAINT "Shift_positionId_fkey";

-- AlterTable
ALTER TABLE "Shift" DROP COLUMN "positionId",
ADD COLUMN     "jobPositionId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_jobPositionId_fkey" FOREIGN KEY ("jobPositionId") REFERENCES "JobPosition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
