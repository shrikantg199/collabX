const express = require("express");
const {
  createWorkspace,
  getWorkspaces,
  joinWorkspace,
  leaveWorkspace,
  deleteWorkspace,
  transferOwnership,
  removeMember,
  getWorkspaceMembers,
} = require("../controllers/workspace.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(protect);
router.get("/", getWorkspaces);
router.post("/", createWorkspace);
router.post("/join", joinWorkspace);
router.post("/:workspaceId/leave", leaveWorkspace);
router.delete("/:workspaceId", deleteWorkspace);
router.post("/:workspaceId/transfer", transferOwnership);
router.delete("/:workspaceId/members/:memberId", removeMember);
router.get("/:workspaceId/members", getWorkspaceMembers);

module.exports = router;
