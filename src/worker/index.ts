import { releaseExpiredCars } from "@/modules/cars/status-service";
import { db } from "@/lib/db";
import { logger } from "@/lib/errors";
import { deliverNotifications, pollTelegram } from "@/modules/telegram/service";
import { scheduledTick } from "./scheduler";
let stopping = false;
process.on("SIGTERM", () => {
  stopping = true;
});
process.on("SIGINT", () => {
  stopping = true;
});
async function main() {
  logger.info("worker_started");
  while (!stopping) {
    for (const job of [
      releaseExpiredCars,
      scheduledTick,
      deliverNotifications,
      pollTelegram,
    ]) {
      try {
        await job();
      } catch {
        logger.error("worker_job_failed");
      }
    }
    for (let n = 0; n < 30 && !stopping; n++)
      await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  await db.$disconnect();
}
main().catch(() => {
  logger.error("worker_fatal");
  process.exitCode = 1;
});
