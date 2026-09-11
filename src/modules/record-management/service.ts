import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { dateOnly } from "@/lib/time";
import { id, reportInput, serviceInput } from "@/lib/validation";
import type { Actor } from "@/modules/auth/service";
export function requireSuperAdmin(actor: Actor) {
  if (actor.role.name !== "SUPER_ADMIN")
    throw new AppError(403, "Tahrirlash va o‘chirish faqat Super Admin uchun");
}
export async function manageRecord(
  actor: Actor,
  resource: string,
  recordId: string,
  method: string,
  raw: unknown,
) {
  requireSuperAdmin(actor);
  id.parse(recordId);
  if (!["PATCH", "DELETE"].includes(method))
    throw new AppError(405, "Amal qo‘llanmaydi");
  return db.$transaction(async (tx) => {
    const where = { id: recordId };
    let old: unknown, row: unknown;
    const removing = method === "DELETE";
    switch (resource) {
      case "daily-reports": {
        old = await tx.dailyTask.findUniqueOrThrow({ where });
        if (removing) row = await tx.dailyTask.delete({ where });
        else {
          const v = reportInput.parse(raw);
          row = await tx.dailyTask.update({
            where,
            data: { ...v, date: dateOnly(v.date), carId: v.carId || null },
          });
        }
        break;
      }
      case "services": {
        old = await tx.carService.findUniqueOrThrow({ where });
        if (removing) row = await tx.carService.delete({ where });
        else {
          const v = serviceInput.parse(raw);
          row = await tx.carService.update({
            where,
            data: { ...v, date: dateOnly(v.date) },
          });
          await tx.car.updateMany({
            where: { id: v.carId, mileage: { lt: v.mileage } },
            data: { mileage: v.mileage },
          });
        }
        break;
      }
      case "documents": {
        if (!removing)
          throw new AppError(405, "Hujjat tahrirlash formasidan foydalaning");
        old = await tx.carDocument.findUniqueOrThrow({
          where,
          include: { recipients: true },
        });
        await tx.telegramRecipient.deleteMany({
          where: { documentId: recordId },
        });
        row = await tx.carDocument.delete({ where });
        break;
      }
      case "attendance": {
        if (!removing)
          throw new AppError(405, "Davomat tahrirlash formasidan foydalaning");
        old = await tx.attendance.findUniqueOrThrow({ where });
        row = await tx.attendance.delete({ where });
        break;
      }
      case "audit-logs": {
        old = await tx.auditLog.findUniqueOrThrow({ where });
        row = removing
          ? await tx.auditLog.delete({ where })
          : await tx.auditLog.update({
              where,
              data: z
                .object({
                  action: z.string().trim().min(1).max(100),
                  entityType: z.string().trim().min(1).max(100),
                })
                .strict()
                .parse(raw),
            });
        break;
      }
      case "notifications": {
        // Delivery and recipient fields cannot be changed from this editor.
        await tx.$queryRaw`SELECT id FROM "Notification" WHERE id=${recordId} FOR UPDATE`;
        const notice = await tx.notification.findUniqueOrThrow({ where });
        if (notice.status === "PROCESSING")
          throw new AppError(
            409,
            "Navbatdagi xabarni yuborish tugagach boshqaring",
          );
        const { documentData: _pdf, ...safe } = notice;
        old = safe;
        const result = removing
          ? await tx.notification.delete({ where })
          : await tx.notification.update({
              where,
              data: z
                .object({
                  title: z.string().trim().min(1).max(200),
                  message: z.string().trim().min(1).max(10000),
                })
                .strict()
                .parse(raw),
            });
        const { documentData: _resultPdf, ...safeResult } = result;
        row = safeResult;
        break;
      }
      case "service-types": {
        old = await tx.serviceType.findUniqueOrThrow({ where });
        row = removing
          ? await tx.serviceType.delete({ where })
          : await tx.serviceType.update({
              where,
              data: z
                .object({ name: z.string().trim().min(2).max(100) })
                .strict()
                .parse(raw),
            });
        break;
      }
      case "document-types": {
        old = await tx.documentType.findUniqueOrThrow({ where });
        row = removing
          ? await tx.documentType.delete({ where })
          : await tx.documentType.update({
              where,
              data: z
                .object({ name: z.string().trim().min(2).max(100) })
                .strict()
                .parse(raw),
            });
        break;
      }
      case "offices": {
        if (!removing)
          throw new AppError(405, "Ofis tahrirlash formasidan foydalaning");
        old = await tx.office.findUniqueOrThrow({ where });
        row = await tx.office.delete({ where });
        break;
      }
      case "rentals": {
        old = await tx.rentalRecord.findUniqueOrThrow({ where });
        row = removing
          ? await tx.rentalRecord.delete({ where })
          : await tx.rentalRecord.update({
              where,
              data: z
                .object({
                  customerName: z.string().trim().min(1).max(200),
                  phone: z.string().max(50),
                  contractNumber: z.string().max(100),
                  issuedBy: z.string().max(200),
                  acceptedBy: z.string().max(200),
                })
                .strict()
                .parse(raw),
            });
        break;
      }
      case "google-sheets": {
        if (!removing)
          throw new AppError(405, "Sozlash formasidan foydalaning");
        old = await tx.googleSheetsConfig.findUniqueOrThrow({ where });
        row = await tx.googleSheetsConfig.delete({ where });
        break;
      }
      default:
        throw new AppError(404, "Bo‘lim topilmadi");
    }
    // Even edits/deletions of audit entries leave a new correction trail.
    await audit(
      tx,
      actor.id,
      removing ? "ADMIN_DELETE" : "ADMIN_EDIT",
      resource,
      recordId,
      old,
      removing ? undefined : row,
    );
    return { ok: true };
  });
}
