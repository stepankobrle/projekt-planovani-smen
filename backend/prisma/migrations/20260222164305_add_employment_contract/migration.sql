-- CreateEnum
CREATE TYPE "EmploymentContractType" AS ENUM ('HPP', 'DPC', 'DPP', 'ICO');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "employmentContractId" INTEGER;

-- CreateTable
CREATE TABLE "EmploymentContract" (
    "id" SERIAL NOT NULL,
    "type" "EmploymentContractType" NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "EmploymentContract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmploymentContract_type_key" ON "EmploymentContract"("type");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_employmentContractId_fkey" FOREIGN KEY ("employmentContractId") REFERENCES "EmploymentContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
