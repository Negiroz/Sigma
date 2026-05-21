-- CreateTable
CREATE TABLE "VersusMatch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "companyId" INTEGER NOT NULL,
    "agent1Id" INTEGER NOT NULL,
    "agent2Id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "winnerId" INTEGER,
    CONSTRAINT "VersusMatch_agent1Id_fkey" FOREIGN KEY ("agent1Id") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VersusMatch_agent2Id_fkey" FOREIGN KEY ("agent2Id") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "VersusMatch_date_agent1Id_key" ON "VersusMatch"("date", "agent1Id");
