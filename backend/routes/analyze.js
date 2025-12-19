import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

/* ---------- UPLOAD DIR ---------- */
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

/* ---------- MULTER ---------- */
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

/* ---------- ANALYZE ---------- */
router.post("/", upload.single("chart"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    // 🔥 MOCK ANALYSIS (NO PYTHON)
    res.json({
      file: req.file.filename,
      trend: "Downtrend",
      confidence: 0.71,
      rsi: 42,
      verdict: "HOLD",
      reason: "Render deployment running without Python analyzer"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Analyze failed" });
  }
});

export default router;
