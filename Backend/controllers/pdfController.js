const User = require("../models/user.js");
const { gfs } = require("../Config/gridfs.js");

// Upload PDF
const uploadPDF = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.resume = {
      filename: req.file.filename,
      contentType: req.file.contentType,
      uploadDate: new Date(),
    };

    await user.save();

    res.status(201).json({
      message: "File uploaded successfully",
      filename: user.resume.filename,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Upload failed" });
  }
};

// Download PDF
// controllers/pdfController.js
const downloadPDF = async (req, res) => {
  try {
    const files = await gfs.find({ filename: req.params.filename }).toArray();

    if (!files.length) {
      return res.status(404).json({ message: "File not found" });
    }

    const file = files[0];

    if (file.contentType !== "application/pdf") {
      return res.status(400).json({ message: "Not a PDF file" });
    }

    const downloadStream = gfs.openDownloadStream(file._id);
    res.set("Content-Type", file.contentType);
    res.set("Content-Disposition", `attachment; filename="${file.filename}"`);
    downloadStream.pipe(res);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ message: "Download failed" });
  }
};

module.exports = { uploadPDF, downloadPDF };
