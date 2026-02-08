-- CreateTable
CREATE TABLE "ScheduleSubmission" (
    "id" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ScheduleSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleSubmission_userId_weekNumber_year_key" ON "ScheduleSubmission"("userId", "weekNumber", "year");

-- AddForeignKey
ALTER TABLE "ScheduleSubmission" ADD CONSTRAINT "ScheduleSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
