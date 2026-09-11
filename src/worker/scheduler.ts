import { monthlyCarReports } from "@/modules/car-reports/service";
import { db } from "@/lib/db";
import { logger } from "@/lib/errors";
import { businessDate, dateOnly, localClock } from "@/lib/time";
import { checkExpirations } from "@/modules/documents/service";
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
export async function attendanceReport(
  tx: Prisma.TransactionClient,
  closing = false,
  onlyOfficeId?: string,
) {
  const offices = await tx.office.findMany({
    where: onlyOfficeId ? { id: onlyOfficeId } : undefined,
    include: {
      employees: {
        where: { user: { active: true } },
        include: {
          user: {
            include: {
              attendance: { where: { date: dateOnly(businessDate()) } },
            },
          },
        },
      },
    },
  });
  for (const office of offices) {
    if (!closing) {
      for (const employee of office.employees) {
        if (employee.user.attendance.length) continue;
        await notify(tx, {
          title: "⚠️ Ishga kelish qayd etilmadi",
          message: `⚠️ Ishga kelish / ofisni ochish qayd etilmadi\nXodim: ${employee.firstName} ${employee.lastName}\nOfis: ${office.name}\nSana: ${businessDate()}\nIsh boshlanishi: 10:00\nTekshiruv: ${localClock()} (Asia/Tashkent)\n10:00 dan keyin ham xodim ishga kelish qaydini kiritmagan. Ofis ochilganini xodim bilan aniqlashtiring.`,
          chatId: office.telegramChatId || process.env.TELEGRAM_ADMIN_CHAT_ID,
          dedupeKey: `missing-attendance:${office.id}:${employee.userId}:${businessDate()}`,
        });
      }
    }
    const lines = office.employees.map((p) => {
      const a = p.user.attendance[0];
      return closing
        ? `${p.firstName} ${p.lastName} — ${a?.checkOut ? formatInTimeZone(a.checkOut, a.checkOutTimezone || a.checkInTimezone, "dd.MM.yyyy HH:mm") + ` (${a.checkOutTimezone || a.checkInTimezone})` + " ✅" : a ? "checkout qilmagan ⚠️" : "check-in qilmagan ❌"}`
        : `${p.firstName} ${p.lastName} — ${a ? formatInTimeZone(a.checkIn, a.checkInTimezone, "dd.MM.yyyy HH:mm") + ` (${a.checkInTimezone})` + (a.status === "LATE" ? ` ⚠️ Kechikdi\nSabab: ${a.lateReason}` : " ✅") : "hali check-in qilmagan ❌"}`;
    });
    const title = closing
      ? "Ish kuni yakuni"
      : "📋 Bugungi ishga kelish hisoboti";
    // Chunk on employee boundaries; no silent 4096-character truncation of a large office report.
    let chunk = "",
      part = 0;
    for (const line of [...lines, ""]) {
      if (chunk.length + line.length > 3300 || line === "") {
        if (chunk)
          await notify(tx, {
            title,
            message: `${title}\n${office.name}\n${businessDate()}\n${chunk}`,
            chatId: office.telegramChatId || process.env.TELEGRAM_ADMIN_CHAT_ID,
            dedupeKey: `${closing ? "closing" : "attendance"}:${office.id}:${businessDate()}:${part++}`,
          });
        chunk = "";
      }
      chunk += line + "\n";
    }
  }
}
export async function scheduledTick() {
  const clock = localClock();
  if (clock >= "08:00")
    await once("monthly-car-reports", async () => {
      await monthlyCarReports();
    });
  if (clock >= "08:00")
    await once("documents", async (tx) => {
      await checkExpirations(tx);
    });
  if (clock >= "10:10") await once("attendance", (tx) => attendanceReport(tx));
  if (clock >= "22:10")
    await once("closing", (tx) => attendanceReport(tx, true));
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
