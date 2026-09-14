import { AppError } from "@/lib/errors";
import type { Prisma } from "@prisma/client";
export type ReportAudience = "SELF" | "SELF_EMPLOYEES" | "ALL";
type Sender = {
  id: string;
  role: { name: string };
  profile: { position: string } | null;
};
export function reportAudiences(actor: Sender): ReportAudience[] {
  const director = ["direktor", "director"].includes(
    actor.profile?.position.trim().toLowerCase() || "",
  );
  if (actor.role.name === "SUPER_ADMIN" || director)
    return ["SELF", "SELF_EMPLOYEES", "ALL"];
  if (actor.role.name === "ADMIN") return ["SELF", "SELF_EMPLOYEES"];
  return [];
}
export function reportRecipientWhere(
  actor: Sender,
  audience: ReportAudience,
): Prisma.UserWhereInput {
  if (!reportAudiences(actor).includes(audience))
    throw new AppError(
      403,
      "Bu qabul qiluvchilar guruhiga yuborishga ruxsat yo‘q",
    );
  if (audience === "SELF") return { id: actor.id };
  if (audience === "SELF_EMPLOYEES")
    return { OR: [{ id: actor.id }, { role: { name: "EMPLOYEE" } }] };
  return {};
}
