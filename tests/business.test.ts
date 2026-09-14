import assert from "node:assert/strict";
import test from "node:test";
import { decrypt, encrypt } from "../src/lib/crypto";
import {
  businessDate,
  isLate,
  normalizePlate,
  remainingDays,
} from "../src/lib/time";
import { date, employeeInput } from "../src/lib/validation";
import { hasPermission, permissions } from "../src/modules/auth/permissions";
import {
  mappingSchema,
  parseRentalDate,
} from "../src/modules/google-sheets/service";
import { rentalContains } from "../src/modules/rentals/service";
test("plate spaces/case share one canonical identity", () => {
  assert.equal(normalizePlate("01 a 038 aa"), normalizePlate("01A038AA"));
  assert.equal(normalizePlate("786 aps"), "786APS");
});
test("attendance respects Tashkent midnight, independent of server timezone", () => {
  assert.equal(businessDate(new Date("2026-09-05T19:01:00Z")), "2026-09-06");
});
test("10:00 exactly on time; any later server timestamp is late", () => {
  assert.equal(isLate(new Date("2026-09-06T05:00:00Z")), false);
  assert.equal(isLate(new Date("2026-09-06T05:00:00.001Z")), true);
  assert.equal(isLate(new Date("2026-09-06T04:59:59Z")), false);
});
test("expiry is a calendar date and never rounded by current hour", () => {
  assert.equal(
    remainingDays(
      new Date("2026-09-13T00:00:00Z"),
      new Date("2026-09-06T18:59:00Z"),
    ),
    7,
  );
  assert.equal(
    remainingDays(
      new Date("2026-09-06T00:00:00Z"),
      new Date("2026-09-06T19:00:00Z"),
    ),
    -1,
  );
});
test("employees cannot access passport data, employee management, or audit", () => {
  for (const p of [
    "rentals.sensitive",
    "employees.write",
    "audit.read",
    "cars.write",
  ])
    assert.equal(hasPermission(permissions.EMPLOYEE, p), false);
  assert.equal(hasPermission(permissions.ADMIN, "rentals.sensitive"), true);
  assert.equal(
    hasPermission(permissions.SUPER_ADMIN, "future.permission"),
    true,
  );
});
test("fine lookup uses half-open interval so adjacent rentals do not both match", () => {
  const start = new Date("2026-08-01T05:00:00Z"),
    end = new Date("2026-08-05T05:00:00Z");
  assert.equal(rentalContains(start, end, start), true);
  assert.equal(
    rentalContains(start, end, new Date("2026-08-03T10:24:00Z")),
    true,
  );
  assert.equal(rentalContains(start, end, end), false);
});
test("passport ciphertext is randomized, authenticated, and reversible", () => {
  process.env.DATA_ENCRYPTION_KEY = "ab".repeat(32);
  const a = encrypt("AA1234567"),
    b = encrypt("AA1234567");
  assert.notEqual(a, b);
  assert.ok(!a.includes("AA1234567"));
  assert.equal(decrypt(a), "AA1234567");
  const parts = a.split(".");
  parts[1] = Buffer.alloc(16).toString("base64");
  assert.throws(() => decrypt(parts.join(".")));
});
test("rental timestamps require explicit timezone", () => {
  assert.equal(
    parseRentalDate("2026-09-06T10:00:00+05:00").toISOString(),
    "2026-09-06T05:00:00.000Z",
  );
  assert.throws(() => parseRentalDate("06/09/2026"));
  assert.throws(() => parseRentalDate("2026-09-06T10:00:00"));
});
test("invalid calendar dates and weak passwords fail validation", () => {
  assert.equal(date.safeParse("2026-02-30").success, false);
  assert.equal(employeeInput.safeParse({ password: "short" }).success, false);
});
test("mapping must have all required columns", () => {
  assert.equal(mappingSchema.safeParse({ plate: 0 }).success, false);
});

test("SSR date output uses fixed Uzbek labels and Tashkent timezone", async () => {
  const { formatDate } = await import("../src/lib/display-date");
  assert.equal(formatDate("2026-09-06T12:00:00Z"), "06-sen, 2026");
  assert.equal(formatDate("2026-09-06T23:00:00Z", true), "07-sen, 2026 04:00");
  assert.equal(formatDate(null), "—");
});

test("manual attendance uses Tashkent time regardless of device timezone", async () => {
  const { manualAttendanceTime } = await import(
    "../src/modules/attendance/validation"
  );
  const recorded = new Date("2026-09-06T14:00:00Z");
  const before = manualAttendanceTime(
    { date: "2026-09-06", time: "09:59", timezone: "Asia/Kuala_Lumpur" },
    recorded,
  );
  assert.equal(before.late, false);
  assert.equal(before.instant.toISOString(), "2026-09-06T04:59:00.000Z");
  assert.equal(
    manualAttendanceTime(
      { date: "2026-09-06", time: "10:00", timezone: "Asia/Tashkent" },
      recorded,
    ).late,
    false,
  );
  assert.equal(
    manualAttendanceTime(
      { date: "2026-09-06", time: "10:01", timezone: "Asia/Tashkent" },
      recorded,
    ).late,
    true,
  );
  assert.throws(
    () =>
      manualAttendanceTime(
        { date: "2026-09-07", time: "10:00", timezone: "Asia/Tashkent" },
        recorded,
      ),
    /Kelajak/,
  );
  assert.throws(() =>
    manualAttendanceTime(
      { date: "2026-09-06", time: "09:00", timezone: "Invalid/Zone" },
      recorded,
    ),
  );
});
