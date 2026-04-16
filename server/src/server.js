require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");
const createApp = require("./app");
const connectDB = require("./config/db");
const attachChatHandlers = require("./sockets/chat.socket");

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: (process.env.CLIENT_URL || "http://localhost:3000")
        .split(",")
        .map((origin) => origin.trim()),
      credentials: true,
    },
  });

  attachChatHandlers(io);

  server.listen(PORT, () => {
    console.log(`CollabX server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
