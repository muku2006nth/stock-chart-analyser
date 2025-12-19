import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./db.js";
import technicalsRoute from "./routes/technicals.js";
import analyzeRoute from "./routes/analyze.js";
import fundamentalsRoute from "./routes/fundamentals.js";
import newsRoute from "./routes/news.js";


dotenv.config();

const app = express();

app.use(cors({
   orgin:"*"
}));
app.use(express.json());


connectDB();

app.get("/", (req, res) => {
  res.send("Stock Analyzer Backend Running");
});

app.use("/api/analyze", analyzeRoute);
app.use("/api/fundamentals", fundamentalsRoute);
app.use("/api/news", newsRoute);
app.use("/api/technicals", technicalsRoute);


const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(
    "API KEY LOADED:",
    process.env.ALPHA_VANTAGE_API_KEY ? "YES" : "NO"
  );
});
