const Workspace = require("../models/Workspace");

async function getWorkspaceForMember(workspaceId, userId, select = "") {
  const query = Workspace.findById(workspaceId);

  if (select) {
    query.select(select);
  }

  const workspace = await query.lean();

  if (!workspace) {
    return { error: "Workspace not found.", status: 404 };
  }

  const isMember = workspace.members.some(
    (memberId) => memberId.toString() === userId.toString()
  );

  if (!isMember) {
    return { error: "You are not a member of this workspace.", status: 403 };
  }

  return { workspace };
}

module.exports = {
  getWorkspaceForMember,
};
