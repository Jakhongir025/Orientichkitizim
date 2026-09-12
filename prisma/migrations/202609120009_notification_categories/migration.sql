ALTER TABLE "Notification" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'OTHER';
UPDATE "Notification" SET "category" = 'ATTENDANCE' WHERE "dedupeKey" LIKE 'late:%' OR "dedupeKey" LIKE 'checkout:%' OR "dedupeKey" LIKE 'missing-attendance:%' OR "dedupeKey" LIKE 'attendance:%' OR "dedupeKey" LIKE 'closing:%';
UPDATE "Notification" SET "category" = 'DOCUMENTS' WHERE "dedupeKey" LIKE 'document:%';
CREATE INDEX "Notification_category_createdAt_idx" ON "Notification" ("category", "createdAt");
UPDATE "Notification" SET "category" = 'REPORTS' WHERE "dedupeKey" LIKE 'monthly-car:%' OR "dedupeKey" LIKE 'car-report:%';
