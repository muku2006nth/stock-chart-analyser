import { useState } from "react";

function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ Backend API (Render)
  const API_BASE = import.meta.env.VITE_API_URL;
  console.log("API BASE:", API_BASE);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    setFile(selected);
    setResult(null);
    setError("");

    if (selected) {
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please upload a chart image");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("chart", file);

    try {
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        throw new Error("Backend connection failed");
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError("❌ Backend connection failed");
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
    <div
      style={{
        width: "100vw",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background:
          "radial-gradient(circle at top, rgb(2,6,23), rgb(0,0,0))",
        color: "white",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <div
        style={{
          maxWidth: "520px",
          width: "90%",
          padding: "30px",
          background: "rgb(2,6,23)",
          borderRadius: "16px",
          textAlign: "center",
          boxShadow: "0 0 40px rgba(25,109,255,0.3)"
        }}
      >
        <h1 style={{ marginBottom: "20px" }}>
          📈 Stock Chart Analyzer
        </h1>

        {/* Upload Box */}
        <div
          style={{
            border: "2px dashed #64748b",
            padding: "20px",
            borderRadius: "12px",
            marginBottom: "15px"
          }}
        >
          <input type="file" onChange={handleFileChange} />
          <p style={{ color: "#94a3b8", marginTop: "10px" }}>
            Upload chart image here
          </p>
        </div>

        {/* Preview */}
        {preview && (
          <img
            src={preview}
            alt="preview"
            style={{
              width: "100%",
              borderRadius: "12px",
              marginBottom: "15px"
            }}
          />
        )}

        {/* Button */}
        <button
          onClick={handleUpload}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            fontSize: "16px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer"
          }}
        >
          {loading ? "Analyzing..." : "Upload & Analyze"}
        </button>

        {/* Error */}
        {error && (
          <p style={{ color: "#ef4444", marginTop: "15px" }}>
            {error}
          </p>
        )}

        {/* Result */}
        {result && (
          <div
            style={{
              marginTop: "20px",
              padding: "15px",
              borderRadius: "12px",
              background: "#020617"
            }}
          >
            <h2
              style={{
                color: verdictColor[result.verdict],
                marginBottom: "10px"
              }}
            >
              {result.verdict}
            </h2>
            <p>Trend: {result.trend}</p>
            <p>Confidence: {(result.confidence * 100).toFixed(1)}%</p>
            <p style={{ marginTop: "8px", color: "#94a3b8" }}>
              {result.reason}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
