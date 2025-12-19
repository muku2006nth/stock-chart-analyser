import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./db.js";

import analyzeRoute from "./routes/analyze.js";
import fundamentalsRoute from "./routes/fundamentals.js";
import newsRoute from "./routes/news.js";
import technicalsRoute from "./routes/technicals.js";

dotenv.config();

const app = express();

/* ---------- CORS (VERCEL + LOCAL SAFE) ---------- */
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
  })
);

app.use(express.json());

/* ---------- DB ---------- */
connectDB();

/* ---------- HEALTH CHECK ---------- */
app.get("/", (req, res) => {
  res.send("Stock Analyzer Backend Running");
});

/* ---------- ROUTES ---------- */
app.use("/api/analyze", analyzeRoute);
app.use("/api/fundamentals", fundamentalsRoute);
app.use("/api/news", newsRoute);
app.use("/api/technicals", technicalsRoute);

/* ---------- PORT (RENDER SAFE) ---------- */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(
    "TWELVE DATA API KEY:",
    process.env.TWELVE_DATA_API_KEY ? "LOADED" : "MISSING"
  );
});
