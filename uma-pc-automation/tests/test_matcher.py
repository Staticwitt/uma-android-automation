"""Tests for vision/matcher.py — OpenCV template matching wrapper."""

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

# conftest.py has already stubbed cv2 into sys.modules.
import vision.matcher as matcher_module
from vision.matcher import MatchResult, load_template, match, match_all

cv2 = sys.modules["cv2"]


# ── MatchResult properties ────────────────────────────────────────────────────

def test_match_result_right():
    r = MatchResult(left=10, top=20, width=50, height=30, confidence=0.9)
    assert r.right == 60


def test_match_result_bottom():
    r = MatchResult(left=10, top=20, width=50, height=30, confidence=0.9)
    assert r.bottom == 50


def test_match_result_center_x():
    r = MatchResult(left=10, top=20, width=50, height=30, confidence=0.9)
    assert r.center_x == 35  # 10 + 50//2


def test_match_result_center_y():
    r = MatchResult(left=10, top=20, width=50, height=30, confidence=0.9)
    assert r.center_y == 35  # 20 + 30//2


def test_match_result_center_truncates():
    r = MatchResult(left=0, top=0, width=11, height=11, confidence=1.0)
    assert r.center_x == 5  # 0 + 11//2
    assert r.center_y == 5


# ── match ─────────────────────────────────────────────────────────────────────

def _fake_frame(h: int = 100, w: int = 100) -> np.ndarray:
    return np.zeros((h, w, 3), dtype=np.uint8)


def _fake_template(h: int = 20, w: int = 30) -> np.ndarray:
    return np.zeros((h, w, 3), dtype=np.uint8)


def _setup_match(max_val: float, max_loc: tuple[int, int]) -> MagicMock:
    corr = np.zeros((80, 70), dtype=np.float32)
    cv2.matchTemplate.return_value = corr
    cv2.minMaxLoc.return_value = (0.0, max_val, (0, 0), max_loc)
    return cv2


def test_match_returns_none_below_threshold():
    _setup_match(max_val=0.7, max_loc=(5, 10))
    result = match(_fake_frame(), _fake_template(), threshold=0.8)
    assert result is None


def test_match_returns_result_at_threshold():
    _setup_match(max_val=0.8, max_loc=(5, 10))
    result = match(_fake_frame(), _fake_template(), threshold=0.8)
    assert result is not None
    assert result.confidence == pytest.approx(0.8)


def test_match_location_from_max_loc():
    _setup_match(max_val=0.95, max_loc=(15, 25))
    template = _fake_template(h=20, w=30)
    result = match(_fake_frame(), template, threshold=0.8)
    assert result is not None
    assert result.left == 15
    assert result.top == 25


def test_match_size_from_template():
    _setup_match(max_val=0.95, max_loc=(0, 0))
    template = _fake_template(h=40, w=60)
    result = match(_fake_frame(200, 200), template, threshold=0.8)
    assert result is not None
    assert result.width == 60
    assert result.height == 40


def test_match_calls_tm_ccoeff_normed():
    _setup_match(max_val=0.9, max_loc=(0, 0))
    frame, template = _fake_frame(), _fake_template()
    cv2.matchTemplate.reset_mock()
    match(frame, template)
    cv2.matchTemplate.assert_called_once_with(frame, template, cv2.TM_CCOEFF_NORMED)


def test_match_raises_without_cv2():
    with patch.object(matcher_module, "_CV2_AVAILABLE", False):
        with pytest.raises(RuntimeError, match="cv2 not available"):
            match(_fake_frame(), _fake_template())


# ── match_all ─────────────────────────────────────────────────────────────────

def _make_corr_map(hits: list[tuple[int, int, float]], shape: tuple[int, int]) -> np.ndarray:
    """Build a fake correlation map with specified (x, y, value) hits."""
    arr = np.zeros(shape, dtype=np.float32)
    for x, y, val in hits:
        arr[y, x] = val
    return arr


def test_match_all_empty_when_no_hits():
    corr = _make_corr_map([], (80, 70))
    cv2.matchTemplate.return_value = corr
    results = match_all(_fake_frame(), _fake_template(), threshold=0.8)
    assert results == []


def test_match_all_single_hit():
    corr = _make_corr_map([(10, 20, 0.9)], (80, 70))
    cv2.matchTemplate.return_value = corr
    template = _fake_template(h=20, w=30)
    results = match_all(_fake_frame(), template, threshold=0.8)
    assert len(results) == 1
    assert results[0].left == 10
    assert results[0].top == 20
    assert results[0].confidence == pytest.approx(0.9)


def test_match_all_suppresses_overlapping_hits():
    # Two hits at (10,20) and (12,22) — within template size (30×20), so one suppressed.
    corr = _make_corr_map([(10, 20, 0.95), (12, 22, 0.90)], (80, 70))
    cv2.matchTemplate.return_value = corr
    results = match_all(_fake_frame(), _fake_template(h=20, w=30), threshold=0.8)
    assert len(results) == 1
    assert results[0].confidence == pytest.approx(0.95)  # higher-confidence one kept


def test_match_all_keeps_non_overlapping_hits():
    # Two hits far apart: (5,5) and (60,60) — both outside 30×20 NMS window.
    corr = _make_corr_map([(5, 5, 0.95), (60, 60, 0.90)], (100, 100))
    cv2.matchTemplate.return_value = corr
    results = match_all(_fake_frame(200, 200), _fake_template(h=20, w=30), threshold=0.8)
    assert len(results) == 2


def test_match_all_sorted_by_confidence_descending():
    corr = _make_corr_map([(5, 5, 0.85), (60, 60, 0.95)], (100, 100))
    cv2.matchTemplate.return_value = corr
    results = match_all(_fake_frame(200, 200), _fake_template(h=20, w=30), threshold=0.8)
    assert len(results) == 2
    assert results[0].confidence > results[1].confidence


def test_match_all_raises_without_cv2():
    with patch.object(matcher_module, "_CV2_AVAILABLE", False):
        with pytest.raises(RuntimeError, match="cv2 not available"):
            match_all(_fake_frame(), _fake_template())


# ── load_template ─────────────────────────────────────────────────────────────

def test_load_template_raises_when_file_missing():
    with pytest.raises(FileNotFoundError, match="Template not found"):
        load_template("nonexistent_template.png")


def test_load_template_raises_when_cv2_imread_returns_none(tmp_path):
    # Create a real file but make cv2.imread return None (corrupt image scenario).
    fake_png = tmp_path / "fake.png"
    fake_png.write_bytes(b"not a real image")
    cv2.imread.return_value = None
    with patch.object(matcher_module, "TEMPLATES_DIR", tmp_path):
        with pytest.raises(ValueError, match="cv2.imread failed"):
            load_template("fake.png")


def test_load_template_returns_cv2_imread_result(tmp_path):
    fake_png = tmp_path / "ok.png"
    fake_png.write_bytes(b"dummy")
    sentinel = np.zeros((20, 30, 3), dtype=np.uint8)
    cv2.imread.return_value = sentinel
    with patch.object(matcher_module, "TEMPLATES_DIR", tmp_path):
        result = load_template("ok.png")
    assert result is sentinel


def test_load_template_raises_without_cv2():
    with patch.object(matcher_module, "_CV2_AVAILABLE", False):
        with pytest.raises(RuntimeError, match="cv2 not available"):
            load_template("any.png")
