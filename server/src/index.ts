import express from "express";
import http from "http";
import cors from "cors";
import { connectDB } from "./config/db";
import { initSocket } from "./config/socket";
import { env } from "./config/env";
import authRoutes from "./routes/auth.routes";
import emergencyRoutes from "./routes/emergency.routes";
import userRoutes from "./routes/user.routes";
import adminRoutes from "./routes/admin.routes";
import { errorHandler } from "./middleware/error.middleware";

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/emergency", emergencyRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);

// Error handler
app.use(errorHandler);

async function start() {
  await connectDB();
  initSocket(server);
  server.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
}

start();
