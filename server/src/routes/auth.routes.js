const express = require("express");
const {
  login,
  me,
  register,
  uploadProfilePhoto,
  updatePassword,
  updateProfile,
} = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");
const { uploadProfilePhoto: uploadProfilePhotoMiddleware } = require("../middleware/upload.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, me);
router.post(
  "/profile-photo",
  protect,
  uploadProfilePhotoMiddleware.single("photo"),
  uploadProfilePhoto
);
router.put("/profile", protect, updateProfile);
router.put("/password", protect, updatePassword);

module.exports = router;
