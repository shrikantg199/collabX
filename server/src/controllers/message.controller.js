const Message = require("../models/Message");
const Workspace = require("../models/Workspace");

async function getWorkspaceMessages(req, res) {
  try {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found." });
    }

    const canAccess = workspace.members.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );

    if (!canAccess) {
      return res.status(403).json({ message: "You are not a member of this workspace." });
    }

    const messages = await Message.find({ workspace: workspaceId })
      .sort({ createdAt: 1 })
      .populate("user", "name email photoUrl")
      .lean();

    return res.json({ messages });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Could not fetch messages." });
  }
}

module.exports = {
  getWorkspaceMessages,
};
