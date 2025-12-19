import express from "express";
import multer from "multer";
import path from "path";
import { exec } from "child_process";
import fs from "fs";

const router = express.Router();

/* ------------------ Ensure uploads folder exists ------------------ */
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

/* ------------------ Multer config ------------------ */
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

/* ------------------ POST /api/analyze ------------------ */
router.get("/", (req, res) => {
  res.json({ status: "Analyze API is alive" });
});

router.post("/", upload.single("chart"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Chart image missing" });
    }

    const imagePath = path.join(uploadDir, req.file.filename);

    /**
     * IMPORTANT (Render):
     * process.cwd() === /opt/render/project/src/backend
     * analyzer folder is at /opt/render/project/src/analyzer
     */
    const PYTHON_PATH = "python3";
    const SCRIPT_PATH = path.join(
      process.cwd(),
      "..",
      "analyzer",
      "analyze_chart.py"
    );
    console.log("SCRIPT PATH:", SCRIPT_PATH);
    console.log("CWD:", process.cwd());


    exec(
      `${PYTHON_PATH} "${SCRIPT_PATH}" "${imagePath}"`,
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
        } catch (parseErr) {
          console.error("Invalid Python output:", stdout);
          return res.status(500).json({
            error: "Invalid Python output",
            raw: stdout
          });
        }

        return res.json({
          file: req.file.filename,
          trend: result.trend,
          confidence: result.confidence,
          verdict: result.verdict,
          reason: result.reason
        });
      }
    );
  } catch (err) {
    console.error("Analyze route error:", err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

export default router;
