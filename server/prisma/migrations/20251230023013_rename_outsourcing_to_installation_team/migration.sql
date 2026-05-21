/*
  Warnings:

  - You are about to drop the `OutsourcingPerformance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OutsourcingTeam` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "OutsourcingPerformance";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "OutsourcingTeam";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "InstallationTeam" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    CONSTRAINT "InstallationTeam_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InstallationPerformance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "teamId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "installations" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "InstallationPerformance_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "InstallationTeam" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "InstallationPerformance_teamId_month_year_key" ON "InstallationPerformance"("teamId", "month", "year");
