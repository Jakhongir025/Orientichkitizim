import { reportPdf } from "@/modules/car-reports/pdf";
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
  requestId?: string,
  recipientWhere?: Prisma.UserWhereInput,
) {
  let queued = 0;
  const people = await tx.user.findMany({
    where: {
      active: true,
      ...(recipientWhere ?? {
        role: { name: { in: ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"] } },
      }),
    },
    include: { profile: true },
  });
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
    if (!requestId && days > 7) continue;
    const message = `HUJJAT MUDDATI
Avtomobil: ${doc.car.brand} ${doc.car.model}
Davlat raqami: ${doc.car.plateNumber}
Hujjat: ${uzLabel(doc.documentType.name)}
Amal muddati: ${doc.expiryDate.toISOString().slice(0, 10)}
${days < 0 ? `Muddat ${-days} kun oldin tugagan` : `${days} kun qoldi`}
Hujjatni yangilang.`;
    const pdf = await reportPdf({
      title: "Hujjat muddati",
      plate: doc.car.plateNumber,
      period: businessDate(now),
      generatedAt: businessDate(now) + " (Toshkent)",
      lines: message.split("\n"),
    });
    for (const user of people) {
      if (
        !user.profile?.telegramVerified ||
        !user.profile.telegramUserId ||
        user.profile.telegramChatId !== user.profile.telegramUserId
      )
        continue;
      await notify(tx, {
        category: "DOCUMENTS",
        userId: user.id,
        title:
          days < 0
            ? "Hujjat muddati tugagan"
            : `${uzLabel(doc.documentType.name)}: ${days} kun qoldi`,
        message,
        chatId: user.profile.telegramChatId,
        documentData: new Uint8Array(pdf),
        documentName: `hujjat-${doc.id}-${businessDate(now)}.pdf`,
        dedupeKey: `document-daily:${doc.id}:${doc.expiryDate.toISOString()}:${requestId || businessDate(now)}:${user.id}`,
      });
      queued++;
    }
  }
  return { queued };
}

/** One PDF per recipient, containing all overdue and next-seven-day documents. */
export async function sendExpirationSummary(
  tx: Prisma.TransactionClient,
  now: Date,
  deliveryKey: string,
  recipientWhere?: Prisma.UserWhereInput,
) {
  const documents = await tx.carDocument.findMany({
    where: {
      car: { archived: false },
      expiryDate: {
        lte: new Date(dateOnly(businessDate(now)).getTime() + 7 * 86400000),
      },
    },
    include: { car: true, documentType: true },
    orderBy: [{ expiryDate: "asc" }, { id: "asc" }],
  });
  if (!documents.length) return { queued: 0, documents: 0 };
  const users = await tx.user.findMany({
    where: {
      active: true,
      ...(recipientWhere ?? {
        role: { name: { in: ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"] } },
      }),
    },
    include: { profile: true },
  });
  const lines = documents.flatMap((doc) => [
    `${doc.car.brand} ${doc.car.model} — ${doc.car.plateNumber}`,
    `${uzLabel(doc.documentType.name)} | ${doc.expiryDate.toISOString().slice(0, 10)} | ${remainingDays(doc.expiryDate, now) < 0 ? "Muddati tugagan" : `${remainingDays(doc.expiryDate, now)} kun qoldi`}`,
    "",
  ]);
  const pdf = await reportPdf({
    title: "Muddati yaqinlashgan va tugagan hujjatlar",
    plate: `Jami: ${documents.length} ta hujjat`,
    period: businessDate(now),
    generatedAt: now.toISOString() + " (UTC)",
    lines,
  });
  let queued = 0;
  for (const user of users) {
    const p = user.profile;
    if (
      !p?.telegramVerified ||
      !p.telegramUserId ||
      p.telegramChatId !== p.telegramUserId
    )
      continue;
    await notify(tx, {
      category: "DOCUMENTS",
      userId: user.id,
      chatId: p.telegramChatId,
      title: "Hujjatlar umumiy hisoboti",
      message: `${businessDate(now)} — muddati yaqinlashgan va tugagan ${documents.length} ta hujjat. To‘liq ro‘yxat PDFda.`,
      documentData: new Uint8Array(pdf),
      documentName: `hujjatlar-umumiy-${businessDate(now)}.pdf`,
      dedupeKey: `document-summary:${businessDate(now)}:${deliveryKey}:${user.id}`,
    });
    queued++;
  }
  return { queued, documents: documents.length };
}
