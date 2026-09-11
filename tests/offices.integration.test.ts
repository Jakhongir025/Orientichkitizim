import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { attendanceReport } from "../src/worker/scheduler";
test(
  "missing attendance alert targets office manager once and excludes inactive employees",
  { skip: process.env.RUN_INTEGRATION !== "1" },
  async () => {
    const office = await db.office.create({
      data: { name: `test-${randomUUID()}`, telegramChatId: "123456789" },
    });
    const role = await db.role.findUniqueOrThrow({
      where: { name: "EMPLOYEE" },
    });
    const users: string[] = [];
    try {
      for (const active of [true, false]) {
        const user = await db.user.create({
          data: {
            login: `office-${randomUUID()}`,
            passwordHash: "unused-test",
            roleId: role.id,
            active,
            profile: {
              create: {
                firstName: active ? "Active" : "Inactive",
                lastName: "Fixture",
                phone: "",
                position: "Manager",
                officeId: office.id,
              },
            },
          },
        });
        users.push(user.id);
      }
      // Roll back notifications: test must never enqueue Telegram delivery to a real chat.
      const rollback = new Error("rollback-fixture");
      await assert.rejects(
        db.$transaction(async (tx) => {
          await attendanceReport(tx, false, office.id);
          await attendanceReport(tx, false, office.id);
          const alerts = await tx.notification.findMany({
            where: {
              dedupeKey: { startsWith: `missing-attendance:${office.id}:` },
            },
          });
          assert.equal(alerts.length, 1);
          assert.equal(alerts[0].chatId, "123456789");
          assert.match(alerts[0].message, /Active Fixture/);
          assert.match(alerts[0].message, /qaydini kiritmagan/);
          assert.ok(!alerts[0].message.includes("Inactive"));
          throw rollback;
        }),
        (error) => error === rollback,
      );
    } finally {
      await db.employeeProfile.deleteMany({ where: { userId: { in: users } } });
      await db.user.deleteMany({ where: { id: { in: users } } });
      await db.office.delete({ where: { id: office.id } });
      await db.$disconnect();
    }
  },
);
