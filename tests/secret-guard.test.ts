import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
test("secret guard inspects staged content and does not print a token", () => {
  const cwd = mkdtempSync(join(tmpdir(), "orient-secret-guard-"));
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd, stdio: "ignore" });
  const run = () =>
    spawnSync(
      process.execPath,
      [resolve("scripts/security-check.mjs"), "--git-only"],
      { cwd, encoding: "utf8" },
    );
  try {
    git("init");
    writeFileSync(join(cwd, "safe.txt"), "Ordinary application content");
    git("add", "safe.txt");
    assert.equal(run().status, 0);
    const token = ["123456789", "a".repeat(35)].join(":");
    writeFileSync(join(cwd, "bad.txt"), token);
    git("add", "bad.txt");
    writeFileSync(
      join(cwd, "bad.txt"),
      "Working copy cleaned but index still unsafe",
    );
    const result = run();
    assert.equal(result.status, 1);
    assert.ok(!`${result.stdout}${result.stderr}`.includes(token));
    git("add", "bad.txt");
    assert.equal(run().status, 0);
    writeFileSync(join(cwd, ".env"), "EXAMPLE=value");
    git("add", ".env");
    assert.equal(run().status, 1);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
