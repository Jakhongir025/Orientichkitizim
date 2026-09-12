ALTER TABLE "CarStatusHistory" ALTER COLUMN "employeeId" DROP NOT NULL;
ALTER TABLE "AuditLog" ALTER COLUMN "userId" DROP NOT NULL;
CREATE INDEX "Car_expiring_rental_idx" ON "Car" ("occupiedUntil") WHERE "status" = 'RENTED' AND "archived" = false;
