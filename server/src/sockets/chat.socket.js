const jwt = require("jsonwebtoken");
const Document = require("../models/Document");
const Message = require("../models/Message");
const User = require("../models/User");
const { publish, subscribe } = require("../config/redis");
const { getWorkspaceForMember } = require("../utils/workspace-access");

const MESSAGE_CHANNEL = "collabx:workspace:messages";
const DOCUMENT_CHANNEL = "collabx:workspace:documents";
const REDIS_DEBUG_LOGS = process.env.REDIS_DEBUG_LOGS === "true";

function logRedisDebug(message, details) {
  if (!REDIS_DEBUG_LOGS) {
    return;
  }

  console.log(`[Redis Debug][port ${process.env.PORT || 5000}] ${message}`, details);
}

function serializeUser(user) {
  return {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    photoUrl: user.photoUrl || "",
  };
}

async function validateWorkspaceMembership(workspaceId, userId) {
  return getWorkspaceForMember(workspaceId, userId, "members");
}

async function getWorkspaceMessage(messageId, workspaceId) {
  return Message.findOne({ _id: messageId, workspace: workspaceId });
}

async function hydrateMessage(messageId) {
  return Message.findById(messageId).populate("user", "name email photoUrl").lean();
}

function emitWorkspaceEvent(io, event) {
  switch (event?.type) {
    case "message.created":
      io.to(event.workspaceId).emit("new-message", event.message);
      return;
    case "message.updated":
      io.to(event.workspaceId).emit("message-updated", event.message);
      return;
    case "message.deleted":
      io.to(event.workspaceId).emit("message-deleted", {
        workspaceId: event.workspaceId,
        messageId: event.messageId,
      });
      return;
    case "typing.updated":
      io.to(event.workspaceId).emit("typing-status", {
        workspaceId: event.workspaceId,
        isTyping: event.isTyping,
        user: event.user,
      });
      return;
    case "document.updated":
      io.to(`doc-${event.workspaceId}`).emit("document-updated", {
        workspaceId: event.workspaceId,
        content: event.content,
        updatedAt: event.updatedAt,
        userId: event.userId,
        socketId: event.socketId,
      });
      return;
    case "document.typing.updated":
      io.to(`doc-${event.workspaceId}`).emit("document-typing-updated", {
        workspaceId: event.workspaceId,
        isTyping: event.isTyping,
        user: event.user,
        socketId: event.socketId,
      });
      return;
    case "user.joined":
      io.to(event.workspaceId).emit("user-joined", {
        workspaceId: event.workspaceId,
        user: event.user,
      });
      return;
    case "user.left":
      io.to(event.workspaceId).emit("user-left", {
        workspaceId: event.workspaceId,
        user: event.user,
      });
      return;
    default:
      return;
    }
}

function getRedisDebugDetails(event) {
  if (!event) {
    return null;
  }

  if (event.type === "typing.updated") {
    return {
      channel: MESSAGE_CHANNEL,
      workspaceId: event.workspaceId,
      userId: event.user?._id,
      isTyping: event.isTyping,
      type: event.type,
    };
  }

  if (event.type === "document.typing.updated") {
    return {
      channel: DOCUMENT_CHANNEL,
      workspaceId: event.workspaceId,
      userId: event.user?._id,
      isTyping: event.isTyping,
      type: event.type,
    };
  }

  if (event.type === "document.updated") {
    return {
      channel: DOCUMENT_CHANNEL,
      workspaceId: event.workspaceId,
      userId: event.userId,
      type: event.type,
    };
  }

  return {
    channel: MESSAGE_CHANNEL,
    workspaceId: event.workspaceId,
    messageId: event.message?._id || event.messageId,
    userId: event.message?.user?._id || event.user?._id,
    type: event.type,
  };
}

async function publishWorkspaceEvent(io, event) {
  const publishedToRedis = await publish(MESSAGE_CHANNEL, event);

  if (publishedToRedis) {
    logRedisDebug("published workspace event to Redis", getRedisDebugDetails(event));
    return true;
  }

  logRedisDebug("Redis publish unavailable, falling back to local broadcast", getRedisDebugDetails(event));
  emitWorkspaceEvent(io, event);
  return false;
}

