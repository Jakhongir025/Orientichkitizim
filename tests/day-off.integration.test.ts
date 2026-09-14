import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { businessDate, dateOnly } from "../src/lib/time";
import { profileSelect } from "../src/modules/auth/service";
import { saveDayOff, cancelDayOff } from "../src/modules/attendance/day-off";
import { attendanceReport } from "../src/worker/scheduler";
test(
  "day off appears in closing report, exempts only its date and can be cancelled",
  { skip: process.env.RUN_INTEGRATION !== "1" },
  async () => {
    const office = await db.office.create({
      data: { name: `Day off fixture ${randomUUID()}` },
    });
    const role = await db.role.findUniqueOrThrow({
      where: { name: "EMPLOYEE" },
    });
    const user = await db.user.create({
      data: {
        login: `day-off-${randomUUID()}`,
        passwordHash: "unused-test",
        roleId: role.id,
        profile: {
          create: {
            firstName: "Dam",
            lastName: "Sinov",
            phone: "TEST-PHONE",
            position: "Sinov",
            officeId: office.id,
          },
        },
      },
      select: profileSelect,
    });
    const next = dateOnly(businessDate());
    next.setUTCDate(next.getUTCDate() + 1);
    const day = next.toISOString().slice(0, 10);
    try {
      await assert.rejects(saveDayOff(user, { date: "2020-01-01" }), {
        status: 400,
      });
      await assert.rejects(
        saveDayOff(user, { date: day, userId: "someone-else" }),
      );
      const saved = await saveDayOff(user, { date: day, notes: "Sinov" });
      assert.equal(saved.userId, user.id);
      assert.equal((await saveDayOff(user, { date: day })).id, saved.id);
      async function report(closing: boolean, now: Date) {
        const rollback = new Error("rollback");
        let messages: string[] = [];
        await assert.rejects(
          db.$transaction(async (tx) => {
            messages = [
              (await attendanceReport(tx, closing, office.id, now)).join("\n"),
            ];
            throw rollback;
          }),
          (e) => e === rollback,
        );
        return messages;
      }
      const evening = await report(true, new Date());
      assert.ok(
        evening.some(
          (m) =>
            m.includes("Dam Sinov") &&
            m.includes("TEST-PHONE") &&
            m.includes(day) &&
            m.includes("Dam olish kuni"),
        ),
      );
      const rest = await report(false, new Date(`${day}T07:00:00Z`));
      assert.ok(rest.some((m) => m.includes("Dam olish kuni")));
      assert.ok(
        rest.every((m) => !m.includes("Qayd etilmagan") && !m.includes("⚠️")),
      );
      const later = new Date(`${day}T07:00:00Z`);
      later.setUTCDate(later.getUTCDate() + 1);
      assert.ok(
        (await report(false, later)).some((m) => m.includes("Qayd etilmagan")),
      );
      await cancelDayOff(user, saved.id);
      assert.equal(await db.dayOff.count({ where: { userId: user.id } }), 0);
    } finally {
      await db.notification.deleteMany({ where: { userId: user.id } });
      await db.auditLog.deleteMany({ where: { userId: user.id } });
      await db.dayOff.deleteMany({ where: { userId: user.id } });
      await db.employeeProfile.delete({ where: { userId: user.id } });
      await db.user.delete({ where: { id: user.id } });
      await db.office.delete({ where: { id: office.id } });
      await db.$disconnect();
    }
  },
);
