import { Queue, Worker, connection } from "./bullmq.config.js";

// A Map to store queues associated with different tenants
const queues = new Map();

/**
 * Initialize a tenant's queue.
 *
 * @param {string} tenantId - The ID of the tenant.
 * @param {string} queueName - The name of the scheduler (queue).
 * @returns {Queue} - The created BullMQ queue.
 */
export const initializeTenantQueue = (tenantId, queueName) => {
  const queuName = `${tenantId}-${queueName}`;

  const taskQueue = new Queue(queuName, { connection });

  // Store the queue in the map using a unique key
  queues.set(`${tenantId}:${queueName}`, taskQueue);

  // Create a worker to process jobs
  const worker = new Worker(
    queuName,
    async (job) => {
      // Define job processing logic here
      console.log(
        `Processing job ${job.id} in queue ${queuName} for tenant ${tenantId}`
      );
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
};

/**
 * Pause a BullMQ queue.
 *
 * @param {Queue} queue - The BullMQ queue to pause.
 * @returns {Promise<void>}
 */
export const pauseQueue = async (queue) => {
  await queue.pause();
};

/**
 * Resume a BullMQ queue.
 *
 * @param {Queue} queue - The BullMQ queue to resume.
 * @returns {Promise<void>}
 */
export const resumeQueue = async (queue) => {
  await queue.resume();
};

/**
 * Delete a BullMQ queue.
 *
 * @param {Queue} queue - The BullMQ queue to delete.
 * @returns {Promise<void>}
 */
export const deleteQueue = async (queue) => {
  await queue.close();
  await queue.remove();
};

/**
 * Get all jobs from a BullMQ queue.
 *
 * @param {Queue} queue - The BullMQ queue to retrieve jobs from.
 * @returns {Promise<Array>} - The list of jobs in the queue.
 */
export const getQueueJobs = async (queue) => {
  return await queue.getJobs();
};

/**
 * Get a specific queue by tenantId and queueName.
 * @param {string} tenantId - The ID of the tenant.
 * @param {string} queueName - The name of the queue.
 * @returns {Queue} - The requested queue.
 */
export function getQueue(tenantId, queueName) {
  return queues.get(`${tenantId}:${queueName}`);
}

/**
 * Get all queues.
 * @returns {Map} - A Map of all queues.
 */
export function getAllQueues() {
  return queues;
}

// Export the queues map so other modules can access it
export { queues };
// Additional functions related to job management can go here...
