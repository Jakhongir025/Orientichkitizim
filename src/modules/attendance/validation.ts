import { AppError } from "@/lib/errors";
import { date } from "@/lib/validation";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { z } from "zod";
export const timezoneSchema = z
  .string()
  .max(100)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Vaqt zonasi noto‘g‘ri");
export const attendanceInput = z.object({
  date,
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: timezoneSchema,
  earlyLeaveReason: z.string().trim().max(1000).optional(),
  lateReason: z.string().trim().max(1000).optional(),
});
export function manualAttendanceTime(raw: unknown, recordedAt = new Date()) {
  const input = attendanceInput.parse(raw);
  const local = `${input.date}T${input.time}`;
  const instant = fromZonedTime(`${local}:00`, input.timezone);
  if (formatInTimeZone(instant, input.timezone, "yyyy-MM-dd'T'HH:mm") !== local)
    throw new AppError(400, "Bu mahalliy vaqt ushbu vaqt zonasida mavjud emas");
  if (instant.getTime() > recordedAt.getTime() + 60000)
    throw new AppError(400, "Kelajakdagi vaqtni kiritish mumkin emas");
  return { ...input, instant, recordedAt, late: input.time > "10:00" };
}
