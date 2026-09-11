import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { dateOnly } from "@/lib/time";
import { reportInput } from "@/lib/validation";
import { Actor } from "@/modules/auth/service";
export async function addReport(actor: Actor, raw: unknown) {
  const input = reportInput.parse(raw);
  return db.$transaction(async (tx) => {
    const task = await tx.dailyTask.create({
      data: {
        ...input,
        date: dateOnly(input.date),
        carId: input.carId || null,
        employeeId: actor.id,
      },
    });
    await audit(tx, actor.id, "CREATE", "DailyTask", task.id, undefined, task);
    return task;
  });
}
