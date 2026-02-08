-- AlterTable
ALTER TABLE "Availability" ADD COLUMN     "shiftId" TEXT;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
