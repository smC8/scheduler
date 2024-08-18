import { Queue, Worker, connection } from "./bullmq.config.js";

// Create a function to initialize a queue for a tenant
export function initializeTenantQueue(tenantId) {
  const queueName = `tenant_${tenantId}_tasks`;

  // Create a new queue for the tenant
  const taskQueue = new Queue(queueName, { connection });

  // Create a worker to process jobs in the queue
  const worker = new Worker(
    queueName,
    async (job) => {
      // Process the task (job data will contain the task details)
      console.log(`Processing job for tenant ${tenantId}:`, job.data);

      // Simulate task execution (replace with actual task logic)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log(`Job completed for tenant ${tenantId}:`, job.id);
    },
    { connection }
  );

  worker.on("completed", (job) => {
    console.log(`${job.id} has completed!`);
  });

  worker.on("failed", (job, err) => {
    console.log(`${job.id} has failed with ${err.message}`);
  });

  return taskQueue;
}
