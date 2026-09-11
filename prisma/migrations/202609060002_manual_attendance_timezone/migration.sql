ALTER TABLE "Attendance"
  ADD COLUMN "checkInTimezone" TEXT NOT NULL DEFAULT 'Asia/Tashkent',
  ADD COLUMN "checkOutTimezone" TEXT,
  ADD COLUMN "checkInRecordedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "checkOutRecordedAt" TIMESTAMPTZ(3);
-- Before this migration all entries used server time in Tashkent.
UPDATE "Attendance" SET "checkInRecordedAt"="checkIn", "checkOutRecordedAt"="checkOut", "checkOutTimezone"=CASE WHEN "checkOut" IS NOT NULL THEN 'Asia/Tashkent' ELSE NULL END;
