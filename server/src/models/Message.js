const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: false, // Make text optional if a file is present
      trim: true,
    },
    fileUrl: {
      type: String,
      trim: true,
    },
    fileType: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ workspace: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);
