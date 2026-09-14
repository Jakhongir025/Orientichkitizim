import { attendanceReport } from "@/modules/attendance/report";
export { attendanceReport } from "@/modules/attendance/report";
import { isAttendanceManager } from "@/modules/attendance/recipients";
import { reportPdf } from "@/modules/car-reports/pdf";
import { monthlyCarReports } from "@/modules/car-reports/service";
import { db } from "@/lib/db";
import { logger } from "@/lib/errors";
import { businessDate, dateOnly, localClock } from "@/lib/time";
import { sendExpirationSummary } from "@/modules/documents/service";
import { syncSheets } from "@/modules/google-sheets/service";
import { notify } from "@/modules/notifications/service";
import { Prisma } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
async function once(
  name: string,
  work: (tx: Prisma.TransactionClient) => Promise<void>,
) {
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(81291)`;
      const key = `${businessDate()}:${name}`;
      if (await tx.scheduledJob.findUnique({ where: { key } })) return false;
      await work(tx);
      await tx.scheduledJob.create({ data: { key } });
      return true;
    },
    { timeout: 60000 },
  );
}
export async function scheduledTick() {
  const clock = localClock();
  if (clock >= "08:00")
    await once("monthly-car-reports", async () => {
      await monthlyCarReports();
    });
  for (const slot of ["10:30", "21:30"]) {
    if (clock >= slot)
      await once(`documents-summary-${slot}`, async (tx) => {
        await sendExpirationSummary(tx, new Date(), slot);
      });
  }
  if (clock >= "10:10")
    await once("attendance", async (tx) => {
      await attendanceReport(tx);
    });
  if (clock >= "22:10")
    await once("closing", async (tx) => {
      await attendanceReport(tx, true);
    });
  if (clock >= "06:00") {
    const configs = await db.googleSheetsConfig.findMany({
      where: { enabled: true },
    });
    for (const config of configs) {
      if (
        config.syncStatus === "FAILED" &&
        Date.now() - config.updatedAt.getTime() < 15 * 60000
      )
        continue;
      if (
        config.lastSyncAt &&
        businessDate(config.lastSyncAt) === businessDate()
      )
        continue;
      try {
        await syncSheets(config.id);
      } catch {
        logger.warn("scheduled_sync_failed");
      }
    }
  }
  await once("cleanup", async (tx) => {
    await tx.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await tx.loginAttempt.deleteMany({
      where: { resetAt: { lt: new Date() } },
    });
    await tx.telegramLinkToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  });
}
