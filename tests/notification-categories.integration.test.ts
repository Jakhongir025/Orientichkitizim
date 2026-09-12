import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { notify } from "../src/modules/notifications/service";
test(
  "notification categories remain separate and duplicate events do not add records",
  { skip: process.env.RUN_INTEGRATION !== "1" },
  async () => {
    const prefix = `fixture-category:${randomUUID()}`;
    const rollback = new Error("rollback");
    try {
      await assert.rejects(
        db.$transaction(async (tx) => {
          for (const category of [
            "ATTENDANCE",
            "SERVICE",
            "DOCUMENTS",
            "REPORTS",
            "OTHER",
          ] as const) {
            const input = {
              category,
              title: "Fixture",
              message: "Fixture",
              dedupeKey: `${prefix}:${category}`,
            };
            await notify(tx, input);
            await notify(tx, input);
            assert.equal(
              await tx.notification.count({
                where: { dedupeKey: { startsWith: prefix }, category },
              }),
              1,
            );
          }
          assert.equal(
            await tx.notification.count({
              where: { dedupeKey: { startsWith: prefix } },
            }),
            5,
          );
          throw rollback;
        }),
        (e) => e === rollback,
      );
    } finally {
      await db.$disconnect();
    }
  },
);
