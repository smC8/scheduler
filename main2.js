import express from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter.js";
import { ExpressAdapter } from "@bull-board/express";
import {
  initializeTenantQueue,
  pauseQueue,
  resumeQueue,
  deleteQueue,
  getQueueJobs,
  getQueueJob,
} from "./scheduler2.js";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");
const queueArray = [];

const app = express();
app.use(express.json());
app.use("/admin/queues", serverAdapter.getRouter());

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
app.post("/tenant/:tenantId/scheduler", async (req, res) => {
  const { tenantId } = req.params;
  const { queueName, taskName, scheduleTime } = req.body;

  if (!queues.has(tenantId)) {
    queues.set(tenantId, new Map());
  }

  if (queues.get(tenantId).has(queueName)) {
    return res.status(400).json({ message: "Scheduler already exists" });
  }

  const queue = initializeTenantQueue(tenantId, queueName);
  queues.get(tenantId).set(queueName, queue);

  // Schedule a one-time task
  await queue.add(
    taskName,
    { taskName },
    {
      delay: new Date(scheduleTime) - Date.now(),
    }
  );
  queueArray.push(new BullMQAdapter(queue));
  const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
    queues: queueArray,
    serverAdapter: serverAdapter,
  });

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

// Start the Express server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
