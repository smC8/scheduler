import express from "express";
import { Queue, Worker, connection } from "./bullmq.config.js";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter.js";
import { ExpressAdapter } from "@bull-board/express";

const taskQueue = new Queue("tenant_tenant123_tasks", { connection });

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: [new BullMQAdapter(taskQueue)],
  serverAdapter: serverAdapter,
});

const app = express();

app.use("/admin/queues", serverAdapter.getRouter());

// other configurations of your server

app.listen(3003, () => {
  console.log("Running on 3000...");
  console.log("For the UI, open http://localhost:3000/admin/queues");
  console.log("Make sure Redis is running on port 6379 by default");
});
