const cors = require("cors");
const express = require("express");
const authRoutes = require("./routes/auth.routes");
const messageRoutes = require("./routes/message.routes");
const workspaceRoutes = require("./routes/workspace.routes");

function isAllowedOrigin(origin, allowedOrigins) {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function createApp() {
  const app = express();
  const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim());

  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedOrigin(origin, allowedOrigins)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origin ${origin} is not allowed by CORS.`));
      },
      credentials: true,
    })
  );
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, message: "CollabX API is live." });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/workspaces", workspaceRoutes);
  app.use("/api/messages", messageRoutes);

  return app;
}

module.exports = createApp;
