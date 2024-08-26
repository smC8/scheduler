import { Queue, connection } from "../config/bullmq.config.js";

// A Map to store queues associated with different tenants
const queues = new Map();

/**
 * Initialize a tenant's queue.
 *
 * @param {string} tenantId - The ID of the tenant.
 * @param {string} queueName - The name of the scheduler (queue).
 * @returns {Queue} - The created BullMQ queue.
 */
export async function initializeTenantQueue(tenantId, queueName) {
  const queuName = `${tenantId}-${queueName}`;

  const taskQueue = new Queue(queuName, { connection });
  // console.log('connection-----', connection)

  // Store the queue in the map using a unique key
  queues.set(`${tenantId}:${queueName}`, taskQueue);
  // console.log("queues======", queues);

  // Persist the queue mapping in Redis
  await connection.hset("tenantQueues", `${tenantId}:${queueName}`, queuName);

  return taskQueue;
}

/**
 * Loads all queues from Redis.
 * @returns {Map} - A Map of all queues.
 */
export async function loadQueues() {
  const tenantQueues = await connection.hgetall("tenantQueues");
  // const queues = new Map();

  for (const key in tenantQueues) {
    // Re-instantiate the queue as a BullMQ Queue instance
    const queueName = tenantQueues[key];
    const queue = new Queue(queueName, { connection });
    queues.set(key, queue);
  }
  console.log("QueueMAP for board=========", queues.size);

  return queues;
}

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
export const deleteQueue = async (queue, tenantId, queueName) => {
  await queue.close();
  // await queue.remove();
  // Removes everything but only if there are no active jobs (unnless overridden, as shown here)
  await queue.obliterate({ force: true });

  // Remove the queue mapping from Redis
  await connection.hdel("tenantQueues", `${tenantId}:${queueName}`);
  // Remove the queue information from Redis
  await connection.srem(`tenantQueue:${tenantId}`, queueName);
  // Remove other redis keys associated w/ this queue

  // Remove the queue from the map using the unique key
  queues.delete(`${tenantId}:${queueName}`);
  // console.log("queues======", queues);
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

// Job management functions

/**
 * Get a job by ID.
 *
 * @param {Queue} queue - The queue to which the job belongs.
 * @param {string} jobId - The ID of the job.
 * @returns {Promise<Object|null>} - The job details or null if not found.
 */
export const getJob = async (queue, jobId) => {
  const job = await queue.getJob(jobId);
  return job ? job.toJSON() : null;
};

/**
 * Create a new job in a queue.
 *
 * @param {Queue} queue - The queue to which the job should be added.
 * @param {Object} jobData - The data for the new job.
 * @returns {Promise<Object>} - The created job.
 */
export const createJob = async (
  queue,
  jobName,
  jobData,
  scheduleTime,
  cron,
  limit
) => {
  // Check if the queue is a valid BullMQ Queue instance
  if (!(queue instanceof Queue)) {
    throw new Error("Invalid queue instance", queue);
  }
  // const job = await queue.add("task", jobData);
  // return job.toJSON();
  // Add the job to the queue with the specified options
  try {
    // const job = await queue.add(jobName, jobData);
    let job;
    if (cron) {
      job = await queue.add(jobName, jobData, {
        repeat: { cron, limit },
      });
    } else {
      job = await queue.add(jobName, jobData, {
        delay: new Date(scheduleTime) - new Date(),
      });
    }
    return job.toJSON();
  } catch (error) {
    console.error("Error adding job to queue:", error);
    throw new Error("Failed to add job to the queue");
  }
};

/**
 * Update a job in a queue.
 *
 * @param {Queue} queue - The queue to which the job belongs.
 * @param {string} jobId - The ID of the job to update.
 * @param {Object} jobData - The updated job data.
 * @returns {Promise<Object|null>} - The updated job details or null if not found.
 */
export const updateJob = async (
  queue,
  jobId,
  jobName,
  jobData,
  scheduleTime,
  cron,
  limit
) => {
  const job = await queue.getJob(jobId);
  if (job) {
    await job.update({
      name: jobName,
      data: jobData,
      opts: cron
        ? { repeat: { cron, limit } }
        : { delay: new Date(scheduleTime) - new Date() },
    });
    return job.toJSON();
  }
  return null;
};

/**
 * Delete a job from a queue.
 *
 * @param {Queue} queue - The queue to which the job belongs.
 * @param {string} jobId - The ID of the job to delete.
 * @returns {Promise<boolean>} - True if the job was deleted, false otherwise.
 */
export const deleteJob = async (queue, jobId) => {
  const job = await queue.getJob(jobId);
  if (job) {
    await job.remove();
    return true;
  }
  return false;
};

/**
 * Pause a job in a queue.
 *
 * @param {Queue} queue - The queue to which the job belongs.
 * @param {string} jobId - The ID of the job to pause.
 * @returns {Promise<boolean>} - True if the job was paused, false otherwise.
 */
export const pauseJob = async (queue, jobId) => {
  const job = await queue.getJob(jobId);
  if (job) {
    await job.pause();
    return true;
  }
  return false;
};

/**
 * Resume a paused job in a queue.
 *
 * @param {Queue} queue - The queue to which the job belongs.
 * @param {string} jobId - The ID of the job to resume.
 * @returns {Promise<boolean>} - True if the job was resumed, false otherwise.
 */
export const resumeJob = async (queue, jobId) => {
  const job = await queue.getJob(jobId);
  if (job) {
    await job.resume();
    return true;
  }
  return false;
};

// Export the queues map so other modules can access it
export { queues };
