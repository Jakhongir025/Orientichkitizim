import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
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
            const label = labels[field] || field;
            if (field === "password") return issue.message;
            if (field === "roleId" || field === "officeId")
              return `${label}: ro‘yxatdan tanlang`;
            return `${label ? `${label}: ` : ""}${issue.message}`;
          })
          .join(". "),
        details: error.flatten(),
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
