import { db } from "@/lib/db";
import { hashToken, randomToken } from "@/lib/crypto";
import { AppError } from "@/lib/errors";
import { validateTelegramLaunch } from "./validation";

export async function telegramLogin(initData: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken)
    throw new AppError(
      503,
      "Telegram bot hali sozlanmagan. Administratorga murojaat qiling.",
    );
  const identity = validateTelegramLaunch(initData, botToken);
  const profile = await db.employeeProfile.findUnique({
    where: { telegramUserId: String(identity.id) },
    include: { user: true },
  });
  if (!profile?.user.active || !profile.telegramVerified)
    throw new AppError(
      403,
      "Telegram hisobingiz ulanmagan. Web profilingizdagi Telegramni ulash orqali botga /start kodini yuboring.",
    );
  const token = `mini_${randomToken()}`;
  const expiresAt = new Date(Date.now() + 4 * 3600000);
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${profile.userId}))`;
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
