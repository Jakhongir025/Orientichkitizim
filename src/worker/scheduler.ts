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
  now = new Date(),
) {
  const offices = await tx.office.findMany({
    where: onlyOfficeId ? { id: onlyOfficeId } : undefined,
    include: {
      employees: {
        where: { user: { active: true } },
        include: {
          user: {
            include: {
              daysOff: {
                where: { date: { gte: dateOnly(businessDate(now)) } },
                orderBy: { date: "asc" },
              },
              attendance: { where: { date: dateOnly(businessDate(now)) } },
            },
          },
        },
      },
    },
  });
  for (const office of offices) {
    if (!closing) {
      for (const employee of office.employees) {
        if (
          employee.user.attendance.length ||
          employee.user.daysOff.some(
            (d) => d.date.getTime() === dateOnly(businessDate(now)).getTime(),
          )
        )
          continue;
        await notify(tx, {
          category: "ATTENDANCE",
          title: "⚠️ Ishga kelish qayd etilmadi",
          message: `⚠️ Ishga kelish / ofisni ochish qayd etilmadi\nXodim: ${employee.firstName} ${employee.lastName}\nOfis: ${office.name}\nSana: ${businessDate(now)}\nIsh boshlanishi: 10:00\nTekshiruv: ${localClock()} (Asia/Tashkent)\n10:00 dan keyin ham xodim ishga kelish qaydini kiritmagan. Ofis ochilganini xodim bilan aniqlashtiring.`,
          chatId: office.telegramChatId || process.env.TELEGRAM_ADMIN_CHAT_ID,
          dedupeKey: `missing-attendance:${office.id}:${employee.userId}:${businessDate(now)}`,
        });
      }
    }
    const lines = office.employees.map((p) => {
      const a = p.user.attendance[0];
      const restToday = p.user.daysOff.some(
        (d) => d.date.getTime() === dateOnly(businessDate(now)).getTime(),
      );
      const upcoming = p.user.daysOff.filter(
        (d) => d.date > dateOnly(businessDate(now)),
      );
      const suffix =
        closing && upcoming.length
          ? `\n${upcoming.map((d) => `${d.date.toISOString().slice(0, 10)} — Dam olish kuni`).join("\n")}`
          : "";
      const identity = `${p.firstName} ${p.lastName} | Telefon: ${p.phone}`;
      if (restToday) return `${identity} — Dam olish kuni${suffix}`;
      return (
        (closing
          ? `${identity} — ${a?.checkOut ? formatInTimeZone(a.checkOut, a.checkOutTimezone || a.checkInTimezone, "dd.MM.yyyy HH:mm") + ` (${a.checkOutTimezone || a.checkInTimezone})` + " ✅" : a ? "ketishni qayd etmagan ⚠️" : "ishga kelishni qayd etmagan ❌"}`
          : `${identity} — ${a ? formatInTimeZone(a.checkIn, a.checkInTimezone, "dd.MM.yyyy HH:mm") + ` (${a.checkInTimezone})` + (a.status === "LATE" ? ` ⚠️ Kechikdi\nSabab: ${a.lateReason}` : " ✅") : "hali ishga kelishni qayd etmagan ❌"}`) +
        suffix
      );
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
            category: "ATTENDANCE",
            title,
            message: `${title}\n${office.name}\n${businessDate(now)}\n${chunk}`,
            chatId: office.telegramChatId || process.env.TELEGRAM_ADMIN_CHAT_ID,
            dedupeKey: `${closing ? "closing" : "attendance"}:${office.id}:${businessDate(now)}:${part++}`,
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
