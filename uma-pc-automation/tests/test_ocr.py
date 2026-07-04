"""Tests for vision/ocr.py — EasyOCR digit reader."""

import sys
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

import vision.ocr as ocr_module
from vision.ocr import StatOcr

cv2 = sys.modules["cv2"]
easyocr = sys.modules["easyocr"]


# ── StatOcr construction ──────────────────────────────────────────────────────

def test_init_raises_without_cv2():
    with patch.object(ocr_module, "_CV2_AVAILABLE", False):
        with pytest.raises(RuntimeError, match="cv2 not available"):
            StatOcr()


def test_init_raises_without_easyocr():
    with patch.object(ocr_module, "_EASYOCR_AVAILABLE", False):
        with pytest.raises(RuntimeError, match="easyocr not available"):
            StatOcr()


def test_init_creates_reader_with_english_model():
    easyocr.Reader.reset_mock()
    StatOcr(gpu=False)
    easyocr.Reader.assert_called_once_with(["en"], gpu=False, verbose=False)


def test_init_gpu_true_by_default():
    easyocr.Reader.reset_mock()
    StatOcr()
    _, kwargs = easyocr.Reader.call_args
    assert kwargs["gpu"] is True


# ── StatOcr.preprocess ────────────────────────────────────────────────────────

def _make_bgr(h: int = 40, w: int = 80) -> np.ndarray:
    return np.zeros((h, w, 3), dtype=np.uint8)


def _make_gray(h: int = 40, w: int = 80) -> np.ndarray:
    return np.zeros((h, w), dtype=np.uint8)


def _build_ocr() -> StatOcr:
    """Return a StatOcr whose Reader is a MagicMock (no real model loaded)."""
    ocr = StatOcr.__new__(StatOcr)
    ocr._reader = MagicMock()
    return ocr


def test_preprocess_converts_bgr_to_gray():
    ocr = _build_ocr()
    gray_sentinel = np.zeros((40, 80), dtype=np.uint8)
    cv2.cvtColor.return_value = gray_sentinel
    cv2.threshold.return_value = (0, gray_sentinel)

    ocr.preprocess(_make_bgr())

    cv2.cvtColor.assert_called_once()
    args = cv2.cvtColor.call_args[0]
    assert args[1] == cv2.COLOR_BGR2GRAY


def test_preprocess_skips_cvtcolor_for_single_channel():
    ocr = _build_ocr()
    gray = _make_gray()
    binary = np.zeros_like(gray)
    cv2.threshold.return_value = (0, binary)
    cv2.cvtColor.reset_mock()

    result = ocr.preprocess(gray)

    cv2.cvtColor.assert_not_called()
    assert result is binary


def test_preprocess_applies_otsu_threshold():
    ocr = _build_ocr()
    gray_sentinel = np.zeros((40, 80), dtype=np.uint8)
    binary = np.ones((40, 80), dtype=np.uint8) * 255
    cv2.cvtColor.return_value = gray_sentinel
    cv2.threshold.return_value = (128.0, binary)
    cv2.threshold.reset_mock()

    result = ocr.preprocess(_make_bgr())

    cv2.threshold.assert_called_once_with(
        gray_sentinel, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )
    assert result is binary


# ── StatOcr.read_digits ───────────────────────────────────────────────────────

def _ocr_with_readtext(return_value) -> StatOcr:
    ocr = _build_ocr()
    binary = _make_gray()
    cv2.cvtColor.return_value = binary
    cv2.threshold.return_value = (0, binary)
    ocr._reader.readtext.return_value = return_value
    return ocr


def test_read_digits_returns_integer_for_single_segment():
    ocr = _ocr_with_readtext(["1234"])
    assert ocr.read_digits(_make_bgr()) == 1234


def test_read_digits_joins_multiple_segments():
    ocr = _ocr_with_readtext(["12", "34"])
    assert ocr.read_digits(_make_bgr()) == 1234


def test_read_digits_returns_none_when_no_text():
    ocr = _ocr_with_readtext([])
    assert ocr.read_digits(_make_bgr()) is None


def test_read_digits_returns_none_for_empty_string():
    ocr = _ocr_with_readtext([""])
    assert ocr.read_digits(_make_bgr()) is None


def test_read_digits_returns_none_for_whitespace_only():
    ocr = _ocr_with_readtext([" "])
    assert ocr.read_digits(_make_bgr()) is None


def test_read_digits_strips_internal_spaces():
    # EasyOCR may emit segments with spaces; joined text should still parse.
    ocr = _ocr_with_readtext(["1 2 3"])
    assert ocr.read_digits(_make_bgr()) == 123


def test_read_digits_returns_zero():
    ocr = _ocr_with_readtext(["0"])
    assert ocr.read_digits(_make_bgr()) == 0


def test_read_digits_passes_digit_allowlist_to_readtext():
    ocr = _build_ocr()
    binary = _make_gray()
    cv2.cvtColor.return_value = binary
    cv2.threshold.return_value = (0, binary)
    ocr._reader.readtext.return_value = ["9"]

    ocr.read_digits(_make_bgr())

    _, kwargs = ocr._reader.readtext.call_args
    assert kwargs["allowlist"] == "0123456789"
    assert kwargs["detail"] == 0
    assert kwargs["paragraph"] is True
