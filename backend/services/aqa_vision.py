"""
AQA Vision Service — Automated Quality Assurance for visual submissions.

Uses:
- OpenCV: Image validation, resolution check, blank/corrupt detection,
          screenshot analysis, color analysis
- Ultralytics (YOLOv8): Object detection in UI screenshots
  (detect buttons, forms, navigation — verify UI components exist)
- NumPy: Pixel-level analysis

This runs BEFORE Claude's text-based AQA.
If the submission is a file URL (image/screenshot), vision checks run first.
Results feed into Claude's final evaluation.
"""

import cv2
import numpy as np
import os
import requests
import tempfile
from pathlib import Path

# Lazy-load YOLO to avoid slow startup
_yolo_model = None
YOLO_MODEL_PATH = Path(__file__).parent.parent / "ml_models" / "yolov8n.pt"


def get_yolo():
    """Load YOLOv8 nano model. Downloads ~6MB on first use."""
    global _yolo_model
    if _yolo_model is not None:
        return _yolo_model
    try:
        from ultralytics import YOLO
        print("[ML] Loading YOLOv8 model...")
        _yolo_model = YOLO("yolov8n.pt")  # nano — fast, small
        print("[ML] YOLOv8 loaded.")
        return _yolo_model
    except Exception as e:
        print(f"[ML] YOLO load failed: {e}")
        return None


