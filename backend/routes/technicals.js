import express from "express";
import axios from "axios";

const router = express.Router();

router.get("/:symbol", async (req, res) => {
  const { symbol } = req.params;

  try {
    // RSI
    const rsiRes = await axios.get("https://api.twelvedata.com/rsi", {
      params: {
        symbol: `${symbol}.NSE`,
        interval: "1day",
        time_period: 14,
        apikey: process.env.TWELVE_DATA_API_KEY
      }
    });

    // EMA
    const emaRes = await axios.get("https://api.twelvedata.com/ema", {
      params: {
        symbol: `${symbol}.NSE`,
        interval: "1day",
        time_period: 20,
        apikey: process.env.TWELVE_DATA_API_KEY
      }
    });

    res.json({
      symbol,
      rsi: rsiRes.data.values?.[0]?.rsi,
      ema: emaRes.data.values?.[0]?.ema
    });

  } catch (err) {
    res.status(500).json({ error: "Failed to fetch technical indicators" });
  }
});

export default router;
