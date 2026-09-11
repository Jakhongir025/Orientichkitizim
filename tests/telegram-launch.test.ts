import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { validateTelegramLaunch } from "../src/modules/telegram/validation";
const token = "123:test-secret";
const now = 1800000000000;
function signed(values: Record<string, string> = {}) {
  const p = new URLSearchParams({
    auth_date: String(now / 1000),
    user: JSON.stringify({ id: 123456, first_name: "Aziz" }),
    ...values,
  });
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  const data = [...p.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  p.set("hash", createHmac("sha256", secret).update(data).digest("hex"));
  return p.toString();
}
test("Telegram signed identity is accepted", () =>
  assert.equal(validateTelegramLaunch(signed(), token, now).id, 123456));
test("Telegram tampered identity and wrong bot are rejected", () => {
  assert.throws(() =>
    validateTelegramLaunch(signed().replace("123456", "654321"), token, now),
  );
  assert.throws(() => validateTelegramLaunch(signed(), "another-bot", now));
});
test("Telegram expired and future launches are rejected", () => {
  assert.throws(() =>
    validateTelegramLaunch(
      signed({ auth_date: String(now / 1000 - 301) }),
      token,
      now,
    ),
  );
  assert.throws(() =>
    validateTelegramLaunch(
      signed({ auth_date: String(now / 1000 + 60) }),
      token,
      now,
    ),
  );
});
test("Telegram duplicate parameters and malformed identities are rejected", () => {
  assert.throws(() =>
    validateTelegramLaunch(signed() + "&auth_date=1800000000", token, now),
  );
  assert.throws(() =>
    validateTelegramLaunch(signed({ user: '{"id":-1}' }), token, now),
  );
  assert.throws(() =>
    validateTelegramLaunch(signed({ user: "broken" }), token, now),
  );
});
