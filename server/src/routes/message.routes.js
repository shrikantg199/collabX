const express = require("express");
const { getWorkspaceMessages } = require("../controllers/message.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(protect);
router.get("/:workspaceId", getWorkspaceMessages);

module.exports = router;
