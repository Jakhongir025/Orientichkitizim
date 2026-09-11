import { AppError } from "./errors";
export async function limitedText(request: Request, limit = 65536) {
  const size = Number(request.headers.get("content-length") || 0);
  if (!Number.isFinite(size) || size < 0 || size > limit)
    throw new AppError(413, "So‘rov hajmi juda katta");
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new AppError(413, "So‘rov hajmi juda katta");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const data = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(data);
  } catch {
    throw new AppError(400, "Matn UTF-8 formatida bo‘lsin");
  }
}
