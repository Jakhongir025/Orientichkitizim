import { db } from "../src/lib/db";
async function main() {
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(81295)`;
    const owner = await tx.user.findUniqueOrThrow({
      where: { login: "superadmin" },
    });
    for (const name of ["Yunusobod", "Oybek", "Qushbegi"]) {
      if (
        await tx.office.findFirst({
          where: { name: { equals: name, mode: "insensitive" } },
        })
      )
        continue;
      const office = await tx.office.create({ data: { name } });
      await tx.auditLog.create({
        data: {
          userId: owner.id,
          action: "CREATE",
          entityType: "Office",
          entityId: office.id,
          newValue: { name },
        },
      });
    }
  });
  console.info("Yunusobod, Oybek, Qushbegi ofislari tayyor");
}
main().finally(() => db.$disconnect());
