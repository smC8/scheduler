import express from "express";
import schedulerRoutes from "./src/routes/schedulerRoutes.js";
import {
  getBullBoardRouter,
  loadQueuesFromRedis,
} from "./src/controllers/schedulerController.js";
import { initializeWorkers } from "./src/worker.js"; // Import worker initialization function

const app = express();
app.use(express.json());

(async () => {
  try {
    await loadQueuesFromRedis();
    console.log("Queues loaded from Redis successfully.");
  } catch (err) {
    console.error("Error loading queues from Redis:", err);
    process.exit(1); // Exit if loading queues fails
  }
})();
// Initialize workers after loading queues
await initializeWorkers();

// Example basic authentication middleware
app.use("/admin/queues", (req, res, next) => {
  const auth = { login: "admin", password: "secret" };

  const b64auth = (req.headers.authorization || "").split(" ")[1] || "";
  const [login, password] = Buffer.from(b64auth, "base64")
    .toString()
    .split(":");

  if (login && password && login === auth.login && password === auth.password) {
    return next();
  }

  res.set("WWW-Authenticate", 'Basic realm="401"');
  res.status(401).send("Authentication required.");
});

// Add Bull-Board routes to your Express app
app.use("/admin/queues", getBullBoardRouter());

// Set up routes
app.use("/tenant/:tenantId", schedulerRoutes);

// Start the server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
