import cv2
import numpy as np
import sys
import json
import os

# -------------------------------
# 1. Validate arguments
# -------------------------------
if len(sys.argv) < 2:
    print(json.dumps({
        "error": "No image path provided"
    }))
    sys.exit(1)

image_path = sys.argv[1]
image_path = os.path.abspath(image_path)

# -------------------------------
# 2. Validate file existence
# -------------------------------
if not os.path.exists(image_path):
    print(json.dumps({
        "error": "Image file not found",
        "path": image_path
    }))
    sys.exit(1)

# -------------------------------
# 3. Load image
# -------------------------------
img = cv2.imread(image_path)

if img is None:
    print(json.dumps({
        "error": "OpenCV failed to load image",
        "path": image_path
    }))
    sys.exit(1)

# -------------------------------
# 4. Preprocessing
# -------------------------------
img = cv2.resize(img, (800, 400))
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
blur = cv2.GaussianBlur(gray, (5, 5), 0)
edges = cv2.Canny(blur, 50, 150)

# -------------------------------
# 5. Focus on price region
# -------------------------------
h, w = edges.shape
roi = edges[int(h * 0.2):int(h * 0.8), :]

ys, xs = np.where(roi > 0)

# -------------------------------
# 6. Handle low signal
# -------------------------------
if len(xs) < 100:
    print(json.dumps({
        "trend": "Sideways",
        "confidence": 0.1
    }))
    sys.exit(0)

# -------------------------------
# 7. Trend calculation
# -------------------------------
slope = np.polyfit(xs, ys, 1)[0]

confidence = min(abs(slope) * 10, 1.0)

if slope < -0.02:
    trend = "Uptrend"
elif slope > 0.02:
    trend = "Downtrend"
else:
    trend = "Sideways"

# -------------------------------
# 8. Final JSON output
# -------------------------------
print(json.dumps({
    "trend": trend,
    "confidence": round(confidence, 2)
}))
