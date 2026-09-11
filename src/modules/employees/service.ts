import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { employeeInput, id, passwordSchema } from "@/lib/validation";
import { Actor, allow, profileSelect } from "@/modules/auth/service";
import bcrypt from "bcryptjs";
import { z } from "zod";
export async function createEmployee(actor: Actor, raw: unknown) {
  allow(actor, "employees.write");
  const { password, roleId, login, ...profile } = employeeInput.parse(raw);
  const passwordHash = await bcrypt.hash(password, 12);
  return db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { login, passwordHash, roleId, profile: { create: profile } },
      select: profileSelect,
    });
    await audit(tx, actor.id, "CREATE", "User", user.id, undefined, {
      login,
      roleId,
      ...profile,
    });
    return user;
  });
}
const updateInput = z.object({
  active: z.boolean().optional(),
  roleId: id.optional(),
  password: passwordSchema.optional(),
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  phone: z.string().max(40).optional(),
  position: z.string().max(100).optional(),
  officeId: id.optional(),
  telegramUserId: z.string().regex(/^\d+$/).nullable().optional(),
  telegramChatId: z
    .string()
    .regex(/^-?\d+$/)
    .nullable()
    .optional(),
  telegramUsername: z.string().max(100).nullable().optional(),
});
export async function updateEmployee(
  actor: Actor,
  userId: string,
  raw: unknown,
) {
  allow(actor, "employees.write");
  const input = updateInput.parse(raw);
  const { active, roleId, password, ...profile } = input;
  if (
    userId === actor.id &&
    (active === false || (roleId && roleId !== actor.role.id))
  )
    throw new AppError(
      400,
      "O‘z hisobingizni o‘chirish yoki rolini almashtirish mumkin emas",
    );
  const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
  return db.$transaction(async (tx) => {
    const old = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: profileSelect,
    });
    const roleChanged = Boolean(roleId && roleId !== old.role.id);
    const telegramChanged =
      ("telegramUserId" in profile &&
        profile.telegramUserId !== old.profile?.telegramUserId) ||
      ("telegramChatId" in profile &&
        profile.telegramChatId !== old.profile?.telegramChatId);
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        active,
        roleId,
        passwordHash,
        profile: {
          update: {
            ...profile,
            ...(telegramChanged ? { telegramVerified: false } : {}),
          },
        },
      },
      select: profileSelect,
    });
    if (password || active === false || roleChanged || telegramChanged) {
      await tx.session.deleteMany({ where: { userId } });
      await tx.telegramLinkToken.deleteMany({ where: { userId } });
    }
    await audit(tx, actor.id, "UPDATE", "User", userId, old, {
      ...user,
      passwordReset: Boolean(password),
    });
    return user;
  });
}

export async function removeEmployee(actor: Actor, userId: string) {
  allow(actor, "employees.write");
  if (actor.id === userId)
    throw new AppError(400, "O‘z egasi hisobingizni o‘chira olmaysiz");
  return db.$transaction(async (tx) => {
    const old = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: profileSelect,
    });
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        active: false,
        login: `removed_${userId}`,
        profile: {
          update: {
            telegramUserId: null,
            telegramChatId: null,
            telegramUsername: null,
            telegramVerified: false,
          },
        },
      },
      select: profileSelect,
    });
    await tx.session.deleteMany({ where: { userId } });
    await tx.telegramLinkToken.deleteMany({ where: { userId } });
    await audit(tx, actor.id, "REMOVE", "User", userId, old, { active: false });
    return { ok: true };
  });
}
