import express from "express";
import axios from "axios";

const router = express.Router();

router.get("/:symbol", async (req, res) => {
  const { symbol } = req.params;

  try {
    const response = await axios.get(
      "https://www.alphavantage.co/query",
      {
        params: {
          function: "OVERVIEW",
          symbol,
          apikey: process.env.ALPHA_VANTAGE_API_KEY
        }
      }
    );

    res.json({
      symbol,
      pe: response.data.PERatio,
      eps: response.data.EPS,
      marketCap: response.data.MarketCapitalization
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch fundamentals" });
  }
});

export default router;
