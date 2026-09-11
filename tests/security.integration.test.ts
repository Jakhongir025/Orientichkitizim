import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { rateLimit } from "../src/lib/rate-limit";
import { hashToken, randomToken } from "../src/lib/crypto";
test(
  "idle sessions, logout-all, CSP nonces and shared rate limits",
  { skip: process.env.RUN_INTEGRATION !== "1" },
  async () => {
    const role = await db.role.findUniqueOrThrow({
      where: { name: "EMPLOYEE" },
    });
    const office = await db.office.findFirstOrThrow();
    const user = await db.user.create({
      data: {
        login: `security-${randomUUID()}`,
        passwordHash: "unused",
        roleId: role.id,
        profile: {
          create: {
            firstName: "Security",
            lastName: "Test",
            phone: "",
            position: "Test",
            officeId: office.id,
            telegramVerified: true,
          },
        },
      },
    });
    const token = `mini_${randomToken()}`,
      bucket = `test-${randomUUID()}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      Origin: "http://localhost:3000",
    };
    try {
      const session = await db.session.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + 3600000),
          lastSeenAt: new Date(Date.now() - 5 * 3600000),
        },
      });
      assert.equal(
        (await fetch("http://localhost:3000/api/me", { headers })).status,
        401,
      );
      await db.session.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date() },
      });
      assert.equal(
        (await fetch("http://localhost:3000/api/me", { headers })).status,
        200,
      );
      assert.equal(
        (
          await fetch("http://localhost:3000/api/auth/logout-all", {
            method: "POST",
            headers,
          })
        ).status,
        200,
      );
      assert.equal(
        (await fetch("http://localhost:3000/api/me", { headers })).status,
        401,
      );
      await rateLimit(bucket, 2, 60000);
      await rateLimit(bucket, 2, 60000);
      await assert.rejects(rateLimit(bucket, 2, 60000), { status: 429 });
      const a = await fetch("http://localhost:3000/login"),
        b = await fetch("http://localhost:3000/login");
      const csp = a.headers.get("content-security-policy")!;
      assert.match(csp, /nonce-/);
      assert.ok(
        !csp
          .split(";")
          .find((s) => s.includes("script-src"))!
          .includes("unsafe-inline"),
      );
      assert.notEqual(csp, b.headers.get("content-security-policy"));
      assert.equal(a.headers.get("x-frame-options"), "DENY");
      assert.match(await a.text(), /nonce="[^"]+"/);
    } finally {
      await db.auditLog.deleteMany({ where: { userId: user.id } });
      await db.session.deleteMany({ where: { userId: user.id } });
      await db.employeeProfile.delete({ where: { userId: user.id } });
      await db.user.delete({ where: { id: user.id } });
      await db.loginAttempt.deleteMany({
        where: { key: hashToken(`rate:${bucket}`) },
      });
      await db.$disconnect();
    }
  },
);
