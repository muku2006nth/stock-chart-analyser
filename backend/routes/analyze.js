import express from "express";
import multer from "multer";
import path from "path";
import { exec } from "child_process";
import axios from "axios";
import Fundamental from "../models/Fundamental.js";

const router = express.Router();

/* ---------- MULTER CONFIG ---------- */
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname);
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

    const imagePath = path.resolve("uploads", req.file.filename);

    /* ---------- PYTHON EXECUTION ---------- */
    const PYTHON_PATH = path.resolve(
      "..",
      "analyzer",
      "venv",
      "Scripts",
      "python.exe"
    );

    const SCRIPT_PATH = path.resolve(
      "..",
      "analyzer",
      "analyze_chart.py"
    );

    exec(
      `"${PYTHON_PATH}" "${SCRIPT_PATH}" "${imagePath}"`,
      async (error, stdout, stderr) => {
        if (error) {
          return res.status(500).json({
            error: "Python execution failed",
            details: stderr
          });
        }

        let result;
        try {
          result = JSON.parse(stdout);
        } catch {
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

        /* ---------- TECHNICAL INDICATOR (RSI - TWELVE DATA) ---------- */
        const symbol = req.body?.symbol;
        let rsi = null;

        if (symbol) {
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
            console.log("RSI fetch failed");
          }
        }

        /* ---------- FUNDAMENTALS FUSION ---------- */
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

        // Adjust verdict using fundamentals
        if (verdict === "BUY" && fundamentalScore === 0) {
          verdict = "HOLD";
          reason = "Technical signals positive, but fundamentals are weak";
        }

        /* ---------- FINAL RESPONSE ---------- */
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
    res.status(500).json({ error: "Analysis failed" });
  }
});

export default router;
