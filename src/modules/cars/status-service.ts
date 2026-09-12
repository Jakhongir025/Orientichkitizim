import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import type { Actor } from "@/modules/auth/service";
export const statusInput = z
  .object({
    status: z.enum([
      "AVAILABLE",
      "RENTED",
      "WITH_OWNER",
      "CAR_WASH",
      "SERVICE",
    ]),
    occupiedUntil: z.string().datetime({ offset: true }).nullable().optional(),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();
export async function updateCarStatus(
  actor: Actor,
  carId: string,
  raw: unknown,
) {
  if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role.name))
    throw new AppError(403, "Holatni faqat admin o‘zgartira oladi");
  const input = statusInput.parse(raw);
  const until =
    input.status === "RENTED" && input.occupiedUntil
      ? new Date(input.occupiedUntil)
      : null;
  if (input.status === "RENTED" && (!until || until.getTime() <= Date.now()))
    throw new AppError(
      400,
      "Band bo‘lishining tugash sanasi va kelajakdagi vaqtini kiriting",
    );
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Car" WHERE id = ${carId} FOR UPDATE`;
    const old = await tx.car.findUnique({ where: { id: carId } });
    if (!old || old.archived) throw new AppError(404, "Avtomobil topilmadi");
    if (old.updatedAt.getTime() !== new Date(input.updatedAt).getTime())
      throw new AppError(
        409,
        "Ma’lumot yangilangan. Ro‘yxatni yangilab qayta tanlang",
      );
    const car = await tx.car.update({
      where: { id: carId },
      data: { status: input.status, occupiedUntil: until },
    });
    await tx.carStatusHistory.create({
      data: {
        carId,
        employeeId: actor.id,
        fromStatus: old.status,
        toStatus: car.status,
      },
    });
    await audit(tx, actor.id, "STATUS_CHANGE", "Car", carId, old, car);
    return car;
  });
}

/** A conditional update under the same row lock as manual edits avoids stale releases. */
export async function releaseExpiredCars() {
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<import("@prisma/client").Car[]>`
      SELECT * FROM "Car" WHERE "status" = 'RENTED' AND "archived" = false
      AND "occupiedUntil" <= CURRENT_TIMESTAMP ORDER BY "occupiedUntil"
      LIMIT 200 FOR UPDATE SKIP LOCKED`;
    for (const old of rows) {
      const car = await tx.car.update({
        where: { id: old.id },
        data: { status: "AVAILABLE", occupiedUntil: null },
      });
      await tx.carStatusHistory.create({
        data: {
          carId: car.id,
          employeeId: null,
          fromStatus: old.status,
          toStatus: car.status,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: null,
          action: "AUTO_RELEASE",
          entityType: "Car",
          entityId: car.id,
          oldValue: {
            status: old.status,
            occupiedUntil: old.occupiedUntil!.toISOString(),
          },
          newValue: {
            status: car.status,
            occupiedUntil: null,
            reason: "Bandlik muddati tugadi",
          },
        },
      });
    }
    return rows.length;
  });
}
