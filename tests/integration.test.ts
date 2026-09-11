import { PrismaClient } from "@prisma/client";
import assert from "node:assert/strict";
import test from "node:test";
import { encrypt } from "../src/lib/crypto";
import { checkExpirations } from "../src/modules/documents/service";
const enabled = process.env.RUN_INTEGRATION === "1";
const base = process.env.APP_URL || "http://localhost:3000";
const db = new PrismaClient();
async function request(
  path: string,
  method = "GET",
  body?: unknown,
  cookie?: string,
  origin = base,
) {
  const res = await fetch(`${base}/api/${path}`, {
    method,
    headers: {
      origin,
      ...(body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: res.status,
    data: await res.json(),
    cookie: res.headers.get("set-cookie")?.split(";")[0],
    headers: res.headers,
  };
}
test(
  "full-stack authorization, consistency, attendance, search and durable notifications",
  { skip: !enabled },
  async (t) => {
    const suffix = Date.now().toString(36);
    let employeeId = "",
      carId = "",
      configId = "",
      docId = "",
      session = "";
    const notices: string[] = [];
    try {
      await t.test("unauthenticated APIs deny access", async () => {
        assert.equal((await request("cars")).status, 401);
      });
      const admin = await request("auth/login", "POST", {
        login: "superadmin",
        password: process.env.SEED_ADMIN_PASSWORD,
      });
      assert.equal(admin.status, 200);
      assert.ok(admin.cookie);
      session = admin.cookie!;
      assert.match(admin.headers.get("set-cookie") || "", /HttpOnly/i);
      await t.test("CSRF blocks a foreign origin", async () => {
        assert.equal(
          (await request("cars", "POST", {}, session, "https://evil.invalid"))
            .status,
          403,
        );
      });
      await t.test(
        "dashboard and protected pages render authenticated",
        async () => {
          const dashboard = await request(
            "dashboard",
            "GET",
            undefined,
            session,
          );
          assert.equal(dashboard.status, 200);
          assert.ok(dashboard.data.totalCars >= 5);
          for (const path of ["/", "/cars", "/employees", "/settings"]) {
            const response = await fetch(`${base}${path}`, {
              headers: { cookie: session },
            });
            assert.equal(response.status, 200);
            assert.ok((await response.text()).includes("RentCar"));
          }
        },
      );
      const lookup = await request("lookup", "GET", undefined, session);
      const role = lookup.data.roles.find(
        (r: { name: string }) => r.name === "EMPLOYEE",
      );
      const password = "TestOnly!Pass12345";
      const login = `test_${suffix}`;
      const created = await request(
        "employees",
        "POST",
        {
          login,
          password,
          roleId: role.id,
          firstName: "Integration",
          lastName: "Employee",
          phone: "",
          position: "Test",
          officeId: lookup.data.offices[0].id,
        },
        session,
      );
      assert.equal(created.status, 201);
      employeeId = created.data.id;
      assert.ok(!("passwordHash" in created.data));
      const employee = await request("auth/login", "POST", { login, password });
      assert.equal(employee.status, 200);
      const empCookie = employee.cookie!;
      await t.test(
        "native login submits POST and redirects without credentials in URL",
        async () => {
          const response = await fetch(`${base}/api/auth/login`, {
            method: "POST",
            redirect: "manual",
            headers: {
              origin: base,
              "content-type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ login, password }),
          });
          assert.equal(response.status, 303);
          assert.equal(response.headers.get("location"), `${base}/`);
          assert.match(response.headers.get("set-cookie") || "", /HttpOnly/i);
        },
      );
      await t.test(
        "employee cannot manage users or read audit logs",
        async () => {
          assert.equal(
            (await request("employees", "GET", undefined, empCookie)).status,
            403,
          );
          assert.equal(
            (await request("audit-logs", "GET", undefined, empCookie)).status,
            403,
          );
        },
      );
      const car = await request(
        "cars",
        "POST",
        {
          brand: "Integration",
          model: "Test",
          year: 2025,
          plateNumber: `TEST ${suffix.toUpperCase()}`,
          color: "White",
          engine: "Test",
          mileage: 100,
          status: "AVAILABLE",
          location: "Test",
        },
        session,
      );
      assert.equal(car.status, 201);
      carId = car.data.id;
      await t.test(
        "normalized plate uniqueness and partial lookup",
        async () => {
          const duplicate = await request(
            "cars",
            "POST",
            {
              ...car.data,
              vin: undefined,
              legalPlateNumber: undefined,
              notes: undefined,
              plateNumber: car.data.plateNumber
                .replaceAll(" ", "")
                .toLowerCase(),
            },
            session,
          );
          assert.equal(duplicate.status, 409);
          const found = await request(
            `cars?q=${car.data.plateNumber.replaceAll(" ", "").toLowerCase()}`,
            "GET",
            undefined,
            empCookie,
          );
          assert.equal(found.data[0].id, carId);
        },
      );
      await t.test(
        "service gets employee identity from the session and mileage advances",
        async () => {
          const result = await request(
            "services",
            "POST",
            {
              carId,
              serviceTypeId: lookup.data.serviceTypes[0].id,
              date: "2026-09-06",
              mileage: 150,
              notes: "Integration",
              employeeId: created.data.id + "spoof",
            },
            empCookie,
          );
          assert.equal(result.status, 201);
          assert.equal(result.data.employeeId, employeeId);
          assert.equal(
            (await db.car.findUniqueOrThrow({ where: { id: carId } })).mileage,
            150,
          );
        },
      );
      await t.test(
        "manual local check-in is on-time despite later submission; concurrent entries deduplicate",
        async () => {
          assert.equal(
            (
              await request(
                "attendance/check-in",
                "POST",
                {
                  date: "2026-08-29",
                  time: "10:17",
                  timezone: "Asia/Kuala_Lumpur",
                },
                empCookie,
              )
            ).status,
            400,
          );
          const responses = await Promise.all([
            request(
              "attendance/check-in",
              "POST",
              {
                date: "2026-08-29",
                time: "09:54",
                timezone: "Asia/Kuala_Lumpur",
              },
              empCookie,
            ),
            request(
              "attendance/check-in",
              "POST",
              {
                date: "2026-08-29",
                time: "09:54",
                timezone: "Asia/Kuala_Lumpur",
              },
              empCookie,
            ),
          ]);
          assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
          assert.equal(
            await db.attendance.count({ where: { userId: employeeId } }),
            1,
          );
          const attendance = await db.attendance.findFirstOrThrow({
            where: { userId: employeeId },
          });
          assert.equal(attendance.status, "ON_TIME");
          assert.equal(attendance.lateReason, null);
          assert.equal(
            attendance.checkIn.toISOString(),
            "2026-08-29T01:54:00.000Z",
          );
          assert.equal(attendance.checkInTimezone, "Asia/Kuala_Lumpur");
          assert.ok(attendance.checkInRecordedAt > attendance.checkIn);
          const checkout = await request(
            "attendance/check-out",
            "POST",
            {
              date: "2026-08-29",
              time: "22:00",
              timezone: "Asia/Kuala_Lumpur",
            },
            empCookie,
          );
          assert.equal(checkout.status, 200);
          assert.equal(
            (
              await request(
                "attendance/check-out",
                "POST",
                {
                  date: "2026-08-29",
                  time: "22:00",
                  timezone: "Asia/Kuala_Lumpur",
                },
                empCookie,
              )
            ).status,
            400,
          );
        },
      );
      await t.test("report identity cannot be spoofed", async () => {
        const result = await request(
          "daily-reports",
          "POST",
          {
            date: "2026-09-06",
            description: "Integration report",
            carId,
            employeeId: "spoof",
          },
          empCookie,
        );
        assert.equal(result.status, 201);
        assert.equal(result.data.employeeId, employeeId);
      });
      const document = await request(
        "documents",
        "POST",
        {
          carId,
          documentTypeId: lookup.data.documentTypes[0].id,
          number: "TEST",
          startDate: "2026-01-01",
          expiryDate: "2026-09-13",
          responsibleId: employeeId,
          recipientIds: [],
        },
        session,
      );
      assert.equal(document.status, 201);
      docId = document.data.id;
      await t.test(
        "document update changes one record and is audited",
        async () => {
          const updated = await request(
            `documents/${docId}`,
            "PATCH",
            {
              carId,
              documentTypeId: lookup.data.documentTypes[0].id,
              number: "TEST",
              startDate: "2026-01-01",
              expiryDate: "2026-09-20",
              responsibleId: employeeId,
              recipientIds: [],
            },
            session,
          );
          assert.equal(updated.status, 200);
          const logs = await db.auditLog.findMany({
            where: { entityId: docId, action: "UPDATE" },
          });
          assert.equal(logs.length, 1);
          assert.ok(JSON.stringify(logs[0].oldValue).includes("2026-09-13"));
        },
      );
      await t.test(
        "expiration delivery is recipient-scoped and idempotent",
        async () => {
          for (let i = 0; i < 2; i++)
            await db.$transaction((tx) =>
              checkExpirations(tx, new Date("2026-09-13T04:00:00Z"), docId),
            );
          const records = await db.notification.findMany({
            where: { dedupeKey: { startsWith: `document:${docId}:` } },
          });
          assert.equal(records.length, 1);
          assert.equal(records[0].userId, employeeId);
          assert.equal(records[0].status, "SKIPPED");
        },
      );
      const config = await db.googleSheetsConfig.create({
        data: {
          name: `Test ${suffix}`,
          sheetId: "test",
          range: "A2:L",
          mapping: {},
          enabled: false,
        },
      });
      configId = config.id;
      await db.rentalRecord.create({
        data: {
          configId,
          sourceId: "test",
          carId,
          customerName: "Test Customer",
          phone: "123",
          passportEncrypted: encrypt("TEST123"),
          passportDetailsEncrypted: encrypt("Sensitive details"),
          rentalStart: new Date("2026-08-01T00:00:00+05:00"),
          rentalEnd: new Date("2026-08-05T00:00:00+05:00"),
          contractNumber: "TEST",
        },
      });
      await t.test(
        "fine search finds renter and redacts passport for employees",
        async () => {
          const path = `rentals/search?plate=${encodeURIComponent(car.data.plateNumber)}&fineAt=${encodeURIComponent("2026-08-03T15:24:00+05:00")}`;
          const emp = await request(path, "GET", undefined, empCookie);
          assert.equal(emp.data.length, 1);
          assert.ok(!("passport" in emp.data[0]));
          assert.ok(!JSON.stringify(emp.data).includes("Encrypted"));
          const adm = await request(path, "GET", undefined, session);
          assert.equal(adm.data[0].passport, "TEST123");
        },
      );
      await t.test(
        "deactivation revokes existing sessions immediately",
        async () => {
          assert.equal(
            (
              await request(
                `employees/${employeeId}`,
                "PATCH",
                { active: false },
                session,
              )
            ).status,
            200,
          );
          assert.equal(
            (await request("me", "GET", undefined, empCookie)).status,
            401,
          );
        },
      );
    } finally {
      // Only remove records created by this test, preserving seed and user data.
      if (employeeId) {
        await db.notification.deleteMany({ where: { userId: employeeId } });
        await db.auditLog.deleteMany({
          where: {
            OR: [
              { userId: employeeId },
              { entityId: { in: [employeeId, carId, docId, configId] } },
            ],
          },
        });
        await db.attendance.deleteMany({ where: { userId: employeeId } });
        await db.dailyTask.deleteMany({ where: { employeeId } });
        await db.carService.deleteMany({ where: { employeeId } });
      }
      if (docId) await db.carDocument.delete({ where: { id: docId } });
      if (configId) {
        await db.rentalRecord.deleteMany({ where: { configId } });
        await db.googleSheetsConfig.delete({ where: { id: configId } });
      }
      if (carId) await db.car.delete({ where: { id: carId } });
      if (employeeId) {
        await db.employeeProfile.delete({ where: { userId: employeeId } });
        await db.user.delete({ where: { id: employeeId } });
      }
      if (session) await request("auth/logout", "POST", {}, session);
      await db.$disconnect();
    }
  },
);
