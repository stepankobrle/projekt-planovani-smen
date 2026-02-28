-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "scheduleGroupId" TEXT;

-- CreateTable
CREATE TABLE "ScheduleGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dateFrom" TIMESTAMP(3) NOT NULL,
    "dateTo" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleGroup_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_scheduleGroupId_fkey" FOREIGN KEY ("scheduleGroupId") REFERENCES "ScheduleGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
