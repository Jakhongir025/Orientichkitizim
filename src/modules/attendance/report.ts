import { dailyOperationsLines } from "@/modules/car-reports/daily-operations";
import { isAttendanceManager } from "./recipients";
import { reportPdf } from "@/modules/car-reports/pdf";
import { businessDate, dateOnly } from "@/lib/time";
import { notify } from "@/modules/notifications/service";
import { Prisma } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
export async function attendanceReport(
  tx: Prisma.TransactionClient,
  closing = false,
  onlyOfficeId?: string,
  now = new Date(),
  manual?: { userId: string; requestId: string; date: string },
) {
  const day = manual?.date ?? businessDate(now);
  const offices = await tx.office.findMany({
    where: onlyOfficeId ? { id: onlyOfficeId } : undefined,
    include: {
      employees: {
        where: { user: { active: true } },
        include: {
          user: {
            include: {
              daysOff: {
                where: { date: { gte: dateOnly(day) } },
                orderBy: { date: "asc" },
              },
              attendance: { where: { date: dateOnly(day) } },
            },
          },
        },
      },
    },
  });
  const lines: string[] = [];
  for (const office of offices) {
    lines.push(`Ofis: ${office.name}`);
    for (const p of office.employees) {
      const a = p.user.attendance[0];
      const rest = p.user.daysOff.some(
        (d) => d.date.getTime() === dateOnly(day).getTime(),
      );
      const clock = (value: Date | null | undefined) =>
        value
          ? formatInTimeZone(value, "Asia/Tashkent", "HH:mm")
          : "Qayd etilmagan";
      lines.push(`${p.firstName} ${p.lastName} | Telefon: ${p.phone}`);
      lines.push(
        rest
          ? "Dam olish kuni"
          : `Kelish: ${clock(a?.checkIn)}${closing ? ` | Ketish: ${a?.checkOut ? clock(a.checkOut) : a?.checkIn ? "Hali ofisda — ketish qayd etilmagan" : "Kelish ham, ketish ham qayd etilmagan"}` : ""}`,
      );
      if (a?.lateReason) lines.push(`Kechikish sababi: ${a.lateReason}`);
      if (closing && a?.earlyLeaveReason)
        lines.push(`Erta ketish sababi: ${a.earlyLeaveReason}`);
      if (closing)
        for (const restDay of p.user.daysOff.filter(
          (d) => d.date > dateOnly(day),
        ))
          lines.push(
            `${restDay.date.toISOString().slice(0, 10)} — Dam olish kuni`,
          );
      lines.push("");
    }
  }
  if (closing && !manual && !onlyOfficeId)
    lines.push(...(await dailyOperationsLines(tx, day)));
  const title = manual
    ? "Kunlik davomat hisoboti"
    : closing
      ? "Ish kuni yakuni — davomat va avtomobillar"
      : "Bugungi ishga kelish hisoboti";
  const recipients = (
    await tx.user.findMany({
      where: { active: true, ...(manual ? { id: manual.userId } : {}) },
      include: { role: true, profile: true },
    })
  ).filter(isAttendanceManager);
  if (!recipients.length) return lines;
  const pdf = await reportPdf(
    {
      title,
      plate: "Barcha ofislar",
      period: day,
      generatedAt:
        formatInTimeZone(now, "Asia/Tashkent", "dd.MM.yyyy HH:mm") +
        " (Toshkent)",
      lines,
    },
    "ORIENTRENTCAR / DAVOMAT",
  );
  for (const recipient of recipients)
    await notify(tx, {
      category: "ATTENDANCE",
      userId: recipient.id,
      chatId: recipient.profile!.telegramChatId!,
      title,
      message: `${title} — ${day} (Toshkent vaqti)`,
      documentData: new Uint8Array(pdf),
      documentName: `davomat-${day}-${manual ? "sorov" : closing ? "2210" : "1010"}.pdf`,
      dedupeKey: `attendance-pdf:${manual ? `manual:${manual.requestId}` : closing ? "closing" : "morning"}:${day}:${recipient.id}`,
    });
  return lines;
}
