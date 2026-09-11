import test from "node:test";
import assert from "node:assert/strict";
import { reportPeriod } from "../src/modules/car-reports/period";
import { splitReport } from "../src/modules/car-reports/service";
test("car report calendar boundaries use Tashkent midnight, Monday weeks and leap months", () => {
  assert.equal(reportPeriod("2024-02-10", "MONTH").endDay, "2024-03-01");
  assert.equal(reportPeriod("2026-09-09", "WEEK").startDay, "2026-09-07");
  assert.equal(
    reportPeriod("2026-09-09", "DAY").start.toISOString(),
    "2026-09-08T19:00:00.000Z",
  );
  assert.equal(reportPeriod("2026-12-31", "MONTH").endDay, "2027-01-01");
});
test("long Telegram reports retain all Unicode text across bounded messages", () => {
  const text = "Ўзбекистон 🚗 xodim\n".repeat(1000);
  const parts = splitReport(text);
  assert.equal(parts.join(""), text);
  assert.ok(parts.every((p) => p.length <= 3500));
  assert.ok(parts.every((p) => !/[\uD800-\uDBFF]$/.test(p)));
});
