import pkg from "bullmq";
const { Queue, Worker, QueueEvents } = pkg;
import { connection } from "./bullmq.config.js";

// Initialize a tenant queue with the specified name
export function initializeTenantQueue(tenantId, queueName) {
  const fullQueueName = `tenant_${tenantId}_${queueName}`;

  // Create a new queue for the tenant
  const taskQueue = new Queue(fullQueueName, { connection });

  // Create a queue scheduler for the tenant to handle delayed and recurring jobs
  // new QueueScheduler(fullQueueName, { connection });

  // Create a worker to process jobs in the queue
  new Worker(
    fullQueueName,
    async (job) => {
      // Process the task (job data will contain the task details)
      console.log(`Processing job for tenant ${tenantId}:`, job.data);

      // Simulate task execution (replace with actual task logic)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log(`Job completed for tenant ${tenantId}:`, job.id);
    },
    { connection }
  );

  return taskQueue;
}

// Pause a queue
export async function pauseQueue(queue) {
  await queue.pause();
}

// Resume a queue
export async function resumeQueue(queue) {
  await queue.resume();
}

// Delete a queue and all its jobs
export async function deleteQueue(queue) {
  await queue.drain();
  await queue.clean(0, 0, "delayed");
  await queue.clean(0, 0, "wait");
  await queue.clean(0, 0, "active");
  await queue.clean(0, 0, "completed");
  await queue.clean(0, 0, "failed");
  await queue.close();
}

// Get all jobs from a queue
export async function getQueueJobs(queue) {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaiting(),
    queue.getActive(),
    queue.getCompleted(),
    queue.getFailed(),
    queue.getDelayed(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
  };
}

// Get a specific job from a queue by ID
export async function getQueueJob(queue, jobId) {
  const job = await queue.getJob(jobId);
  if (!job) {
    return null;
  }

  return {
    id: job.id,
    data: job.data,
    status: job.getState(),
  };
}
