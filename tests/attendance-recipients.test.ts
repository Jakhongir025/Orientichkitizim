import test from "node:test";
import assert from "node:assert/strict";
import { isAttendanceManager } from "../src/modules/attendance/recipients";
test("Attendance PDF only goes to active linked super admins or directors", () => {
  const user = {
    active: true,
    role: { name: "EMPLOYEE" },
    profile: {
      position: "Direktor",
      telegramVerified: true,
      telegramUserId: "123",
      telegramChatId: "123",
    },
  };
  assert.equal(isAttendanceManager(user), true);
  assert.equal(isAttendanceManager({ ...user, active: false }), false);
  assert.equal(
    isAttendanceManager({
      ...user,
      profile: { ...user.profile, position: "Operator" },
    }),
    false,
  );
  assert.equal(
    isAttendanceManager({
      ...user,
      profile: { ...user.profile, telegramChatId: "456" },
    }),
    false,
  );
  assert.equal(
    isAttendanceManager({
      ...user,
      profile: { ...user.profile, telegramVerified: false },
    }),
    false,
  );
  assert.equal(
    isAttendanceManager({
      ...user,
      role: { name: "SUPER_ADMIN" },
      profile: { ...user.profile, position: "Community Manager" },
    }),
    true,
  );
  assert.equal(
    isAttendanceManager({
      ...user,
      role: { name: "ADMIN" },
      profile: { ...user.profile, position: "Operator" },
    }),
    false,
  );
});
