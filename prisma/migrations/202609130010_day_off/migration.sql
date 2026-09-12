CREATE TABLE "DayOff" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id"), "date" DATE NOT NULL, "notes" TEXT,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL
);
CREATE UNIQUE INDEX "DayOff_userId_date_key" ON "DayOff"("userId", "date");
CREATE INDEX "DayOff_date_idx" ON "DayOff"("date");
