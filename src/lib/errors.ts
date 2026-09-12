import { Prisma } from "@prisma/client";
import { ZodError, type ZodIssue } from "zod";
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const logger = {
  info: (event: string) =>
    console.info(JSON.stringify({ level: "INFO", event })),
  warn: (event: string) =>
    console.warn(JSON.stringify({ level: "WARN", event })),
  error: (event: string) =>
    console.error(JSON.stringify({ level: "ERROR", event })),
};
export function uzValidationMessage(issue: ZodIssue): string {
  if (issue.code === "custom") return issue.message;
  if (issue.code === "too_small")
    return `Qiymat kamida ${issue.minimum}${issue.type === "string" ? " belgidan iborat" : ""} bo‘lishi kerak`;
  if (issue.code === "too_big")
    return `Qiymat ${issue.maximum}${issue.type === "string" ? " belgidan" : ""} oshmasligi kerak`;
  if (issue.code === "invalid_type")
    return issue.received === "undefined"
      ? "Bu maydonni to‘ldiring"
      : "Ma’lumot turi noto‘g‘ri";
  if (issue.code === "invalid_enum_value")
    return "Ro‘yxatdan mos qiymatni tanlang";
  if (issue.code === "unrecognized_keys")
    return "Ruxsat berilmagan maydon kiritilgan";
  return "Ma’lumot formati noto‘g‘ri";
}
export function errorResponse(error: unknown) {
  if (error instanceof AppError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError)
    return Response.json(
      {
        error: error.issues
          .map((issue) => {
            const labels: Record<string, string> = {
              password: "Parol",
              login: "Login",
              firstName: "Ism",
              lastName: "Familiya",
              phone: "Telefon",
              position: "Lavozim",
              roleId: "Tizimdagi ruxsat roli",
              officeId: "Ofis",
            };
            const field = String(issue.path[0] || "");
            const label = labels[field] || "Maydon";
            if (field === "password")
              return issue.code === "too_small"
                ? `Parol kamida ${issue.minimum} belgidan iborat bo‘lishi kerak`
                : uzValidationMessage(issue);
            if (field === "roleId" || field === "officeId")
              return `${label}: ro‘yxatdan tanlang`;
            return `${label ? `${label}: ` : ""}${uzValidationMessage(issue)}`;
          })
          .join(". "),
        details: error.flatten(uzValidationMessage),
      },
      { status: 400 },
    );
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002")
      return Response.json(
        { error: "Bu ma’lumot allaqachon mavjud" },
        { status: 409 },
      );
    if (error.code === "P2025")
      return Response.json({ error: "Ma’lumot topilmadi" }, { status: 404 });
    if (error.code === "P2003")
      return Response.json(
        { error: "Bog‘langan ma’lumot topilmadi yoki foydalanilmoqda" },
        { status: 409 },
      );
  }
  logger.error("request_failed");
  return Response.json(
    { error: "Xizmat vaqtincha ishlamayapti. Qayta urinib ko‘ring." },
    { status: 503 },
  );
}
