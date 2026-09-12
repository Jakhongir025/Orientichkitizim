import { uzLabel } from "@/lib/uzbek";
import { notify } from "@/modules/notifications/service";
import { sanitizeCarImage } from "@/modules/media/image";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { dateOnly, normalizePlate } from "@/lib/time";
import { carInput, serviceInput } from "@/lib/validation";
import { Actor, allow } from "@/modules/auth/service";
export async function saveCar(actor: Actor, raw: unknown, carId?: string) {
  allow(actor, "cars.write");
  const input = carId ? carInput.partial().parse(raw) : carInput.parse(raw);
  const data = {
    ...input,
    ...(input.status && input.status !== "RENTED"
      ? { occupiedUntil: null }
      : {}),
    ...(input.imageData !== undefined
      ? { imageData: await sanitizeCarImage(input.imageData) }
      : {}),
    ...(input.plateNumber
      ? { normalizedPlate: normalizePlate(input.plateNumber) }
      : {}),
    ...(input.vin !== undefined ? { vin: input.vin || null } : {}),
  };
  return db.$transaction(async (tx) => {
    if (carId)
      await tx.$queryRaw`SELECT id FROM "Car" WHERE id = ${carId} FOR UPDATE`;
    const old = carId
      ? await tx.car.findUniqueOrThrow({ where: { id: carId } })
      : null;
    const car = carId
      ? await tx.car.update({ where: { id: carId }, data })
      : await tx.car.create({
          data: data as Parameters<typeof tx.car.create>[0]["data"],
        });
    if (old && old.status !== car.status)
      await tx.carStatusHistory.create({
        data: {
          carId: car.id,
          employeeId: actor.id,
          fromStatus: old.status,
          toStatus: car.status,
        },
      });
    await audit(
      tx,
      actor.id,
      carId ? "UPDATE" : "CREATE",
      "Car",
      car.id,
      old,
      car,
    );
    return car;
  });
}
export async function archiveCar(actor: Actor, carId: string) {
  allow(actor, "cars.delete");
  return db.$transaction(async (tx) => {
    const old = await tx.car.findUniqueOrThrow({ where: { id: carId } });
    const car = await tx.car.update({
      where: { id: carId },
      data: { archived: true },
    });
    await audit(tx, actor.id, "ARCHIVE", "Car", carId, old, car);
    return car;
  });
}
export async function addService(actor: Actor, raw: unknown) {
  allow(actor, "services.write");
  const input = serviceInput.parse(raw);
  return db.$transaction(async (tx) => {
    const car = await tx.car.findUniqueOrThrow({ where: { id: input.carId } });
    if (car.archived) throw new AppError(400, "Arxivlangan avtomobil");
    const record = await tx.carService.create({
      data: { ...input, date: dateOnly(input.date), employeeId: actor.id },
    });
    // Monotonic mileage even under concurrent entries; historical service logs remain valid.
    await tx.car.updateMany({
      where: { id: car.id, mileage: { lt: input.mileage } },
      data: { mileage: input.mileage },
    });
    await audit(tx, actor.id, "SERVICE", "Car", car.id, undefined, record);
    const serviceType = await tx.serviceType.findUniqueOrThrow({
      where: { id: record.serviceTypeId },
    });
    await notify(tx, {
      category: "SERVICE",
      userId: actor.id,
      title: "Servis ishi kiritildi",
      message: `Xodim: ${actor.profile?.firstName || ""} ${actor.profile?.lastName || ""}\nAvtomobil: ${car.brand} ${car.model}\nDavlat raqami: ${car.plateNumber}\nBajarilgan ish: ${uzLabel(serviceType.name)}\nSana: ${input.date}\nMasofa: ${input.mileage} km${input.notes ? `\n${input.notes}` : ""}`,
      dedupeKey: `service:${record.id}`,
    });
    return record;
  });
}
export function carWhere(query: string) {
  return {
    archived: false,
    OR: [
      { normalizedPlate: { contains: normalizePlate(query) } },
      { brand: { contains: query, mode: "insensitive" as const } },
      { model: { contains: query, mode: "insensitive" as const } },
      { vin: { contains: query, mode: "insensitive" as const } },
    ],
  };
}
