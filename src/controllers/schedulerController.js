import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter.js";
import { ExpressAdapter } from "@bull-board/express";
import {
  initializeTenantQueue,
  pauseQueue,
  resumeQueue,
  deleteQueue,
  getQueueJobs,
} from "../scheduler.js";

const queues = new Map();
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");
const queueArray = [];
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
  if (!queues.has(tenantId)) {
    return res.status(404).json({ message: "Tenant not found" });
  }
  const tenantQueues = queues.get(tenantId);
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
  if (!queues.has(tenantId) || !queues.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }
  const queue = queues.get(tenantId).get(queueName);
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
 * @returns {void}
 */
export const createScheduler = (req, res) => {
  const { tenantId } = req.params;
  // console.log("tennantid =======", req.params.tenantId);
  const { queueName } = req.body;
  if (!queues.has(tenantId)) {
    queues.set(tenantId, new Map());
  }
  if (queues.get(tenantId).has(queueName)) {
    return res.status(400).json({ message: "Scheduler already exists" });
  }
  const queue = initializeTenantQueue(tenantId, queueName);
  queues.get(tenantId).set(queueName, queue);
  queueArray.push(new BullMQAdapter(queue));

  const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
    queues: queueArray,
    serverAdapter: serverAdapter,
  });

  res.status(201).json({ message: "Scheduler created successfully" });
};

/**
 * Create a new scheduler for a tenant.
 *
 * @param {Object} req - The request object.
 * @param {string} req.params.tenantId - The ID of the tenant.
 * @param {Object} req.body - The request body.
 * @param {string} req.body.queueName - The name of the scheduler to create.
 * @param {Object} res - The response object.
 * @returns {void}
 */
export const updateScheduler = async (req, res) => {
  const { tenantId, queueName } = req.params;
  const { newQueueName } = req.body;

  if (!queues.has(tenantId) || !queues.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }

  // Pause the existing scheduler
  const queue = queues.get(tenantId).get(queueName);
  await pauseQueue(queue);

  // Rename the queue in the map
  const updatedQueue = initializeTenantQueue(tenantId, newQueueName);
  queues.get(tenantId).delete(queueName);
  queues.get(tenantId).set(newQueueName, updatedQueue);

  res.status(200).json({ message: "Scheduler updated successfully" });
};

export const deleteScheduler = async (req, res) => {
  const { tenantId, queueName } = req.params;

  if (!queues.has(tenantId) || !queues.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }

  const queue = queues.get(tenantId).get(queueName);
  await deleteQueue(queue);
  queues.get(tenantId).delete(queueName);

  res.status(200).json({ message: "Scheduler deleted successfully" });
};

export const pauseScheduler = async (req, res) => {
  const { tenantId, queueName } = req.params;

  if (!queues.has(tenantId) || !queues.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }

  const queue = queues.get(tenantId).get(queueName);
  await pauseQueue(queue);

  res.status(200).json({ message: "Scheduler paused successfully" });
};

export const resumeScheduler = async (req, res) => {
  const { tenantId, queueName } = req.params;

  if (!queues.has(tenantId) || !queues.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }

  const queue = queues.get(tenantId).get(queueName);
  await resumeQueue(queue);

  res.status(200).json({ message: "Scheduler resumed successfully" });
};

export const listJobs = async (req, res) => {
  const { tenantId, queueName } = req.params;

  if (!queues.has(tenantId) || !queues.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }

  const queue = queues.get(tenantId).get(queueName);
  const jobs = await queue.getJobs();
  res.status(200).json(jobs);
};

export const getJob = async (req, res) => {
  const { tenantId, queueName, jobId } = req.params;

  if (!queues.has(tenantId) || !queues.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }

  const queue = queues.get(tenantId).get(queueName);
  const job = await queue.getJob(jobId);

  if (!job) {
    return res.status(404).json({ message: "Job not found" });
  }

  res.status(200).json(job);
};

export const createJob = async (req, res) => {
  const { tenantId, queueName } = req.params;
  const { jobName, jobData, scheduleTime, cron, limit } = req.body;

  if (!queues.has(tenantId) || !queues.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }

  const queue = queues.get(tenantId).get(queueName);

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

  res.status(201).json(job);
};

export const updateJob = async (req, res) => {
  const { tenantId, queueName, jobId } = req.params;
  const { jobName, jobData, scheduleTime, cron, limit } = req.body;

  if (!queues.has(tenantId) || !queues.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }

  const queue = queues.get(tenantId).get(queueName);
  const job = await queue.getJob(jobId);

  if (!job) {
    return res.status(404).json({ message: "Job not found" });
  }

  await job.update({
    name: jobName,
    data: jobData,
    opts: cron
      ? { repeat: { cron, limit } }
      : { delay: new Date(scheduleTime) - new Date() },
  });

  res.status(200).json(job);
};

export const deleteJob = async (req, res) => {
  const { tenantId, queueName, jobId } = req.params;

  if (!queues.has(tenantId) || !queues.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }

  const queue = queues.get(tenantId).get(queueName);
  const job = await queue.getJob(jobId);

  if (!job) {
    return res.status(404).json({ message: "Job not found" });
  }

  await job.remove();
  res.status(200).json({ message: "Job deleted successfully" });
};

export const pauseJob = async (req, res) => {
  const { tenantId, queueName, jobId } = req.params;

  if (!queues.has(tenantId) || !queues.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }

  const queue = queues.get(tenantId).get(queueName);
  const job = await queue.getJob(jobId);

  if (!job) {
    return res.status(404).json({ message: "Job not found" });
  }

  await job.pause();
  res.status(200).json({ message: "Job paused successfully" });
};

export const resumeJob = async (req, res) => {
  const { tenantId, queueName, jobId } = req.params;

  if (!queues.has(tenantId) || !queues.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }

  const queue = queues.get(tenantId).get(queueName);
  const job = await queue.getJob(jobId);

  if (!job) {
    return res.status(404).json({ message: "Job not found" });
  }

  await job.resume();
  res.status(200).json({ message: "Job resumed successfully" });
};
