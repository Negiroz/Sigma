-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BranchPerformance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "branchId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "installations" INTEGER NOT NULL DEFAULT 0,
    "activeClients" INTEGER NOT NULL DEFAULT 0,
    "churnRate" DECIMAL NOT NULL DEFAULT 0.00,
    "installationGoal" INTEGER NOT NULL DEFAULT 0,
    "salesProjection" DECIMAL NOT NULL DEFAULT 0.00,
    CONSTRAINT "BranchPerformance_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_BranchPerformance" ("activeClients", "branchId", "churnRate", "id", "installations", "month", "year") SELECT "activeClients", "branchId", "churnRate", "id", "installations", "month", "year" FROM "BranchPerformance";
DROP TABLE "BranchPerformance";
ALTER TABLE "new_BranchPerformance" RENAME TO "BranchPerformance";
CREATE UNIQUE INDEX "BranchPerformance_branchId_month_year_key" ON "BranchPerformance"("branchId", "month", "year");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
