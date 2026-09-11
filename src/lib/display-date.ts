import { formatInTimeZone } from "date-fns-tz";

const TIMEZONE = "Asia/Tashkent";
const MONTHS = [
  "yan",
  "fev",
  "mar",
  "apr",
  "may",
  "iyn",
  "iyl",
  "avg",
  "sen",
  "okt",
  "noy",
  "dek",
];

/** Fixed Uzbek labels avoid different ICU locale data in Node and WebKit. */
export function formatDate(
  value?: string | null,
  withTime = false,
  timezone = TIMEZONE,
): string {
  if (!value) return "—";
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return "—";
  const [day, month, year, hour, minute] = formatInTimeZone(
    instant,
    timezone,
    "dd/MM/yyyy/HH/mm",
  ).split("/");
  return `${day}-${MONTHS[Number(month) - 1]}, ${year}${withTime ? ` ${hour}:${minute}` : ""}`;
}
export function clock(value?: string | null, timezone = TIMEZONE): string {
  return value ? formatInTimeZone(new Date(value), timezone, "HH:mm") : "—";
}
export function today(): string {
  return formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd");
}
