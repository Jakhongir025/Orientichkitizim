import { db } from "./db";
import { hashToken } from "./crypto";
import { AppError } from "./errors";
export async function rateLimit(
  bucket: string,
  limit: number,
  windowMs: number,
) {
  const key = hashToken(`rate:${bucket}`),
    now = new Date(),
    reset = new Date(now.getTime() + windowMs);
  const rows = await db.$queryRaw<
    Array<{ count: number }>
  >`INSERT INTO "LoginAttempt" ("key","count","resetAt") VALUES (${key},1,${reset}) ON CONFLICT ("key") DO UPDATE SET "count"=CASE WHEN "LoginAttempt"."resetAt" < ${now} THEN 1 ELSE "LoginAttempt"."count"+1 END,"resetAt"=CASE WHEN "LoginAttempt"."resetAt" < ${now} THEN ${reset} ELSE "LoginAttempt"."resetAt" END RETURNING "count"`;
  if (rows[0].count > limit)
    throw new AppError(
      429,
      "So‘rovlar ko‘p. Birozdan keyin qayta urinib ko‘ring",
    );
}
