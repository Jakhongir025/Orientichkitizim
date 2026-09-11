import { decrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { normalizePlate } from "@/lib/time";
import { hasPermission } from "@/modules/auth/permissions";
import { Actor } from "@/modules/auth/service";
import { subMonths } from "date-fns";
import { z } from "zod";
const input = z.object({
  plate: z.string().trim().min(3).max(30),
  months: z.coerce
    .number()
    .refine((v) => [1, 3, 6, 12].includes(v))
    .default(1),
  fineAt: z.string().datetime({ offset: true }).optional(),
});
export function rentalContains(start: Date, end: Date, instant: Date) {
  return start <= instant && instant < end;
}
export async function searchRentals(actor: Actor, params: URLSearchParams) {
  const query = input.parse(Object.fromEntries(params));
  const now = new Date();
  const from = subMonths(now, query.months);
  const instant = query.fineAt ? new Date(query.fineAt) : null;
  const records = await db.rentalRecord.findMany({
    where: {
      car: { normalizedPlate: normalizePlate(query.plate) },
      ...(instant
        ? { rentalStart: { lte: instant }, rentalEnd: { gt: instant } }
        : { rentalStart: { lte: now }, rentalEnd: { gte: from } }),
    },
    include: { car: true },
    orderBy: { rentalStart: "desc" },
    take: 200,
  });
  const sensitive = hasPermission(actor.role.permissions, "rentals.sensitive");
  // Explicit output projection prevents future model fields leaking to employee clients.
  return records.map((r) => ({
    id: r.id,
    customerName: r.customerName,
    phone: r.phone,
    rentalStart: r.rentalStart,
    rentalEnd: r.rentalEnd,
    contractNumber: r.contractNumber,
    issuedBy: r.issuedBy,
    acceptedBy: r.acceptedBy,
    car: r.car,
    ...(sensitive
      ? {
          passport: decrypt(r.passportEncrypted),
          passportDetails: decrypt(r.passportDetailsEncrypted),
          notes: r.notes,
        }
      : {}),
  }));
}
