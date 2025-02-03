const mongoose = require("mongoose");
const { GridFsStorage } = require("multer-gridfs-storage");
const multer = require("multer");

// Initialize GridFS once MongoDB connects
let gfs;
mongoose.connection.once("open", () => {
  gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "pdfs",
  });
});

// Create storage engine AFTER env vars are loaded
const storage = new GridFsStorage({
  db: mongoose.connection, // Use existing connection
  file: (req, file) => {
    return {
      filename: file.originalname,
      bucketName: "pdfs",
      metadata: { userId: req.userId },
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

module.exports = { upload, gfs };
