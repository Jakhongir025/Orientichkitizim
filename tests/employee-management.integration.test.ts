import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { profileSelect } from "../src/modules/auth/service";
import {
  createEmployee,
  removeEmployee,
  updateEmployee,
} from "../src/modules/employees/service";
test(
  "owner can edit own profile; removal hides employee and frees login for a distinct new account",
  { skip: process.env.RUN_INTEGRATION !== "1" },
  async () => {
    const owner = await db.user.findUniqueOrThrow({
      where: { login: "superadmin" },
      select: profileSelect,
    });
    const role = await db.role.findUniqueOrThrow({
      where: { name: "EMPLOYEE" },
    });
    const ids: string[] = [];
    const login = `test.${randomUUID().slice(0, 8)}`;
    const input = {
      login,
      password: "Test-only-password-28!",
      roleId: role.id,
      firstName: "Test",
      lastName: "Employee",
      phone: "",
      position: "Direktor",
      officeId: owner.profile!.officeId,
    };
    try {
      await updateEmployee(owner, owner.id, {
        roleId: owner.role.id,
        position: owner.profile!.position,
      });
      const first = await createEmployee(owner, input);
      ids.push(first.id);
      await removeEmployee(owner, first.id);
      const removed = await db.user.findUniqueOrThrow({
        where: { id: first.id },
      });
      assert.equal(removed.active, false);
      assert.notEqual(removed.login, login);
      const replacement = await createEmployee(owner, input);
      ids.push(replacement.id);
      assert.notEqual(replacement.id, first.id);
      assert.equal(replacement.login, login);
      await assert.rejects(removeEmployee(owner, owner.id), { status: 400 });
    } finally {
      await db.auditLog.deleteMany({ where: { entityId: { in: ids } } });
      await db.employeeProfile.deleteMany({ where: { userId: { in: ids } } });
      await db.user.deleteMany({ where: { id: { in: ids } } });
      await db.$disconnect();
    }
  },
);
