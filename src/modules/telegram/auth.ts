import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { hashToken, randomToken } from "@/lib/crypto";
import { AppError } from "@/lib/errors";
import { validateTelegramLaunch } from "./validation";

export async function telegramLogin(
  initData: string,
  credentials?:
    | { login: string; password: string; newPin?: string }
    | { pin: string },
) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken)
    throw new AppError(
      503,
      "Telegram bot hali sozlanmagan. Administratorga murojaat qiling.",
    );
  const identity = validateTelegramLaunch(initData, botToken);
  if (!credentials) throw new AppError(401, "Login va parolni kiriting");
  const pinMode = "pin" in credentials;
  await rateLimit(`mini-pin-identity:${identity.id}`, pinMode ? 5 : 30, 900000);
  const account = pinMode
    ? await db.user.findFirst({
        where: { profile: { telegramUserId: String(identity.id) } },
        include: { profile: true },
      })
    : await db.user.findUnique({
        where: { login: credentials.login.trim().toLowerCase() },
        include: { profile: true },
      });
  const storedPin = account
    ? await db.miniAppPin.findUnique({ where: { userId: account.id } })
    : null;
  const valid = pinMode
    ? Boolean(
        storedPin &&
          account &&
          storedPin.passwordBinding === hashToken(account.passwordHash) &&
          storedPin.telegramUserId === String(identity.id) &&
          (await bcrypt.compare(credentials.pin, storedPin.pinHash)),
      )
    : await bcrypt.compare(
        credentials.password,
        account?.passwordHash ||
          "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxQ3MqU3Vbb8MbVWQVDTPDlQaCi",
      );
  if (!pinMode)
    await rateLimit(
      `mini-login:${hashToken(credentials.login.trim().toLowerCase())}`,
      10,
      900000,
    );
  if (!account?.active || !valid)
    throw new AppError(
      401,
      pinMode
        ? "PIN noto‘g‘ri yoki eskirgan. Login/parol orqali qayta kiring."
        : "Login yoki parol noto‘g‘ri",
    );
  const newPinHash =
    !pinMode && credentials.newPin
      ? await bcrypt.hash(credentials.newPin, 12)
      : null;
  const profile = account.profile;
  if (!profile || profile.telegramUserId !== String(identity.id))
    throw new AppError(
      403,
      "Telegram ID hisobingizga mos emas. Administrator profilingizga aynan sizning Telegram ID raqamingizni kiritsin.",
    );
  const token = `mini_${randomToken()}`;
  const expiresAt = new Date(Date.now() + 4 * 3600000);
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${profile.userId}))`;
    const current = await tx.user.findUnique({
      where: { id: account.id },
      include: { profile: true },
    });
    if (
      !current?.active ||
      current.passwordHash !== account.passwordHash ||
      current.profile?.telegramUserId !== String(identity.id)
    )
      throw new AppError(403, "Hisob ma’lumotlari o‘zgargan. Qayta kiring.");
    if (pinMode) {
      const latest = await tx.miniAppPin.findUnique({
        where: { userId: account.id },
      });
      if (!latest || latest.pinHash !== storedPin?.pinHash)
        throw new AppError(401, "PIN o‘zgargan. Qayta kiring.");
    }
    const launchKey = hashToken(`telegram-launch:${initData}`);
    const used = await tx.loginAttempt.findUnique({
      where: { key: launchKey },
    });
    if (used && used.resetAt > new Date())
      throw new AppError(
        401,
        "Telegram kirish ma’lumoti ishlatilgan. Mini Appni yopib qayta oching",
      );
    await tx.loginAttempt.upsert({
      where: { key: launchKey },
      create: {
        key: launchKey,
        count: 1,
        resetAt: new Date(Date.now() + 330000),
      },
      update: { count: 1, resetAt: new Date(Date.now() + 330000) },
    });
    // Bound session issuance even when a valid launch payload is replayed.
    const recent = await tx.session.count({
      where: { userId: profile.userId, expiresAt: { gt: new Date() } },
    });
    if (recent >= 40)
      throw new AppError(
        429,
        "Ochiq sessiyalar ko‘p. Avval boshqa qurilmadan chiqing.",
      );
    await tx.employeeProfile.update({
      where: { userId: profile.userId },
      data: {
        telegramVerified: true,
        telegramChatId: String(identity.id),
        telegramUsername: identity.username,
      },
    });
    if (newPinHash)
      await tx.miniAppPin.upsert({
        where: { userId: account.id },
        create: {
          userId: account.id,
          pinHash: newPinHash,
          passwordBinding: hashToken(account.passwordHash),
          telegramUserId: String(identity.id),
        },
        update: {
          pinHash: newPinHash,
          passwordBinding: hashToken(account.passwordHash),
          telegramUserId: String(identity.id),
        },
      });
    await tx.session.create({
      data: { userId: profile.userId, tokenHash: hashToken(token), expiresAt },
    });
    await tx.auditLog.create({
      data: {
        userId: profile.userId,
        action: "TELEGRAM_LOGIN",
        entityType: "User",
        entityId: profile.userId,
      },
    });
  });
  return { token, expiresAt: expiresAt.toISOString() };
}

export async function telegramPinStatus(initData: string) {
  const identity = validateTelegramLaunch(
    initData,
    process.env.TELEGRAM_BOT_TOKEN || "",
  );
  await rateLimit(`mini-pin-status:${identity.id}`, 30, 60000);
  const user = await db.user.findFirst({
    where: { active: true, profile: { telegramUserId: String(identity.id) } },
    include: { miniAppPin: true },
  });
  return {
    hasPin: Boolean(
      user?.miniAppPin &&
        user.miniAppPin.telegramUserId === String(identity.id) &&
        user.miniAppPin.passwordBinding === hashToken(user.passwordHash),
    ),
  };
}
