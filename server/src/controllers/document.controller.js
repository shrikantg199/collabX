const Document = require("../models/Document");
const { getWorkspaceForMember } = require("../utils/workspace-access");

async function getWorkspaceDocument(req, res) {
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

    const document = await Document.findOneAndUpdate(
      { workspace: workspaceId },
      {
        $setOnInsert: {
          workspace: workspaceId,
          content: "",
        },
      },
      {
        new: true,
        upsert: true,
      }
    ).lean();

    return res.json({ document });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Could not fetch document." });
  }
}

module.exports = {
  getWorkspaceDocument,
};
