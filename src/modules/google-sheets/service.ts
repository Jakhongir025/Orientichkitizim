import { encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { AppError, logger } from "@/lib/errors";
import { normalizePlate } from "@/lib/time";
import { SignJWT, importPKCS8 } from "jose";
import { z } from "zod";
export const mappingSchema = z.object({
  sourceId: z.number().int().min(0),
  plate: z.number().int().min(0),
  customerName: z.number().int().min(0),
  phone: z.number().int().min(0),
  rentalStart: z.number().int().min(0),
  rentalEnd: z.number().int().min(0),
  contractNumber: z.number().int().min(0),
  passport: z.number().int().min(0).optional(),
  passportDetails: z.number().int().min(0).optional(),
  issuedBy: z.number().int().min(0).optional(),
  acceptedBy: z.number().int().min(0).optional(),
  notes: z.number().int().min(0).optional(),
});
export const sheetsInput = z.object({
  name: z.string().min(1).max(100),
  sheetId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  range: z.string().min(1).max(200),
  mapping: mappingSchema,
  enabled: z.boolean().default(true),
});
export function parseRentalDate(value: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) ||
    isNaN(Date.parse(value)) ||
    new Date(value.slice(0, 10)).toISOString().slice(0, 10) !==
      value.slice(0, 10)
  )
    throw new AppError(400, "Ijara sanasi vaqt zonasi bilan ISO 8601 formatida bo‘lishi kerak");
  return new Date(value);
}
export async function syncSheets(configId: string) {
  const config = await db.googleSheetsConfig.findUniqueOrThrow({
    where: { id: configId },
  });
  if (!config.enabled)
    throw new AppError(400, "Google Sheets ulanishi o‘chirilgan");
  // Atomic lease avoids overlapping manual and scheduled sync; stale leases recover after 10 minutes.
  const claimed = await db.googleSheetsConfig.updateMany({
    where: {
      id: configId,
      OR: [
        { syncStatus: { not: "RUNNING" } },
        { updatedAt: { lt: new Date(Date.now() - 600000) } },
      ],
    },
    data: { syncStatus: "RUNNING", lastError: null },
  });
  if (!claimed.count) throw new AppError(409, "Sinxronlash davom etmoqda");
  try {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      pem = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!email || !pem) throw new Error("Google credentials missing");
    const assertion = await new SignJWT({
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(email)
      .setAudience("https://oauth2.googleapis.com/token")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(await importPKCS8(pem, "RS256"));
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!tokenResponse.ok) throw new Error("Google authentication failed");
    const token = z
      .object({ access_token: z.string() })
      .parse(await tokenResponse.json());
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.sheetId)}/values/${encodeURIComponent(config.range)}`,
      {
        headers: { Authorization: `Bearer ${token.access_token}` },
        signal: AbortSignal.timeout(30000),
      },
    );
    if (!response.ok) throw new Error("Google request failed");
    const { values = [] } = z
      .object({
        values: z
          .array(z.array(z.union([z.string(), z.number(), z.boolean()])))
          .max(20000)
          .optional(),
      })
      .parse(await response.json());
    const mapping = mappingSchema.parse(config.mapping);
    const cars = await db.car.findMany({
      where: { archived: false },
      select: { id: true, normalizedPlate: true },
    });
    const byPlate = new Map(cars.map((c) => [c.normalizedPlate, c.id]));
    const seen = new Set<string>();
    const rows = values
      .filter((row) => row.some((v) => String(v).trim()))
      .map((row, index) => {
        const get = (field: keyof typeof mapping) => {
          const column = mapping[field];
          return column === undefined ? "" : String(row[column] ?? "").trim();
        };
        const sourceId = get("sourceId"),
          carId = byPlate.get(normalizePlate(get("plate")));
        if (!sourceId || seen.has(sourceId) || !carId || !get("customerName"))
          throw new AppError(
            400,
            `Jadval qatori ${index + 1}: ID, avtomobil yoki mijoz noto‘g‘ri`,
          );
        seen.add(sourceId);
        const rentalStart = parseRentalDate(get("rentalStart")),
          rentalEnd = parseRentalDate(get("rentalEnd"));
        if (rentalEnd <= rentalStart)
          throw new AppError(
            400,
            `Jadval qatori ${index + 1}: ijara vaqt oralig‘i noto‘g‘ri`,
          );
        return {
          sourceId,
          configId,
          carId,
          customerName: get("customerName"),
          phone: get("phone"),
          rentalStart,
          rentalEnd,
          contractNumber: get("contractNumber"),
          passportEncrypted: get("passport") ? encrypt(get("passport")) : null,
          passportDetailsEncrypted: get("passportDetails")
            ? encrypt(get("passportDetails"))
            : null,
          issuedBy: get("issuedBy"),
          acceptedBy: get("acceptedBy"),
          notes: get("notes"),
          importedAt: new Date(),
        };
      });
    await db.$transaction(
      async (tx) => {
        for (const row of rows)
          await tx.rentalRecord.upsert({
            where: { configId_sourceId: { configId, sourceId: row.sourceId } },
            create: row,
            update: row,
          });
        await tx.googleSheetsConfig.update({
          where: { id: configId },
          data: {
            syncStatus: "SUCCESS",
            lastSyncAt: new Date(),
            importedCount: rows.length,
            lastError: null,
          },
        });
      },
      { timeout: 120000 },
    );
    logger.info("sheets_sync_success");
    return { importedCount: rows.length };
  } catch (error) {
    await db.googleSheetsConfig.update({
      where: { id: configId },
      data: {
        syncStatus: "FAILED",
        lastError:
          error instanceof AppError
            ? error.message
            : "Google jadvallari xizmati vaqtincha ishlamayapti",
      },
    });
    logger.error("sheets_sync_failed");
    if (error instanceof AppError) throw error;
    throw new AppError(503, "Google jadvallari xizmati vaqtincha ishlamayapti");
  }
}
