const express = require("express");
const { getWorkspaceDocument } = require("../controllers/document.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(protect);
router.get("/:workspaceId", getWorkspaceDocument);

module.exports = router;
