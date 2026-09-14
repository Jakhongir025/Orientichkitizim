import { z } from "zod";
import { db } from "@/lib/db";
import { date } from "@/lib/validation";
import { businessDate, dateOnly } from "@/lib/time";
import { AppError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { notify } from "@/modules/notifications/service";
import { allow, type Actor } from "@/modules/auth/service";
export async function saveDayOff(actor: Actor, raw: unknown) {
  allow(actor, "attendance.write");
  const input = z
    .object({ date, notes: z.string().trim().max(1000).optional() })
    .strict()
    .parse(raw);
  if (input.date < businessDate())
    throw new AppError(
      400,
      "O‘tgan sanani dam olish kuni deb belgilab bo‘lmaydi",
    );
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${actor.id} FOR UPDATE`;
    const existing = await tx.dayOff.findUnique({
      where: { userId_date: { userId: actor.id, date: dateOnly(input.date) } },
    });
    if (existing) return existing;
    const row = await tx.dayOff.create({
      data: {
        userId: actor.id,
        date: dateOnly(input.date),
        notes: input.notes,
      },
    });
    await audit(
      tx,
      actor.id,
      "DAY_OFF_CREATE",
      "DayOff",
      row.id,
      undefined,
      row,
    );
    await notify(tx, {
      category: "ATTENDANCE",
      userId: actor.id,
      title: "Dam olish kuni belgilandi",
      message: `Xodim: ${actor.profile?.firstName} ${actor.profile?.lastName}\nTelefon: ${actor.profile?.phone}\nSana: ${input.date}${input.notes ? `\nIzoh: ${input.notes}` : ""}\nDam olish kuni`,
      dedupeKey: `day-off:${row.id}`,
    });
    if (
      await tx.scheduledJob.findUnique({
        where: { key: `${businessDate()}:closing` },
      })
    ) {
      await notify(tx, {
        category: "ATTENDANCE",
        userId: actor.id,
        title: "Kechki hisobotga qo‘shimcha",
        message: `${actor.profile?.firstName} ${actor.profile?.lastName}\nTelefon: ${actor.profile?.phone}\nSana: ${input.date}\nDam olish kuni`,
        chatId: null,
        dedupeKey: `day-off-evening:${row.id}`,
      });
    }
    return row;
  });
}
export async function cancelDayOff(actor: Actor, id: string) {
  allow(actor, "attendance.write");
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${actor.id} FOR UPDATE`;
    const row = await tx.dayOff.findUnique({ where: { id } });
    if (!row) throw new AppError(404, "Dam olish kuni topilmadi");
    if (row.userId !== actor.id && actor.role.name !== "SUPER_ADMIN")
      throw new AppError(
        403,
        "Faqat o‘z dam olish kuningizni bekor qilishingiz mumkin",
      );
    if (row.date < dateOnly(businessDate()))
      throw new AppError(400, "O‘tgan dam olish kunini bekor qilib bo‘lmaydi");
    await tx.dayOff.delete({ where: { id } });
    await audit(tx, actor.id, "DAY_OFF_CANCEL", "DayOff", id, row);
    return { ok: true };
  });
}
