const express = require("express");
const {
  createWorkspace,
  getWorkspaces,
  joinWorkspace,
} = require("../controllers/workspace.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(protect);
router.get("/", getWorkspaces);
router.post("/", createWorkspace);
router.post("/join", joinWorkspace);

module.exports = router;
