import { Queue, Worker } from "bullmq";
import { redis } from "../lib/redis";
import { logger } from "../lib/logger";

export const archiveQueue = new Queue("archive", { connection: redis as any });

export function startWorkers(): void {
  new Worker(
    "archive",
    async (job) => {
      logger.info({ jobId: job.id, name: job.name }, "Processing archive job");
      switch (job.name) {
        case "archive:session":
          // Stub for archival logic
          logger.info(`Archiving session ${job.data.sessionKey}`);
          break;
        case "enrich:session":
          // Stub for Python enrichment
          logger.info(`Enriching session ${job.data.sessionKey}`);
          break;
      }
    },
    { connection: redis as any, concurrency: 1 }
  );

  logger.info("BullMQ workers started");
}
