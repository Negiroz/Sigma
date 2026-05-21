-- CreateTable
CREATE TABLE "DailyBranchMetric" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "branchId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "installations" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL NOT NULL DEFAULT 0.00,
    CONSTRAINT "DailyBranchMetric_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyBranchMetric_branchId_date_key" ON "DailyBranchMetric"("branchId", "date");
