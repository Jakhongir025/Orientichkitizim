import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
const gitOnly = process.argv.includes("--git-only");
const production = process.argv.includes("--production");
let failures = 0;
function fail(message) {
  console.error(`FAIL: ${message}`);
  failures++;
}
function warn(message) {
  console.warn(`WARN: ${message}`);
}
const names = [
  "TELEGRAM_BOT_TOKEN",
  "GOOGLE_PRIVATE_KEY",
  "GOOGLE_SHEET_ID",
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "DATA_ENCRYPTION_KEY",
  "POSTGRES_PASSWORD",
];
const placeholder = (v) =>
  !v || /change-me|example|BU_YERGA|YANGI_|KALIT|PAROL|your-/i.test(v);
if (!gitOnly) {
  if (!/^[a-f0-9]{64}$/i.test(process.env.DATA_ENCRYPTION_KEY || ""))
    fail(
      "DATA_ENCRYPTION_KEY: 64 hex belgi kerak. Mavjud bazaning kalitini tasodifan almashtirmang.",
    );
  try {
    const u = new URL(process.env.DATABASE_URL);
    if (!["postgresql:", "postgres:"].includes(u.protocol)) throw new Error();
    if (production && placeholder(u.password))
      fail("DATABASE_URL: production DB paroli sozlanmagan.");
  } catch {
    fail("DATABASE_URL noto‘g‘ri yoki berilmagan.");
  }
  if (production) {
    try {
      const u = new URL(process.env.APP_URL);
      if (
        u.protocol !== "https:" ||
        ["localhost", "127.0.0.1"].includes(u.hostname) ||
        u.hostname.endsWith(".example.uz")
      )
        throw new Error();
      if (u.hostname !== process.env.RENTCAR_DOMAIN)
        fail("APP_URL va RENTCAR_DOMAIN mos emas.");
    } catch {
      fail("APP_URL: haqiqiy HTTPS domen kerak.");
    }
    if (
      placeholder(process.env.POSTGRES_PASSWORD) ||
      process.env.POSTGRES_PASSWORD.length < 24
    )
      fail("POSTGRES_PASSWORD: kamida 24 belgili tasodifiy qiymat kerak.");
    if (process.env.SEED_ADMIN_PASSWORD || process.env.SEED_EMPLOYEE_PASSWORD)
      warn(
        "Bootstrap/seed tugagach seed parollarini environmentdan olib tashlang.",
      );
  }
  const idle = Number(process.env.SESSION_IDLE_MINUTES || 30);
  if (!Number.isInteger(idle) || idle < 5 || idle > 240)
    fail("SESSION_IDLE_MINUTES: 5–240 oralig‘ida bo‘lsin.");
  for (const name of [
    "TELEGRAM_BOT_TOKEN",
    "GOOGLE_SHEET_ID",
    "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    "GOOGLE_PRIVATE_KEY",
  ])
    if (placeholder(process.env[name]))
      warn(`${name} sozlanmagan: tegishli integratsiya ishlamaydi.`);
  for (const name of Object.keys(process.env))
    if (
      name.startsWith("NEXT_PUBLIC_") &&
      /TOKEN|SECRET|PRIVATE|PASSWORD|SHEET_ID/.test(name)
    )
      fail(`${name}: maxfiy qiymat brauzerga chiqarilmasin.`);
  try {
    if (process.platform !== "win32" && (statSync(".env").mode & 0o077) !== 0)
      fail(".env ruxsatlari keng: chmod 600 .env bajaring.");
  } catch {
    warn(
      ".env yo‘q; qiymatlar server environmentida berilgan bo‘lishi mumkin.",
    );
  }
}
const git = (...args) =>
  execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    maxBuffer: 32 * 1024 * 1024,
  });
let tracked;
try {
  tracked = git("ls-files", "-z").split("\0").filter(Boolean);
} catch {
  if (gitOnly) fail("Git repository topilmadi.");
  else
    warn("Git repository mavjud emas; Git indeksini tekshirish bajarilmadi.");
}
if (tracked) {
  const actualValues = names.flatMap((name) => {
    const value = process.env[name];
    return !placeholder(value) && value.length >= 8
      ? [value, value.replaceAll("\\n", "\n")]
      : [];
  });
  for (const file of tracked) {
    if (
      (/(^|\/)\.env(?:\.|$)/.test(file) && !file.endsWith(".env.example")) ||
      /(^|\/)(backups|output|tmp|secrets|credentials|\.local)\//.test(file) ||
      /\.(pem|key|dump|backup)$/.test(file) ||
      /service-account.*\.json$|(^|\/)credentials\.json$/.test(file)
    ) {
      fail(`Git ichida maxfiy fayl bo‘lishi mumkin: ${file}`);
      continue;
    }
    let content;
    try {
      content = git("show", `:${file}`);
    } catch {
      fail(`Git indeksidagi fayl o‘qilmadi: ${file}`);
      continue;
    }
    if (
      /\d{6,12}:[A-Za-z0-9_-]{30,}/.test(content) ||
      /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----\s+[A-Za-z0-9+/=]{30,}/.test(
        content,
      ) ||
      actualValues.some((v) => content.includes(v))
    )
      fail(`Git indeksida ehtimoliy maxfiy qiymat: ${file}`);
  }
  console.log(
    `Git indeksi tekshirildi: ${tracked.length} fayl. Secret qiymatlari chiqarilmaydi.`,
  );
}
console.log(
  failures
    ? `Tekshiruv o‘tmadi: ${failures} muammo.`
    : "Tekshiruv o‘tdi. Bu konfiguratsiya tekshiruvi; to‘liq pentest emas.",
);
process.exitCode = failures ? 1 : 0;
