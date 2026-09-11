import { Prisma } from "@prisma/client";
export function audit(
  tx: Prisma.TransactionClient,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  oldValue?: unknown,
  newValue?: unknown,
) {
  const safe = (v: unknown): Prisma.InputJsonValue =>
    JSON.parse(JSON.stringify(v));
  return tx.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      ...(oldValue === undefined ? {} : { oldValue: safe(oldValue) }),
      ...(newValue === undefined ? {} : { newValue: safe(newValue) }),
    },
  });
}
