const express = require("express");
const { uploadAttachment } = require("../middleware/upload.middleware");
const { getWorkspaceMessages, uploadAttachment: uploadAttachmentController } = require("../controllers/message.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(protect);
router.get("/:workspaceId", getWorkspaceMessages);
router.post("/attachment", uploadAttachment.single("file"), uploadAttachmentController);

module.exports = router;
