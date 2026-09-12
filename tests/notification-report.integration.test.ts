import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { db } from "../src/lib/db";
import {
  notificationDay,
  notificationWhere,
  buildNotificationPdf,
} from "../src/modules/notifications/report";
import { handleNotificationCommand } from "../src/modules/telegram/notification-command";
test("notification date range uses Tashkent day and rejects invalid days", () => {
  const range = notificationDay("2026-09-12");
  assert.equal(range.gte.toISOString(), "2026-09-11T19:00:00.000Z");
  assert.equal(range.lt.toISOString(), "2026-09-12T19:00:00.000Z");
  assert.throws(() => notificationDay("2026-02-30"));
  assert.throws(
    () =>
      notificationWhere(
        { id: "x", role: { permissions: [] } },
        { date: "2026-09-12" },
      ),
    { status: 403 },
  );
});
test(
  "daily PDF and bot enforce date, category, identity, visibility and replay protection",
  { skip: process.env.RUN_INTEGRATION !== "1" },
  async () => {
    const rollback = new Error("rollback");
    try {
      await assert.rejects(
        db.$transaction(
          async (tx) => {
            const role = await tx.role.findFirstOrThrow({
                where: { name: "EMPLOYEE" },
              }),
              office = await tx.office.findFirstOrThrow();
            const tid = Math.floor(Date.now() / 10);
            const user = await tx.user.create({
              data: {
                login: `notice-test-${randomUUID()}`,
                passwordHash: "unused-fixture",
                roleId: role.id,
                profile: {
                  create: {
                    firstName: "Sinov",
                    lastName: "Xodim",
                    position: "Sinov",
                    phone: "test",
                    officeId: office.id,
                    telegramUserId: String(tid),
                    telegramChatId: String(tid),
                    telegramVerified: true,
                  },
                },
              },
              include: { role: true },
            });
            const prefix = randomUUID();
            for (const [i, at, category] of [
              [0, "2026-09-11T18:59:59Z", "SERVICE"],
              [1, "2026-09-11T19:00:00Z", "SERVICE"],
              [2, "2026-09-12T18:59:59Z", "ATTENDANCE"],
              [3, "2026-09-12T19:00:00Z", "SERVICE"],
            ] as const) {
              await tx.notification.create({
                data: {
                  userId: user.id,
                  title: `Sinov ${i}`,
                  message:
                    "Xodim: Sinov Xodim\nAvtomobil: Li Auto L9\nRaqam: 01 A 001 AA\nBajarilgan ish: Moy almashtirildi",
                  category,
                  createdAt: new Date(at),
                  dedupeKey: `${prefix}:${i}`,
                  status: "SKIPPED",
                },
              });
            }
            const scope = notificationWhere(user, {
              date: "2026-09-12",
              category: "ALL",
            });
            assert.equal(await tx.notification.count({ where: scope }), 2);
            assert.equal(
              await tx.notification.count({
                where: notificationWhere(user, {
                  date: "2026-09-12",
                  category: "SERVICE",
                }),
              }),
              1,
            );
            const pdf = await buildNotificationPdf(tx, user, {
              date: "2026-09-12",
              category: "ALL",
            });
            assert.equal(pdf.pdf.subarray(0, 5).toString(), "%PDF-");
            mkdirSync("tmp/pdfs", { recursive: true });
            writeFileSync("tmp/pdfs/notification-day-preview.pdf", pdf.pdf);
            const message = {
              text: "/hisobot 2026-09-12 servis",
              from: { id: tid },
              chat: { id: tid, type: "private" },
            };
            await handleNotificationCommand(tx, 1, {
              ...message,
              from: { id: tid + 1 },
              chat: { id: tid + 1, type: "private" },
            });
            assert.equal(
              await tx.notification.count({
                where: {
                  dedupeKey: {
                    startsWith: `notification-pdf-command:${user.id}:`,
                  },
                },
              }),
              0,
            );
            await handleNotificationCommand(tx, 2, message);
            await handleNotificationCommand(tx, 2, message);
            const queued = await tx.notification.findMany({
              where: {
                dedupeKey: {
                  startsWith: `notification-pdf-command:${user.id}:`,
                },
              },
            });
            assert.equal(queued.length, 1);
            assert.equal(queued[0].chatId, String(tid));
            assert.ok(queued[0].documentData);
            assert.equal(queued[0].status, "PENDING");
            await tx.employeeProfile.update({
              where: { userId: user.id },
              data: { telegramVerified: false },
            });
            await handleNotificationCommand(tx, 3, message);
            assert.equal(
              await tx.notification.count({
                where: {
                  dedupeKey: {
                    startsWith: `notification-pdf-command:${user.id}:`,
                  },
                },
              }),
              1,
            );
            throw rollback;
          },
          { timeout: 20000 },
        ),
        (e) => e === rollback,
      );
    } finally {
      await db.$disconnect();
    }
  },
);
