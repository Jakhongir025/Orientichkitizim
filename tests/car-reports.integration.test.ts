import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { addReport } from "../src/modules/reports/service";
import { db } from "../src/lib/db";
import {
  buildCarReport,
  enqueueReport,
  enqueueMonthlyReport,
} from "../src/modules/car-reports/service";
import { checkOut, editAttendance } from "../src/modules/attendance/service";
import { profileSelect } from "../src/modules/auth/service";
import { sendTelegramDocument } from "../src/modules/telegram/service";
test(
  "early checkout requires reason; car reports preserve data, scope and PDF delivery",
  { skip: process.env.RUN_INTEGRATION !== "1" },
  async () => {
    const role = await db.role.findUniqueOrThrow({
      where: { name: "EMPLOYEE" },
    });
    const office = await db.office.create({ data: { name: "Report fixture" } });
    const user = await db.user.create({
      data: {
        login: `report-${randomUUID()}`,
        passwordHash: "unused",
        roleId: role.id,
        profile: {
          create: {
            firstName: "Report",
            lastName: "Fixture",
            phone: "",
            position: "Tester",
            officeId: office.id,
          },
        },
      },
      select: profileSelect,
    });
    const car = await db.car.create({
      data: {
        brand: "Fixture",
        model: "Report",
        plateNumber: `R${Date.now()}`,
        normalizedPlate: `R${Date.now()}`,
        year: 2020,
        color: "White",
        engine: "Test",
        location: "Test",
        createdAt: new Date("2026-01-01"),
      },
    });
    let attendanceId = "";
    const savedFetch = globalThis.fetch;
    const savedToken = process.env.TELEGRAM_BOT_TOKEN;
    try {
      const entry = await db.attendance.create({
        data: {
          userId: user.id,
          officeId: office.id,
          date: new Date("2020-01-01"),
          checkIn: new Date("2020-01-01T04:00:00Z"),
          status: "ON_TIME",
        },
      });
      attendanceId = entry.id;
      await assert.rejects(
        checkOut(user, {
          date: "2020-01-01",
          time: "21:59",
          timezone: "Asia/Tashkent",
        }),
        { status: 400 },
      );
      const result = await checkOut(user, {
        date: "2020-01-01",
        time: "21:59",
        timezone: "Asia/Tashkent",
        earlyLeaveReason: "Shaxsiy sabab",
      });
      assert.equal(result.earlyLeaveReason, "Shaxsiy sabab");
      const savedExpense = await addReport(user, {
        carId: car.id,
        date: "2026-08-15",
        description: "Fixture work",
        expenseAmount: "650000.25",
        expenseNotes: "Moy va filtr",
      });
      assert.equal(savedExpense.expenseAmount.toFixed(2), "650000.25");
      await db.dailyTask.create({
        data: {
          carId: car.id,
          employeeId: user.id,
          date: new Date("2026-09-01"),
          description: "OUTSIDE RANGE",
        },
      });
      const report = await buildCarReport(
        db,
        car.id,
        "2026-08-15",
        "MONTH",
        role.permissions,
      );
      assert.ok(report.lines.join("\n").includes("Fixture work"));
      assert.ok(report.lines.join("\n").includes("650000.25 so‘m"));
      assert.ok(report.lines.join("\n").includes("Moy va filtr"));
      assert.ok(!report.lines.join("\n").includes("OUTSIDE RANGE"));
      assert.ok(!report.lines.join("\n").includes("HUJJATLAR"));
      const rollback = new Error("rollback");
      await assert.rejects(
        db.$transaction(async (tx) => {
          await enqueueReport(
            tx,
            report,
            user.id,
            "123",
            "PDF",
            `test-pdf:${car.id}`,
          );
          const notice = await tx.notification.findUniqueOrThrow({
            where: { dedupeKey: `test-pdf:${car.id}` },
          });
          assert.equal(
            Buffer.from(notice.documentData!).subarray(0, 5).toString(),
            "%PDF-",
          );
          process.env.TELEGRAM_BOT_TOKEN = "fixture";
          globalThis.fetch = async (_url, init) => {
            const form = init?.body as FormData;
            assert.equal(form.get("chat_id"), "123");
            assert.ok(form.get("document") instanceof Blob);
            return Response.json({ ok: true });
          };
          await sendTelegramDocument(
            "123",
            "Fixture",
            notice.documentData!,
            notice.documentName!,
          );
          await tx.employeeProfile.update({
            where: { userId: user.id },
            data: {
              telegramVerified: true,
              telegramChatId: "123",
              reportFormat: "PDF",
            },
          });
          await enqueueMonthlyReport(tx, user.id, car.id, "2026-08-01");
          await enqueueMonthlyReport(tx, user.id, car.id, "2026-08-01");
          assert.equal(
            await tx.notification.count({
              where: { dedupeKey: `monthly-car:2026-08:${user.id}:${car.id}` },
            }),
            1,
          );
          throw rollback;
        }),
        (e) => e === rollback,
      );
    } finally {
      globalThis.fetch = savedFetch;
      if (savedToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
      else process.env.TELEGRAM_BOT_TOKEN = savedToken;
      await db.notification.deleteMany({ where: { userId: user.id } });
      await db.auditLog.deleteMany({ where: { userId: user.id } });
      await db.dailyTask.deleteMany({ where: { carId: car.id } });
      await db.attendance.deleteMany({ where: { userId: user.id } });
      await db.car.delete({ where: { id: car.id } });
      await db.employeeProfile.delete({ where: { userId: user.id } });
      await db.user.delete({ where: { id: user.id } });
      await db.office.delete({ where: { id: office.id } });
      await db.$disconnect();
    }
  },
);
