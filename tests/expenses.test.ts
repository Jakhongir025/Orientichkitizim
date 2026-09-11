import test from "node:test";
import assert from "node:assert/strict";
import { reportInput } from "../src/lib/validation";
const base = { date: "2026-09-11", description: "Moy almashtirildi" };
test("expense preserves decimal precision and accepts reports without spending", () => {
  assert.equal(reportInput.parse(base).expenseAmount, "0");
  assert.equal(
    reportInput.parse({
      ...base,
      expenseAmount: "650000.25",
      expenseNotes: "Moy va filtr",
    }).expenseAmount,
    "650000.25",
  );
});
test("expense rejects negative, overprecision, invalid and oversized values", () => {
  for (const expenseAmount of [
    "-1",
    "1.001",
    "NaN",
    "1e12",
    "1000000000000",
    {},
    null,
  ])
    assert.equal(
      reportInput.safeParse({ ...base, expenseAmount }).success,
      false,
    );
});
