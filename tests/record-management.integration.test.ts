import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { profileSelect } from "../src/modules/auth/service";
import { manageRecord } from "../src/modules/record-management/service";
test(
  "super admin edits and deletes a fixture report with an audit trail",
  { skip: process.env.RUN_INTEGRATION !== "1" },
  async () => {
    const actor = await db.user.findFirstOrThrow({
      where: { active: true, role: { name: "SUPER_ADMIN" } },
      select: profileSelect,
    });
    const row = await db.dailyTask.create({
      data: {
        employeeId: actor.id,
        date: new Date("2020-01-01"),
        description: "Management test fixture",
      },
    });
    try {
      await assert.rejects(
        manageRecord(
          { ...actor, role: { ...actor.role, name: "ADMIN" } },
          "daily-reports",
          row.id,
          "PATCH",
          {},
        ),
        { status: 403 },
      );
      await manageRecord(actor, "daily-reports", row.id, "PATCH", {
        date: "2020-01-02",
        description: "Corrected test fixture",
        expenseAmount: "125.25",
        expenseNotes: "Fixture",
      });
      const saved = await db.dailyTask.findUniqueOrThrow({
        where: { id: row.id },
      });
      assert.equal(saved.expenseAmount.toFixed(2), "125.25");
      assert.equal(saved.employeeId, actor.id);
      await manageRecord(actor, "daily-reports", row.id, "DELETE", undefined);
      assert.equal(
        await db.dailyTask.findUnique({ where: { id: row.id } }),
        null,
      );
      const trail = await db.auditLog.findMany({
        where: { entityId: row.id },
        orderBy: { timestamp: "asc" },
      });
      assert.equal(trail.length, 2);
      assert.equal(trail[0].action, "ADMIN_EDIT");
      assert.equal(trail[1].action, "ADMIN_DELETE");
    } finally {
      await db.dailyTask.deleteMany({ where: { id: row.id } });
      await db.auditLog.deleteMany({ where: { entityId: row.id } });
      await db.$disconnect();
    }
  },
);
