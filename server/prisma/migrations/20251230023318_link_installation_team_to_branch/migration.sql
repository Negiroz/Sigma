-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_InstallationTeam" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "branchId" INTEGER,
    CONSTRAINT "InstallationTeam_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InstallationTeam_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_InstallationTeam" ("companyId", "id", "name") SELECT "companyId", "id", "name" FROM "InstallationTeam";
DROP TABLE "InstallationTeam";
ALTER TABLE "new_InstallationTeam" RENAME TO "InstallationTeam";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
