-- CreateTable
CREATE TABLE "DailyAgentMetric" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "prospects" INTEGER NOT NULL DEFAULT 0,
    "closings" INTEGER NOT NULL DEFAULT 0,
    "revenue" REAL NOT NULL DEFAULT 0,
    "supportTickets" INTEGER NOT NULL DEFAULT 0,
    "paymentsReg" INTEGER NOT NULL DEFAULT 0,
    "supervisorScore" REAL NOT NULL DEFAULT 0,
    "versusPoints" INTEGER NOT NULL DEFAULT 0,
    "avoidableTickets" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DailyAgentMetric_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Employee" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "currentXp" INTEGER NOT NULL DEFAULT 0,
    "currentLevel" TEXT NOT NULL DEFAULT 'BRONZE',
    CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Employee_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Employee" ("active", "branchId", "companyId", "id", "name", "role") SELECT "active", "branchId", "companyId", "id", "name", "role" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "DailyAgentMetric_employeeId_date_key" ON "DailyAgentMetric"("employeeId", "date");
