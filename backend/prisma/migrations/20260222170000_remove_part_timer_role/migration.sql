-- Převést všechny PART_TIMER záznamy na EMPLOYEE před smazáním enum hodnoty
UPDATE "Profile" SET "role" = 'EMPLOYEE' WHERE "role" = 'PART_TIMER';

-- Smazat default před přetypováním sloupce
ALTER TABLE "Profile" ALTER COLUMN "role" DROP DEFAULT;

-- Přejmenovat starý enum
ALTER TYPE "UserRole" RENAME TO "UserRole_old";

-- Vytvořit nový enum bez PART_TIMER
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'EMPLOYEE');

-- Převést sloupec na nový enum typ
ALTER TABLE "Profile" ALTER COLUMN "role" TYPE "UserRole" USING "role"::text::"UserRole";

-- Obnovit default
ALTER TABLE "Profile" ALTER COLUMN "role" SET DEFAULT 'EMPLOYEE';

-- Smazat starý enum
DROP TYPE "UserRole_old";
