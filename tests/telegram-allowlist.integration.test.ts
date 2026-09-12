import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import {
  createLink,
  confirmTelegramLink,
} from "../src/modules/telegram/service";
test(
  "only admin assigned Telegram ID can redeem link; wrong IDs leave account unchanged",
  { skip: process.env.RUN_INTEGRATION !== "1" },
  async () => {
    const role = await db.role.findFirstOrThrow({
        where: { name: "EMPLOYEE" },
      }),
      office = await db.office.findFirstOrThrow();
    const user = await db.user.create({
      data: {
        login: `allowlist-${randomUUID()}`,
        passwordHash: "unused-fixture",
        roleId: role.id,
        profile: {
          create: {
            firstName: "Test",
            lastName: "Allowlist",
            phone: "test",
            position: "test",
            officeId: office.id,
          },
        },
      },
    });
    const id = Math.floor(Date.now() / 10);
    try {
      await assert.rejects(createLink(user.id), { status: 403 });
      await db.employeeProfile.update({
        where: { userId: user.id },
        data: { telegramUserId: String(id) },
      });
      const { token } = await createLink(user.id);
      const verify = (sender: number) =>
        db.$transaction((tx) =>
          confirmTelegramLink(tx, token, {
            from: { id: sender },
            chat: { id: sender, type: "private" },
          }),
        );
      await verify(id + 1);
      let p = await db.employeeProfile.findUniqueOrThrow({
        where: { userId: user.id },
      });
      assert.equal(p.telegramVerified, false);
      assert.equal(p.telegramUserId, String(id));
      assert.equal(
        await db.telegramLinkToken.count({ where: { userId: user.id } }),
        1,
      );
      // Roll back verification and its notification: no real delivery can happen.
      const rollback = new Error("fixture rollback");
      await assert.rejects(
        db.$transaction(async (tx) => {
          await confirmTelegramLink(tx, token, {
            from: { id },
            chat: { id, type: "private" },
          });
          p = await tx.employeeProfile.findUniqueOrThrow({
            where: { userId: user.id },
          });
          assert.equal(p.telegramVerified, true);
          assert.equal(p.telegramChatId, String(id));
          assert.equal(
            await tx.telegramLinkToken.count({ where: { userId: user.id } }),
            0,
          );
          throw rollback;
        }),
        (e) => e === rollback,
      );
      await db.employeeProfile.update({
        where: { userId: user.id },
        data: { telegramUserId: String(id + 2) },
      });
      await verify(id);
      p = await db.employeeProfile.findUniqueOrThrow({
        where: { userId: user.id },
      });
      assert.equal(p.telegramVerified, false);
    } finally {
      await db.telegramLinkToken.deleteMany({ where: { userId: user.id } });
      await db.employeeProfile.delete({ where: { userId: user.id } });
      await db.user.delete({ where: { id: user.id } });
      await db.$disconnect();
    }
  },
);
