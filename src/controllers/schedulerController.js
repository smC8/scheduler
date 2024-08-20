import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter.js";
import { ExpressAdapter } from "@bull-board/express";
import Redis from "ioredis";
import {
  initializeTenantQueue,
  initializeWorker,
  pauseQueue,
  resumeQueue,
  deleteQueue,
  getQueueJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob,
  pauseJob,
  resumeJob,
} from "../scheduler.js";

const redis = new Redis();
const queuesMap = new Map();

// Setup Bull-Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

const { addQueue } = createBullBoard({
  queues: Array.from(queuesMap.values()).map(
    (queue) => new BullMQAdapter(queue)
  ),
  serverAdapter: serverAdapter,
});

/**
 * Load tenant queues from Redis and populate the queuesMap.
 * @returns {Promise<void>}
 */
export async function loadQueuesFromRedis() {
  const tenantQueueKeys = await redis.keys("tenantQueue:*");
  for (const key of tenantQueueKeys) {
    const tenantId = key.split(":")[1];
    const queueNames = await redis.smembers(key);

    if (!queuesMap.has(tenantId)) {
      queuesMap.set(tenantId, new Map());
    }
    // console.log("QueueMAP for board=========", queuesMap);

    for (const queueName of queueNames) {
      const queue = await initializeTenantQueue(tenantId, queueName);
      // console.log("queue=======", queue);
      queuesMap.get(tenantId).set(queueName, queue);
      // console.log(
      //   "queueMAP get=======",
      //   queuesMap.get(tenantId).set(queueName, queue)
      // );

      // Add the queue to Bull-Board
      addQueue(new BullMQAdapter(queue));
    }
  }
}

// Call this function when the application starts to load existing queues.
// loadQueuesFromRedis();

/**
 * List all schedulers for a tenant.
 *
 * @param {Object} req - The request object.
 * @param {string} req.params.tenantId - The ID of the tenant.
 * @param {Object} res - The response object.
 * @returns {void}
 */
export const listSchedulers = (req, res) => {
  const { tenantId } = req.params;
  if (!queuesMap.has(tenantId)) {
    return res.status(404).json({ message: "Tenant not found" });
  }
  const tenantQueues = queuesMap.get(tenantId);
  res.status(200).json([...tenantQueues.keys()]);
};

