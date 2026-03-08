import argparse
import base64
import hashlib
import io
import os
import re
from dataclasses import dataclass
from typing import Dict, Optional

import easyocr
import numpy as np
from flask import Flask, jsonify, request
from PIL import Image, ImageFilter, ImageOps

DATA_URL_PREFIX_RE = re.compile(r"^data:image/[a-zA-Z0-9.+-]+;base64,")
ALNUM_RE = re.compile(r"[^A-Za-z0-9]")
DEFAULT_FALLBACK_TEXT = os.getenv("OCR_FALLBACK_TEXT", "ABCDEF")


@dataclass
class OCRResult:
    text: str
    source: str


class OCRService:
    """Captcha OCR service with lightweight in-memory caching."""

    def __init__(self, model_dir: str = "./EasyOCR", cache_size: int = 256) -> None:
        self.reader = easyocr.Reader(["en"], model_storage_directory=model_dir)
        self.cache_size = cache_size
        self.cache: Dict[str, str] = {}

    def extract(self, image_data_url_or_base64: str) -> OCRResult:
        cache_key = hashlib.sha1(image_data_url_or_base64.encode("utf-8")).hexdigest()
        if cache_key in self.cache:
            return OCRResult(text=self.cache[cache_key], source="cache")

        image = self._decode_image(image_data_url_or_base64)
        processed = self._preprocess(image)
        text = self._run_ocr(processed)

        if len(self.cache) >= self.cache_size:
            # FIFO eviction using insertion order (Python 3.7+ dict ordering).
            self.cache.pop(next(iter(self.cache)))
        self.cache[cache_key] = text

        return OCRResult(text=text, source="ocr")

    @staticmethod
    def _decode_image(image_data_url_or_base64: str) -> Image.Image:
        payload = DATA_URL_PREFIX_RE.sub("", image_data_url_or_base64 or "")
        if not payload:
            raise ValueError("No base64 payload provided")

        try:
            image_bytes = base64.b64decode(payload)
        except Exception as exc:
            raise ValueError("Invalid base64 payload") from exc

        try:
            image = Image.open(io.BytesIO(image_bytes))
            image.load()
            return image
        except Exception as exc:
            raise ValueError("Invalid image data") from exc

    @staticmethod
    def _preprocess(image: Image.Image) -> np.ndarray:
        gray = image.convert("L")
        gray = ImageOps.autocontrast(gray)
        denoised = gray.filter(ImageFilter.MedianFilter(size=3))

        # Binary thresholding works well for high-contrast captchas.
        threshold = denoised.point(lambda px: 255 if px > 140 else 0)
        return np.array(threshold)

    @staticmethod
    def _normalize_text(raw_text: str) -> str:
        cleaned = ALNUM_RE.sub("", raw_text).upper()
        return cleaned

    def _run_ocr(self, image_array: np.ndarray) -> str:
        result = self.reader.readtext(image_array, detail=0)
        joined = "".join(result) if result else ""
        normalized = self._normalize_text(joined)
        return normalized or DEFAULT_FALLBACK_TEXT


app = Flask(__name__)
ocr_service: Optional[OCRService] = None


def get_ocr_service() -> OCRService:
    global ocr_service
    if ocr_service is None:
        ocr_service = OCRService()
    return ocr_service


@app.route("/extract-text", methods=["POST"])
def extract_text():
    data = request.get_json(silent=True) or {}
    base64_image = data.get("image", "")

    if not base64_image:
        return jsonify({"error": "No base64 image string provided"}), 400

    try:
        result = get_ocr_service().extract(base64_image)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception:
        return jsonify({"error": "OCR processing failed"}), 500

    return jsonify({"extracted_text": result.text, "source": result.source}), 200


@app.route("/")
def health_check():
    service = get_ocr_service()
    return (
        jsonify(
            {
                "status": "ok",
                "cache_size": len(service.cache),
                "fallback_text": DEFAULT_FALLBACK_TEXT,
            }
        ),
        200,
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the captcha OCR extraction server.")
    parser.add_argument(
        "--host",
        type=str,
        default="0.0.0.0",
        help="Host address to run the server on (default: 0.0.0.0)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=5000,
        help="Port to run the server on (default: 5000)",
    )
    parser.add_argument(
        "--cache-size",
        type=int,
        default=256,
        help="In-memory cache size for identical captcha payloads.",
    )
    args = parser.parse_args()

    ocr_service = OCRService(cache_size=args.cache_size)
    app.run(host=args.host, port=args.port)
