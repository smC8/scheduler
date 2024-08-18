import express from "express";
import {
  initializeTenantQueue,
  pauseQueue,
  resumeQueue,
  deleteQueue,
  getQueueJobs,
} from "./scheduler.js";

const app = express();
app.use(express.json());

const queues = new Map(); // Store all queues for easy access

// List all schedulers (queues)
app.get("/tenant/:tenantId/schedulers", (req, res) => {
  const { tenantId } = req.params;

  if (!queues.has(tenantId)) {
    return res.status(404).json({ message: "Tenant not found" });
  }

  const tenantQueues = queues.get(tenantId);
  res.status(200).json([...tenantQueues.keys()]);
});

// Get an existing scheduler
app.get("/tenant/:tenantId/scheduler/:queueName", async (req, res) => {
  const { tenantId, queueName } = req.params;

  if (!queues.has(tenantId) || !queues.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }

  const queue = queues.get(tenantId).get(queueName);
  const jobs = await getQueueJobs(queue);
  res.status(200).json(jobs);
});

// Create a new scheduler
app.post("/tenant/:tenantId/scheduler", (req, res) => {
  const { tenantId } = req.params;
  const { queueName } = req.body;

  if (!queues.has(tenantId)) {
    queues.set(tenantId, new Map());
  }

  if (queues.get(tenantId).has(queueName)) {
    return res.status(400).json({ message: "Scheduler already exists" });
  }

  const queue = initializeTenantQueue(tenantId, queueName);
  queues.get(tenantId).set(queueName, queue);

  res.status(201).json({ message: "Scheduler created successfully" });
});

// Update an existing scheduler
app.put("/tenant/:tenantId/scheduler/:queueName", async (req, res) => {
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
});

// Delete a scheduler
app.delete("/tenant/:tenantId/scheduler/:queueName", async (req, res) => {
  const { tenantId, queueName } = req.params;

  if (!queues.has(tenantId) || !queues.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }

  const queue = queues.get(tenantId).get(queueName);
  await deleteQueue(queue);
  queues.get(tenantId).delete(queueName);

  res.status(200).json({ message: "Scheduler deleted successfully" });
});

// Pause a scheduler
app.post("/tenant/:tenantId/scheduler/:queueName/pause", async (req, res) => {
  const { tenantId, queueName } = req.params;

  if (!queues.has(tenantId) || !queues.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }

  const queue = queues.get(tenantId).get(queueName);
  await pauseQueue(queue);

  res.status(200).json({ message: "Scheduler paused successfully" });
});

// Resume a scheduler
app.post("/tenant/:tenantId/scheduler/:queueName/resume", async (req, res) => {
  const { tenantId, queueName } = req.params;

  if (!queues.has(tenantId) || !queues.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }

  const queue = queues.get(tenantId).get(queueName);
  await resumeQueue(queue);

  res.status(200).json({ message: "Scheduler resumed successfully" });
});

// Add a one-time job to a scheduler
app.post("/tenant/:tenantId/scheduler/:queueName/job", async (req, res) => {
  const { tenantId, queueName } = req.params;
  const { jobName, jobData, scheduleTime } = req.body;

  if (!queues.has(tenantId) || !queues.get(tenantId).has(queueName)) {
    return res.status(404).json({ message: "Scheduler not found" });
  }

  const queue = queues.get(tenantId).get(queueName);

  await queue.add(jobName, jobData, {
    delay: new Date(scheduleTime) - Date.now(),
  });

  res.status(201).json({ message: "One-time job added successfully" });
});

// Add a recurring job to a scheduler
app.post(
  "/tenant/:tenantId/scheduler/:queueName/job/recurring",
  async (req, res) => {
    const { tenantId, queueName } = req.params;
    const { jobName, jobData, cron, limit } = req.body;

    if (!queues.has(tenantId) || !queues.get(tenantId).has(queueName)) {
      return res.status(404).json({ message: "Scheduler not found" });
    }

    const queue = queues.get(tenantId).get(queueName);

    await queue.add(jobName, jobData, {
      repeat: { cron, limit },
    });

    res.status(201).json({ message: "Recurring job added successfully" });
  }
);

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
