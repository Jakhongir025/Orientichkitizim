import bcrypt from "bcryptjs";
import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { telegramLogin } from "../src/modules/telegram/auth";
import { hashToken } from "../src/lib/crypto";
test(
  "Mini App login requires linked active verified employee and creates revocable session",
  { skip: process.env.RUN_INTEGRATION !== "1" },
  async () => {
    const previous = process.env.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_BOT_TOKEN = "test-only-token";
    const role = await db.role.findFirstOrThrow({
      where: { name: "EMPLOYEE" },
    });
    const office = await db.office.findFirstOrThrow();
    const id = Math.floor(Date.now() / 10);
    const user = await db.user.create({
      data: {
        login: `mini-${randomUUID()}`,
        passwordHash: await bcrypt.hash("Mini-test-password-123", 4),
        roleId: role.id,
        profile: {
          create: {
            firstName: "Mini",
            lastName: "Test",
            phone: "test",
            position: "test",
            officeId: office.id,
          },
        },
      },
    });
    const p = new URLSearchParams({
      user: JSON.stringify({ id }),
      auth_date: String(Math.floor(Date.now() / 1000)),
    });
    const key = createHmac("sha256", "WebAppData")
      .update(process.env.TELEGRAM_BOT_TOKEN)
      .digest();
    p.set(
      "hash",
      createHmac("sha256", key)
        .update(
          [...p.entries()]
            .sort(([a], [b]) => (a < b ? -1 : 1))
            .map(([k, v]) => `${k}=${v}`)
            .join("\n"),
        )
        .digest("hex"),
    );
    const credentials = {
      login: user.login,
      password: "Mini-test-password-123",
    };
    try {
      await assert.rejects(telegramLogin(p.toString(), credentials), {
        status: 403,
      });
      await db.employeeProfile.update({
        where: { userId: user.id },
        data: { telegramUserId: String(id) },
      });
      await assert.rejects(
        telegramLogin(p.toString(), { ...credentials, password: "wrong" }),
        { status: 401 },
      );
      const session = await telegramLogin(p.toString(), credentials);
      await assert.rejects(telegramLogin(p.toString(), credentials), {
        status: 401,
      });
      assert.match(session.token, /^mini_[a-f0-9]{64}$/);
      const stored = await db.session.findUniqueOrThrow({
        where: { tokenHash: hashToken(session.token) },
      });
      assert.equal(stored.userId, user.id);
      assert.ok(stored.expiresAt.getTime() > Date.now());
      const response = await fetch("http://localhost:3000/api/me", {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      assert.equal(response.status, 200);
      const denied = await fetch("http://localhost:3000/api/employees", {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      assert.equal(denied.status, 403);
      await db.user.update({ where: { id: user.id }, data: { active: false } });
      await assert.rejects(telegramLogin(p.toString(), credentials), {
        status: 401,
      });
      assert.equal(
        (
          await fetch("http://localhost:3000/api/me", {
            headers: { Authorization: `Bearer ${session.token}` },
          })
        ).status,
        401,
      );
    } finally {
      await db.auditLog.deleteMany({ where: { userId: user.id } });
      await db.session.deleteMany({ where: { userId: user.id } });
      await db.employeeProfile.deleteMany({ where: { userId: user.id } });
      await db.user.delete({ where: { id: user.id } });
      if (previous === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
      else process.env.TELEGRAM_BOT_TOKEN = previous;
      await db.$disconnect();
    }
  },
);
