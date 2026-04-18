require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");
const createApp = require("./app");
const connectDB = require("./config/db");
const { disconnectRedis } = require("./config/redis");
const attachChatHandlers = require("./sockets/chat.socket");

const PORT = process.env.PORT || 5000;

function isAllowedOrigin(origin, allowedOrigins) {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

async function startServer() {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);
  const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim());
  const io = new Server(server, {
    cors: {
      origin(origin, callback) {
        if (isAllowedOrigin(origin, allowedOrigins)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origin ${origin} is not allowed by Socket.IO CORS.`));
      },
      credentials: true,
    },
  });

  await attachChatHandlers(io);

  await new Promise((resolve) => {
    server.listen(PORT, () => {
      console.log(`CollabX server running on port ${PORT}`);
      resolve();
    });
  });

  return server;
}

let httpServer = null;

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down CollabX server...`);

  await Promise.allSettled([
    disconnectRedis(),
    new Promise((resolve) => {
      if (!httpServer) {
        resolve();
        return;
      }

      httpServer.close(() => resolve());
    }),
  ]);

  process.exit(0);
}

startServer()
  .then((server) => {
    httpServer = server;
  })
  .catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
