import cv2
import sys
import json
import numpy as np

image_path = sys.argv[1]

img = cv2.imread(image_path)
if img is None:
    print(json.dumps({"error": "Image not readable"}))
    sys.exit(1)

gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
edges = cv2.Canny(gray, 50, 150)

# Edge density as volatility proxy
edge_density = np.sum(edges > 0) / edges.size

# Simple trend proxy using brightness gradient
h, w = gray.shape
left_mean = np.mean(gray[:, :w//3])
right_mean = np.mean(gray[:, 2*w//3:])

trend = "Sideways"
confidence = 0.4

if right_mean > left_mean * 1.05:
    trend = "Uptrend"
    confidence = min(0.9, 0.5 + edge_density)
elif left_mean > right_mean * 1.05:
    trend = "Downtrend"
    confidence = min(0.9, 0.5 + edge_density)

result = {
    "trend": trend,
    "confidence": round(confidence, 2),
    "volatility": round(edge_density, 3)
}

print(json.dumps(result))
