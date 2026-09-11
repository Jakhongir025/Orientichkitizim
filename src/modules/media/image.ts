import sharp from "sharp";
import { AppError } from "@/lib/errors";
export async function sanitizeCarImage(value: string | null | undefined) {
  if (value === null || value === undefined) return value;
  try {
    const bytes = Buffer.from(value.split(",")[1], "base64");
    const input = sharp(bytes, { limitInputPixels: 4000000, failOn: "error" });
    const metadata = await input.metadata();
    if (metadata.format !== "jpeg") throw new Error();
    const output = await input
      .rotate()
      .resize(600, 600, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();
    const result = `data:image/jpeg;base64,${output.toString("base64")}`;
    if (result.length > 60000) throw new Error();
    return result;
  } catch {
    throw new AppError(
      400,
      "Rasm buzilgan yoki juda katta. Boshqa JPG/PNG/WebP rasmni tanlang",
    );
  }
}
