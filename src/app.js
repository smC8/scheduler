import express from "express";
import schedulerRoutes from "./routes/schedulerRoutes.js";

const app = express();
app.use(express.json());

// Set up routes
app.use("/tenant/:tenantId", schedulerRoutes);

// Start the server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
