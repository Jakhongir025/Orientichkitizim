CREATE TABLE "MiniAppPin" (
 "userId" TEXT PRIMARY KEY,
 "pinHash" TEXT NOT NULL,
 "passwordBinding" TEXT NOT NULL,
 "telegramUserId" TEXT NOT NULL,
 "updatedAt" TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT "MiniAppPin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
