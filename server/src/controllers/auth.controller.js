const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { uploadBuffer } = require("../utils/cloudinary");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    photoUrl: user.photoUrl || "",
  };
}

function validatePhotoUrl(photoUrl) {
  if (!photoUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(photoUrl);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return "Photo URL must start with http or https.";
    }
  } catch (_error) {
    return "Photo URL must be a valid link.";
  }

  return null;
}

async function register(req, res) {
  try {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password?.trim();
    const photoUrl = req.body.photoUrl?.trim() ?? "";

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required." });
    }

    if (name.length < 2 || name.length > 40) {
      return res.status(400).json({ message: "Name must be between 2 and 40 characters." });
    }

    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const photoUrlError = validatePhotoUrl(photoUrl);
    if (photoUrlError) {
      return res.status(400).json({ message: photoUrlError });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      photoUrl,
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
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password?.trim();

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
    const photoUrl = req.body.photoUrl?.trim() ?? "";

    if (!name) {
      return res.status(400).json({ message: "Name is required." });
    }

    if (name.length < 2 || name.length > 40) {
      return res.status(400).json({ message: "Name must be between 2 and 40 characters." });
    }

    const photoUrlError = validatePhotoUrl(photoUrl);
    if (photoUrlError) {
      return res.status(400).json({ message: photoUrlError });
    }

    req.user.name = name;
    req.user.photoUrl = photoUrl;
    await req.user.save();

    return res.json({ user: sanitizeUser(req.user) });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Profile update failed." });
  }
}

async function uploadProfilePhoto(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please choose an image to upload." });
    }

    const uploadedPhoto = await uploadBuffer(req.file.buffer, {
      folder: "collabx/profile-photos",
      resource_type: "image",
      public_id: `user-${req.user._id}-${Date.now()}`,
      overwrite: true,
    });

    const photoUrl = uploadedPhoto.secure_url || uploadedPhoto.url;

    if (!photoUrl) {
      return res.status(500).json({ message: "Cloudinary did not return a photo URL." });
    }

    req.user.photoUrl = photoUrl;
    await req.user.save();

    return res.status(201).json({
      photoUrl,
      user: sanitizeUser(req.user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Photo upload failed." });
  }
}

async function updatePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new passwords are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters." });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: "Choose a new password different from the current one." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ message: "Password updated successfully." });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Password update failed." });
  }
}

module.exports = {
  register,
  login,
  me,
  uploadProfilePhoto,
  updateProfile,
  updatePassword,
};
