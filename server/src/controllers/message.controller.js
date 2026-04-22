const Message = require("../models/Message");
const { getWorkspaceForMember } = require("../utils/workspace-access");
const { uploadBuffer } = require("../utils/cloudinary");

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

async function uploadAttachment(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please choose a file to upload." });
    }

    const uploadedFile = await uploadBuffer(req.file.buffer, {
      folder: "collabx/attachments",
      resource_type: "auto",
      public_id: `msg-${req.user._id}-${Date.now()}`,
    });

    const fileUrl = uploadedFile.secure_url || uploadedFile.url;

    if (!fileUrl) {
      return res.status(500).json({ message: "Cloudinary did not return a file URL." });
    }

    return res.status(201).json({
      fileUrl,
      fileType: req.file.mimetype,
      fileName: req.file.originalname,
    });
  } catch (error) {
    console.error("Message attachment upload error:", error);
    return res.status(500).json({ message: error.message || "File upload failed." });
  }
}

module.exports = {
  getWorkspaceMessages,
  uploadAttachment,
};
