import { Prisma } from "@prisma/client";
import { z } from "zod";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { date } from "@/lib/validation";
import { AppError } from "@/lib/errors";
import { hasPermission } from "@/modules/auth/permissions";
import { reportPdf } from "@/modules/car-reports/pdf";
import { notify } from "./service";
export const notificationCategories = {
  ATTENDANCE: "Ishga kelish / ketish",
  SERVICE: "Servis ishlari",
  DOCUMENTS: "Hujjatlar",
  REPORTS: "Hisobotlar",
  OTHER: "Boshqa",
  ALL: "Barcha bo‘limlar",
};
export const notificationQuery = z.object({
  date: date.optional(),
  category: z
    .enum(["ATTENDANCE", "SERVICE", "DOCUMENTS", "REPORTS", "OTHER", "ALL"])
    .default("ALL"),
  q: z.string().trim().max(100).default(""),
});
export function notificationDay(day: string) {
  date.parse(day);
  const next = new Date(`${day}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return {
    gte: fromZonedTime(`${day}T00:00:00`, "Asia/Tashkent"),
    lt: fromZonedTime(
      `${next.toISOString().slice(0, 10)}T00:00:00`,
      "Asia/Tashkent",
    ),
  };
}
export type NotificationViewer = {
  id: string;
  role: { permissions: string[] };
};
export function notificationWhere(
  viewer: NotificationViewer,
  raw: unknown,
): Prisma.NotificationWhereInput {
  const input = notificationQuery.parse(raw);
  if (!hasPermission(viewer.role.permissions, "notifications.read"))
    throw new AppError(403, "Bildirishnomalarni ko‘rishga ruxsat yo‘q");
  return {
    ...(hasPermission(viewer.role.permissions, "settings.write")
      ? {}
      : { userId: viewer.id }),
    ...(input.date ? { createdAt: notificationDay(input.date) } : {}),
    ...(input.category !== "ALL" ? { category: input.category } : {}),
    ...(input.q
      ? {
          OR: [
            { title: { contains: input.q, mode: "insensitive" } },
            { message: { contains: input.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}
export async function buildNotificationPdf(
  tx: Prisma.TransactionClient,
  viewer: NotificationViewer,
  raw: unknown,
) {
  const input = notificationQuery.extend({ date }).parse(raw);
  const rows = await tx.notification.findMany({
    where: notificationWhere(viewer, input),
    select: { title: true, message: true, createdAt: true, category: true },
    orderBy: [{ category: "asc" }, { createdAt: "desc" }, { id: "desc" }],
    take: 2001,
  });
  if (rows.length > 2000)
    throw new AppError(400, "Yozuvlar ko‘p. Bitta bo‘limni tanlang");
  const lines: string[] = [];
  for (const [category, label] of Object.entries(notificationCategories)) {
    if (
      category === "ALL" ||
      (input.category !== "ALL" && input.category !== category)
    )
      continue;
    const group = rows.filter((n) => n.category === category);
    lines.push(label, `${group.length} ta yozuv`, "");
    for (const row of group)
      lines.push(
        `${formatInTimeZone(row.createdAt, "Asia/Tashkent", "HH:mm")} | ${row.title}`,
        row.message,
        "",
      );
  }
  if (!rows.length) lines.push("Ushbu sanada bildirishnoma qayd etilmagan.");
  const pdf = await reportPdf(
    {
      title: "Kunlik bildirishnomalar",
      plate: notificationCategories[input.category],
      period: `${input.date} | Asia/Tashkent`,
      generatedAt: formatInTimeZone(
        new Date(),
        "Asia/Tashkent",
        "dd.MM.yyyy HH:mm",
      ),
      lines,
    },
    "ORIENTRENTCAR / KUNLIK HISOBOT",
  );
  return {
    pdf,
    filename: `orient-${input.date}-${input.category.toLowerCase()}.pdf`,
    input,
  };
}
export async function enqueueNotificationPdf(
  tx: Prisma.TransactionClient,
  viewer: NotificationViewer,
  chatId: string,
  raw: unknown,
  key: string,
) {
  if (
    await tx.notification.findUnique({
      where: { dedupeKey: key },
      select: { id: true },
    })
  )
    return;
  const result = await buildNotificationPdf(tx, viewer, raw);
  await notify(tx, {
    userId: viewer.id,
    chatId,
    category: "REPORTS",
    title: "Kunlik PDF hisoboti",
    message: `${result.input.date} | ${notificationCategories[result.input.category]} | Asia/Tashkent`,
    documentData: new Uint8Array(result.pdf),
    documentName: result.filename,
    requiredPermissions: [
      "notifications.read",
      ...(hasPermission(viewer.role.permissions, "settings.write")
        ? ["settings.write"]
        : []),
    ],
    dedupeKey: key,
  });
}
