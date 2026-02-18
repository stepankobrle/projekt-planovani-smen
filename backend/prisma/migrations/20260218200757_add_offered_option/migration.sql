-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "offeredById" TEXT,
ADD COLUMN     "requestedById" TEXT;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_offeredById_fkey" FOREIGN KEY ("offeredById") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
