"""
Digit OCR for reading Uma Musume stat values from screen regions.

Uses EasyOCR with the English model (Arabic numerals only — no Japanese needed
for stat digits). cv2 handles grayscale preprocessing before passing to the reader.

Both easyocr and cv2 are optional at import time; StatOcr.__init__ raises
RuntimeError if either is absent.
"""

from __future__ import annotations

from typing import Optional

import numpy as np

try:
    import cv2

    _CV2_AVAILABLE = True
except ImportError:
    _CV2_AVAILABLE = False

try:
    import easyocr

    _EASYOCR_AVAILABLE = True
except ImportError:
    _EASYOCR_AVAILABLE = False

# Digits only — stat values are always non-negative integers.
_DIGIT_ALLOWLIST = "0123456789"


class StatOcr:
    """
    Reads numeric stat values from BGR image regions captured by ScreenCapture.

    Create one instance per bot run — EasyOCR loads a ~40 MB model on first
    construction and is expensive to reload.

    Args:
        gpu: Pass True to use GPU inference (faster). Requires CUDA.
    """

    def __init__(self, gpu: bool = True) -> None:
        if not _CV2_AVAILABLE:
            raise RuntimeError(
                "cv2 not available. Install opencv-python on Windows."
            )
        if not _EASYOCR_AVAILABLE:
            raise RuntimeError(
                "easyocr not available. Install with: pip install easyocr"
            )
        self._reader = easyocr.Reader(["en"], gpu=gpu, verbose=False)

    def preprocess(self, image: np.ndarray) -> np.ndarray:
        """
        Convert a BGR crop to a binary grayscale image suitable for digit OCR.

        The stat panel uses bright digits on a colored background. Grayscale +
        Otsu threshold produces clean black-on-white digits regardless of the
        exact background hue. If the image is already single-channel, the
        cvtColor step is skipped.
        """
        if image.ndim == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return binary

    def read_digits(self, image: np.ndarray) -> Optional[int]:
        """
        Read a single non-negative integer from *image*.

        Preprocesses the crop, runs EasyOCR with the digit allowlist, and
        concatenates any detected text segments into one integer. Returns None
        when no digits are detected or the result can't be parsed as an integer.
        """
        processed = self.preprocess(image)
        results: list[str] = self._reader.readtext(
            processed,
            allowlist=_DIGIT_ALLOWLIST,
            detail=0,
            paragraph=True,
        )
        text = "".join(results).strip().replace(" ", "")
        if not text:
            return None
        try:
            return int(text)
        except ValueError:
            return None
