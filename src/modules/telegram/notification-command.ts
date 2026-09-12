import type { Prisma } from "@prisma/client";
import { enqueueNotificationPdf } from "@/modules/notifications/report";
import { notify } from "@/modules/notifications/service";
import { hasPermission } from "@/modules/auth/permissions";
const categories: Record<string, string> = {
  davomat: "ATTENDANCE",
  servis: "SERVICE",
  hujjatlar: "DOCUMENTS",
  hisobotlar: "REPORTS",
  boshqa: "OTHER",
  barchasi: "ALL",
};
export async function handleNotificationCommand(
  tx: Prisma.TransactionClient,
  updateId: number,
  m: {
    text?: string;
    from: { id: number };
    chat: { id: number; type: string };
  },
) {
  if (
    !m.text ||
    !/^\/(hisobot|pdf)(?:@\w+)?(?:\s|$)/i.test(m.text) ||
    m.chat.type !== "private" ||
    m.from.id !== m.chat.id
  )
    return;
  const profile = await tx.employeeProfile.findUnique({
    where: { telegramUserId: String(m.from.id) },
    include: { user: { include: { role: true } } },
  });
  if (
    !profile?.user.active ||
    !profile.telegramVerified ||
    profile.telegramChatId !== String(m.chat.id) ||
    !hasPermission(profile.user.role.permissions, "notifications.read")
  )
    return;
  const key = `notification-pdf-command:${profile.userId}:${updateId}`;
  if (
    await tx.notification.findUnique({
      where: { dedupeKey: key },
      select: { id: true },
    })
  )
    return;
  const recent = await tx.notification.count({
    where: {
      userId: profile.userId,
      dedupeKey: { startsWith: `notification-pdf-command:${profile.userId}:` },
      createdAt: { gte: new Date(Date.now() - 60000) },
    },
  });
  if (recent >= 3) return;
  const parts = m.text.trim().split(/\s+/);
  const category = categories[(parts[2] || "barchasi").toLowerCase()];
  try {
    if (parts.length > 3 || !parts[1] || !category)
      throw new Error("invalid command");
    await enqueueNotificationPdf(
      tx,
      profile.user,
      String(m.chat.id),
      { date: parts[1], category },
      key,
    );
  } catch (error) {
    // Validation errors produce a helpful response; infrastructure errors remain retryable.
    if (
      error instanceof Error &&
      (error.message === "invalid command" ||
        error.name === "ZodError" ||
        ("status" in error && error.status === 400))
    )
      await notify(tx, {
        userId: profile.userId,
        chatId: String(m.chat.id),
        title: "Hisobot so‘rovi",
        message:
          "Namuna: /hisobot 2026-09-12 servis\nBo‘limlar: davomat, servis, hujjatlar, hisobotlar, boshqa, barchasi.\nSana Toshkent vaqti bo‘yicha olinadi.",
        dedupeKey: key,
        requiredPermissions: ["notifications.read"],
      });
    else throw error;
  }
}
