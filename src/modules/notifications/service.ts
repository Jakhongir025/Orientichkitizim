import { Prisma } from "@prisma/client";
export async function notify(
  tx: Prisma.TransactionClient,
  data: {
    category?: "ATTENDANCE" | "SERVICE" | "DOCUMENTS" | "REPORTS" | "OTHER";
    userId?: string;
    title: string;
    message: string;
    chatId?: string | null;
    dedupeKey: string;
    documentData?: Uint8Array<ArrayBuffer>;
    documentName?: string;
    requiredPermissions?: string[];
  },
) {
  return tx.notification.upsert({
    where: { dedupeKey: data.dedupeKey },
    update: {},
    create: { ...data, status: data.chatId ? "PENDING" : "SKIPPED" },
  });
}
