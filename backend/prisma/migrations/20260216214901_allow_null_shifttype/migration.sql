-- DropForeignKey
ALTER TABLE "Shift" DROP CONSTRAINT "Shift_shiftTypeId_fkey";

-- AlterTable
ALTER TABLE "Shift" ALTER COLUMN "shiftTypeId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_shiftTypeId_fkey" FOREIGN KEY ("shiftTypeId") REFERENCES "ShiftType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
