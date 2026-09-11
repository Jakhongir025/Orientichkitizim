import { PrismaClient } from "@prisma/client";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { syncSheets } from "../src/modules/google-sheets/service";
import { deliverNotifications } from "../src/modules/telegram/service";
import { scheduledTick } from "../src/worker/scheduler";
const enabled = process.env.RUN_INTEGRATION === "1";
test(
  "external adapters with mocked HTTP and real PostgreSQL",
  { skip: !enabled },
  async (t) => {
    const db = new PrismaClient();
    const originalFetch = globalThis.fetch;
    const oldEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      oldKey = process.env.GOOGLE_PRIVATE_KEY,
      oldToken = process.env.TELEGRAM_BOT_TOKEN;
    const suffix = Date.now().toString(36);
    let carId = "",
      configId = "",
      notificationId = "";
    try {
      const { privateKey } = generateKeyPairSync("rsa", {
        modulusLength: 2048,
        privateKeyEncoding: { format: "pem", type: "pkcs8" },
        publicKeyEncoding: { format: "pem", type: "spki" },
      });
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "test@example.invalid";
      process.env.GOOGLE_PRIVATE_KEY = privateKey;
      process.env.TELEGRAM_BOT_TOKEN = "test-token";
      const car = await db.car.create({
        data: {
          brand: "Mock",
          model: "Integration",
          year: 2026,
          plateNumber: `MOCK${suffix}`,
          normalizedPlate: `MOCK${suffix}`.toUpperCase(),
          color: "White",
          engine: "Test",
          location: "Test",
        },
      });
      carId = car.id;
      const config = await db.googleSheetsConfig.create({
        data: {
          name: "Mock integration",
          sheetId: "mock",
          range: "A2:I",
          mapping: {
            sourceId: 0,
            plate: 1,
            customerName: 2,
            phone: 3,
            rentalStart: 4,
            rentalEnd: 5,
            contractNumber: 6,
            passport: 7,
            passportDetails: 8,
          },
        },
      });
      configId = config.id;
      let rows: unknown[][] = [
        [
          "stable-id",
          car.plateNumber,
          "Mock Customer",
          "123",
          "2026-09-01T10:00:00+05:00",
          "2026-09-03T10:00:00+05:00",
          "TEST",
          "TEST-PASSPORT",
          "Sensitive",
        ],
      ];
      globalThis.fetch = async (input) =>
        String(input).includes("oauth2")
          ? Response.json({ access_token: "mock" })
          : Response.json({ values: rows });
      await t.test(
        "Sheets import encrypts passport and upserts stable source IDs",
        async () => {
          await syncSheets(configId);
          await syncSheets(configId);
          const records = await db.rentalRecord.findMany({
            where: { configId },
          });
          assert.equal(records.length, 1);
          assert.ok(!records[0].passportEncrypted!.includes("TEST-PASSPORT"));
          assert.equal(
            (
              await db.googleSheetsConfig.findUniqueOrThrow({
                where: { id: configId },
              })
            ).syncStatus,
            "SUCCESS",
          );
        },
      );
      await t.test(
        "invalid import preserves entire previous cache",
        async () => {
          rows = [
            ...rows,
            [
              "second",
              "UNKNOWN",
              "Bad",
              "123",
              "2026-09-01T10:00:00+05:00",
              "2026-09-03T10:00:00+05:00",
              "TEST",
            ],
          ];
          await assert.rejects(() => syncSheets(configId));
          assert.equal(await db.rentalRecord.count({ where: { configId } }), 1);
          assert.equal(
            (
              await db.googleSheetsConfig.findUniqueOrThrow({
                where: { id: configId },
              })
            ).syncStatus,
            "FAILED",
          );
        },
      );
      await t.test(
        "network errors expose friendly error and keep cache available",
        async () => {
          globalThis.fetch = async () => {
            throw new Error("Mock transport error");
          };
          await assert.rejects(
            () => syncSheets(configId),
            /Google Sheets temporarily unavailable/,
          );
          assert.equal(await db.rentalRecord.count({ where: { configId } }), 1);
        },
      );
      const notification = await db.notification.create({
        data: {
          title: "Mock",
          message: "Test",
          chatId: "-123",
          dedupeKey: `mock:${suffix}`,
        },
      });
      notificationId = notification.id;
      await t.test(
        "Telegram failure persists FAILED and can retry to SENT",
        async () => {
          globalThis.fetch = async () =>
            Response.json({ ok: false }, { status: 503 });
          await deliverNotifications();
          let row = await db.notification.findUniqueOrThrow({
            where: { id: notificationId },
          });
          assert.equal(row.status, "FAILED");
          assert.equal(row.attempts, 1);
          await db.notification.update({
            where: { id: notificationId },
            data: { nextAttemptAt: new Date(0) },
          });
          globalThis.fetch = async () => Response.json({ ok: true });
          await deliverNotifications();
          row = await db.notification.findUniqueOrThrow({
            where: { id: notificationId },
          });
          assert.equal(row.status, "SENT");
          assert.equal(row.attempts, 2);
        },
      );
      await db.googleSheetsConfig.update({
        where: { id: configId },
        data: { enabled: false },
      });
      await t.test(
        "scheduler replay does not duplicate completed daily jobs",
        async () => {
          globalThis.fetch = originalFetch;
          await scheduledTick();
          const count = await db.scheduledJob.count();
          await scheduledTick();
          assert.equal(await db.scheduledJob.count(), count);
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
      for (const [name, value] of Object.entries({
        GOOGLE_SERVICE_ACCOUNT_EMAIL: oldEmail,
        GOOGLE_PRIVATE_KEY: oldKey,
        TELEGRAM_BOT_TOKEN: oldToken,
      })) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
      if (notificationId)
        await db.notification.delete({ where: { id: notificationId } });
      if (configId) {
        await db.rentalRecord.deleteMany({ where: { configId } });
        await db.googleSheetsConfig.delete({ where: { id: configId } });
      }
      if (carId) await db.car.delete({ where: { id: carId } });
      await db.$disconnect();
    }
  },
);
