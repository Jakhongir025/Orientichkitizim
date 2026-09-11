import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { AppError } from "@/lib/errors";

export function validateTelegramLaunch(
  initData: string,
  botToken: string,
  now = Date.now(),
) {
  const fail = () =>
    new AppError(
      401,
      "Telegram tasdiqlanmadi. Mini Appni botdan qayta oching.",
    );
  if (!botToken || initData.length > 8192) throw fail();
  const params = new URLSearchParams(initData);
  if (new Set(params.keys()).size !== [...params.keys()].length) throw fail();
  const hash = params.get("hash") || "";
  if (!/^[a-f0-9]{64}$/.test(hash)) throw fail();
  params.delete("hash");
  const data = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(data).digest();
  if (!timingSafeEqual(expected, Buffer.from(hash, "hex"))) throw fail();
  const date = Number(params.get("auth_date"));
  if (
    !Number.isSafeInteger(date) ||
    date > now / 1000 + 30 ||
    now / 1000 - date > 300
  )
    throw fail();
  try {
    return z
      .object({
        id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
        username: z.string().max(64).optional(),
      })
      .parse(JSON.parse(params.get("user") || "null"));
  } catch {
    throw fail();
  }
}
