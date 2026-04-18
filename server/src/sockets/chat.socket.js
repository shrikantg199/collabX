const jwt = require("jsonwebtoken");
const Message = require("../models/Message");
const User = require("../models/User");
const Workspace = require("../models/Workspace");
const { publish, subscribe } = require("../config/redis");

const MESSAGE_CHANNEL = "collabx:workspace:messages";
const REDIS_DEBUG_LOGS = process.env.REDIS_DEBUG_LOGS === "true";

function logRedisDebug(message, details) {
  if (!REDIS_DEBUG_LOGS) {
    return;
  }

  console.log(`[Redis Debug][port ${process.env.PORT || 5000}] ${message}`, details);
}

async function validateWorkspaceMembership(workspaceId, userId) {
  const workspace = await Workspace.findById(workspaceId).select("members").lean();

  if (!workspace) {
    return { error: "Workspace not found." };
  }

  const isMember = workspace.members.some(
    (memberId) => memberId.toString() === userId.toString()
  );

  if (!isMember) {
    return { error: "You are not a member of this workspace." };
  }

  return { workspace };
}

function leaveJoinedWorkspaces(socket) {
  return Promise.all(
    Array.from(socket.rooms)
      .filter((roomId) => roomId !== socket.id)
      .map((roomId) => socket.leave(roomId))
  );
} 

async function attachChatHandlers(io) {
  const redisSubscribed = await subscribe(MESSAGE_CHANNEL, (event) => {
    if (event?.type !== "message.created" || !event.workspaceId || !event.message) {
      return;
    }

    logRedisDebug("received message from Redis", {
      channel: MESSAGE_CHANNEL,
      workspaceId: event.workspaceId,
      messageId: event.message._id,
      userId: event.message.user?._id,
    });

    io.to(event.workspaceId).emit("new-message", event.message);
  });

  if (!redisSubscribed) {
    console.warn("Chat sockets are running without Redis Pub/Sub. Broadcasts stay on this server instance.");
  }

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Authentication token missing."));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select("-password");

      if (!user) {
        return next(new Error("User not found."));
      }

      socket.data.user = user;
      return next();
    } catch (_error) {
      return next(new Error("Socket authentication failed."));
    }
  });

  io.on("connection", (socket) => {
    socket.on("join-workspace", async ({ workspaceId }, callback) => {
      try {
        if (!workspaceId) {
          callback?.({ error: "Workspace is required." });
          return;
        }

        const { error } = await validateWorkspaceMembership(
          workspaceId,
          socket.data.user._id
        );

        if (error) {
          callback?.({ error });
          return;
        }

        await leaveJoinedWorkspaces(socket);
        await socket.join(workspaceId);
        callback?.({ ok: true, workspaceId });
      } catch (error) {
        callback?.({ error: error.message || "Could not join workspace." });
      }
    });

    socket.on("send-message", async ({ workspaceId, text }, callback) => {
      try {
        if (!workspaceId || !text?.trim()) {
          callback?.({ error: "Workspace and message text are required." });
          return;
        }

        const { error } = await validateWorkspaceMembership(
          workspaceId,
          socket.data.user._id
        );

        if (error) {
          callback?.({ error });
          return;
        }

        const message = await Message.create({
          workspace: workspaceId,
          user: socket.data.user._id,
          text: text.trim(),
        });

        const hydratedMessage = await Message.findById(message._id)
          .populate("user", "name email photoUrl")
          .lean();

        const publishedToRedis = await publish(MESSAGE_CHANNEL, {
          type: "message.created",
          workspaceId,
          message: hydratedMessage,
        });

        if (publishedToRedis) {
          logRedisDebug("published message to Redis", {
            channel: MESSAGE_CHANNEL,
            workspaceId,
            messageId: hydratedMessage._id,
            userId: socket.data.user._id.toString(),
          });
        }

        if (!publishedToRedis) {
          logRedisDebug("Redis publish unavailable, falling back to local broadcast", {
            workspaceId,
            messageId: hydratedMessage._id,
          });
          io.to(workspaceId).emit("new-message", hydratedMessage);
        }

        callback?.({ ok: true, message: hydratedMessage });
      } catch (error) {
        callback?.({ error: error.message || "Message delivery failed." });
      }
    });
  });
}

module.exports = attachChatHandlers;
