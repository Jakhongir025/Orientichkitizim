import { uzLabel } from "@/lib/uzbek";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { dateOnly, businessDate } from "@/lib/time";
import { AppError } from "@/lib/errors";
import { notify } from "@/modules/notifications/service";
import { hasPermission } from "@/modules/auth/permissions";
import { reportPeriod } from "./period";
import { reportPdf } from "./pdf";
import { formatInTimeZone } from "date-fns-tz";
export type CarReport = {
  permissions?: string[];
  title: string;
  plate: string;
  period: string;
  generatedAt: string;
  lines: string[];
};
export async function buildCarReport(
  tx: Prisma.TransactionClient,
  carId: string,
  day: string,
  period: "DAY" | "WEEK" | "MONTH",
  permissions: string[],
): Promise<CarReport> {
  const car = await tx.car.findUniqueOrThrow({
    where: { id: carId },
    select: { id: true, brand: true, model: true, plateNumber: true },
  });
  const range = reportPeriod(day, period);
  const dated = { gte: dateOnly(range.startDay), lt: dateOnly(range.endDay) };
  const timed = { gte: range.start, lt: range.end };
  const [services, tasks, statuses, documents, rentals] = await Promise.all([
    tx.carService.findMany({
      where: { carId, date: dated },
      include: { serviceType: true, employee: { select: { profile: true } } },
      orderBy: { date: "asc" },
    }),
    tx.dailyTask.findMany({
      where: { carId, date: dated },
      include: { employee: { select: { profile: true } } },
      orderBy: { date: "asc" },
    }),
    tx.carStatusHistory.findMany({
      where: { carId, createdAt: timed },
      orderBy: { createdAt: "asc" },
    }),
    hasPermission(permissions, "documents.read")
      ? tx.carDocument.findMany({
          where: {
            carId,
            OR: [
              { createdAt: timed },
              { updatedAt: timed },
              { expiryDate: dated },
            ],
          },
          include: { documentType: true },
          orderBy: { expiryDate: "asc" },
        })
      : Promise.resolve([]),
    hasPermission(permissions, "rentals.read")
      ? tx.rentalRecord.findMany({
          where: {
            carId,
            rentalStart: { lt: range.end },
            rentalEnd: { gt: range.start },
          },
          select: { contractNumber: true, rentalStart: true, rentalEnd: true },
          orderBy: { rentalStart: "asc" },
        })
      : Promise.resolve([]),
  ]);
  const name = (p: { firstName: string; lastName: string } | null) =>
    p ? `${p.firstName} ${p.lastName}` : "—";
  const dayOf = (d: Date) => d.toISOString().slice(0, 10);
  const stamp = (d: Date) =>
    formatInTimeZone(d, "Asia/Tashkent", "yyyy-MM-dd HH:mm");
  const lines = [
    `Servis ishlari: ${services.length}`,
    `Avtomobilga bog‘langan kunlik qaydlar: ${tasks.length}`,
    `Holat o‘zgarishlari: ${statuses.length}`,
  ];
  lines.push("", "SERVIS TARIXI");
  for (const s of services)
    lines.push(
      `${dayOf(s.date)} | ${uzLabel(s.serviceType.name)} | ${s.mileage} km | ${name(s.employee.profile)}${s.notes ? `\n${s.notes}` : ""}`,
    );
  if (!services.length) lines.push("Bu davrda servis qaydi yo‘q.");
  lines.push(
    "",
    "KUNLIK ISHLAR",
    `Jami xarajat: ${tasks.reduce((total, t) => total.plus(t.expenseAmount), new Prisma.Decimal(0)).toFixed(2)} so‘m`,
  );
  for (const t of tasks)
    lines.push(
      `${dayOf(t.date)} | ${name(t.employee.profile)}\n${t.description}\nXarajat: ${t.expenseAmount.toFixed(2)} so‘m${t.expenseNotes ? `\n${t.expenseNotes}` : ""}`,
    );
  if (!tasks.length) lines.push("Bu davrda avtomobilga bog‘langan qayd yo‘q.");
  lines.push("", "HOLAT TARIXI");
  for (const s of statuses)
    lines.push(
      `${stamp(s.createdAt)} | ${uzLabel(s.fromStatus)} -> ${uzLabel(s.toStatus)}`,
    );
  if (!statuses.length) lines.push("Holat o‘zgarishi qayd etilmagan.");
  if (hasPermission(permissions, "documents.read")) {
    lines.push("", "HUJJATLAR (joriy ma’lumot)");
    for (const d of documents)
      lines.push(
        `${uzLabel(d.documentType.name)} | ${d.number} | Amal muddati: ${dayOf(d.expiryDate)} | Oxirgi yangilanish: ${stamp(d.updatedAt)}`,
      );
    if (!documents.length)
      lines.push("Ushbu davrga tegishli hujjat yangilanishi/muddati yo‘q.");
  }
  if (hasPermission(permissions, "rentals.read")) {
    lines.push("", `IJARA DAVRLARI: ${rentals.length}`);
    for (const r of rentals)
      lines.push(
        `${r.contractNumber} | ${stamp(r.rentalStart)} - ${stamp(r.rentalEnd)}`,
      );
    lines.push(
      "Ijara ma’lumotlari oxirgi Google Sheets sinxronlashidan olingan. Passport ma’lumotlari hisobotga kiritilmaydi.",
    );
  }
  return {
    permissions: [
      "cars.read",
      ...(hasPermission(permissions, "documents.read")
        ? ["documents.read"]
        : []),
      ...(hasPermission(permissions, "rentals.read") ? ["rentals.read"] : []),
    ],
    title: `${car.brand} ${car.model}`,
    plate: car.plateNumber,
    period: `${range.startDay} - ${range.endDay} (oxirgi sana kirmaydi, Asia/Tashkent)`,
    generatedAt: stamp(new Date()),
    lines,
  };
}
export const reportText = (report: CarReport) =>
  [
    `RENTCAR | AVTOMOBIL HISOBOTI`,
    report.title,
    `Davlat raqami: ${report.plate}`,
    `Davr: ${report.period}`,
    `Tuzilgan: ${report.generatedAt}`,
    "",
    ...report.lines,
  ].join("\n");
