import { uzLabel } from "@/lib/uzbek";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { businessDate, dateOnly, remainingDays } from "@/lib/time";
import { documentInput } from "@/lib/validation";
import { Actor, allow } from "@/modules/auth/service";
import { notify } from "@/modules/notifications/service";
import { Prisma } from "@prisma/client";
export async function saveDocument(
  actor: Actor,
  raw: unknown,
  documentId?: string,
) {
  allow(actor, "documents.write");
  const { recipientIds, ...input } = documentInput.parse(raw);
  const data = {
    ...input,
    startDate: dateOnly(input.startDate),
    expiryDate: dateOnly(input.expiryDate),
    fileUrl: input.fileUrl || null,
  };
  return db.$transaction(async (tx) => {
    const old = documentId
      ? await tx.carDocument.findUniqueOrThrow({ where: { id: documentId } })
      : null;
    const document = documentId
      ? await tx.carDocument.update({ where: { id: documentId }, data })
      : await tx.carDocument.create({ data });
    if (documentId)
      await tx.telegramRecipient.deleteMany({ where: { documentId } });
    await tx.telegramRecipient.createMany({
      data: [...new Set(recipientIds)].map((employeeId) => ({
        employeeId,
        documentId: document.id,
      })),
      skipDuplicates: true,
    });
    await audit(
      tx,
      actor.id,
      old ? "UPDATE" : "CREATE",
      "CarDocument",
      document.id,
      old,
      document,
    );
    return document;
  });
}
export async function checkExpirations(
  tx: Prisma.TransactionClient,
  now = new Date(),
  onlyDocumentId?: string,
) {
  const setting = await tx.systemSetting.findUnique({
    where: { key: "expirationIntervals" },
  });
  const intervals = Array.isArray(setting?.value)
    ? setting.value.filter((v): v is number => typeof v === "number")
    : [7, 3, 1, 0];
  const documents = await tx.carDocument.findMany({
    where: {
      car: { archived: false },
      ...(onlyDocumentId ? { id: onlyDocumentId } : {}),
    },
    include: {
      car: true,
      documentType: true,
      responsible: { include: { profile: true } },
      recipients: { include: { employee: { include: { profile: true } } } },
    },
  });
  for (const doc of documents) {
    const days = remainingDays(doc.expiryDate, now);
    if (days >= 0 && !intervals.includes(days)) continue;
    const people = new Map(
      [doc.responsible, ...doc.recipients.map((r) => r.employee)].map((p) => [
        p.id,
        p,
      ]),
    );
    for (const user of people.values()) {
      if (!user.active) continue;
      await notify(tx, {
        category: "DOCUMENTS",
        userId: user.id,
        title:
          days < 0
            ? "Hujjat muddati tugagan"
            : `${uzLabel(doc.documentType.name)}: ${days} kun qoldi`,
        message: `🚨 HUJJAT MUDDATI\nAvtomobil: ${doc.car.brand} ${doc.car.model}\nDavlat raqami: ${doc.car.plateNumber}\nHujjat: ${uzLabel(doc.documentType.name)}\nAmal muddati: ${doc.expiryDate.toISOString().slice(0, 10)}\nQolgan vaqt: ${days} kun\nHujjatni yangilang.`,
        chatId: user.profile?.telegramChatId || user.profile?.telegramUserId,
        dedupeKey: `document:${doc.id}:${doc.expiryDate.toISOString()}:${days < 0 ? "expired" : businessDate(now)}:${user.id}`,
      });
    }
  }
}
