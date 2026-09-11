import test from "node:test";
import assert from "node:assert/strict";
import { employeeInput } from "../src/lib/validation";
import { errorResponse } from "../src/lib/errors";
const employee = {
  login: "bobur.nigmatov",
  firstName: "Bobur",
  lastName: "Nigmatov",
  phone: "+998997000777",
  position: "Ofis Manager",
  roleId: "cseedrole00000000000000001",
  officeId: "cseedoffice000000000000001",
};
test("employee password validation reports exact reason without exposing password", async () => {
  const result = employeeInput.safeParse({ ...employee, password: "short123" });
  assert.equal(result.success, false);
  if (result.success) return;
  const response = errorResponse(result.error);
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error, "Parol kamida 12 belgidan iborat bo‘lishi kerak");
  assert.ok(!JSON.stringify(body).includes("short123"));
});
test("employee form accepts a valid manually chosen login and 12-character password", () => {
  assert.equal(
    employeeInput.safeParse({ ...employee, password: "TwelveChars1" }).success,
    true,
  );
});
