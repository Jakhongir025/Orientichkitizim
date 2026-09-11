import { hashToken, randomToken } from "@/lib/crypto";
import { db } from "@/lib/db";
import { AppError, logger } from "@/lib/errors";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { hasPermission } from "./permissions";
export const COOKIE = "rentcar_session";
export const profileSelect = {
  id: true,
  login: true,
  active: true,
  role: true,
  profile: { include: { office: true } },
} as const;
export type Actor = NonNullable<Awaited<ReturnType<typeof currentUser>>>;
export async function currentUser() {
  const authorization = (await headers()).get("authorization");
  const token = authorization
    ? /^Bearer mini_[a-f0-9]{64}$/.test(authorization)
      ? authorization.slice(7)
      : undefined
    : (await cookies()).get(COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: profileSelect } },
  });
  const now = new Date();
  const configuredIdle = Number(process.env.SESSION_IDLE_MINUTES || 30);
  const idleMinutes =
    Number.isFinite(configuredIdle) &&
    configuredIdle >= 5 &&
    configuredIdle <= 240
      ? configuredIdle
      : 30;
  if (
    !session ||
    session.expiresAt <= now ||
    !session.user.active ||
    (authorization && !session.user.profile?.telegramVerified) ||
    now.getTime() - session.lastSeenAt.getTime() > idleMinutes * 60000
  )
    return null;
  if (now.getTime() - session.lastSeenAt.getTime() > 60000)
    await db.session.updateMany({
      where: { id: session.id },
      data: { lastSeenAt: now },
    });
  return session.user;
}
export async function requireUser(permission?: string) {
  const user = await currentUser();
  if (!user) throw new AppError(401, "Avval tizimga kiring");
  if (permission && !hasPermission(user.role.permissions, permission))
    throw new AppError(403, "Bu amal uchun ruxsat yo‘q");
  return user;
}
export function allow(user: Actor, permission: string) {
  if (!hasPermission(user.role.permissions, permission))
    throw new AppError(403, "Bu amal uchun ruxsat yo‘q");
}
export function checkOrigin(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const expected = new URL(process.env.APP_URL || "http://localhost:3000")
    .origin;
  if (request.headers.get("origin") !== expected)
    throw new AppError(403, "So‘rov manbasi tasdiqlanmadi");
}
export async function login(loginName: string, password: string) {
  if (
    process.env.NODE_ENV === "production" &&
    !process.env.APP_URL?.startsWith("https://")
  )
    throw new AppError(503, "Production HTTPS domeni sozlanmagan");
  const key = hashToken(loginName.toLowerCase());
  const now = new Date();
  const attempt = await db.$queryRaw<
    Array<{ count: number }>
  >`INSERT INTO "LoginAttempt" ("key","count","resetAt") VALUES (${key},1,${new Date(now.getTime() + 900000)}) ON CONFLICT ("key") DO UPDATE SET "count"=CASE WHEN "LoginAttempt"."resetAt" < ${now} THEN 1 ELSE "LoginAttempt"."count"+1 END, "resetAt"=CASE WHEN "LoginAttempt"."resetAt" < ${now} THEN ${new Date(now.getTime() + 900000)} ELSE "LoginAttempt"."resetAt" END RETURNING "count"`;
  if (attempt[0].count > 10)
    throw new AppError(
      429,
      "Urinishlar ko‘p. 15 daqiqadan keyin qayta urinib ko‘ring.",
    );
  const user = await db.user.findUnique({
    where: { login: loginName.toLowerCase() },
  });
  const valid = await bcrypt.compare(
    password,
    user?.passwordHash ||
      "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxQ3MqU3Vbb8MbVWQVDTPDlQaCi",
  );
  if (!user || !valid || !user.active) {
    logger.warn("authentication_failed");
    throw new AppError(401, "Login yoki parol noto‘g‘ri");
  }
  const token = randomToken();
  const expires = new Date(Date.now() + 12 * 3600000);
  await db.$transaction(async (tx) => {
    await tx.session.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: expires,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        entityType: "User",
        entityId: user.id,
      },
    });
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
  return { ok: true };
}
export async function logout() {
  const jar = await cookies();
  const authorization = (await headers()).get("authorization");
  const token = authorization?.startsWith("Bearer mini_")
    ? authorization.slice(7)
    : jar.get(COOKIE)?.value;
  if (token)
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  if (!authorization) jar.delete(COOKIE);
  return { ok: true };
}
