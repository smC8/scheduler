import express from "express";
import schedulerRoutes from "./src/routes/schedulerRoutes.js";
import { getBullBoardRouter } from "./src/controllers/schedulerController.js";

// import { queues } from "./scheduler.js";

// // Setup Bull-Board
// const serverAdapter = new ExpressAdapter();
// serverAdapter.setBasePath("/admin/queues");

// const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
//   queues: Array.from(queues.values()).map((queue) => new BullMQAdapter(queue)),
//   serverAdapter: serverAdapter,
// });

const app = express();
app.use(express.json());

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
