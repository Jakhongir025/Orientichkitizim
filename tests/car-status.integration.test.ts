import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { profileSelect } from "../src/modules/auth/service";
import {
  updateCarStatus,
  releaseExpiredCars,
} from "../src/modules/cars/status-service";
test(
  "fleet status shares canonical car, enforces roles, deadline and concurrent edits",
  { skip: process.env.RUN_INTEGRATION !== "1" },
  async () => {
    const actor = await db.user.findFirstOrThrow({
      where: { active: true, role: { name: "SUPER_ADMIN" } },
      select: profileSelect,
    });
    const plate = `TEST-${randomUUID()}`;
    const car = await db.car.create({
      data: {
        brand: "Test",
        model: "Fixture",
        year: 2026,
        plateNumber: plate,
        normalizedPlate: plate.toUpperCase(),
        color: "test",
        engine: "test",
        location: "test",
      },
    });
    try {
      const input = {
        status: "RENTED",
        occupiedUntil: new Date(Date.now() + 86400000).toISOString(),
        updatedAt: car.updatedAt.toISOString(),
      };
      await assert.rejects(
        updateCarStatus(
          { ...actor, role: { ...actor.role, name: "EMPLOYEE" } },
          car.id,
          input,
        ),
        { status: 403 },
      );
      await assert.rejects(
        updateCarStatus(actor, car.id, { ...input, occupiedUntil: null }),
        { status: 400 },
      );
      await assert.rejects(
        updateCarStatus(actor, car.id, {
          ...input,
          occupiedUntil: "2020-01-01T00:00:00Z",
        }),
        { status: 400 },
      );
      await updateCarStatus(
        { ...actor, role: { ...actor.role, name: "ADMIN" } },
        car.id,
        input,
      );
      let saved = await db.car.findUniqueOrThrow({ where: { id: car.id } });
      assert.equal(saved.status, "RENTED");
      assert.equal(saved.occupiedUntil?.toISOString(), input.occupiedUntil);
      await assert.rejects(
        updateCarStatus(actor, car.id, {
          ...input,
          updatedAt: "2000-01-01T00:00:00Z",
        }),
        { status: 409 },
      );
      for (const status of ["WITH_OWNER", "CAR_WASH", "SERVICE", "AVAILABLE"]) {
        saved = await updateCarStatus(actor, car.id, {
          status,
          updatedAt: saved.updatedAt.toISOString(),
        });
        assert.equal(saved.status, status);
        assert.equal(saved.occupiedUntil, null);
      }
      assert.equal(
        await db.carStatusHistory.count({ where: { carId: car.id } }),
        5,
      );
      assert.equal(
        await db.auditLog.count({
          where: { entityId: car.id, action: "STATUS_CHANGE" },
        }),
        5,
      );
      await db.car.update({
        where: { id: car.id },
        data: {
          status: "RENTED",
          occupiedUntil: new Date(Date.now() + 3600000),
        },
      });
      await releaseExpiredCars();
      assert.equal(
        (await db.car.findUniqueOrThrow({ where: { id: car.id } })).status,
        "RENTED",
      );
      await db.car.update({
        where: { id: car.id },
        data: { occupiedUntil: new Date(Date.now() - 1000) },
      });
      await Promise.all([releaseExpiredCars(), releaseExpiredCars()]);
      const released = await db.car.findUniqueOrThrow({
        where: { id: car.id },
      });
      assert.equal(released.status, "AVAILABLE");
      assert.equal(released.occupiedUntil, null);
      assert.equal(
        await db.auditLog.count({
          where: { entityId: car.id, action: "AUTO_RELEASE", userId: null },
        }),
        1,
      );
      await releaseExpiredCars();
      assert.equal(
        await db.carStatusHistory.count({
          where: { carId: car.id, employeeId: null },
        }),
        1,
      );
      await db.car.update({
        where: { id: car.id },
        data: { status: "SERVICE", occupiedUntil: new Date(Date.now() - 1000) },
      });
      await releaseExpiredCars();
      assert.equal(
        (await db.car.findUniqueOrThrow({ where: { id: car.id } })).status,
        "SERVICE",
      );
      await db.car.update({
        where: { id: car.id },
        data: { status: "RENTED", occupiedUntil: null },
      });
      await releaseExpiredCars();
      assert.equal(
        (await db.car.findUniqueOrThrow({ where: { id: car.id } })).status,
        "RENTED",
      );
    } finally {
      await db.carStatusHistory.deleteMany({ where: { carId: car.id } });
      await db.auditLog.deleteMany({ where: { entityId: car.id } });
      await db.car.delete({ where: { id: car.id } });
      await db.$disconnect();
    }
  },
);
