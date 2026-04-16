const Workspace = require("../models/Workspace");

const CODE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode() {
  return Array.from({ length: 6 }, () => {
    const index = Math.floor(Math.random() * CODE_CHARACTERS.length);
    return CODE_CHARACTERS[index];
  }).join("");
}

async function generateUniqueCode() {
  let code = makeCode();
  let exists = await Workspace.findOne({ code });

  while (exists) {
    code = makeCode();
    exists = await Workspace.findOne({ code });
  }

  return code;
}

async function getWorkspaces(req, res) {
  try {
    const workspaces = await Workspace.find({
      members: req.user._id,
    })
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({ workspaces });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Could not fetch workspaces." });
  }
}

async function createWorkspace(req, res) {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Workspace name is required." });
    }

    const workspace = await Workspace.create({
      name,
      code: await generateUniqueCode(),
      createdBy: req.user._id,
      members: [req.user._id],
    });

    return res.status(201).json({ workspace });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Could not create workspace." });
  }
}

async function joinWorkspace(req, res) {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Workspace code is required." });
    }

    const workspace = await Workspace.findOne({ code: code.toUpperCase() });
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found." });
    }

    const alreadyJoined = workspace.members.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );

    if (!alreadyJoined) {
      workspace.members.push(req.user._id);
      await workspace.save();
    }

    return res.json({ workspace });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Could not join workspace." });
  }
}

module.exports = {
  getWorkspaces,
  createWorkspace,
  joinWorkspace,
};