async function publishDocumentEvent(io, event) {
  const publishedToRedis = await publish(DOCUMENT_CHANNEL, event);

  if (publishedToRedis) {
    logRedisDebug("published document event to Redis", getRedisDebugDetails(event));
    return true;
  }

  logRedisDebug("Redis publish unavailable, falling back to local document broadcast", getRedisDebugDetails(event));
  emitWorkspaceEvent(io, event);
  return false;
}

function emitStoppedTypingForJoinedRooms(io, socket) {
  const joinedWorkspaceIds = Array.from(socket.rooms).filter(
    (roomId) => roomId !== socket.id && !roomId.startsWith("doc-")
  );

  return Promise.all(
    joinedWorkspaceIds.map((workspaceId) =>
      publishWorkspaceEvent(io, {
        type: "typing.updated",
        workspaceId,
        isTyping: false,
        user: serializeUser(socket.data.user),
      })
    )
  );
}

async function attachChatHandlers(io) {
  const redisSubscribed = await subscribe(MESSAGE_CHANNEL, (event) => {
    if (!event?.type || !event.workspaceId) {
      return;
    }

    logRedisDebug("received workspace event from Redis", getRedisDebugDetails(event));
    emitWorkspaceEvent(io, event);
  });

  const documentRedisSubscribed = await subscribe(DOCUMENT_CHANNEL, (event) => {
    if (!event?.type || !event.workspaceId) {
      return;
    }

    logRedisDebug("received document event from Redis", getRedisDebugDetails(event));
    emitWorkspaceEvent(io, event);
  });

  if (!redisSubscribed) {
    console.warn("Chat sockets are running without Redis Pub/Sub. Broadcasts stay on this server instance.");
  }

  if (!documentRedisSubscribed) {
    console.warn("Document sockets are running without Redis Pub/Sub. Broadcasts stay on this server instance.");
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

        await socket.join(workspaceId);

        // Notify others that a user has joined
        await publishWorkspaceEvent(io, {
          type: "user.joined",
          workspaceId,
          user: serializeUser(socket.data.user),
        });

        callback?.({ ok: true, workspaceId });
      } catch (error) {
        callback?.({ error: error.message || "Could not join workspace." });
      }
    });

    socket.on("join-document", async ({ workspaceId }, callback) => {
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

        await socket.join(`doc-${workspaceId}`);
        callback?.({ ok: true, workspaceId });
      } catch (error) {
        callback?.({ error: error.message || "Could not join document." });
      }
    });

    socket.on("leave-document", async ({ workspaceId }) => {
      if (!workspaceId) {
        return;
      }

      await socket.leave(`doc-${workspaceId}`);

      await publishDocumentEvent(io, {
        type: "document.typing.updated",
        workspaceId,
        isTyping: false,
        user: serializeUser(socket.data.user),
        socketId: socket.id,
      });
    });

    socket.on("send-message", async ({ workspaceId, text, fileUrl, fileType }, callback) => {
      try {
        if (!workspaceId) {
          callback?.({ error: "Workspace is required." });
          return;
        }

        if (!text?.trim() && !fileUrl) {
          callback?.({ error: "Message text or a file is required." });
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
          text: text?.trim(),
          fileUrl,
          fileType,
        });

        const hydratedMessage = await hydrateMessage(message._id);

        await publishWorkspaceEvent(io, {
          type: "message.created",
          workspaceId,
          message: hydratedMessage,
        });

        callback?.({ ok: true, message: hydratedMessage });
      } catch (error) {
        callback?.({ error: error.message || "Message delivery failed." });
      }
    });

    socket.on("update-message", async ({ workspaceId, messageId, text }, callback) => {
      try {
        if (!workspaceId || !messageId || !text?.trim()) {
          callback?.({ error: "Workspace, message, and updated text are required." });
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

        const message = await getWorkspaceMessage(messageId, workspaceId);
        if (!message) {
          callback?.({ error: "Message not found." });
          return;
        }

        if (message.user.toString() !== socket.data.user._id.toString()) {
          callback?.({ error: "You can only edit your own messages." });
          return;
        }

        message.text = text.trim();
        await message.save();

        const hydratedMessage = await hydrateMessage(message._id);
        await publishWorkspaceEvent(io, {
          type: "message.updated",
          workspaceId,
          message: hydratedMessage,
        });

        callback?.({ ok: true, message: hydratedMessage });
      } catch (error) {
        callback?.({ error: error.message || "Message update failed." });
      }
    });

    socket.on("delete-message", async ({ workspaceId, messageId }, callback) => {
      try {
        if (!workspaceId || !messageId) {
          callback?.({ error: "Workspace and message are required." });
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

        const message = await getWorkspaceMessage(messageId, workspaceId);
        if (!message) {
          callback?.({ error: "Message not found." });
          return;
        }

        if (message.user.toString() !== socket.data.user._id.toString()) {
          callback?.({ error: "You can only delete your own messages." });
          return;
        }

        await message.deleteOne();
        await publishWorkspaceEvent(io, {
          type: "message.deleted",
          workspaceId,
          messageId,
        });

        callback?.({ ok: true, messageId });
      } catch (error) {
        callback?.({ error: error.message || "Message deletion failed." });
      }
    });

    socket.on("typing-status", async ({ workspaceId, isTyping }) => {
      if (!workspaceId) {
        return;
      }

      const { error } = await validateWorkspaceMembership(
        workspaceId,
        socket.data.user._id
      );

      if (error) {
        return;
      }

      await publishWorkspaceEvent(io, {
        type: "typing.updated",
        workspaceId,
        isTyping: Boolean(isTyping),
        user: serializeUser(socket.data.user),
      });
    });

    socket.on("document-typing", async ({ workspaceId, isTyping }) => {
      if (!workspaceId) {
        return;
      }

      const { error } = await validateWorkspaceMembership(
        workspaceId,
        socket.data.user._id
      );

      if (error) {
        return;
      }

      await publishDocumentEvent(io, {
        type: "document.typing.updated",
        workspaceId,
        isTyping: Boolean(isTyping),
        user: serializeUser(socket.data.user),
        socketId: socket.id,
      });
    });

    socket.on("edit-document", async ({ workspaceId, content }, callback) => {
      try {
        if (!workspaceId || typeof content !== "string") {
          callback?.({ error: "Workspace and content are required." });
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

        const document = await Document.findOneAndUpdate(
          { workspace: workspaceId },
          {
            $set: {
              content,
            },
            $setOnInsert: {
              workspace: workspaceId,
            },
          },
          {
            new: true,
            upsert: true,
          }
        ).lean();

        await publishDocumentEvent(io, {
          type: "document.updated",
          workspaceId,
          content: document.content,
          updatedAt: document.updatedAt,
          userId: socket.data.user._id.toString(),
          socketId: socket.id,
        });

        callback?.({
          ok: true,
          document: {
            _id: document._id,
            workspace: document.workspace,
            content: document.content,
            updatedAt: document.updatedAt,
          },
        });
      } catch (error) {
        callback?.({ error: error.message || "Document update failed." });
      }
    });

    socket.on("disconnecting", () => {
      const user = serializeUser(socket.data.user);
      const joinedWorkspaceIds = Array.from(socket.rooms).filter(
        (roomId) => roomId !== socket.id && !roomId.startsWith("doc-")
      );

      // Notify others that the user is leaving
      void Promise.all(
        joinedWorkspaceIds.map((workspaceId) =>
          publishWorkspaceEvent(io, {
            type: "user.left",
            workspaceId,
            user,
          })
        )
      );

      void emitStoppedTypingForJoinedRooms(io, socket);

      const joinedDocumentRooms = Array.from(socket.rooms).filter(
        (roomId) => roomId.startsWith("doc-")
      );

      void Promise.all(
        joinedDocumentRooms.map((roomId) =>
          publishDocumentEvent(io, {
            type: "document.typing.updated",
            workspaceId: roomId.replace("doc-", ""),
            isTyping: false,
            user: serializeUser(socket.data.user),
            socketId: socket.id,
          })
        )
      );
    });
  });
}

module.exports = attachChatHandlers;
