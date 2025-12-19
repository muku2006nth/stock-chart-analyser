import express from "express";
import multer from "multer";
import path from "path";
import { exec } from "child_process";
import axios from "axios";
import Fundamental from "../models/Fundamental.js";
import fs from "fs";
import { fileURLToPath } from "url";

/* ---------- PATH FIX (ES MODULES) ---------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ---------- ENSURE UPLOADS FOLDER ---------- */
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

const router = express.Router();

/* ---------- MULTER CONFIG ---------- */
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

/* ---------- ANALYZE ROUTE ---------- */
router.post("/", upload.single("chart"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Chart image missing" });
    }

    const imagePath = path.join(UPLOAD_DIR, req.file.filename);

    /* ---------- PYTHON EXEC (RENDER SAFE) ---------- */
    const PYTHON_PATH = process.env.PYTHON_PATH || "python3";
    const SCRIPT_PATH = path.join(
      __dirname,
      "..",
      "analyzer",
      "analyze_chart.py"
    );

    exec(
      `"${PYTHON_PATH}" "${SCRIPT_PATH}" "${imagePath}"`,
      async (error, stdout, stderr) => {
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

        /* ---------- INITIAL VERDICT (CHART) ---------- */
        let verdict = "HOLD";
        let reason = "Market conditions are unclear";

        if (result.trend === "Uptrend" && result.confidence >= 0.6) {
          verdict = "BUY";
          reason = "Strong uptrend detected from chart pattern";
        } else if (result.trend === "Downtrend" && result.confidence >= 0.6) {
          verdict = "SELL";
          reason = "Strong downtrend detected from chart pattern";
        }

        /* ---------- RSI (TWELVE DATA) ---------- */
        const symbol = req.body?.symbol;
        let rsi = null;

        if (symbol && process.env.TWELVE_DATA_API_KEY) {
          try {
            const rsiRes = await axios.get(
              "https://api.twelvedata.com/rsi",
              {
                params: {
                  symbol: `${symbol}.NSE`,
                  interval: "1day",
                  time_period: 14,
                  apikey: process.env.TWELVE_DATA_API_KEY
                }
              }
            );

            rsi = parseFloat(rsiRes.data?.values?.[0]?.rsi);

            if (!isNaN(rsi)) {
              if (rsi > 70) {
                verdict = "SELL";
                reason = "RSI indicates overbought conditions";
              } else if (rsi < 30) {
                verdict = "BUY";
                reason = "RSI indicates oversold conditions";
              }
            }
          } catch (err) {
            console.warn("RSI fetch failed");
          }
        }

        /* ---------- FUNDAMENTALS ---------- */
        let fundamentalScore = 0;

        if (symbol) {
          const fundamentals = await Fundamental.findOne({ symbol });

          if (fundamentals?.data) {
            const pe = parseFloat(fundamentals.data.PERatio);
            const eps = parseFloat(fundamentals.data.EPS);

            if (!isNaN(pe) && pe < 25) fundamentalScore++;
            if (!isNaN(eps) && eps > 0) fundamentalScore++;
          }
        }

        if (verdict === "BUY" && fundamentalScore === 0) {
          verdict = "HOLD";
          reason = "Technical signals positive, but fundamentals are weak";
        }

        /* ---------- RESPONSE ---------- */
        res.json({
          file: req.file.filename,
          trend: result.trend,
          confidence: result.confidence,
          rsi,
          verdict,
          reason
        });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

export default router;
