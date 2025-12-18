import { useState } from "react";

function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [symbol, setSymbol] = useState("");
  const [result, setResult] = useState(null);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    setFile(selected);
    setResult(null);
    setError("");
    setNews([]);

    if (selected) {
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      alert("Please upload a chart image");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setNews([]);

    const formData = new FormData();
    formData.append("chart", file);
    if (symbol) formData.append("symbol", symbol);

    try {
      const res = await fetch("http://localhost:5000/api/analyze", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        fetchNews(symbol);
      }
    } catch {
      setError("Backend connection failed");
    } finally {
      setLoading(false);
    }
  };

  const fetchNews = async (symbol) => {
    if (!symbol) return;

    try {
      const res = await fetch(
        `http://localhost:5000/api/news/${symbol}`
      );
      const data = await res.json();
      setNews(data.articles || []);
    } catch {
      console.log("News fetch failed");
    }
  };

  const verdictColor = (v) => {
    if (v === "BUY") return "green";
    if (v === "SELL") return "red";
    if (v === "HOLD") return "#f4b400";
    return "#fff";
  };

  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "radial-gradient(circle at top, #020617, #000)",
        color: "#fff",
        fontFamily: "Arial"
      }}
    >
      <div
        style={{
          maxWidth: "520px",
          width: "90%",
          padding: "30px",
          background: "#020617",
          borderRadius: "16px",
          textAlign: "center",
          boxShadow: "0 0 40px rgba(25, 43, 109, 0.7)"
        }}
      >
        <h1>📈 Stock Chart Analyzer</h1>

        {/* Symbol Input */}
        <input
          placeholder="Enter stock symbol (AAPL, TSLA)"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          style={{
            width: "100%",
            padding: "10px",
            margin: "15px 0",
            borderRadius: "8px",
            border: "none"
          }}
        />

        {/* Upload Box */}
        <div
          style={{
            border: "2px dashed #475569",
            padding: "20px",
            borderRadius: "12px",
            marginBottom: "15px"
          }}
        >
          <input type="file" accept="image/*" onChange={handleFileChange} />
          <p style={{ color: "#94a3b8" }}>Upload chart image here</p>
        </div>

        {/* Image Preview */}
        {preview && (
          <img
            src={preview}
            alt="preview"
            style={{
              width: "100%",
              maxHeight: "220px",
              objectFit: "contain",
              borderRadius: "8px",
              marginBottom: "15px"
            }}
          />
        )}

        <button
          onClick={handleAnalyze}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            fontSize: "16px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer"
          }}
        >
          {loading ? "Analyzing..." : "Upload & Analyze"}
        </button>

        {error && <p style={{ color: "red" }}>{error}</p>}

        {/* RESULT */}
        {result && (
          <div style={{ marginTop: "25px" }}>
            <p><b>Trend:</b> {result.trend}</p>

            {/* Confidence Bar */}
            <div
              style={{
                height: "10px",
                background: "#334155",
                borderRadius: "6px",
                margin: "10px 0"
              }}
            >
              <div
                style={{
                  width: `${result.confidence * 100}%`,
                  height: "100%",
                  background: "#22c55e",
                  borderRadius: "6px"
                }}
              />
            </div>

            <p>
              <b>Verdict:</b>{" "}
              <span style={{ color: verdictColor(result.verdict) }}>
                {result.verdict}
              </span>
            </p>
            <p style={{ color: "#cbd5f5" }}>{result.reason}</p>
          </div>
        )}

        {/* NEWS */}
        {news.length > 0 && (
          <div style={{ marginTop: "25px", textAlign: "left" }}>
            <h3>📰 Latest News</h3>
            {news.slice(0, 3).map((n, i) => (
              <p key={i} style={{ fontSize: "14px", color: "#94a3b8" }}>
                • {n.title}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
