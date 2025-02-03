const express = require("express");
const multer = require("multer");
const authMiddleware = require("../middleware/authMiddleware.js");
const { uploadPDF } = require("../controllers/pdfController.js");
const router = express.Router();
const upload = multer({ dest: "uploads/" });
router.post("/upload", authMiddleware, upload.single("pdf"), uploadPDF);
module.exports = router;
