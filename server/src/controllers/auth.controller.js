const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

function sanitizeUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
  };
}

async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    return res.status(201).json({
      user: sanitizeUser(user),
      token: generateToken(user._id.toString()),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Registration failed." });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    return res.json({
      user: sanitizeUser(user),
      token: generateToken(user._id.toString()),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Login failed." });
  }
}

async function me(req, res) {
  return res.json({ user: sanitizeUser(req.user) });
}

async function updateProfile(req, res) {
  try {
    const name = req.body.name?.trim();

    if (!name) {
      return res.status(400).json({ message: "Name is required." });
    }

    if (name.length < 2 || name.length > 40) {
      return res.status(400).json({ message: "Name must be between 2 and 40 characters." });
    }

    req.user.name = name;
    await req.user.save();

    return res.json({ user: sanitizeUser(req.user) });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Profile update failed." });
  }
}

module.exports = {
  register,
  login,
  me,
  updateProfile,
};
