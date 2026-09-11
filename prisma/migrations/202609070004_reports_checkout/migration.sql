ALTER TABLE "Attendance" ADD COLUMN "earlyLeaveReason" TEXT;
ALTER TABLE "EmployeeProfile" ADD COLUMN "reportFormat" TEXT NOT NULL DEFAULT 'TEXT';
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "report_format_valid" CHECK ("reportFormat" IN ('TEXT', 'PDF'));
ALTER TABLE "Notification" ADD COLUMN "documentData" BYTEA, ADD COLUMN "documentName" TEXT;
