import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const randomToken = () => randomBytes(32).toString("hex");
function key() {
  const value = process.env.DATA_ENCRYPTION_KEY;
  if (!value || !/^[a-f\d]{64}$/i.test(value))
    throw new Error("DATA_ENCRYPTION_KEY must contain 32 bytes in hex");
  return Buffer.from(value, "hex");
}
export function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data]
    .map((v) => v.toString("base64"))
    .join(".");
}
export function decrypt(value: string | null) {
  if (!value) return null;
  const [iv, tag, data] = value.split(".").map((v) => Buffer.from(v, "base64"));
  const cipher = createDecipheriv("aes-256-gcm", key(), iv);
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(data), cipher.final()]).toString("utf8");
}
