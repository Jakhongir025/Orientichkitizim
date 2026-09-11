import { hasPermission } from "@/modules/auth/permissions";
import { notify } from "@/modules/notifications/service";
import { hashToken, randomToken } from "@/lib/crypto";
import { db } from "@/lib/db";
import { AppError, logger } from "@/lib/errors";
import { z } from "zod";
export async function sendTelegram(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Telegram not configured");
  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000) }),
      signal: AbortSignal.timeout(15000),
    },
  );
  const result = (await response.json()) as { ok?: boolean };
  if (!response.ok || !result.ok) throw new Error("Telegram delivery failed");
}
export async function deliverNotifications() {
  for (let n = 0; n < 50; n++) {
    const row = await db.$transaction(async (tx) => {
      const candidates = await tx.$queryRaw<
        Array<{ id: string }>
      >`SELECT "id" FROM "Notification" WHERE (("status" IN ('PENDING','FAILED') AND "nextAttemptAt" <= NOW()) OR ("status"='PROCESSING' AND "leaseUntil" < NOW())) AND "attempts" < 6 AND "chatId" IS NOT NULL ORDER BY "createdAt" LIMIT 1 FOR UPDATE SKIP LOCKED`;
      if (!candidates.length) return null;
      return tx.notification.update({
        where: { id: candidates[0].id },
        data: {
          status: "PROCESSING",
          attempts: { increment: 1 },
          leaseUntil: new Date(Date.now() + 60000),
        },
      });
    });
    if (!row) break;
    if (row.userId) {
      const recipient = await db.user.findUnique({
        where: { id: row.userId },
        include: { role: true, profile: true },
      });
      if (
        !recipient?.active ||
        (row.requiredPermissions.length &&
          (!recipient.profile?.telegramVerified ||
            recipient.profile.telegramChatId !== row.chatId ||
            !row.requiredPermissions.every((p) =>
              hasPermission(recipient.role.permissions, p),
            )))
      ) {
        await db.notification.update({
          where: { id: row.id },
          data: {
            status: "SKIPPED",
            leaseUntil: null,
            lastError: "Recipient access changed",
          },
        });
        continue;
      }
    }
    try {
      if (row.documentData && row.documentName)
        await sendTelegramDocument(
          row.chatId!,
          row.message,
          row.documentData,
          row.documentName,
        );
      else await sendTelegram(row.chatId!, row.message);
      await db.notification.update({
        where: { id: row.id },
        data: { status: "SENT", leaseUntil: null, lastError: null },
      });
    } catch {
      logger.warn("telegram_delivery_failed");
      await db.notification.update({
        where: { id: row.id },
        data: {
          status: "FAILED",
          leaseUntil: null,
          lastError: "Telegram delivery failed",
          nextAttemptAt: new Date(
            Date.now() + Math.min(3600000, 30000 * 2 ** row.attempts),
          ),
        },
      });
    }
  }
}
export async function createLink(userId: string) {
  const token = randomToken();
  await db.$transaction(async (tx) => {
    const profile = await tx.employeeProfile.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!profile?.user.active || !profile.telegramUserId)
      throw new AppError(
        403,
        "Avval Super Admin xodim profilingizga Telegram User ID kiritsin. Keyin ulanish kodini oling.",
      );
    await tx.telegramLinkToken.deleteMany({ where: { userId } });
    await tx.telegramLinkToken.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 600000),
      },
    });
  });
  return {
    token,
    expiresInSeconds: 600,
    instruction: `Faqat administrator belgilagan Telegram hisobidan kompaniya botiga yuboring: /start ${token}`,
  };
}
const updateSchema = z.object({
  update_id: z.number(),
  message: z
    .object({
      text: z.string().optional(),
      from: z.object({ id: z.number(), username: z.string().optional() }),
      chat: z.object({ id: z.number(), type: z.string() }),
    })
    .optional(),
});
export async function pollTelegram() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  // One short database lease prevents concurrent workers from polling Telegram simultaneously.
  await db.$transaction(
    async (tx) => {
      const locks = await tx.$queryRaw<
        Array<{ locked: boolean }>
      >`SELECT pg_try_advisory_xact_lock(81292) AS locked`;
      if (!locks[0].locked) return;
      const setting = await tx.systemSetting.findUnique({
        where: { key: "telegramOffset" },
      });
      const offset = typeof setting?.value === "number" ? setting.value : 0;
      const response = await fetch(
        `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=0`,
        { signal: AbortSignal.timeout(10000) },
      );
      const data = z
        .object({ ok: z.boolean(), result: z.array(updateSchema) })
        .parse(await response.json());
      if (!data.ok) throw new Error("Telegram polling failed");
      for (const update of data.result) {
        const m = update.message;
        const match = m?.text?.match(/^\/start\s+([a-f0-9]{64})$/);
        if (m && match && m.chat.type === "private") {
          const link = await tx.telegramLinkToken.findUnique({
            where: { tokenHash: hashToken(match[1]) },
            include: { user: { include: { profile: true } } },
          });
          const existing = await tx.employeeProfile.findUnique({
            where: { telegramUserId: String(m.from.id) },
          });
          if (
            link &&
            link.expiresAt > new Date() &&
            link.user.active &&
            link.user.profile?.telegramUserId === String(m.from.id) &&
            (!existing || existing.userId === link.userId)
          ) {
            const verified = await tx.employeeProfile.updateMany({
              where: {
                userId: link.userId,
                telegramUserId: String(m.from.id),
                user: { active: true },
              },
              data: {
                telegramChatId: String(m.chat.id),
                telegramUsername: m.from.username,
                telegramVerified: true,
              },
            });
            if (!verified.count) continue;
            await tx.telegramLinkToken.delete({ where: { id: link.id } });
            await notify(tx, {
              userId: link.userId,
              chatId: String(m.chat.id),
              title: "Telegram ulandi",
              message:
                "Hisobingiz RentCar tizimiga ulandi. Bot menyusidagi «RentCarni ochish» tugmasini bosing.",
              dedupeKey: `telegram-linked:${link.id}`,
            });
            await tx.auditLog.create({
              data: {
                userId: link.userId,
                action: "TELEGRAM_VERIFIED",
                entityType: "User",
                entityId: link.userId,
              },
            });
          }
        }
        await tx.systemSetting.upsert({
          where: { key: "telegramOffset" },
          create: { key: "telegramOffset", value: update.update_id + 1 },
          update: { value: update.update_id + 1 },
        });
      }
    },
    { timeout: 20000 },
  );
}

export async function sendTelegramDocument(
  chatId: string,
  caption: string,
  data: Uint8Array<ArrayBuffer>,
  name: string,
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Telegram not configured");
  const form = new FormData();
  form.set("chat_id", chatId);
  form.set("caption", caption.slice(0, 1000));
  form.set("document", new Blob([data], { type: "application/pdf" }), name);
  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendDocument`,
    { method: "POST", body: form, signal: AbortSignal.timeout(30000) },
  );
  const result = (await response.json()) as { ok: boolean };
  if (!response.ok || !result.ok)
    throw new Error("Telegram document delivery failed");
}
