import test from "node:test";
import assert from "node:assert/strict";
import type { Prisma } from "@prisma/client";
import { attendanceReport } from "../src/worker/scheduler";
import { checkExpirations } from "../src/modules/documents/service";
const manager = {
  id: "manager",
  active: true,
  role: { name: "SUPER_ADMIN" },
  profile: {
    position: "Owner",
    telegramVerified: true,
    telegramUserId: "100",
    telegramChatId: "100",
  },
};
test("Attendance creates one combined PDF per manager for both daily reports", async () => {
  const writes: any[] = [];
  const tx = {
    carService: { findMany: async () => [] },
    dailyTask: { findMany: async () => [] },
    car: { findMany: async () => [] },
    auditLog: { findMany: async () => [] },
    office: {
      findMany: async () => [
        { name: "Oybek", employees: [] },
        { name: "Yunusobod", employees: [] },
      ],
    },
    user: {
      findMany: async () => [
        manager,
        { ...manager, id: "employee", role: { name: "EMPLOYEE" } },
      ],
    },
    notification: {
      upsert: async (input: any) => {
        writes.push(input.create);
        return input.create;
      },
    },
  } as unknown as Prisma.TransactionClient;
  await attendanceReport(
    tx,
    false,
    undefined,
    new Date("2026-09-13T05:10:00Z"),
  );
  await attendanceReport(tx, true, undefined, new Date("2026-09-13T17:10:00Z"));
  assert.equal(writes.length, 2);
  assert.ok(writes[0].documentName.endsWith("1010.pdf"));
  assert.ok(writes[1].documentName.endsWith("2210.pdf"));
  for (const row of writes) {
    assert.equal(row.userId, "manager");
    assert.equal(
      Buffer.from(row.documentData).subarray(0, 4).toString(),
      "%PDF",
    );
  }
});
test("Document reminders repeat daily from seven days through overdue, stop on renewal, allow manual send", async () => {
  let expiry = new Date("2026-09-20T00:00:00Z");
  const writes: any[] = [];
  const tx = {
    user: { findMany: async () => [manager] },
    carDocument: {
      findMany: async () => [
        {
          id: "doc",
          expiryDate: expiry,
          car: { brand: "Toyota", model: "LC", plateNumber: "01A001AA" },
          documentType: { name: "Insurance" },
        },
      ],
    },
    notification: {
      upsert: async (input: any) => {
        writes.push(input.create);
        return input.create;
      },
    },
  } as unknown as Prisma.TransactionClient;
  await checkExpirations(tx, new Date("2026-09-12T03:00:00Z"));
  assert.equal(writes.length, 0);
  for (const day of ["13", "14", "20", "21", "22"])
    await checkExpirations(tx, new Date(`2026-09-${day}T03:00:00Z`));
  assert.equal(writes.length, 5);
  assert.equal(new Set(writes.map((w) => w.dedupeKey)).size, 5);
  expiry = new Date("2027-09-20T00:00:00Z");
  await checkExpirations(tx, new Date("2026-09-23T03:00:00Z"));
  assert.equal(writes.length, 5);
  await checkExpirations(
    tx,
    new Date("2026-09-23T03:00:00Z"),
    "doc",
    "manual-request",
  );
  assert.equal(writes.length, 6);
  assert.equal(
    Buffer.from(writes[5].documentData).subarray(0, 4).toString(),
    "%PDF",
  );
  assert.match(writes[5].message, /01A001AA/);
});

test("Combined expiry report queues one PDF per user with independent morning/evening keys", async () => {
  const { sendExpirationSummary } = await import(
    "../src/modules/documents/service"
  );
  const writes: any[] = [];
  const tx = {
    carDocument: {
      findMany: async () =>
        ["A", "B"].map((id) => ({
          id,
          expiryDate: new Date("2026-09-20"),
          car: { brand: "Toyota", model: "LC", plateNumber: id },
          documentType: { name: "Insurance" },
        })),
    },
    user: { findMany: async () => [manager] },
    notification: {
      upsert: async (i: any) => {
        writes.push(i.create);
        return i.create;
      },
    },
  } as unknown as Prisma.TransactionClient;
  for (const slot of ["10:30", "21:30"]) {
    const result = await sendExpirationSummary(
      tx,
      new Date("2026-09-13T05:30:00Z"),
      slot,
    );
    assert.deepEqual(result, { queued: 1, documents: 2 });
  }
  assert.equal(writes.length, 2);
  assert.notEqual(writes[0].dedupeKey, writes[1].dedupeKey);
  assert.equal(
    Buffer.from(writes[0].documentData).subarray(0, 4).toString(),
    "%PDF",
  );
});

test("Manual attendance report targets only requester and selected Tashkent date", async () => {
  const writes: any[] = [];
  let queriedDate: Date | undefined;
  let recipientId: string | undefined;
  const tx = {
    office: {
      findMany: async (q: any) => {
        queriedDate =
          q.include.employees.include.user.include.attendance.where.date;
        return [];
      },
    },
    user: {
      findMany: async (q: any) => {
        recipientId = q.where.id;
        return [manager];
      },
    },
    notification: {
      upsert: async (i: any) => {
        writes.push(i.create);
        return i.create;
      },
    },
  } as unknown as Prisma.TransactionClient;
  await attendanceReport(
    tx,
    true,
    undefined,
    new Date("2026-09-20T12:00:00Z"),
    { userId: "manager", requestId: "manual-test", date: "2026-09-13" },
  );
  assert.equal(queriedDate?.toISOString(), "2026-09-13T00:00:00.000Z");
  assert.equal(recipientId, "manager");
  assert.equal(writes.length, 1);
  assert.match(writes[0].dedupeKey, /manual:manual-test/);
  assert.match(writes[0].documentName, /2026-09-13-sorov/);
});
