import sharp from "sharp";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { profileSelect } from "../src/modules/auth/service";
import { editAttendance } from "../src/modules/attendance/service";
import { saveCar } from "../src/modules/cars/service";
test(
  "attendance correction enforces owner access and late reason; image persists on car",
  { skip: process.env.RUN_INTEGRATION !== "1" },
  async () => {
    const owner = await db.user.findUniqueOrThrow({
      where: { login: "superadmin" },
      select: profileSelect,
    });
    const role = await db.role.findUniqueOrThrow({
      where: { name: "EMPLOYEE" },
    });
    const user = await db.user.create({
      data: {
        login: `fix-${randomUUID()}`,
        passwordHash: "unused",
        roleId: role.id,
      },
      select: profileSelect,
    });
    const entry = await db.attendance.create({
      data: {
        userId: user.id,
        officeId: owner.profile!.officeId,
        date: new Date("2020-01-01"),
        checkIn: new Date("2020-01-01T04:00:00Z"),
        status: "ON_TIME",
      },
    });
    let carId = "";
    const input = {
      checkIn: {
        date: "2020-01-01",
        time: "10:05",
        timezone: "Asia/Tashkent",
        lateReason: "Transport",
      },
      checkOut: {
        date: "2020-01-01",
        time: "22:00",
        timezone: "Asia/Tashkent",
      },
      reason: "Xato vaqt tuzatildi",
    };
    try {
      await assert.rejects(editAttendance(user, entry.id, input), {
        status: 403,
      });
      await assert.rejects(
        editAttendance(owner, entry.id, {
          ...input,
          checkIn: { ...input.checkIn, lateReason: "" },
        }),
        { status: 400 },
      );
      const result = await editAttendance(owner, entry.id, input);
      assert.equal(result.status, "LATE");
      assert.equal(result.checkIn.toISOString(), "2020-01-01T05:05:00.000Z");
      assert.equal(
        result.checkInRecordedAt.getTime(),
        entry.checkInRecordedAt.getTime(),
      );
      assert.equal(
        await db.auditLog.count({
          where: { entityId: entry.id, action: "ATTENDANCE_CORRECTION" },
        }),
        1,
      );
      const car = await saveCar(owner, {
        brand: "Test",
        model: "Image",
        year: 2020,
        plateNumber: `T${Date.now()}`,
        color: "White",
        engine: "Test",
        mileage: 0,
        status: "AVAILABLE",
        location: "Test",
        imageData: `data:image/jpeg;base64,${(await sharp({create:{width:20,height:20,channels:3,background:"white"}}).jpeg().toBuffer()).toString("base64")}`,
      });
      carId = car.id;
      assert.equal(
        (await db.car.findUniqueOrThrow({ where: { id: carId } })).imageData,
        car.imageData,
      );
      assert.equal(
        (await saveCar(owner, { imageData: null }, carId)).imageData,
        null,
      );
    } finally {
      await db.auditLog.deleteMany({
        where: { entityId: { in: [entry.id, carId] } },
      });
      if (carId) await db.car.delete({ where: { id: carId } });
      await db.attendance.delete({ where: { id: entry.id } });
      await db.user.delete({ where: { id: user.id } });
      await db.$disconnect();
    }
  },
);
