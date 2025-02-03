const express = require("express");
const { upload } = require("../Config/gridfs.js");
const { uploadPDF, downloadPDF } = require("../controllers/pdfController.js");
const authMiddleware = require("../middleware/authMiddleware.js");

const router = express.Router();
router.post("/upload", authMiddleware, upload.single("pdf"), uploadPDF);
router.get("/download/:filename", authMiddleware, downloadPDF);
module.exports = router;
