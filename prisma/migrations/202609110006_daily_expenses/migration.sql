ALTER TABLE "DailyTask" ADD COLUMN "expenseAmount" DECIMAL(14,2) NOT NULL DEFAULT 0, ADD COLUMN "expenseNotes" TEXT;
ALTER TABLE "DailyTask" ADD CONSTRAINT "DailyTask_expenseAmount_nonnegative" CHECK ("expenseAmount" >= 0);
