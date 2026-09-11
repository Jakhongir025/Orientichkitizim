import test from "node:test";
import assert from "node:assert/strict";
import {
  requireSuperAdmin,
  manageRecord,
} from "../src/modules/record-management/service";
import type { Actor } from "../src/modules/auth/service";
test("management requires actual SUPER_ADMIN role, not wildcard grants", async () => {
  for (const name of ["ADMIN", "EMPLOYEE", "CUSTOM"]) {
    const actor = { id: "test", role: { name, permissions: ["*"] } } as Actor;
    assert.throws(() => requireSuperAdmin(actor), { status: 403 });
    await assert.rejects(
      manageRecord(actor, "daily-reports", "invalid", "DELETE", {}),
      { status: 403 },
    );
  }
  assert.doesNotThrow(() =>
    requireSuperAdmin({ role: { name: "SUPER_ADMIN" } } as Actor),
  );
});
