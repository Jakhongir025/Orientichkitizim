import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { dateOnly } from "@/lib/time";
import { Actor } from "@/modules/auth/service";
import { notify } from "@/modules/notifications/service";
import { formatInTimeZone } from "date-fns-tz";
import { z } from "zod";
import { attendanceInput, manualAttendanceTime } from "./validation";

export async function checkIn(actor: Actor, raw: unknown) {
  const input = manualAttendanceTime(raw);
  if (input.late && (!input.lateReason || input.lateReason.length < 3))
    throw new AppError(
      400,
      "10:00 dan keyin kelgan bo‘lsangiz, kechikish sababini kiriting",
    );
  if (!actor.profile) throw new AppError(400, "Xodim profili yo‘q");
  return db.$transaction(async (tx) => {
    const entry = await tx.attendance.create({
      data: {
        userId: actor.id,
        officeId: actor.profile!.officeId,
        date: dateOnly(input.date),
        checkIn: input.instant,
        checkInTimezone: input.timezone,
        checkInRecordedAt: input.recordedAt,
        status: input.late ? "LATE" : "ON_TIME",
        lateReason: input.late ? input.lateReason : null,
      },
    });
    await audit(
      tx,
      actor.id,
      "CHECK_IN",
      "Attendance",
      entry.id,
      undefined,
      entry,
    );
    if (input.late)
      await notify(tx, {
        category: "ATTENDANCE",
        userId: actor.id,
        title: "Ishga kechikish",
        message: `${actor.profile!.firstName} ${actor.profile!.lastName} — ${input.date} ${input.time}\nVaqt zonasi: ${input.timezone}\nSabab: ${input.lateReason}`,
        chatId:
          actor.profile!.office.telegramChatId ||
          process.env.TELEGRAM_ADMIN_CHAT_ID,
        dedupeKey: `late:${entry.id}`,
      });
    if (!input.late)
      await notify(tx, {
        category: "ATTENDANCE",
        userId: actor.id,
        title: "Ishga kelish qayd etildi",
        message: `${actor.profile!.firstName} ${actor.profile!.lastName} - ${input.date} ${input.time} (${input.timezone})`,
        dedupeKey: `checkin:${entry.id}`,
      });
    return entry;
  });
}
export async function checkOut(actor: Actor, raw: unknown) {
  const input = manualAttendanceTime(raw);
  requireDepartureReason(input);
  return db.$transaction(async (tx) => {
    const entry = await tx.attendance.findFirst({
      where: { userId: actor.id, checkOut: null },
      orderBy: { checkIn: "desc" },
    });
    if (!entry) throw new AppError(400, "Ochiq ish kuni topilmadi");
    if (input.instant < entry.checkIn)
      throw new AppError(
        400,
        "Ketish vaqti kelish vaqtidan oldin bo‘lishi mumkin emas",
      );
    const data = {
      checkOut: input.instant,
      checkOutTimezone: input.timezone,
      checkOutRecordedAt: input.recordedAt,
      earlyLeaveReason: input.time < "22:00" ? input.earlyLeaveReason : null,
    };
    const result = await tx.attendance.updateMany({
      where: { id: entry.id, checkOut: null },
      data,
    });
    if (!result.count) throw new AppError(409, "Ish kuni allaqachon yopilgan");
    await audit(tx, actor.id, "CHECK_OUT", "Attendance", entry.id, entry, {
      ...entry,
      ...data,
    });
    await notify(tx, {
      category: "ATTENDANCE",
      userId: actor.id,
      title: "🔴 Ofis yopildi",
      message: `🔴 Ofis yopildi\nXodim: ${actor.profile?.firstName} ${actor.profile?.lastName}\nVaqt: ${formatInTimeZone(input.instant, input.timezone, "dd.MM.yyyy HH:mm")}\nVaqt zonasi: ${input.timezone}\nOfis: ${actor.profile?.office.name}${input.time < "22:00" ? `\nErta ketish sababi: ${input.earlyLeaveReason}` : ""}`,
      chatId:
        actor.profile?.office.telegramChatId ||
        process.env.TELEGRAM_ADMIN_CHAT_ID,
      dedupeKey: `checkout:${entry.id}`,
    });
    return { ...entry, ...data };
  });
}

export async function editAttendance(
  actor: Actor,
  entryId: string,
  raw: unknown,
) {
  if (actor.role.name !== "SUPER_ADMIN")
    throw new AppError(403, "Davomatni faqat Super Admin tahrirlaydi");
  const input = z
    .object({
      checkIn: attendanceInput,
      checkOut: attendanceInput.nullable(),
      reason: z.string().trim().min(3).max(1000),
    })
    .parse(raw);
  const arrival = manualAttendanceTime(input.checkIn);
  const departure = input.checkOut
    ? manualAttendanceTime(input.checkOut)
    : null;
  if (arrival.late && (!arrival.lateReason || arrival.lateReason.length < 3))
    throw new AppError(400, "Kechikish sababini kiriting");
  if (departure) requireDepartureReason(departure);
  if (departure && departure.instant < arrival.instant)
    throw new AppError(400, "Ketish vaqti kelishdan oldin bo‘lmasin");
  return db.$transaction(async (tx) => {
    const old = await tx.attendance.findUniqueOrThrow({
      where: { id: entryId },
    });
    const row = await tx.attendance.update({
      where: { id: entryId },
      data: {
        date: dateOnly(arrival.date),
        checkIn: arrival.instant,
        checkInTimezone: arrival.timezone,
        checkOut: departure?.instant || null,
        earlyLeaveReason:
          departure && departure.time < "22:00"
            ? departure.earlyLeaveReason
            : null,
        checkOutTimezone: departure?.timezone || null,
        status: arrival.late ? "LATE" : "ON_TIME",
        lateReason: arrival.late ? arrival.lateReason : null,
      },
    });
    await audit(
      tx,
      actor.id,
      "ATTENDANCE_CORRECTION",
      "Attendance",
      entryId,
      old,
      { ...row, correctionReason: input.reason },
    );
    return row;
  });
}

function requireDepartureReason(input: {
  time: string;
  earlyLeaveReason?: string;
}) {
  if (
    input.time < "22:00" &&
    (!input.earlyLeaveReason || input.earlyLeaveReason.length < 3)
  )
    throw new AppError(400, "22:00 dan oldin ketish sababini kiriting");
}
