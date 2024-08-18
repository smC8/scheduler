import express from "express";
import {
  listSchedulers,
  getScheduler,
  createScheduler,
  updateScheduler,
  deleteScheduler,
  pauseScheduler,
  resumeScheduler,
  listJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob,
  pauseJob,
  resumeJob,
} from "../controllers/schedulerController.js";

const router = express.Router({ mergeParams: true });

/**
 * @route GET /tenant/:tenantId/schedulers
 * @desc List all schedulers for a tenant.
 * @param {string} tenantId - The ID of the tenant.
 * @returns {Object[]} - Array of scheduler names.
 */
router.get("/schedulers", listSchedulers);

/**
 * @route GET /tenant/:tenantId/scheduler/:queueName
 * @desc Get details of a specific scheduler and its jobs.
 * @param {string} tenantId - The ID of the tenant.
 * @param {string} queueName - The name of the scheduler.
 * @returns {Object[]} - Array of job details.
 */
router.get("/scheduler/:queueName", getScheduler);

/**
 * @route POST /tenant/:tenantId/scheduler
 * @desc Create a new scheduler for a tenant.
 * @param {string} tenantId - The ID of the tenant.
 * @param {Object} body - Request body.
 * @param {string} body.queueName - The name of the scheduler.
 * @returns {Object} - Confirmation message.
 */
router.post("/scheduler", createScheduler);

/**
 * @route PUT /tenant/:tenantId/scheduler/:queueName
 * @desc Update an existing scheduler.
 * @param {string} tenantId - The ID of the tenant.
 * @param {string} queueName - The name of the scheduler.
 * @param {Object} body - Request body with updated details.
 * @returns {Object} - Confirmation message.
 */
router.put("/scheduler/:queueName", updateScheduler);

/**
 * @route DELETE /tenant/:tenantId/scheduler/:queueName
 * @desc Delete an existing scheduler.
 * @param {string} tenantId - The ID of the tenant.
 * @param {string} queueName - The name of the scheduler.
 * @returns {Object} - Confirmation message.
 */
router.delete("/scheduler/:queueName", deleteScheduler);

/**
 * @route POST /tenant/:tenantId/scheduler/:queueName/pause
 * @desc Pause a specific scheduler.
 * @param {string} tenantId - The ID of the tenant.
 * @param {string} queueName - The name of the scheduler.
 * @returns {Object} - Confirmation message.
 */
router.post("/scheduler/:queueName/pause", pauseScheduler);

/**
 * @route POST /tenant/:tenantId/scheduler/:queueName/resume
 * @desc Resume a specific scheduler.
 * @param {string} tenantId - The ID of the tenant.
 * @param {string} queueName - The name of the scheduler.
 * @returns {Object} - Confirmation message.
 */
router.post("/scheduler/:queueName/resume", resumeScheduler);

/**
 * @route GET /tenant/:tenantId/scheduler/:queueName/jobs
 * @desc List all jobs of a specific scheduler.
 * @param {string} tenantId - The ID of the tenant.
 * @param {string} queueName - The name of the scheduler.
 * @returns {Object[]} - Array of job details.
 */
router.get("/scheduler/:queueName/jobs", listJobs);

/**
 * @route GET /tenant/:tenantId/scheduler/:queueName/job/:jobId
 * @desc Get details of a specific job in a scheduler.
 * @param {string} tenantId - The ID of the tenant.
 * @param {string} queueName - The name of the scheduler.
 * @param {string} jobId - The ID of the job.
 * @returns {Object} - Job details.
 */
router.get("/scheduler/:queueName/job/:jobId", getJob);

/**
 * @route POST /tenant/:tenantId/scheduler/:queueName/job
 * @desc Create a new job in a scheduler.
 * @param {string} tenantId - The ID of the tenant.
 * @param {string} queueName - The name of the scheduler.
 * @param {Object} body - Request body with job details.
 * @param {string} body.jobName - The name of the job.
 * @param {Object} body.jobData - The data for the job.
 * @param {string} [body.scheduleTime] - Optional schedule time for one-time jobs.
 * @param {string} [body.cron] - Optional cron expression for recurring jobs.
 * @param {number} [body.limit] - Optional limit for job invocations.
 * @returns {Object} - Details of the created job.
 */
router.post("/scheduler/:queueName/job", createJob);

/**
 * @route PUT /tenant/:tenantId/scheduler/:queueName/job/:jobId
 * @desc Update an existing job in a scheduler.
 * @param {string} tenantId - The ID of the tenant.
 * @param {string} queueName - The name of the scheduler.
 * @param {string} jobId - The ID of the job.
 * @param {Object} body - Request body with updated job details.
 * @param {string} body.jobName - The updated name of the job.
 * @param {Object} body.jobData - The updated data for the job.
 * @param {string} [body.scheduleTime] - Optional updated schedule time for one-time jobs.
 * @param {string} [body.cron] - Optional updated cron expression for recurring jobs.
 * @param {number} [body.limit] - Optional updated limit for job invocations.
 * @returns {Object} - Details of the updated job.
 */
router.put("/scheduler/:queueName/job/:jobId", updateJob);

/**
 * @route DELETE /tenant/:tenantId/scheduler/:queueName/job/:jobId
 * @desc Delete a specific job from a scheduler.
 * @param {string} tenantId - The ID of the tenant.
 * @param {string} queueName - The name of the scheduler.
 * @param {string} jobId - The ID of the job.
 * @returns {Object} - Confirmation message.
 */
router.delete("/scheduler/:queueName/job/:jobId", deleteJob);

/**
 * @route POST /tenant/:tenantId/scheduler/:queueName/job/:jobId/pause
 * @desc Pause a specific job in a scheduler.
 * @param {string} tenantId - The ID of the tenant.
 * @param {string} queueName - The name of the scheduler.
 * @param {string} jobId - The ID of the job.
 * @returns {Object} - Confirmation message.
 */
router.post("/scheduler/:queueName/job/:jobId/pause", pauseJob);

/**
 * @route POST /tenant/:tenantId/scheduler/:queueName/job/:jobId/resume
 * @desc Resume a paused job in a scheduler.
 * @param {string} tenantId - The ID of the tenant.
 * @param {string} queueName - The name of the scheduler.
 * @param {string} jobId - The ID of the job.
 * @returns {Object} - Confirmation message.
 */
router.post("/scheduler/:queueName/job/:jobId/resume", resumeJob);

export default router;
