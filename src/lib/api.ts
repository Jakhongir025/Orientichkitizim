import { attendanceReport } from "@/modules/attendance/report";
import { isAttendanceManager } from "@/modules/attendance/recipients";
import {
  reportAudiences,
  reportRecipientWhere,
} from "@/modules/documents/audience";
import { notify } from "@/modules/notifications/service";
import { saveDayOff, cancelDayOff } from "@/modules/attendance/day-off";
import {
  notificationWhere,
  buildNotificationPdf,
  enqueueNotificationPdf,
} from "@/modules/notifications/report";
import { fleetStatusPdf } from "@/modules/cars/status-pdf";
import {
  updateCarStatus,
  releaseExpiredCars,
} from "@/modules/cars/status-service";
import {
  manageRecord,
  requireSuperAdmin,
} from "@/modules/record-management/service";
import { limitedText } from "./request-body";
import { rateLimit } from "./rate-limit";
import { buildCarReport, enqueueReport } from "@/modules/car-reports/service";
import { reportQuery } from "@/modules/car-reports/period";
import { reportPdf } from "@/modules/car-reports/pdf";
import { telegramLogin, telegramPinStatus } from "@/modules/telegram/auth";
import {
  checkIn,
  checkOut,
  editAttendance,
} from "@/modules/attendance/service";
import { timezoneSchema } from "@/modules/attendance/validation";
import { hasPermission } from "@/modules/auth/permissions";
import {
  allow,
  checkOrigin,
  login,
  logout,
  profileSelect,
  requireUser,
} from "@/modules/auth/service";
import {
  addService,
  archiveCar,
  carWhere,
  saveCar,
} from "@/modules/cars/service";
import {
  checkExpirations,
  sendExpirationSummary,
  saveDocument,
} from "@/modules/documents/service";
import {
  createEmployee,
  updateEmployee,
  removeEmployee,
} from "@/modules/employees/service";
import { sheetsInput, syncSheets } from "@/modules/google-sheets/service";
import { searchRentals } from "@/modules/rentals/service";
import { addReport } from "@/modules/reports/service";
import { createLink } from "@/modules/telegram/service";
import { formatInTimeZone } from "date-fns-tz";
import { z } from "zod";
import { audit } from "./audit";
import { db } from "./db";
import { AppError, errorResponse } from "./errors";
import { businessDate, dateOnly, remainingDays } from "./time";
import { body, date, id } from "./validation";
const employeeInclude = { select: { id: true, profile: true } } as const;
async function handle(request: Request) {
  try {
    checkOrigin(request);
    const url = new URL(request.url),
      parts = url.pathname.replace(/^\/api\//, "").split("/"),
      [resource, key, action] = parts,
      method = request.method,
      q = url.searchParams;
    if (resource === "health" && method === "GET") {
      await db.$queryRaw`SELECT 1`;
      return Response.json({ status: "ok" });
    }
    if (resource === "auth" && key === "login" && method === "POST") {
      await rateLimit("login-global", 120, 60000);
      const nativeForm = request.headers
        .get("content-type")
        ?.startsWith("application/x-www-form-urlencoded");
      const payload = nativeForm
        ? Object.fromEntries(
            new URLSearchParams(await limitedText(request, 4096)),
          )
        : await body(request);
      const input = z
        .object({
          login: z.string().trim().toLowerCase().min(1).max(60),
          password: z
            .string()
            .min(1)
            .max(72)
            .refine((v) => Buffer.byteLength(v, "utf8") <= 72),
        })
        .parse(payload);
      const result = await login(input.login, input.password);
      return nativeForm
        ? new Response(null, {
            status: 303,
            headers: {
              Location: new URL(
                "/",
                process.env.APP_URL || "http://localhost:3000",
              ).href,
            },
          })
        : Response.json(result);
    }
    if (
      resource === "auth" &&
      ["telegram-pin-status", "telegram-pin"].includes(key) &&
      method === "POST"
    ) {
      await rateLimit("telegram-login-global", 300, 60000);
      const input = z
        .object({
          initData: z.string().min(1).max(8192),
          pin: z
            .string()
            .regex(/^\d{4}$/)
            .optional(),
        })
        .strict()
        .parse(await body(request));
      if (key === "telegram-pin-status")
        return Response.json(await telegramPinStatus(input.initData));
      if (!input.pin) throw new AppError(400, "4 xonali PIN kiriting");
      return Response.json(
        await telegramLogin(input.initData, { pin: input.pin }),
      );
    }
    if (resource === "auth" && key === "telegram" && method === "POST") {
      await rateLimit("telegram-login-global", 300, 60000);
      const input = z
        .object({
          initData: z.string().min(1).max(8192),
          newPin: z
            .string()
            .regex(/^\d{4}$/)
            .optional(),
          login: z.string().trim().min(1).max(60),
          password: z
            .string()
            .min(1)
            .max(72)
            .refine((v) => Buffer.byteLength(v, "utf8") <= 72),
        })
        .parse(await body(request));
      return Response.json(
        await telegramLogin(input.initData, {
          newPin: input.newPin,
          login: input.login,
          password: input.password,
        }),
      );
    }
    const actor = await requireUser();
    await rateLimit(`api:${actor.id}`, 240, 60000);
    if (
      ["PATCH", "DELETE"].includes(method) &&
      [
        "employees",
        "cars",
        "documents",
        "attendance",
        "services",
        "daily-reports",
        "settings",
        "google-sheets",
      ].includes(resource)
    )
      requireSuperAdmin(actor);
    if (
      method === "GET" &&
      ["cars", "car-status", "dashboard", "lookup", "car-reports"].includes(
        resource,
      )
    )
      await releaseExpiredCars();
    if (
      resource === "car-status" &&
      ((key === "pdf" && method === "GET") ||
        (key === "send-pdf" && method === "POST"))
    ) {
      const delivery = method === "POST";
      const input = delivery
        ? z
            .object({
              q: z.string().max(100).optional(),
              timezone: z.string().max(100).optional(),
              requestId: z.string().uuid(),
            })
            .strict()
            .parse(await body(request))
        : null;
      if (
        delivery &&
        (!actor.profile?.telegramVerified || !actor.profile.telegramChatId)
      )
        throw new AppError(
          400,
          "Telegram hisobingiz bilan Mini Appga qayta kiring va botda /start bosing",
        );
      if (delivery) await releaseExpiredCars();
      allow(actor, "cars.read");
      await rateLimit(`fleet-pdf:${actor.id}`, 5, 60000);
      const query = (input?.q ?? q.get("q") ?? "").slice(0, 100);
      const timezone = z
        .string()
        .max(100)
        .refine((v) => {
          try {
            new Intl.DateTimeFormat("en", { timeZone: v });
            return true;
          } catch {
            return false;
          }
        }, "Timezone noto‘g‘ri")
        .parse(input?.timezone || q.get("timezone") || "Asia/Tashkent");
      const cars = await db.car.findMany({
        where: carWhere(query),
        orderBy: [{ brand: "asc" }, { model: "asc" }, { plateNumber: "asc" }],
        take: 5001,
        select: {
          brand: true,
          model: true,
          plateNumber: true,
          status: true,
          occupiedUntil: true,
        },
      });
      if (cars.length > 5000)
        throw new AppError(
          400,
          "PDF uchun qidiruvni aniqlashtiring (eng ko‘pi 5000 avtomobil)",
        );
      const pdf = await fleetStatusPdf(cars, timezone, query);
      if (input) {
        await db.$transaction((tx) =>
          notify(tx, {
            userId: actor.id,
            chatId: actor.profile!.telegramChatId!,
            category: "REPORTS",
            title: "Avtomobillar holati",
            message: "Avtomobillarning joriy holati PDF hisoboti",
            documentData: new Uint8Array(pdf),
            documentName: "orientrentcar-avtomobillar-holati.pdf",
            dedupeKey: `fleet-pdf:${actor.id}:${input.requestId}`,
            requiredPermissions: ["cars.read"],
          }),
        );
        return Response.json({ ok: true });
      }
      return Response.json({
        pdf: pdf.toString("base64"),
        filename: "orientrentcar-avtomobillar-holati.pdf",
      });
    }
    if (resource === "car-status" && key && method === "PATCH")
      return Response.json(
        await updateCarStatus(actor, key, await body(request)),
      );
    if (resource === "record-management")
      return Response.json(
        await manageRecord(
          actor,
          key,
          action,
          method,
          method === "PATCH" ? await body(request) : undefined,
        ),
      );
    const permitted = (p: string) => hasPermission(actor.role.permissions, p);
    const limit = z.coerce
      .number()
      .int()
      .min(1)
      .max(200)
      .parse(q.get("limit") || 100);
    const page = z.coerce
      .number()
      .int()
      .min(1)
      .max(100000)
      .parse(q.get("page") || 1);
    const skip = (page - 1) * limit;
    const term = (q.get("q") || "").trim().slice(0, 100);
    const contains = { contains: term, mode: "insensitive" as const };
    const personSearch = {
      OR: [{ firstName: contains }, { lastName: contains }],
    };
    if (resource === "auth" && key === "logout-all" && method === "POST") {
      await db.$transaction(async (tx) => {
        await tx.session.deleteMany({ where: { userId: actor.id } });
        await audit(tx, actor.id, "LOGOUT_ALL", "User", actor.id);
      });
      return Response.json({ ok: true });
    }
    if (resource === "auth" && key === "logout" && method === "POST")
      return Response.json(await logout());
    if (resource === "me" && method === "GET") return Response.json(actor);
    if (resource === "car-reports") {
      allow(actor, "cars.read");
      await rateLimit(`car-report:${actor.id}`, 20, 60000);
      if (key === "preferences") {
        if (method === "GET")
          return Response.json({
            format: actor.profile?.reportFormat || "TEXT",
          });
        if (method === "PATCH") {
          const input = z
            .object({ format: z.enum(["TEXT", "PDF"]) })
            .parse(await body(request));
          await db.employeeProfile.update({
            where: { userId: actor.id },
            data: { reportFormat: input.format },
          });
          return Response.json({ ok: true });
        }
      }
      if (method === "GET" && !key) {
        const input = reportQuery.parse(Object.fromEntries(q));
        const report = await buildCarReport(
          db,
          input.carId,
          input.date,
          input.period,
          actor.role.permissions,
        );
        if (q.get("format") === "PDF")
          return Response.json({
            pdf: (await reportPdf(report)).toString("base64"),
            filename: "rentcar-report.pdf",
          });
        return Response.json(report);
      }
      if (method === "POST" && key === "send") {
        const input = reportQuery
          .extend({
            format: z.enum(["TEXT", "PDF"]),
            requestId: z.string().uuid(),
          })
          .parse(await body(request));
        if (!actor.profile?.telegramVerified || !actor.profile.telegramChatId)
          throw new AppError(
            400,
            "Avval profilingizdan Telegram hisobingizni ulang",
          );
        await db.$transaction(
          async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`report-send:${actor.id}`}))`;
            const key = `manual-car:${actor.id}:${input.requestId}`;
            if (
              await tx.notification.findFirst({
                where: { dedupeKey: { startsWith: key } },
              })
            )
              return;
            const recent = await tx.notification.count({
              where: {
                userId: actor.id,
                dedupeKey: { startsWith: "manual-car:" },
                createdAt: { gte: new Date(Date.now() - 600000) },
              },
            });
            if (recent >= 30)
              throw new AppError(
                429,
                "Hisobotlar ko‘p. Birozdan keyin urinib ko‘ring",
              );
            const report = await buildCarReport(
              tx,
              input.carId,
              input.date,
              input.period,
              actor.role.permissions,
            );
            await enqueueReport(
              tx,
              report,
              actor.id,
              actor.profile!.telegramChatId!,
              input.format,
              key,
            );
          },
          { timeout: 60000 },
        );
        return Response.json({
          ok: true,
          message: "Hisobot Telegramga yuborish navbatiga qo‘shildi",
        });
      }
    }
    if (resource === "lookup" && method === "GET")
      return Response.json({
        cars: await db.car.findMany({
          where: { archived: false },
          select: { id: true, brand: true, model: true, plateNumber: true },
          orderBy: { brand: "asc" },
          take: 2000,
        }),
        serviceTypes: await db.serviceType.findMany(),
        documentTypes: permitted("documents.read")
          ? await db.documentType.findMany()
          : [],
        employees: permitted("employees.read")
          ? await db.user.findMany({
              where: { active: true },
              select: { id: true, profile: true },
            })
          : [],
        roles: permitted("employees.write") ? await db.role.findMany() : [],
        offices: permitted("employees.write") ? await db.office.findMany() : [],
      });
    if (resource === "dashboard" && method === "GET") {
      const viewerTimezone = "Asia/Tashkent";
      const viewerDate = formatInTimeZone(
        new Date(),
        viewerTimezone,
        "yyyy-MM-dd",
      );
      const today = dateOnly(viewerDate),
        soon = new Date(today.getTime() + 7 * 86400000);
      const manager = permitted("attendance.read");
      const [
        totalCars,
        activeEmployees,
        attendance,
        carsInService,
        expiring,
        expired,
        tasks,
        services,
        notifications,
        activities,
      ] = await Promise.all([
        db.car.count({ where: { archived: false } }),
        manager
          ? db.user.count({ where: { active: true } })
          : Promise.resolve(0),
        db.attendance.findMany({
          where: { date: today, ...(manager ? {} : { userId: actor.id }) },
          include: { user: employeeInclude },
        }),
        db.car.count({ where: { archived: false, status: "SERVICE" } }),
        permitted("documents.read")
          ? db.carDocument.findMany({
              where: {
                car: { archived: false },
                expiryDate: { gte: today, lte: soon },
              },
              include: { car: true, documentType: true },
              orderBy: { expiryDate: "asc" },
            })
          : Promise.resolve([]),
        permitted("documents.read")
          ? db.carDocument.count({
              where: { car: { archived: false }, expiryDate: { lt: today } },
            })
          : Promise.resolve(0),
        db.dailyTask.findMany({
          where: {
            date: today,
            ...(permitted("reports.read") ? {} : { employeeId: actor.id }),
          },
          include: { employee: employeeInclude, car: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        db.carService.findMany({
          where: manager ? {} : { employeeId: actor.id },
          include: { car: true, serviceType: true, employee: employeeInclude },
          orderBy: { createdAt: "desc" },
          take: 6,
        }),
        db.notification.findMany({
          omit: { documentData: true },
          where: { userId: actor.id },
          orderBy: { createdAt: "desc" },
          take: 6,
        }),
        db.auditLog.count({
          where: {
            timestamp: { gte: new Date(`${businessDate()}T00:00:00+05:00`) },
            ...(manager ? {} : { userId: actor.id }),
          },
        }),
      ]);
      return Response.json({
        totalCars,
        activeEmployees,
        attendance,
        carsInService,
        expiring: expiring.map((d) => ({
          ...d,
          remainingDays: remainingDays(d.expiryDate),
        })),
        expired,
        tasks,
        services,
        notifications,
        activities,
        date: viewerDate,
        myAttendance:
          attendance.find((a) => a.userId === actor.id) ||
          (await db.attendance.findFirst({
            where: { userId: actor.id, checkOut: null },
            include: { user: employeeInclude },
            orderBy: { checkIn: "desc" },
          })),
      });
    }
    if (resource === "employees") {
      allow(actor, "employees.read");
      if (method === "GET")
        return Response.json(
          await db.user.findMany({
            where: {
              active: true,
              ...(term
                ? { OR: [{ login: contains }, { profile: personSearch }] }
                : {}),
            },
            select: profileSelect,
            orderBy: { createdAt: "desc" },
            take: limit,
            skip,
          }),
        );
      if (method === "POST" && !key)
        return Response.json(await createEmployee(actor, await body(request)), {
          status: 201,
        });
      if (method === "PATCH" && key)
        return Response.json(
          await updateEmployee(actor, id.parse(key), await body(request)),
        );
      if (method === "DELETE" && key)
        return Response.json(await removeEmployee(actor, id.parse(key)));
    }
    if (resource === "days-off") {
      allow(actor, "attendance.write");
      if (method === "POST" && !key)
        return Response.json(await saveDayOff(actor, await body(request)), {
          status: 201,
        });
      if (method === "DELETE" && key)
        return Response.json(await cancelDayOff(actor, id.parse(key)));
      if (method === "GET" && !key) {
        const all = q.get("all") === "1";
        if (all) allow(actor, "attendance.read");
        return Response.json(
          await db.dayOff.findMany({
            where: {
              ...(!all ? { userId: actor.id } : {}),
              date: { gte: dateOnly(businessDate()) },
            },
            include: {
              user: {
                select: {
                  id: true,
                  profile: {
                    select: { firstName: true, lastName: true, phone: true },
                  },
                },
              },
            },
            orderBy: [{ date: "asc" }, { createdAt: "asc" }],
            take: 200,
          }),
        );
      }
    }
    if (resource === "attendance") {
      if (method === "PATCH" && key)
        return Response.json(
          await editAttendance(actor, id.parse(key), await body(request)),
        );
      if (method === "POST" && key === "check-in") {
        allow(actor, "attendance.write");
        return Response.json(await checkIn(actor, await body(request)), {
          status: 201,
        });
      }
      if (method === "POST" && key === "check-out") {
        allow(actor, "attendance.write");
        return Response.json(await checkOut(actor, await body(request)));
      }
      if (method === "GET" && !key)
        return Response.json(
          await db.attendance.findMany({
            where: {
              ...(term ? { user: { profile: personSearch } } : {}),
              ...(!permitted("attendance.read")
                ? { userId: actor.id }
                : q.get("employeeId")
                  ? { userId: id.parse(q.get("employeeId")) }
                  : {}),
              ...(q.get("date")
                ? { date: dateOnly(date.parse(q.get("date"))) }
                : {}),
            },
            include: { user: employeeInclude, office: true },
            orderBy: { checkIn: "desc" },
            take: limit,
            skip,
          }),
        );
    }
    if (resource === "daily-reports") {
      if (method === "POST") {
        allow(actor, "reports.write");
        return Response.json(await addReport(actor, await body(request)), {
          status: 201,
        });
      }
      if (method === "GET")
        return Response.json(
          await db.dailyTask.findMany({
            where: {
              ...(!permitted("reports.read")
                ? { employeeId: actor.id }
                : q.get("employeeId")
                  ? { employeeId: id.parse(q.get("employeeId")) }
                  : {}),
              ...(q.get("date")
                ? { date: dateOnly(date.parse(q.get("date"))) }
                : {}),
              ...(q.get("carId") ? { carId: id.parse(q.get("carId")) } : {}),
              ...(q.get("q")
                ? {
                    description: {
                      contains: q.get("q")!.slice(0, 100),
                      mode: "insensitive",
                    },
                  }
                : {}),
            },
            include: { employee: employeeInclude, car: true },
            orderBy: { createdAt: "desc" },
            take: limit,
            skip,
          }),
        );
    }
    if (resource === "cars") {
      allow(actor, "cars.read");
      if (key) id.parse(key);
      if (key && action === "services") {
        if (method === "POST")
          return Response.json(
            await addService(actor, {
              ...z.record(z.unknown()).parse(await body(request)),
              carId: key,
            }),
            { status: 201 },
          );
        if (method === "GET")
          return Response.json(
            await db.carService.findMany({
              where: { carId: key },
              include: { employee: employeeInclude, serviceType: true },
              orderBy: { date: "desc" },
              take: limit,
              skip,
            }),
          );
      }
      if (method === "GET" && key) {
        const car = await db.car.findUnique({
          where: { id: key },
          include: {
            services: {
              include: { serviceType: true, employee: employeeInclude },
              orderBy: { date: "desc" },
              take: 100,
            },
            documents: permitted("documents.read")
              ? {
                  include: {
                    documentType: true,
                    responsible: employeeInclude,
                    recipients: true,
                  },
                }
              : false,
            statusHistory: {
              include: { employee: employeeInclude },
              orderBy: { createdAt: "desc" },
              take: 100,
            },
          },
        });
        if (!car) throw new AppError(404, "Avtomobil topilmadi");
        return Response.json({
          ...car,
          activity: permitted("audit.read")
            ? await db.auditLog.findMany({
                where: {
                  OR: [
                    { entityType: "Car", entityId: key },
                    { newValue: { path: ["carId"], equals: key } },
                  ],
                },
                include: { user: employeeInclude },
                orderBy: { timestamp: "desc" },
                take: 100,
              })
            : [],
        });
      }
      if (method === "GET")
        return Response.json(
          await db.car.findMany({
            where: {
              ...carWhere((q.get("q") || "").slice(0, 100)),
              ...(q.get("status")
                ? {
                    status: z
                      .enum([
                        "AVAILABLE",
                        "RENTED",
                        "SERVICE",
                        "RESERVED",
                        "UNAVAILABLE",
                        "WITH_OWNER",
                        "CAR_WASH",
                      ])
                      .parse(q.get("status")),
                  }
                : {}),
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            skip,
          }),
        );
      if (method === "POST" && !key)
        return Response.json(await saveCar(actor, await body(request)), {
          status: 201,
        });
      if (method === "PATCH" && key)
        return Response.json(await saveCar(actor, await body(request), key));
      if (method === "DELETE" && key)
        return Response.json(await archiveCar(actor, key));
    }
    if (resource === "services") {
      if (method === "POST")
        return Response.json(await addService(actor, await body(request)), {
          status: 201,
        });
      if (method === "GET") {
        allow(actor, "cars.read");
        return Response.json(
          await db.carService.findMany({
            where: {
              ...(q.get("carId") ? { carId: id.parse(q.get("carId")) } : {}),
              ...(term
                ? {
                    OR: [
                      { serviceType: { name: contains } },
                      { notes: contains },
                      { car: carWhere(term) },
                    ],
                  }
                : {}),
            },
            include: {
              car: true,
              serviceType: true,
              employee: employeeInclude,
            },
            orderBy: { date: "desc" },
            take: limit,
            skip,
          }),
        );
      }
    }
    if (
      resource === "attendance" &&
      key === "report-options" &&
      method === "GET"
    ) {
      return Response.json({
        allowed:
          actor.role.name === "SUPER_ADMIN" ||
          ["direktor", "director"].includes(
            actor.profile?.position.trim().toLowerCase() || "",
          ),
      });
    }
    if (
      resource === "attendance" &&
      key === "send-report" &&
      method === "POST"
    ) {
      if (
        actor.role.name !== "SUPER_ADMIN" &&
        !["direktor", "director"].includes(
          actor.profile?.position.trim().toLowerCase() || "",
        )
      )
        throw new AppError(403, "Faqat bosh administrator va direktor uchun");
      if (!isAttendanceManager(actor))
        throw new AppError(400, "Avval Telegram hisobingizni ulang");
      const input = z
        .object({ date, requestId: z.string().uuid() })
        .strict()
        .parse(await body(request));
      if (input.date > businessDate())
        throw new AppError(
          400,
          "Kelajak sanasi bo‘yicha hisobot olib bo‘lmaydi",
        );
      await rateLimit(`attendance-manual:${actor.id}`, 5, 60000);
      await db.$transaction(
        (tx) =>
          attendanceReport(tx, true, undefined, new Date(), {
            userId: actor.id,
            ...input,
          }),
        { timeout: 60000 },
      );
      return Response.json({ ok: true });
    }
    if (resource === "documents") {
      allow(actor, "documents.read");
      if (key === "send-options" && method === "GET")
        return Response.json(reportAudiences(actor));
      if (key === "send-summary" && method === "POST") {
        await rateLimit(`document-summary:${actor.id}`, 3, 60000);
        const input = z
          .object({
            requestId: z.string().uuid(),
            audience: z.enum(["SELF", "SELF_EMPLOYEES", "ALL"]).default("SELF"),
          })
          .strict()
          .parse(await body(request));
        const result = await db.$transaction(
          (tx) =>
            sendExpirationSummary(
              tx,
              new Date(),
              `${actor.id}:${input.requestId}`,
              reportRecipientWhere(actor, input.audience),
            ),
          { timeout: 60000 },
        );
        return Response.json(result);
      }
      if (key === "send-reminders" && method === "POST") {
        await rateLimit(`document-manual:${actor.id}`, 5, 60000);
        const input = z
          .object({
            documentId: z.string().min(1),
            audience: z.enum(["SELF", "SELF_EMPLOYEES", "ALL"]).default("SELF"),
            requestId: z.string().uuid(),
          })
          .strict()
          .parse(await body(request));
        const result = await db.$transaction(
          (tx) =>
            checkExpirations(
              tx,
              new Date(),
              input.documentId,
              `${actor.id}:${input.requestId}`,
              reportRecipientWhere(actor, input.audience),
            ),
          { timeout: 60000 },
        );
        return Response.json(result);
      }

      if (method === "GET")
        return Response.json(
          await db.carDocument.findMany({
            where: {
              car: { archived: false },
              ...(term
                ? {
                    OR: [
                      { documentType: { name: contains } },
                      { number: contains },
                      { car: carWhere(term) },
                    ],
                  }
                : {}),
              ...(key === "expiring"
                ? {
                    expiryDate: {
                      lte: new Date(
                        dateOnly(businessDate()).getTime() + 7 * 86400000,
                      ),
                    },
                  }
                : {}),
            },
            include: {
              car: true,
              documentType: true,
              responsible: employeeInclude,
              recipients: true,
            },
            orderBy: { expiryDate: "asc" },
            take: limit,
            skip,
          }),
        );
      if (method === "POST")
        return Response.json(await saveDocument(actor, await body(request)), {
          status: 201,
        });
      if (method === "PATCH" && key)
        return Response.json(
          await saveDocument(actor, await body(request), id.parse(key)),
        );
    }
    if (resource === "rentals" && key === "search" && method === "GET") {
      allow(actor, "rentals.read");
      return Response.json(await searchRentals(actor, q));
    }
    if (resource === "notifications") {
      if (key === "pdf" && method === "GET") {
        await rateLimit(`notification-pdf:${actor.id}`, 5, 60000);
        const result = await buildNotificationPdf(
          db,
          actor,
          Object.fromEntries(q),
        );
        return Response.json({
          pdf: result.pdf.toString("base64"),
          filename: result.filename,
        });
      }
      if (key === "send-report" && method === "POST") {
        allow(actor, "notifications.read");
        await rateLimit(`notification-pdf:${actor.id}`, 5, 60000);
        if (!actor.profile?.telegramVerified || !actor.profile.telegramChatId)
          throw new AppError(400, "Avval Telegram hisobingizni ulang");
        const input = z
          .object({
            date: z.string(),
            category: z.string(),
            q: z.string().optional(),
            requestId: z.string().uuid(),
          })
          .parse(await body(request));
        await db.$transaction(
          (tx) =>
            enqueueNotificationPdf(
              tx,
              actor,
              actor.profile!.telegramChatId!,
              input,
              `notification-pdf-web:${actor.id}:${input.requestId}`,
            ),
          { timeout: 20000 },
        );
        return Response.json({ ok: true });
      }
      if (method === "GET" && !key)
        return Response.json(
          await db.notification.findMany({
            omit: { documentData: true },
            where: notificationWhere(actor, Object.fromEntries(q)),
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: limit,
            skip,
          }),
        );
      if (method === "PATCH" && key) {
        const input = z
          .object({ retry: z.boolean().optional() })
          .parse(await body(request));
        const where = {
          id: id.parse(key),
          ...(permitted("settings.write") ? {} : { userId: actor.id }),
        };
        if (input.retry) allow(actor, "settings.write");
        const result = await db.notification.updateMany({
          where: {
            ...where,
            ...(input.retry
              ? {
                  status: {
                    in: ["FAILED", "SKIPPED"] as ("FAILED" | "SKIPPED")[],
                  },
                }
              : {}),
          },
          data: input.retry
            ? { status: "PENDING", attempts: 0, nextAttemptAt: new Date() }
            : { readAt: new Date() },
        });
        return Response.json(result);
      }
    }
    if (resource === "audit-logs" && method === "GET") {
      allow(actor, "audit.read");
      return Response.json(
        await db.auditLog.findMany({
          where: {
            ...(q.get("entityId") ? { entityId: q.get("entityId")! } : {}),
            ...(q.get("q")
              ? {
                  action: {
                    contains: q.get("q")!.slice(0, 100),
                    mode: "insensitive",
                  },
                }
              : {}),
          },
          include: { user: employeeInclude },
          orderBy: { timestamp: "desc" },
          take: limit,
          skip,
        }),
      );
    }
    if (resource === "telegram" && key === "connect" && method === "POST")
      return Response.json(await createLink(actor.id));
    if (resource === "google-sheets") {
      allow(actor, "settings.write");
      if (method === "GET")
        return Response.json(await db.googleSheetsConfig.findMany());
      if (method === "POST" && key === "sync") {
        const { configId } = z
          .object({ configId: id })
          .parse(await body(request));
        const result = await syncSheets(configId);
        await db.$transaction((tx) =>
          audit(
            tx,
            actor.id,
            "SYNC",
            "GoogleSheetsConfig",
            configId,
            undefined,
            result,
          ),
        );
        return Response.json(result);
      }
      if (method === "POST" || method === "PATCH") {
        requireSuperAdmin(actor);
        const input = sheetsInput.parse(await body(request));
        return Response.json(
          await db.$transaction(async (tx) => {
            const row = key
              ? await tx.googleSheetsConfig.update({
                  where: { id: id.parse(key) },
                  data: input,
                })
              : await tx.googleSheetsConfig.create({ data: input });
            await audit(
              tx,
              actor.id,
              "CONFIGURE",
              "GoogleSheetsConfig",
              row.id,
              undefined,
              input,
            );
            return row;
          }),
        );
      }
    }
    if (resource === "settings") {
      if (
        method === "POST" &&
        ["service-types", "document-types"].includes(key)
      )
        allow(actor, "types.write");
      else allow(actor, "settings.write");
      if (method === "GET")
        return Response.json({
          defaultSheetId: process.env.GOOGLE_SHEET_ID || "",
          intervals: (
            await db.systemSetting.findUnique({
              where: { key: "expirationIntervals" },
            })
          )?.value || [7, 3, 1, 0],
          offices: await db.office.findMany(),
          roles: await db.role.findMany(),
          serviceTypes: await db.serviceType.findMany(),
          documentTypes: await db.documentType.findMany(),
        });
      if (method === "POST" && key === "intervals") {
        const { intervals } = z
          .object({
            intervals: z.array(z.number().int().min(0).max(365)).min(1).max(20),
          })
          .parse(await body(request));
        return Response.json(
          await db.$transaction(async (tx) => {
            const old = await tx.systemSetting.findUnique({
              where: { key: "expirationIntervals" },
            });
            const row = await tx.systemSetting.upsert({
              where: { key: "expirationIntervals" },
              create: { key: "expirationIntervals", value: intervals },
              update: { value: intervals },
            });
            await audit(
              tx,
              actor.id,
              "UPDATE",
              "SystemSetting",
              "expirationIntervals",
              old,
              row,
            );
            return row;
          }),
        );
      }
      if (
        method === "POST" &&
        ["service-types", "document-types"].includes(key)
      ) {
        const input = z
          .object({ name: z.string().trim().min(2).max(100) })
          .parse(await body(request));
        return Response.json(
          await db.$transaction(async (tx) => {
            const row =
              key === "service-types"
                ? await tx.serviceType.create({ data: input })
                : await tx.documentType.create({ data: input });
            await audit(tx, actor.id, "CREATE", key, row.id, undefined, input);
            return row;
          }),
        );
      }
      if (method === "POST" && key === "office" && !action) {
        const input = z
          .object({
            name: z.string().trim().min(1).max(100),
            telegramChatId: z
              .string()
              .regex(/^-?\d+$/)
              .nullable()
              .optional(),
          })
          .parse(await body(request));
        return Response.json(
          await db.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(81295)`;
            if (
              await tx.office.findFirst({
                where: { name: { equals: input.name, mode: "insensitive" } },
              })
            )
              throw new AppError(409, "Bu ofis allaqachon mavjud");
            const office = await tx.office.create({ data: input });
            await audit(
              tx,
              actor.id,
              "CREATE",
              "Office",
              office.id,
              undefined,
              office,
            );
            return office;
          }),
          { status: 201 },
        );
      }
      if (method === "PATCH" && key === "office" && action) {
        const input = z
          .object({
            name: z.string().min(1).max(100),
            telegramChatId: z
              .string()
              .regex(/^-?\d+$/)
              .nullable(),
          })
          .parse(await body(request));
        return Response.json(
          await db.$transaction(async (tx) => {
            const old = await tx.office.findUniqueOrThrow({
              where: { id: id.parse(action) },
            });
            const row = await tx.office.update({
              where: { id: action },
              data: input,
            });
            await audit(tx, actor.id, "UPDATE", "Office", action, old, row);
            return row;
          }),
        );
      }
    }
    throw new AppError(404, "So‘ralgan xizmat topilmadi");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function dispatch(request: Request) {
  const response = await handle(request);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
