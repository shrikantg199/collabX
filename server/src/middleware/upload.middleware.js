const multer = require("multer");
const storage = multer.memoryStorage();

function imageFileFilter(_req, file, callback) {
  if (file.mimetype?.startsWith("image/")) {
    callback(null, true);
    return;
  }

  callback(new Error("Only image uploads are allowed."));
}

const uploadProfilePhoto = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: imageFileFilter,
});

const uploadAttachment = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

module.exports = {
  uploadProfilePhoto,
  uploadAttachment,
};
