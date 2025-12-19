import express from "express";
import multer from "multer";
import path from "path";
import { exec } from "child_process";
import fs from "fs";
import axios from "axios";

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

    // Python script inside backend/
    const SCRIPT_PATH = path.resolve(process.cwd(), "analyze_chart.py");

    exec(`python3 "${SCRIPT_PATH}" "${imagePath}"`, async (error, stdout) => {
      if (error) {
        console.error("Python error:", error);
        return res.status(500).json({ error: "Python execution failed" });
      }

      let py;
      try {
        py = JSON.parse(stdout);
      } catch {
        return res.status(500).json({
          error: "Invalid Python output",
          raw: stdout
        });
      }

      /* ---------- SAFE VALUES ---------- */
      const trend = py.trend || "Sideways";
      const confidence = Number(py.confidence) || 0.5;

      let verdict = "HOLD";
      let reason = "Market is unclear";

      if (trend === "Uptrend" && confidence >= 0.6) {
        verdict = "BUY";
        reason = "Strong bullish structure detected";
      } else if (trend === "Downtrend" && confidence >= 0.6) {
        verdict = "SELL";
        reason = "Strong bearish momentum detected";
      }

      /* ---------- REAL NEWS (NewsAPI) ---------- */
      let news = [];
      const symbol = req.body?.symbol;

      if (symbol && process.env.NEWS_API_KEY) {
        try {
          const newsRes = await axios.get(
            "https://newsapi.org/v2/everything",
            {
              params: {
                q: symbol,
                language: "en",
                sortBy: "publishedAt",
                pageSize: 5,
                apiKey: process.env.NEWS_API_KEY
              }
            }
          );

          news = newsRes.data.articles.map(a => ({
            title: a.title,
            source: a.source.name,
            url: a.url
          }));
        } catch {
          console.log("News fetch failed");
        }
      }

      /* ---------- FINAL RESPONSE ---------- */
      res.json({
        trend,
        confidence,
        verdict,
        reason,
        news
      });
    });
  } catch (err) {
    console.error("Analyze route failed:", err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

export default router;
