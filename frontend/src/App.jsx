import { useState } from "react";

function App() {
  const [symbol, setSymbol] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_BASE = "https://stock-analyser-backend-yx4e.onrender.com";

  const handleFileChange = e => {
    const f = e.target.files[0];
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
    setResult(null);
    setError("");
  };

  const handleUpload = async () => {
    if (!file) return setError("Upload a chart image");

    setLoading(true);
    setError("");
    setResult(null);

    const fd = new FormData();
    fd.append("chart", file);
    if (symbol) fd.append("symbol", symbol);

    try {
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        body: fd
      });

      if (!res.ok) throw new Error();
      setResult(await res.json());
    } catch {
      setError("Backend connection failed");
    } finally {
      setLoading(false);
    }
  };

  const verdictColor = {
    BUY: "#22c55e",
    SELL: "#ef4444",
    HOLD: "#facc15"
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1>📈 Stock Chart Analyzer</h1>

        <input
          placeholder="Stock symbol (eg: HDFC)"
          value={symbol}
          onChange={e => setSymbol(e.target.value)}
          style={styles.input}
        />

        <div style={styles.uploadBox}>
          <input type="file" onChange={handleFileChange} />
          <p>Upload chart image here</p>
        </div>

        {preview && <img src={preview} style={styles.preview} />}

        <button onClick={handleUpload} disabled={loading} style={styles.button}>
          {loading ? "Analyzing..." : "Upload & Analyze"}
        </button>

        {error && <p style={{ color: "#ef4444" }}>{error}</p>}

        {result && (
          <div style={{ marginTop: 20 }}>
            <div
              style={{
                ...styles.badge,
                background: verdictColor[result.verdict]
              }}
            >
              {result.verdict}
            </div>

            <p>Trend: {result.trend}</p>

            {/* Confidence bar */}
            <div style={styles.barWrap}>
              <div
                style={{
                  ...styles.bar,
                  width: `${result.confidence * 100}%`,
                  background: verdictColor[result.verdict]
                }}
              />
            </div>

            <p>{(result.confidence * 100).toFixed(1)}% confidence</p>
            <p style={{ color: "#94a3b8" }}>{result.reason}</p>

            {result.news?.length > 0 && (
              <div style={{ textAlign: "left", marginTop: 15 }}>
                <h3>📰 Latest News</h3>
                {result.news.map((n, i) => (
                  <a
                    key={i}
                    href={n.url}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.news}
                  >
                    • {n.title} ({n.source})
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- styles ---------- */
const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "radial-gradient(circle, #020617, #000)",
    color: "white"
  },
  card: {
    width: "90%",
    maxWidth: 520,
    padding: 30,
    borderRadius: 16,
    background: "#020617",
    boxShadow: "0 0 40px rgba(37,99,235,.4)",
    textAlign: "center"
  },
  input: {
    width: "100%",
    padding: 12,
    borderRadius: 8,
    border: "none",
    marginBottom: 10
  },
  uploadBox: {
    border: "2px dashed #64748b",
    padding: 20,
    borderRadius: 12
  },
  preview: {
    width: "100%",
    borderRadius: 12,
    marginTop: 10
  },
  button: {
    width: "100%",
    padding: 14,
    marginTop: 15,
    borderRadius: 10,
    border: "none",
    background: "#2563eb",
    color: "white",
    fontSize: 16
  },
  badge: {
    padding: "8px 16px",
    borderRadius: 999,
    display: "inline-block",
    fontWeight: "bold"
  },
  barWrap: {
    height: 10,
    background: "#1e293b",
    borderRadius: 6,
    overflow: "hidden",
    marginTop: 6
  },
  bar: {
    height: "100%",
    transition: "width .8s ease"
  },
  news: {
    display: "block",
    color: "#60a5fa",
    textDecoration: "none",
    marginBottom: 6
  }
};

export default App;
