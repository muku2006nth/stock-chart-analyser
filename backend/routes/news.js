import express from "express";
import axios from "axios";

const router = express.Router();

router.get("/:symbol", async (req, res) => {
  const { symbol } = req.params;

  try {
    const response = await axios.get(
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

    const articles = response.data.articles.map(a => ({
      title: a.title,
      url: a.url,
      source: a.source.name
    }));

    res.json({ articles });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

export default router;
