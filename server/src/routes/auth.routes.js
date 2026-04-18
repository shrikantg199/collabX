const express = require("express");
const {
  login,
  me,
  register,
  updatePassword,
  updateProfile,
} = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, me);
router.put("/profile", protect, updateProfile);
router.put("/password", protect, updatePassword);

module.exports = router;
