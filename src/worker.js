import { Worker, connection } from "./bullmq.config.js";
// import { queues } from "./scheduler.js";
import { loadQueues } from "./scheduler.js";

/**
 * Initialize workers for all existing queues.
 */
export async function initializeWorkers() {
  const queues = await loadQueues();

  queues.forEach((queue, key) => {
    const worker = new Worker(
      queue.name,
      async (job) => {
        // Process the job here
        console.log(`Processing job ${job.id} from queue ${queue.name}`);
        // Add job processing logic here
      },
      { connection }
    );

    worker.on("completed", (job) => {
      console.log(`Job ${job.id} has been completed`);
    });

    worker.on("failed", (job, err) => {
      console.error(`Job ${job.id} failed with error ${err.message}`);
    });
  });
}
