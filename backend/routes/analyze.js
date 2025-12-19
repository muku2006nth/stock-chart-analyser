import express from "express";
import multer from "multer";
import path from "path";
import { exec } from "child_process";
import fs from "fs";

const router = express.Router();

/* ---------- ensure uploads dir ---------- */
const uploadDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

/* ---------- multer config ---------- */
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

/* ---------- analyze route ---------- */
router.post("/", upload.single("chart"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Chart image missing" });
    }

    const imagePath = path.resolve(uploadDir, req.file.filename);

    // Python script placed directly inside backend/
    const SCRIPT_PATH = path.resolve(
      process.cwd(),
      "analyze_chart.py"
    );

    console.log("CWD:", process.cwd());
    console.log("SCRIPT PATH:", SCRIPT_PATH);

    exec(
      `python3 "${SCRIPT_PATH}" "${imagePath}"`,
      (error, stdout, stderr) => {
        if (error) {
          console.error("Python error:", stderr);
          return res.status(500).json({
            error: "Python execution failed",
            details: stderr
          });
        }

        let result;
        try {
          result = JSON.parse(stdout);
        } catch (err) {
          console.error("Invalid Python output:", stdout);
          return res.status(500).json({
            error: "Invalid Python output",
            raw: stdout
          });
        }

        /* ---------- SAFE DEFAULTS ---------- */
        const trend = result.trend || "Unknown";
        const confidence = Number(result.confidence) || 0;
        const verdict = result.verdict || "HOLD";
        const reason =
          result.reason || "Insufficient data to determine verdict";

        /* ---------- OPTIONAL NEWS (placeholder) ---------- */
        const news = result.news || [];

        /* ---------- FINAL RESPONSE ---------- */
        return res.json({
          trend,
          confidence,
          verdict,
          reason,
          news
        });
      }
    );
  } catch (err) {
    console.error("Analyze route failed:", err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

export default router;
