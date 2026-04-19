const Workspace = require("../models/Workspace");
const Message = require("../models/Message");
const Document = require("../models/Document");

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

async function leaveWorkspace(req, res) {
  try {
    const { workspaceId } = req.params;

    if (!workspaceId) {
      return res.status(400).json({ message: "Workspace ID is required." });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found." });
    }

    // Check if user is a member
    const isMember = workspace.members.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this workspace." });
    }

    // Prevent the creator from leaving (they should delete the workspace instead)
    if (workspace.createdBy.toString() === req.user._id.toString()) {
      return res.status(400).json({ 
        message: "Workspace creator cannot leave. Delete the workspace instead or transfer ownership." 
      });
    }

    // Remove user from members
    workspace.members = workspace.members.filter(
      (memberId) => memberId.toString() !== req.user._id.toString()
    );
    await workspace.save();

    return res.json({ 
      message: "Successfully left the workspace.",
      workspaceId 
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Could not leave workspace." });
  }
}

async function deleteWorkspace(req, res) {
  try {
    const { workspaceId } = req.params;

    if (!workspaceId) {
      return res.status(400).json({ message: "Workspace ID is required." });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found." });
    }

    // Only creator can delete
    if (workspace.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the workspace creator can delete it." });
    }

    // Delete all messages in the workspace
    await Message.deleteMany({ workspace: workspaceId });
    
    // Delete the workspace document if exists
    await Document.deleteMany({ workspace: workspaceId });
    
    // Delete the workspace
    await Workspace.findByIdAndDelete(workspaceId);

    return res.json({ 
      message: "Workspace deleted successfully.",
      workspaceId 
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Could not delete workspace." });
  }
}

async function transferOwnership(req, res) {
  try {
    const { workspaceId } = req.params;
    const { newOwnerId } = req.body;

    if (!workspaceId || !newOwnerId) {
      return res.status(400).json({ message: "Workspace ID and new owner ID are required." });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found." });
    }

    // Only creator can transfer ownership
    if (workspace.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the workspace creator can transfer ownership." });
    }

    // Check if new owner is a member
    const isNewOwnerMember = workspace.members.some(
      (memberId) => memberId.toString() === newOwnerId.toString()
    );

    if (!isNewOwnerMember) {
      return res.status(400).json({ message: "New owner must be a member of the workspace." });
    }

    // Transfer ownership
    workspace.createdBy = newOwnerId;
    await workspace.save();

    return res.json({ 
      message: "Ownership transferred successfully.",
      workspace,
      newOwnerId 
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Could not transfer ownership." });
  }
}

async function removeMember(req, res) {
  try {
    const { workspaceId, memberId } = req.params;

    if (!workspaceId || !memberId) {
      return res.status(400).json({ message: "Workspace ID and member ID are required." });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found." });
    }

    // Only creator can remove members
    if (workspace.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the workspace creator can remove members." });
    }

    // Cannot remove yourself
    if (memberId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot remove yourself. Delete or transfer ownership instead." });
    }

    // Remove member
    const wasMember = workspace.members.some(
      (m) => m.toString() === memberId.toString()
    );

    if (!wasMember) {
      return res.status(404).json({ message: "User is not a member of this workspace." });
    }

    workspace.members = workspace.members.filter(
      (m) => m.toString() !== memberId.toString()
    );
    await workspace.save();

    return res.json({ 
      message: "Member removed successfully.",
      workspace 
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Could not remove member." });
  }
}

async function getWorkspaceMembers(req, res) {
  try {
    const { workspaceId } = req.params;

    if (!workspaceId) {
      return res.status(400).json({ message: "Workspace ID is required." });
    }

    const workspace = await Workspace.findById(workspaceId)
      .populate('members', 'name email photoUrl')
      .populate('createdBy', 'name email photoUrl')
      .lean();

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found." });
    }

    // Check if user is a member
    const isMember = workspace.members.some(
      (member) => member._id.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: "You must be a member to view the member list." });
    }

    return res.json({ 
      members: workspace.members,
      createdBy: workspace.createdBy,
      workspaceId 
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Could not fetch workspace members." });
  }
}

module.exports = {
  getWorkspaces,
  createWorkspace,
  joinWorkspace,
  leaveWorkspace,
  deleteWorkspace,
  transferOwnership,
  removeMember,
  getWorkspaceMembers,
};
