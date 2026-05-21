/*
  Warnings:

  - You are about to drop the column `paymentsReg` on the `DailyAgentMetric` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DailyAgentMetric" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "prospects" INTEGER NOT NULL DEFAULT 0,
    "closings" INTEGER NOT NULL DEFAULT 0,
    "revenue" REAL NOT NULL DEFAULT 0,
    "supportTickets" INTEGER NOT NULL DEFAULT 0,
    "tasksScheduled" INTEGER NOT NULL DEFAULT 0,
    "tasksDone" INTEGER NOT NULL DEFAULT 0,
    "supervisorScore" REAL NOT NULL DEFAULT 0,
    "versusPoints" INTEGER NOT NULL DEFAULT 0,
    "avoidableTickets" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DailyAgentMetric_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DailyAgentMetric" ("avoidableTickets", "closings", "date", "employeeId", "id", "month", "prospects", "revenue", "supervisorScore", "supportTickets", "versusPoints", "year") SELECT "avoidableTickets", "closings", "date", "employeeId", "id", "month", "prospects", "revenue", "supervisorScore", "supportTickets", "versusPoints", "year" FROM "DailyAgentMetric";
DROP TABLE "DailyAgentMetric";
ALTER TABLE "new_DailyAgentMetric" RENAME TO "DailyAgentMetric";
CREATE UNIQUE INDEX "DailyAgentMetric_employeeId_date_key" ON "DailyAgentMetric"("employeeId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
