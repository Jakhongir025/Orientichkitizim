import type { Prisma } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { dateOnly } from "@/lib/time";
import { notificationDay } from "@/modules/notifications/report";
import { uzLabel } from "@/lib/uzbek";
const person = (
  user: { profile: { firstName: string; lastName: string } | null } | null,
) =>
  user?.profile
    ? `${user.profile.firstName} ${user.profile.lastName}`
    : "Qayd etilmagan";
const carName = (car: { brand: string; model: string; plateNumber: string }) =>
  `${car.brand} ${car.model} — ${car.plateNumber}`;
export async function dailyOperationsLines(
  tx: Prisma.TransactionClient,
  day: string,
) {
  const [services, tasks, rented, changes] = await Promise.all([
    tx.carService.findMany({
      where: { date: dateOnly(day) },
      include: {
        car: true,
        employee: { include: { profile: true } },
        serviceType: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    tx.dailyTask.findMany({
      where: { date: dateOnly(day), carId: { not: null } },
      include: { car: true, employee: { include: { profile: true } } },
      orderBy: { createdAt: "asc" },
    }),
    tx.car.findMany({
      where: { archived: false, status: "RENTED" },
      include: {
        statusHistory: {
          where: { toStatus: "RENTED" },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { employee: { include: { profile: true } } },
        },
      },
      orderBy: { plateNumber: "asc" },
    }),
    tx.auditLog.findMany({
      where: {
        entityType: "Car",
        action: "STATUS_CHANGE",
        timestamp: notificationDay(day),
      },
      include: { user: { include: { profile: true } } },
      orderBy: { timestamp: "asc" },
    }),
  ]);
  const time = (date: Date) =>
    formatInTimeZone(date, "Asia/Tashkent", "dd.MM.yyyy HH:mm");
  const lines = ["", "AVTOMOBILLARGA BAJARILGAN ISHLAR"];
  if (!services.length && !tasks.length)
    lines.push("Bu sana uchun avtomobil ishlari qayd etilmagan.");
  for (const s of services)
    lines.push(
      `${carName(s.car)} | ${uzLabel(s.serviceType.name)}`,
      `Xodim: ${person(s.employee)} | Kilometr: ${s.mileage}`,
      s.notes || "",
      "",
    );
  for (const t of tasks)
    lines.push(
      `${carName(t.car!)} | ${t.description}`,
      `Xodim: ${person(t.employee)} | Xarajat: ${t.expenseAmount.toString()} so‘m`,
      t.expenseNotes || "",
      "",
    );
  lines.push("BUGUN QAYD ETILGAN IJARA / BANDLIK");
  let count = 0;
  for (const event of changes) {
    const value = event.newValue;
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      value.status !== "RENTED"
    )
      continue;
    count++;
    const end =
      typeof value.occupiedUntil === "string" &&
      !isNaN(Date.parse(value.occupiedUntil))
        ? time(new Date(value.occupiedUntil))
        : "Qayd etilmagan";
    lines.push(
      `${String(value.brand || "")} ${String(value.model || "")} — ${String(value.plateNumber || "Raqam qayd etilmagan")}`,
      `Bandlikni kiritgan / ijaraga bergan: ${person(event.user)}`,
      `Qayd vaqti: ${time(event.timestamp)} | Ijara tugashi: ${end}`,
      "",
    );
  }
  if (!count) lines.push("Bugun yangi bandlik qaydi yo‘q.");
  lines.push("HISOBOT PAYTIDA IJARADAGI AVTOMOBILLAR");
  if (!rented.length) lines.push("Ijaradagi avtomobil yo‘q.");
  for (const c of rented)
    lines.push(
      carName(c),
      `Ijara tugashi: ${c.occupiedUntil ? time(c.occupiedUntil) : "Qayd etilmagan"}`,
      `Bandlikni kiritgan / ijaraga bergan: ${person(c.statusHistory[0]?.employee || null)}`,
      "",
    );
  return lines;
}
