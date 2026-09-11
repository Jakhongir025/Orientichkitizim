import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { businessDate, dateOnly, normalizePlate } from "../src/lib/time";
import { permissions } from "../src/modules/auth/permissions";
const db = new PrismaClient();
async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Development seed is disabled in production");
  const adminPassword = process.env.SEED_ADMIN_PASSWORD,
    employeePassword = process.env.SEED_EMPLOYEE_PASSWORD;
  if (
    !adminPassword ||
    adminPassword.length < 12 ||
    !employeePassword ||
    employeePassword.length < 12
  )
    throw new Error(
      "Set SEED_ADMIN_PASSWORD and SEED_EMPLOYEE_PASSWORD with at least 12 characters",
    );
  for (const [name, grants] of Object.entries(permissions))
    await db.role.upsert({
      where: { name },
      create: { name, permissions: grants },
      update: { permissions: grants },
    });
  const office = await db.office.upsert({
    where: { id: "cseedoffice000000000000001" },
    create: {
      id: "cseedoffice000000000000001",
      name: "Toshkent ofisi",
      telegramChatId: process.env.TELEGRAM_ADMIN_CHAT_ID || null,
    },
    update: {},
  });
  const users = [
    {
      login: "superadmin",
      firstName: "Jaxongir",
      lastName: "Abdurazoqov",
      position: "Community Manager",
      role: "SUPER_ADMIN",
    },
    {
      login: "aziz",
      firstName: "Aziz",
      lastName: "Karimov",
      position: "Menejer",
      role: "EMPLOYEE",
    },
    {
      login: "sardor",
      firstName: "Sardor",
      lastName: "Aliyev",
      position: "Mexanik",
      role: "EMPLOYEE",
    },
    {
      login: "madina",
      firstName: "Madina",
      lastName: "Rahimova",
      position: "Operator",
      role: "EMPLOYEE",
    },
  ];
  for (const u of users) {
    const role = await db.role.findUniqueOrThrow({ where: { name: u.role } });
    await db.user.upsert({
      where: { login: u.login },
      update: {},
      create: {
        login: u.login,
        passwordHash: await bcrypt.hash(
          u.role === "SUPER_ADMIN" ? adminPassword : employeePassword,
          12,
        ),
        roleId: role.id,
        profile: {
          create: {
            firstName: u.firstName,
            lastName: u.lastName,
            position: u.position,
            phone: "+998 90 000 00 00",
            officeId: office.id,
          },
        },
      },
    });
  }
  const employee = await db.user.findUniqueOrThrow({
      where: { login: "aziz" },
    }),
    sardor = await db.user.findUniqueOrThrow({ where: { login: "sardor" } });
  for (const name of [
    "Engine Oil Change",
    "Oil Filter",
    "Air Filter",
    "Brake Pads",
    "Tire Change",
    "Battery Change",
    "Car Wash",
    "Detailing",
    "Repair",
    "Diagnostics",
    "Other",
  ])
    await db.serviceType.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  for (const name of ["Rental Agreement", "Insurance", "Tint Permit", "Other"])
    await db.documentType.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  const entries = [
    {
      brand: "Mercedes-Benz",
      model: "GLS 450",
      plateNumber: "01 A 038 AA",
      year: 2023,
      color: "Qora",
      engine: "3.0 turbo",
      mileage: 52800,
      status: "RENTED" as const,
    },
    {
      brand: "Li Auto",
      model: "L9",
      plateNumber: "01 B 777 LA",
      year: 2024,
      color: "Kulrang",
      engine: "Hybrid",
      mileage: 18240,
      status: "AVAILABLE" as const,
    },
    {
      brand: "Toyota",
      model: "Land Cruiser 200",
      plateNumber: "786 APS",
      year: 2021,
      color: "Oq",
      engine: "4.6 V8",
      mileage: 74200,
      status: "SERVICE" as const,
    },
    {
      brand: "BMW",
      model: "X7",
      plateNumber: "01 X 007 AA",
      year: 2024,
      color: "Qora",
      engine: "3.0 turbo",
      mileage: 26300,
      status: "RESERVED" as const,
    },
    {
      brand: "Kia",
      model: "Carnival",
      plateNumber: "01 C 555 KA",
      year: 2023,
      color: "Oq",
      engine: "3.5 V6",
      mileage: 31500,
      status: "AVAILABLE" as const,
    },
  ];
  const day = businessDate();
  const start = dateOnly(day);
  const insurance = await db.documentType.findUniqueOrThrow({
      where: { name: "Insurance" },
    }),
    service = await db.serviceType.findUniqueOrThrow({
      where: { name: "Engine Oil Change" },
    });
  for (let n = 0; n < entries.length; n++) {
    const entry = entries[n];
    const car = await db.car.upsert({
      where: { normalizedPlate: normalizePlate(entry.plateNumber) },
      create: {
        ...entry,
        normalizedPlate: normalizePlate(entry.plateNumber),
        location: "Toshkent ofisi",
      },
      update: {},
    });
    const expiry = new Date(start.getTime() + [3, 7, 1, -2, 6][n] * 86400000);
    const documentId = `cseeddocument${String(n).padStart(13, "0")}`;
    await db.carDocument.upsert({
      where: { id: documentId },
      create: {
        id: documentId,
        carId: car.id,
        documentTypeId: insurance.id,
        number: `DEMO-INS-2026-${n + 1}`,
        company: "Demo Insurance",
        startDate: new Date(start.getTime() - 300 * 86400000),
        expiryDate: expiry,
        responsibleId: employee.id,
      },
      update: {},
    });
    const serviceId = `cseedservice${String(n).padStart(14, "0")}`;
    await db.carService.upsert({
      where: { id: serviceId },
      create: {
        id: serviceId,
        carId: car.id,
        employeeId: employee.id,
        serviceTypeId: service.id,
        date: new Date(start.getTime() - n * 86400000),
        mileage: entry.mileage,
        notes: n === 0 ? "Mobil 1 5W-30" : "Development demo record",
      },
      update: {},
    });
  }
  for (const [user, time, status, lateReason] of [
    [employee, "09:54", "ON_TIME", null],
    [sardor, "10:03", "LATE", "Transport tirbandligi"],
  ] as const)
    await db.attendance.upsert({
      where: { userId_date: { userId: user.id, date: start } },
      create: {
        userId: user.id,
        officeId: office.id,
        date: start,
        checkIn: new Date(`${day}T${time}:00+05:00`),
        status,
        lateReason,
      },
      update: {},
    });
  await db.dailyTask.upsert({
    where: { id: "cseedtask00000000000000001" },
    create: {
      id: "cseedtask00000000000000001",
      employeeId: employee.id,
      date: start,
      description:
        "Avtomobil mijozga topshirildi va texnik holati tekshirildi.",
    },
    update: {},
  });
  await db.systemSetting.upsert({
    where: { key: "expirationIntervals" },
    create: { key: "expirationIntervals", value: [7, 3, 1, 0] },
    update: {},
  });
  console.info(
    "Seed complete. Logins: superadmin, aziz, sardor, madina. Passwords are the configured seed values.",
  );
}
main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Seed failed");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
