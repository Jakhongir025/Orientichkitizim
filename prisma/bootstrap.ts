import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const db = new PrismaClient();
async function main() {
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password || password.length < 12 || Buffer.byteLength(password) > 72)
    throw new Error(
      "Set SEED_ADMIN_PASSWORD (12+ characters, at most 72 bytes)",
    );
  const passwordHash = await bcrypt.hash(password, 12);
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(81293)`;
    if (await tx.user.count())
      throw new Error("Bootstrap requires an empty user table");
    const role = await tx.role.upsert({
      where: { name: "SUPER_ADMIN" },
      create: { name: "SUPER_ADMIN", permissions: ["*"] },
      update: {},
    });
    for (const name of ["ADMIN", "EMPLOYEE"]) {
      const { permissions } = await import("../src/modules/auth/permissions");
      await tx.role.upsert({
        where: { name },
        create: {
          name,
          permissions: permissions[name as "ADMIN" | "EMPLOYEE"],
        },
        update: {},
      });
    }
    const office = await tx.office.create({
      data: {
        name: "Toshkent ofisi",
        telegramChatId: process.env.TELEGRAM_ADMIN_CHAT_ID || null,
      },
    });
    await tx.user.create({
      data: {
        login: "superadmin",
        passwordHash,
        roleId: role.id,
        profile: {
          create: {
            firstName: "Jaxongir",
            lastName: "Abdurazoqov",
            phone: "",
            position: "Community Manager",
            officeId: office.id,
          },
        },
      },
    });
  });
  console.info("Super admin created. Change the profile after first login.");
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
