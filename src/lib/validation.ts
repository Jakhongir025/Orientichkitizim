import { limitedText } from "./request-body";
import { z } from "zod";
import { AppError } from "./errors";
export const passwordSchema = z
  .string()
  .min(12, "Parol kamida 12 belgidan iborat bo‘lishi kerak")
  .refine(
    (v) => Buffer.byteLength(v, "utf8") <= 72,
    "Parol 72 baytdan oshmasin",
  );
export const id = z.string().cuid();
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
    "Sana noto‘g‘ri",
  );
export const optionalText = z.string().trim().max(4000).optional();
export const carInput = z.object({
  imageData: z
    .string()
    .max(60000)
    .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/)
    .nullable()
    .optional(),
  brand: z.string().trim().min(1).max(100),
  model: z.string().trim().min(1).max(100),
  year: z.coerce.number().int().min(1950).max(2100),
  plateNumber: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9 ]+$/),
  legalPlateNumber: optionalText,
  vin: z.string().trim().max(30).optional(),
  color: z.string().trim().min(1).max(50),
  engine: z.string().trim().max(100),
  mileage: z.coerce.number().int().min(0).max(10000000),
  status: z.enum([
    "AVAILABLE",
    "RENTED",
    "SERVICE",
    "RESERVED",
    "UNAVAILABLE",
    "WITH_OWNER",
    "CAR_WASH",
  ]),
  location: z.string().trim().max(200),
  notes: optionalText,
});
export const employeeInput = z.object({
  login: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9._-]+$/),
  password: passwordSchema,
  roleId: id,
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(40),
  position: z.string().trim().max(100),
  officeId: id,
});
export const serviceInput = z.object({
  carId: id,
  serviceTypeId: id,
  date,
  mileage: z.coerce.number().int().min(0).max(10000000),
  notes: optionalText,
});
export const documentInput = z
  .object({
    carId: id,
    documentTypeId: id,
    number: z.string().trim().min(1).max(100),
    company: z.string().max(150).optional(),
    startDate: date,
    expiryDate: date,
    responsibleId: id,
    fileUrl: z
      .union([
        z.literal(""),
        z
          .string()
          .url()
          .refine((v) => v.startsWith("https://")),
      ])
      .optional(),
    recipientIds: z.array(id).max(30).default([]),
  })
  .refine(
    (v) => v.expiryDate >= v.startDate,
    "Tugash sanasi boshlanish sanasidan oldin bo‘lishi mumkin emas",
  );
export const reportInput = z.object({
  date,
  description: z.string().trim().min(3).max(5000),
  expenseAmount: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === undefined || v === "" ? "0" : String(v).trim()))
    .refine(
      (v) => /^\d{1,12}(\.\d{1,2})?$/.test(v),
      "Xarajat musbat son, ko‘pi bilan 2 kasr xonali bo‘lsin",
    ),
  expenseNotes: z.string().trim().max(2000).optional(),
  carId: z.union([id, z.literal("")]).optional(),
});
export async function body(request: Request) {
  const text = await limitedText(request);
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
