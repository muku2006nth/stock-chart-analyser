import express from "express";
import multer from "multer";
import path from "path";
import { exec } from "child_process";
import fs from "fs";
import axios from "axios";
import Fundamental from "../models/Fundamental.js";

const router = express.Router();

/* ----------------- ENSURE UPLOADS DIR ----------------- */
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

/* ----------------- MULTER CONFIG ----------------- */
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

/* ----------------- ANALYZE ROUTE ----------------- */
router.post("/", upload.single("chart"), async (req, res) => {
  try {
    /* ---------- VALIDATION ---------- */
    if (!req.file) {
      return res.status(400).json({ error: "Chart image missing" });
    }

    const imagePath = path.resolve("uploads", req.file.filename);
    const symbol = req.body?.symbol;

    /* ---------- PYTHON (RENDER SAFE) ---------- */
    const PYTHON_PATH = "python3"; // Render has python3
    const SCRIPT_PATH = path.resolve("analyzer", "analyze_chart.py");

    exec(
      `${PYTHON_PATH} ${SCRIPT_PATH} "${imagePath}"`,
      async (error, stdout, stderr) => {
        if (error) {
          console.error("Python error:", stderr);
          return res.status(500).json({
            error: "Python execution failed"
          });
        }

        let chartResult;
        try {
          chartResult = JSON.parse(stdout);
        } catch (e) {
          return res.status(500).json({
            error: "Invalid Python output",
            raw: stdout
          });
        }

        const { trend, confidence, volatility } = chartResult;

        /* ---------- DEFAULT VERDICT ---------- */
        let verdict = "HOLD";
        let reason = "Insufficient confirmation";

        /* ---------- RSI (OPTIONAL) ---------- */
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
          } catch {
            console.log("RSI fetch failed");
          }
        }

        /* ---------- CHART + RSI DECISION ---------- */
        if (trend === "Uptrend" && confidence >= 0.65) {
          verdict = "BUY";
          reason = "Uptrend detected from chart";

          if (rsi !== null && rsi > 70) {
            verdict = "HOLD";
            reason = "Uptrend but RSI indicates overbought";
          }
        }

        if (trend === "Downtrend" && confidence >= 0.65) {
          verdict = "SELL";
          reason = "Downtrend detected from chart";

          if (rsi !== null && rsi < 30) {
            verdict = "HOLD";
            reason = "Downtrend but RSI indicates oversold";
          }
        }

        if (volatility !== undefined && volatility < 0.02) {
          verdict = "HOLD";
          reason = "Low volatility, unclear direction";
        }

        /* ---------- FUNDAMENTALS (OPTIONAL) ---------- */
        let fundamentalScore = 0;

        if (symbol) {
          try {
            const fundamentals = await Fundamental.findOne({ symbol });
            if (fundamentals?.data) {
              const pe = parseFloat(fundamentals.data.PERatio);
              const eps = parseFloat(fundamentals.data.EPS);

              if (!isNaN(pe) && pe < 25) fundamentalScore++;
              if (!isNaN(eps) && eps > 0) fundamentalScore++;
            }
          } catch {
            console.log("Fundamentals fetch failed");
          }
        }

        if (verdict === "BUY" && fundamentalScore === 0) {
          verdict = "HOLD";
          reason = "Technical signals positive, but fundamentals weak";
        }

        /* ---------- FINAL RESPONSE ---------- */
        res.json({
          file: req.file.filename,
          trend,
          confidence,
          volatility,
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
