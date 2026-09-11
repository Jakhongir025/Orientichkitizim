import { fromZonedTime } from "date-fns-tz";
import { z } from "zod";
import { date } from "@/lib/validation";
export const reportQuery = z.object({
  carId: z.string().cuid(),
  date,
  period: z.enum(["DAY", "WEEK", "MONTH"]),
});
export function reportPeriod(day: string, period: "DAY" | "WEEK" | "MONTH") {
  const parsed = date.parse(day);
  // Calendar arithmetic uses UTC noon to avoid the server's timezone/DST boundaries.
  const d = new Date(`${parsed}T12:00:00Z`);
  let startDay = parsed,
    endDay: string;
  if (period === "MONTH") {
    startDay = parsed.slice(0, 7) + "-01";
    const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
    endDay = next.toISOString().slice(0, 10);
  } else {
    if (period === "WEEK") {
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      startDay = d.toISOString().slice(0, 10);
    }
    const end = new Date(`${startDay}T12:00:00Z`);
    end.setUTCDate(end.getUTCDate() + (period === "WEEK" ? 7 : 1));
    endDay = end.toISOString().slice(0, 10);
  }
  return {
    startDay,
    endDay,
    start: fromZonedTime(`${startDay}T00:00:00`, "Asia/Tashkent"),
    end: fromZonedTime(`${endDay}T00:00:00`, "Asia/Tashkent"),
  };
}
