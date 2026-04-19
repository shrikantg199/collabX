const Message = require("../models/Message");
const { getWorkspaceForMember } = require("../utils/workspace-access");

async function getWorkspaceMessages(req, res) {
  try {
    const { workspaceId } = req.params;

    const { error, status } = await getWorkspaceForMember(
      workspaceId,
      req.user._id,
      "members"
    );

    if (error) {
      return res.status(status).json({ message: error });
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