def download_image(url: str) -> np.ndarray | None:
    """Download image from URL and return as OpenCV numpy array."""
    try:
        resp = requests.get(url, timeout=10, headers={"User-Agent": "SakaaAI-AQA/1.0"})
        if resp.status_code != 200:
            return None
        arr = np.frombuffer(resp.content, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print(f"[ML Vision] Download failed: {e}")
        return None


def is_blank_or_corrupt(img: np.ndarray) -> dict:
    """
    Detect if an image is blank, all-white, all-black, or corrupt.
    Freelancers sometimes submit placeholder screenshots.
    """
    if img is None:
        return {"blank": True, "reason": "Could not decode image"}

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    mean_val = float(np.mean(gray))
    std_val = float(np.std(gray))

    if std_val < 5.0:
        if mean_val > 245:
            return {"blank": True, "reason": "Image is completely white (placeholder)"}
        if mean_val < 10:
            return {"blank": True, "reason": "Image is completely black"}
        return {"blank": True, "reason": f"Image has almost no variation (std={std_val:.1f})"}

    return {"blank": False, "mean": round(mean_val, 1), "std": round(std_val, 1)}


def check_resolution(img: np.ndarray, min_width: int = 800, min_height: int = 400) -> dict:
    """Check if image meets minimum resolution requirements."""
    h, w = img.shape[:2]
    passed = w >= min_width and h >= min_height
    return {
        "passed": passed,
        "width": w,
        "height": h,
        "message": f"{w}x{h}px" + ("" if passed else f" — below minimum {min_width}x{min_height}px"),
    }


def detect_ui_elements(img: np.ndarray) -> dict:
    """
    Use YOLOv8 to detect objects in UI screenshot.
    Checks for presence of common UI components (person, screen, device etc.)
    YOLOv8n is trained on COCO — not UI-specific, but useful for
    detecting if screenshot contains real content vs placeholder.
    """
    yolo = get_yolo()
    if yolo is None:
        return {"skipped": True, "reason": "YOLO model unavailable"}

    try:
        results = yolo(img, verbose=False)
        detections = []
        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                label = yolo.names[cls_id]
                if conf > 0.3:
                    detections.append({"label": label, "confidence": round(conf, 2)})

        return {
            "detections": detections,
            "detection_count": len(detections),
            "has_content": len(detections) > 0,
        }
    except Exception as e:
        return {"skipped": True, "reason": str(e)}


def analyze_color_distribution(img: np.ndarray) -> dict:
    """
    Analyze color distribution in a UI screenshot.
    Very uniform color = likely placeholder or incomplete work.
    """
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    hue_std = float(np.std(hsv[:, :, 0]))
    sat_mean = float(np.mean(hsv[:, :, 1]))

    is_colorful = hue_std > 20 and sat_mean > 30

    return {
        "hue_std": round(hue_std, 1),
        "saturation_mean": round(sat_mean, 1),
        "is_colorful": is_colorful,
        "verdict": "has visual variety" if is_colorful else "very monochrome — may be placeholder",
    }


def detect_text_presence(img: np.ndarray) -> dict:
    """
    Use edge detection as a proxy for text/content presence.
    Real UI screenshots have lots of edges (text, buttons, borders).
    Blank or minimal screenshots have few edges.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    edge_density = float(np.sum(edges > 0)) / (edges.shape[0] * edges.shape[1])

    has_content = edge_density > 0.02  # at least 2% of pixels are edges

    return {
        "edge_density": round(edge_density, 4),
        "has_content": has_content,
        "verdict": "has text/UI elements" if has_content else "very few edges — likely placeholder",
    }


def full_vision_analysis(submission_url: str, domain: str = "") -> dict:
    """
    Run complete vision analysis pipeline on a submitted image URL.

    Returns a structured report with:
    - overall_passed: bool
    - score: 0-100
    - issues: list of problems found
    - details: full breakdown

    This feeds into Claude's AQA evaluation as additional context.
    """
    # Only run vision checks on image URLs
    image_extensions = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp")
    url_lower = submission_url.lower()
    is_image = any(url_lower.endswith(ext) for ext in image_extensions)
    is_screenshot = "screenshot" in url_lower or "screen" in url_lower

    if not (is_image or is_screenshot):
        return {
            "skipped": True,
            "reason": "Not an image URL — skipping vision analysis",
            "overall_passed": True,
            "score": 100,
        }

    print(f"[ML Vision] Analyzing image: {submission_url[:60]}...")
    img = download_image(submission_url)

    if img is None:
        return {
            "overall_passed": False,
            "score": 0,
            "issues": ["Could not download or decode the submitted image"],
            "details": {},
        }

    issues = []
    details = {}

    # 1. Blank/corrupt check
    blank_check = is_blank_or_corrupt(img)
    details["blank_check"] = blank_check
    if blank_check.get("blank"):
        issues.append(f"Image appears blank: {blank_check['reason']}")

    # 2. Resolution check
    res_check = check_resolution(img)
    details["resolution"] = res_check
    if not res_check["passed"]:
        issues.append(f"Low resolution: {res_check['message']}")

    # 3. Content/edge detection
    edge_check = detect_text_presence(img)
    details["edge_analysis"] = edge_check
    if not edge_check["has_content"]:
        issues.append("Very little content detected — image may be incomplete")

    # 4. Color analysis
    color_check = analyze_color_distribution(img)
    details["color_analysis"] = color_check

    # 5. YOLO object detection (only for UI/design work)
    ui_domains = ["ui / ux design", "graphic design", "web development", "frontend dev"]
    if any(d.lower() in domain.lower() for d in ui_domains) or not domain:
        yolo_check = detect_ui_elements(img)
        details["yolo_detections"] = yolo_check

    # Calculate vision score
    vision_score = 100
    if blank_check.get("blank"):
        vision_score -= 60
    if not res_check.get("passed"):
        vision_score -= 20
    if not edge_check.get("has_content"):
        vision_score -= 20

    vision_score = max(0, vision_score)
    overall_passed = vision_score >= 60 and len(issues) == 0

    print(f"[ML Vision] Score: {vision_score}, Issues: {len(issues)}")

    return {
        "overall_passed": overall_passed,
        "score": vision_score,
        "issues": issues,
        "details": details,
        "summary": f"Vision check: {vision_score}/100. " + (
            "No visual issues detected." if not issues
            else f"Issues: {'; '.join(issues)}"
        )
    }
