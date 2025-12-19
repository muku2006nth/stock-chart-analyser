import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";
import path from "path";

import connectDB from "./db.js";
import technicalsRoute from "./routes/technicals.js";
import analyzeRoute from "./routes/analyze.js";
import fundamentalsRoute from "./routes/fundamentals.js";
import newsRoute from "./routes/news.js";

dotenv.config();

const app = express();

/* =========================
   CORS (RENDER SAFE)
========================= */
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
  })
);

/* =========================
   BODY PARSER
========================= */
app.use(express.json());

/* =========================
   ENSURE UPLOADS FOLDER
   (CRITICAL FOR RENDER)
========================= */
const uploadsDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log("📁 uploads/ directory created");
}

/* =========================
   DATABASE
========================= */
connectDB();

/* =========================
   HEALTH CHECK
========================= */
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/* =========================
   ROUTES
========================= */
app.get("/", (req, res) => {
  res.send("Stock Analyzer Backend Running");
});

app.use("/api/analyze", analyzeRoute);
app.use("/api/fundamentals", fundamentalsRoute);
app.use("/api/news", newsRoute);
app.use("/api/technicals", technicalsRoute);

/* =========================
   SERVER (RENDER PORT FIX)
========================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(
    "🔑 ALPHA VANTAGE API KEY:",
    process.env.ALPHA_VANTAGE_API_KEY ? "LOADED" : "MISSING"
  );
});
