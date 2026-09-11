import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
export const TIMEZONE = "Asia/Tashkent";
export const businessDate = (now = new Date()) =>
  formatInTimeZone(now, TIMEZONE, "yyyy-MM-dd");
export const dateOnly = (value: string) => new Date(`${value}T00:00:00.000Z`);
export const localClock = (now = new Date()) =>
  formatInTimeZone(now, TIMEZONE, "HH:mm");
export const localTimestamp = (now: Date) =>
  formatInTimeZone(now, TIMEZONE, "dd.MM.yyyy HH:mm");
export function isLate(now: Date, startTime = "10:00") {
  return now > fromZonedTime(`${businessDate(now)}T${startTime}:00`, TIMEZONE);
}
export function remainingDays(expiry: Date, now = new Date()) {
  return Math.round(
    (dateOnly(expiry.toISOString().slice(0, 10)).getTime() -
      dateOnly(businessDate(now)).getTime()) /
      86400000,
  );
}
export function normalizePlate(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}
