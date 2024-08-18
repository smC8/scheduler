import express from "express";
import { initializeTenantQueue } from "./scheduler.js";

const app = express();
app.use(express.json());

// Example: Schedule a one-time task
app.post("/tenant/:tenantId/schedule", async (req, res) => {
  const { tenantId } = req.params;
  const { taskName, scheduleTime } = req.body;

  const taskQueue = initializeTenantQueue(tenantId);

  // Schedule a one-time task
  await taskQueue.add(
    taskName,
    { taskName },
    { delay: new Date(scheduleTime) - Date.now() }
  );

  res.status(200).json({ message: "Task scheduled successfully" });
});

// Example: Schedule a periodic task
app.post("/tenant/:tenantId/schedule/recurring", async (req, res) => {
  const { tenantId } = req.params;
  const { taskName, cron, limit } = req.body;

  const taskQueue = initializeTenantQueue(tenantId);

  // Schedule a recurring task
  await taskQueue.add(
    taskName,
    { taskName },
    {
      repeat: { cron, limit },
    }
  );

  res.status(200).json({ message: "Recurring task scheduled successfully" });
});

// Start the Express server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