/**
 * Get an existing scheduler and its jobs.
 *
 * @param {Object} req - The request object.
 * @param {string} req.params.tenantId - The ID of the tenant.
 * @param {string} req.params.queueName - The name of the scheduler.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
export const getScheduler = async (req, res) => {
  const { tenantId, queueName } = req.params;
  if (!queuesMap.has(tenantId) || !queuesMap.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }
  const queue = queuesMap.get(tenantId).get(queueName);
  const jobs = await getQueueJobs(queue);
  res.status(200).json(jobs);
};

/**
 * Create a new scheduler for a tenant.
 *
 * @param {Object} req - The request object.
 * @param {string} req.params.tenantId - The ID of the tenant.
 * @param {Object} req.body - The request body.
 * @param {string} req.body.queueName - The name of the scheduler to create.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
export const createScheduler = async (req, res) => {
  const { tenantId } = req.params;
  const { queueName } = req.body;

  if (!queuesMap.has(tenantId)) {
    queuesMap.set(tenantId, new Map());
  }
  if (queuesMap.get(tenantId).has(queueName)) {
    return res.status(400).json({ message: "Scheduler already exists" });
  }

  const queue = await initializeTenantQueue(tenantId, queueName);
  // console.log("Q====", queue);
  queuesMap.get(tenantId).set(queueName, queue);

  // Persist the queue information in Redis
  await redis.sadd(`tenantQueue:${tenantId}`, queueName);

  // Initialize worker for the new queue
  initializeWorker(queue);

  // Update Bull-Board with the new queue
  addQueue(new BullMQAdapter(queue));

  res.status(201).json({ message: "Scheduler created successfully" });
};

/**
 * Update an existing scheduler for a tenant.
 *
 * @param {Object} req - The request object.
 * @param {string} req.params.tenantId - The ID of the tenant.
 * @param {string} req.params.queueName - The name of the scheduler.
 * @param {Object} req.body - The request body.
 * @param {string} req.body.newQueueName - The new name of the scheduler.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
export const updateScheduler = async (req, res) => {
  const { tenantId, queueName } = req.params;
  const { newQueueName } = req.body;

  if (!queuesMap.has(tenantId) || !queuesMap.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }

  // Pause the existing scheduler
  const queue = await queuesMap.get(tenantId).get(queueName);
  await pauseQueue(queue);

  // Rename the queue in the map
  const updatedQueue = initializeTenantQueue(tenantId, newQueueName);
  queuesMap.get(tenantId).delete(queueName);
  queuesMap.get(tenantId).set(newQueueName, updatedQueue);

  // Update Redis with the new queue name
  await redis.srem(`tenantQueue:${tenantId}`, queueName);
  await redis.sadd(`tenantQueue:${tenantId}`, newQueueName);

  res.status(200).json({ message: "Scheduler updated successfully" });
};

/**
 * Delete a scheduler for a tenant.
 *
 * @param {Object} req - The request object.
 * @param {string} req.params.tenantId - The ID of the tenant.
 * @param {string} req.params.queueName - The name of the scheduler.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
export const deleteScheduler = async (req, res) => {
  const { tenantId, queueName } = req.params;

  if (!queuesMap.has(tenantId) || !queuesMap.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }

  const queue = queuesMap.get(tenantId).get(queueName);
  await deleteQueue(queue);
  queuesMap.get(tenantId).delete(queueName);

  // Remove the queue information from Redis
  await redis.srem(`tenantQueue:${tenantId}`, queueName);

  res.status(200).json({ message: "Scheduler deleted successfully" });
};

/**
 * Pause a scheduler for a tenant.
 *
 * @param {Object} req - The request object.
 * @param {string} req.params.tenantId - The ID of the tenant.
 * @param {string} req.params.queueName - The name of the scheduler.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
export const pauseScheduler = async (req, res) => {
  const { tenantId, queueName } = req.params;

  if (!queuesMap.has(tenantId) || !queuesMap.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }

  const queue = queuesMap.get(tenantId).get(queueName);
  await pauseQueue(queue);

  res.status(200).json({ message: "Scheduler paused successfully" });
};

/**
 * Resume a scheduler for a tenant.
 *
 * @param {Object} req - The request object.
 * @param {string} req.params.tenantId - The ID of the tenant.
 * @param {string} req.params.queueName - The name of the scheduler.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
export const resumeScheduler = async (req, res) => {
  const { tenantId, queueName } = req.params;

  if (!queuesMap.has(tenantId) || !queuesMap.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }

  const queue = queuesMap.get(tenantId).get(queueName);
  await resumeQueue(queue);

  res.status(200).json({ message: "Scheduler resumed successfully" });
};

/**
 * List all jobs of a scheduler.
 *
 * @param {Object} req - The request object.
 * @param {string} req.params.tenantId - The ID of the tenant.
 * @param {string} req.params.queueName - The name of the scheduler.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
export const listJobs = async (req, res) => {
  const { tenantId, queueName } = req.params;

  if (!queuesMap.has(tenantId) || !queuesMap.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }

  const queue = queuesMap.get(tenantId).get(queueName);
  const jobs = await getQueueJobs(queue);

  res.status(200).json(jobs);
};

/**
 * Get details of a specific job.
 *
 * @param {Object} req - The request object.
 * @param {string} req.params.tenantId - The ID of the tenant.
 * @param {string} req.params.queueName - The name of the scheduler.
 * @param {string} req.params.jobId - The ID of the job.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
export const getJobDetails = async (req, res) => {
  const { tenantId, queueName, jobId } = req.params;

  if (!queuesMap.has(tenantId) || !queuesMap.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }

  const queue = queuesMap.get(tenantId).get(queueName);
  const job = await getJob(queue, jobId);

  if (!job) {
    return res.status(404).json({ message: "Job not found" });
  }

  res.status(200).json(job);
};

/**
 * Create a new job in a scheduler.
 *
 * @param {Object} req - The request object.
 * @param {string} req.params.tenantId - The ID of the tenant.
 * @param {string} req.params.queueName - The name of the scheduler.
 * @param {Object} req.body - The request body containing job details.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
export const createJobInScheduler = async (req, res) => {
  const { tenantId, queueName } = req.params;
  const { jobName, jobData, scheduleTime, cron, limit } = req.body;

  if (!queuesMap.has(tenantId) || !queuesMap.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }

  const queue = await queuesMap.get(tenantId).get(queueName);
  // console.log("queuemap========", queuesMap);
  const job = await createJob(
    queue,
    jobName,
    jobData,
    scheduleTime,
    cron,
    limit
  );
  // const job = await queue.add("task", jobData);
  // x = job.toJSON();

  res.status(201).json(job);
};

/**
 * Update an existing job in a scheduler.
 *
 * @param {Object} req - The request object.
 * @param {string} req.params.tenantId - The ID of the tenant.
 * @param {string} req.params.queueName - The name of the scheduler.
 * @param {string} req.params.jobId - The ID of the job.
 * @param {Object} req.body - The request body containing updated job details.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
export const updateJobInScheduler = async (req, res) => {
  const { tenantId, queueName, jobId } = req.params;
  const { jobName, jobData, scheduleTime, cron, limit } = req.body;

  if (!queuesMap.has(tenantId) || !queuesMap.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }

  const queue = await queuesMap.get(tenantId).get(queueName);
  const updatedJob = await updateJob(
    queue,
    jobId,
    jobName,
    jobData,
    scheduleTime,
    cron,
    limit
  );

  if (!updatedJob) {
    return res.status(404).json({ message: "Job not found" });
  }

  res.status(200).json(updatedJob);
};

/**
 * Delete a job from a scheduler.
 *
 * @param {Object} req - The request object.
 * @param {string} req.params.tenantId - The ID of the tenant.
 * @param {string} req.params.queueName - The name of the scheduler.
 * @param {string} req.params.jobId - The ID of the job.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
export const deleteJobFromScheduler = async (req, res) => {
  const { tenantId, queueName, jobId } = req.params;

  if (!queuesMap.has(tenantId) || !queuesMap.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }

  const queue = queuesMap.get(tenantId).get(queueName);
  const success = await deleteJob(queue, jobId);

  if (!success) {
    return res.status(404).json({ message: "Job not found" });
  }

  res.status(200).json({ message: "Job deleted successfully" });
};

/**
 * Pause a job in a scheduler.
 *
 * @param {Object} req - The request object.
 * @param {string} req.params.tenantId - The ID of the tenant.
 * @param {string} req.params.queueName - The name of the scheduler.
 * @param {string} req.params.jobId - The ID of the job.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
export const pauseJobInScheduler = async (req, res) => {
  const { tenantId, queueName, jobId } = req.params;

  if (!queuesMap.has(tenantId) || !queuesMap.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }

  const queue = queuesMap.get(tenantId).get(queueName);
  const success = await pauseJob(queue, jobId);

  if (!success) {
    return res.status(404).json({ message: "Job not found" });
  }

  res.status(200).json({ message: "Job paused successfully" });
};

/**
 * Resume a paused job in a scheduler.
 *
 * @param {Object} req - The request object.
 * @param {string} req.params.tenantId - The ID of the tenant.
 * @param {string} req.params.queueName - The name of the scheduler.
 * @param {string} req.params.jobId - The ID of the job.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
export const resumeJobInScheduler = async (req, res) => {
  const { tenantId, queueName, jobId } = req.params;

  if (!queuesMap.has(tenantId) || !queuesMap.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }

  const queue = queuesMap.get(tenantId).get(queueName);
  const success = await resumeJob(queue, jobId);

  if (!success) {
    return res.status(404).json({ message: "Job not found" });
  }

  res.status(200).json({ message: "Job resumed successfully" });
};

/**
 * Expose the Bull-Board router for the UI.
 */
export function getBullBoardRouter() {
  return serverAdapter.getRouter();
}