export function splitReport(text: string) {
  const chunks: string[] = [];
  let current = "";
  for (const char of text) {
    if (current.length + char.length > 3500) {
      chunks.push(current);
      current = "";
    }
    current += char;
  }
  if (current) chunks.push(current);
  return chunks;
}
export async function enqueueReport(
  tx: Prisma.TransactionClient,
  report: CarReport,
  userId: string,
  chatId: string,
  format: "TEXT" | "PDF",
  key: string,
) {
  const text = reportText(report);
  if (format === "PDF") {
    await notify(tx, {
      category: "REPORTS",
      userId,
      chatId,
      requiredPermissions: report.permissions || ["cars.read"],
      title: `Avtomobil hisoboti: ${report.plate}`,
      message: `${report.title}\n${report.plate}\n${report.period}`,
      dedupeKey: key,
      documentData: new Uint8Array(await reportPdf(report)),
      documentName: `rentcar-${report.plate.replace(/[^a-zA-Z0-9]/g, "")}.pdf`,
    });
  } else {
    const chunks = splitReport(text);
    for (let i = 0; i < chunks.length; i++)
      await notify(tx, {
        category: "REPORTS",
        userId,
        chatId,
        requiredPermissions: report.permissions || ["cars.read"],
        title: `Avtomobil hisoboti: ${report.plate} (${i + 1}/${chunks.length})`,
        message: chunks[i],
        dedupeKey: `${key}:${i}`,
      });
  }
}
export async function monthlyCarReports(
  now = new Date(),
  scope?: { userId: string; carId: string },
) {
  const current = businessDate(now).slice(0, 7);
  const date = new Date(`${current}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - 1);
  const day = date.toISOString().slice(0, 10);
  const users = await db.user.findMany({
    where: {
      active: true,
      ...(scope ? { id: scope.userId } : {}),
      profile: { telegramVerified: true, telegramChatId: { not: null } },
    },
    include: { profile: true, role: true },
  });
  const cars = await db.car.findMany({
    where: scope ? { id: scope.carId } : undefined,
    select: { id: true, createdAt: true, archived: true },
  });
  for (const user of users) {
    if (
      !user.profile?.telegramChatId ||
      !hasPermission(user.role.permissions, "cars.read")
    )
      continue;
    for (const car of cars) {
      if (car.createdAt >= reportPeriod(day, "MONTH").end) continue;
      await db.$transaction(
        async (tx) => {
          await enqueueMonthlyReport(tx, user.id, car.id, day);
        },
        { timeout: 60000 },
      );
    }
  }
}

export async function enqueueMonthlyReport(
  tx: Prisma.TransactionClient,
  userId: string,
  carId: string,
  day: string,
) {
  const key = `monthly-car:${day.slice(0, 7)}:${userId}:${carId}`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
  if (await tx.scheduledJob.findUnique({ where: { key } })) return;
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    include: { profile: true, role: true },
  });
  if (
    !user.active ||
    !user.profile?.telegramVerified ||
    !user.profile.telegramChatId ||
    !hasPermission(user.role.permissions, "cars.read")
  )
    return;
  const report = await buildCarReport(
    tx,
    carId,
    day,
    "MONTH",
    user.role.permissions,
  );
  await enqueueReport(
    tx,
    report,
    userId,
    user.profile.telegramChatId,
    user.profile.reportFormat === "PDF" ? "PDF" : "TEXT",
    key,
  );
  await tx.scheduledJob.create({ data: { key } });
}
