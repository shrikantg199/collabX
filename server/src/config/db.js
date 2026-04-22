const mongoose = require("mongoose");

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 30000,
    });

    // Warmup: ensure the connection + auth handshake is fully ready
    await mongoose.connection.db.admin().ping();
    console.log("MongoDB connected");
  } catch (error) {
    if (error.code === "ECONNREFUSED" && error.hostname?.startsWith("_mongodb._tcp.")) {
      error.message = [
        error.message,
        "",
        "Atlas SRV lookup failed before MongoDB could connect.",
        "Use one of these fixes:",
        "1. For local Day 1 development, set MONGODB_URI=mongodb://127.0.0.1:27017/collabx",
        "2. If you want Atlas, make sure your network can resolve SRV DNS records and your Atlas IP access list allows this machine",
        "3. If SRV DNS keeps failing, use Atlas's non-SRV connection string format from the MongoDB dashboard",
      ].join("\n");
    }

    throw error;
  }
}

module.exports = connectDB;
