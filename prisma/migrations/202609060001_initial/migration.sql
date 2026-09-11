-- CreateEnum
CREATE TYPE "CarStatus" AS ENUM ('AVAILABLE', 'RENTED', 'SERVICE', 'RESERVED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('ON_TIME', 'LATE');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" TEXT[],

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "telegramUserId" TEXT,
    "telegramChatId" TEXT,
    "telegramUsername" TEXT,
    "telegramVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "EmployeeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Office" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tashkent',
    "startTime" TEXT NOT NULL DEFAULT '10:00',
    "endTime" TEXT NOT NULL DEFAULT '22:00',
    "telegramChatId" TEXT,

    CONSTRAINT "Office_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "resetAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "checkIn" TIMESTAMPTZ(3) NOT NULL,
    "checkOut" TIMESTAMPTZ(3),
    "status" "AttendanceStatus" NOT NULL,
    "lateReason" TEXT,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyTask" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "carId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DailyTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Car" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "normalizedPlate" TEXT NOT NULL,
    "legalPlateNumber" TEXT,
    "vin" TEXT,
    "color" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "mileage" INTEGER NOT NULL DEFAULT 0,
    "status" "CarStatus" NOT NULL DEFAULT 'AVAILABLE',
    "location" TEXT NOT NULL,
    "notes" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarStatusHistory" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "fromStatus" "CarStatus" NOT NULL,
    "toStatus" "CarStatus" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ServiceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarService" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "serviceTypeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "mileage" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "DocumentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarDocument" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "company" TEXT,
    "startDate" DATE NOT NULL,
    "expiryDate" DATE NOT NULL,
    "responsibleId" TEXT NOT NULL,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CarDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramRecipient" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,

    CONSTRAINT "TelegramRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramLinkToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TelegramLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleSheetsConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "range" TEXT NOT NULL,
    "mapping" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMPTZ(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'NEVER',
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "GoogleSheetsConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalRecord" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passportEncrypted" TEXT,
    "passportDetailsEncrypted" TEXT,
    "rentalStart" TIMESTAMPTZ(3) NOT NULL,
    "rentalEnd" TIMESTAMPTZ(3) NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "issuedBy" TEXT,
    "acceptedBy" TEXT,
    "notes" TEXT,
    "importedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "chatId" TEXT,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "dedupeKey" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseUntil" TIMESTAMPTZ(3),
    "lastError" TEXT,
    "readAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "timestamp" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ScheduledJob" (
    "key" TEXT NOT NULL,
    "completedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduledJob_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_userId_key" ON "EmployeeProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_telegramUserId_key" ON "EmployeeProfile"("telegramUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Attendance_date_status_idx" ON "Attendance"("date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_userId_date_key" ON "Attendance"("userId", "date");

-- CreateIndex
CREATE INDEX "DailyTask_employeeId_date_idx" ON "DailyTask"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Car_plateNumber_key" ON "Car"("plateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Car_normalizedPlate_key" ON "Car"("normalizedPlate");

-- CreateIndex
CREATE UNIQUE INDEX "Car_vin_key" ON "Car"("vin");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceType_name_key" ON "ServiceType"("name");

-- CreateIndex
CREATE INDEX "CarService_carId_date_idx" ON "CarService"("carId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentType_name_key" ON "DocumentType"("name");

-- CreateIndex
CREATE INDEX "CarDocument_expiryDate_idx" ON "CarDocument"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramRecipient_employeeId_documentId_key" ON "TelegramRecipient"("employeeId", "documentId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLinkToken_tokenHash_key" ON "TelegramLinkToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RentalRecord_carId_rentalStart_rentalEnd_idx" ON "RentalRecord"("carId", "rentalStart", "rentalEnd");

-- CreateIndex
CREATE UNIQUE INDEX "RentalRecord_configId_sourceId_key" ON "RentalRecord"("configId", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_status_nextAttemptAt_idx" ON "Notification"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_timestamp_idx" ON "AuditLog"("entityType", "entityId", "timestamp");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTask" ADD CONSTRAINT "DailyTask_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTask" ADD CONSTRAINT "DailyTask_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarStatusHistory" ADD CONSTRAINT "CarStatusHistory_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarStatusHistory" ADD CONSTRAINT "CarStatusHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarService" ADD CONSTRAINT "CarService_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarService" ADD CONSTRAINT "CarService_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarService" ADD CONSTRAINT "CarService_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarDocument" ADD CONSTRAINT "CarDocument_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarDocument" ADD CONSTRAINT "CarDocument_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "DocumentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarDocument" ADD CONSTRAINT "CarDocument_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramRecipient" ADD CONSTRAINT "TelegramRecipient_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramRecipient" ADD CONSTRAINT "TelegramRecipient_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "CarDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramLinkToken" ADD CONSTRAINT "TelegramLinkToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalRecord" ADD CONSTRAINT "RentalRecord_configId_fkey" FOREIGN KEY ("configId") REFERENCES "GoogleSheetsConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalRecord" ADD CONSTRAINT "RentalRecord_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Domain invariants remain valid for imports and future non-HTTP writers.
ALTER TABLE "Car" ADD CONSTRAINT "Car_mileage_nonnegative" CHECK ("mileage" >= 0);
ALTER TABLE "Car" ADD CONSTRAINT "Car_year_valid" CHECK ("year" BETWEEN 1950 AND 2100);
ALTER TABLE "Car" ADD CONSTRAINT "Car_normalized_plate_consistent" CHECK ("normalizedPlate" = UPPER(REGEXP_REPLACE("plateNumber", '\s', '', 'g')));
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_late_reason_required" CHECK ("status" != 'LATE' OR LENGTH(TRIM("lateReason")) >= 3 AND "lateReason" IS NOT NULL);
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_checkout_after_checkin" CHECK ("checkOut" IS NULL OR "checkOut" >= "checkIn");
ALTER TABLE "CarDocument" ADD CONSTRAINT "CarDocument_dates_ordered" CHECK ("expiryDate" >= "startDate");
ALTER TABLE "CarService" ADD CONSTRAINT "CarService_mileage_nonnegative" CHECK ("mileage" >= 0);
ALTER TABLE "RentalRecord" ADD CONSTRAINT "RentalRecord_dates_ordered" CHECK ("rentalEnd" > "rentalStart");
CREATE UNIQUE INDEX "Attendance_one_open_shift" ON "Attendance" ("userId") WHERE "checkOut" IS NULL;
