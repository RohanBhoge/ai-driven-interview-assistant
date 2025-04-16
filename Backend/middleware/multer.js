const multer = require("multer");
const { GridFSBucket } = require("mongodb");
const mongoose = require("mongoose");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "video/webm") {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only WEBM video is allowed."), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for video chunks
  },
});

module.exports = upload;
