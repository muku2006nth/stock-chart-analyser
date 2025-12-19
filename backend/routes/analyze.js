import express from "express";
import multer from "multer";
import path from "path";
import { exec } from "child_process";
import fs from "fs";
import axios from "axios";
import Fundamental from "../models/Fundamental.js";

const router = express.Router();

/* ----------------- ENSURE UPLOAD DIR ----------------- */
const uploadDir = path.resolve(process.cwd(), "backend", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* ----------------- MULTER CONFIG ----------------- */
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

/* ----------------- ANALYZE ROUTE ----------------- */
router.post("/", upload.single("chart"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Chart image missing" });
    }

    const imagePath = path.resolve(uploadDir, req.file.filename);

    /* -------- PYTHON (RENDER SAFE) -------- */
    const PYTHON_BIN = "python3";
    const SCRIPT_PATH = path.resolve(
      process.cwd(),
      "backend",
      "analyzer",
      "analyze_chart.py"
    );

    exec(
      `${PYTHON_BIN} "${SCRIPT_PATH}" "${imagePath}"`,
      async (error, stdout, stderr) => {
        if (error) {
          console.error("Python error:", stderr);
          return res.status(500).json({
            error: "Python execution failed",
            details: stderr
          });
        }

        let chartResult;
        try {
          chartResult = JSON.parse(stdout);
        } catch {
          return res.status(500).json({
            error: "Invalid Python output",
            raw: stdout
          });
        }

        /* -------- INITIAL VERDICT (CHART) -------- */
        let verdict = "HOLD";
        let reason = "Neutral market structure";
        const { trend, confidence } = chartResult;

        if (trend === "Uptrend" && confidence >= 0.6) {
          verdict = "BUY";
          reason = "Strong bullish trend detected";
        } else if (trend === "Downtrend" && confidence >= 0.6) {
          verdict = "SELL";
          reason = "Strong bearish trend detected";
        }

        /* -------- RSI (TWELVE DATA) -------- */
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

        /* -------- FUNDAMENTALS (MONGO) -------- */
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
          reason = "Bullish chart, but weak fundamentals";
        }

        /* -------- FINAL RESPONSE -------- */
        return res.json({
          trend,
          confidence,
          rsi,
          verdict,
          reason
        });
      }
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Analysis failed" });
  }
});

export default router;
