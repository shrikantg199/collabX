const jwt = require("jsonwebtoken");
const Message = require("../models/Message");
const User = require("../models/User");
const Workspace = require("../models/Workspace");

function attachChatHandlers(io) {
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
    socket.on("join-workspace", async ({ workspaceId }) => {
      if (!workspaceId) {
        return;
      }

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return;
      }

      const isMember = workspace.members.some(
        (memberId) => memberId.toString() === socket.data.user._id.toString()
      );

      if (!isMember) {
        return;
      }

      socket.join(workspaceId);
    });

    socket.on("send-message", async ({ workspaceId, text }, callback) => {
      try {
        if (!workspaceId || !text?.trim()) {
          callback?.({ error: "Workspace and message text are required." });
          return;
        }

        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
          callback?.({ error: "Workspace not found." });
          return;
        }

        const isMember = workspace.members.some(
          (memberId) => memberId.toString() === socket.data.user._id.toString()
        );

        if (!isMember) {
          callback?.({ error: "You are not a member of this workspace." });
          return;
        }

        const message = await Message.create({
          workspace: workspaceId,
          user: socket.data.user._id,
          text: text.trim(),
        });

        const hydratedMessage = await Message.findById(message._id)
          .populate("user", "name email")
          .lean();

        io.to(workspaceId).emit("new-message", hydratedMessage);
        callback?.({ message: hydratedMessage });
      } catch (error) {
        callback?.({ error: error.message || "Message delivery failed." });
      }
    });
  });
}

module.exports = attachChatHandlers;
