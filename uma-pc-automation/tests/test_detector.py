"""Tests for bot/detector.py — TemplateDetector screen classification."""

from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from bot.detector import TemplateDetector
from bot.state_machine import ScreenState


def _frame() -> np.ndarray:
    return np.zeros((600, 800, 3), dtype=np.uint8)


def _template() -> np.ndarray:
    return np.zeros((20, 30, 3), dtype=np.uint8)


def _detector(*states: ScreenState, threshold: float = 0.8) -> TemplateDetector:
    """Build a TemplateDetector with one fake template per given state."""
    indicators = [(s, _template()) for s in states]
    return TemplateDetector(indicators, threshold=threshold)


# ── detect — basic behaviour ──────────────────────────────────────────────────

def test_detect_returns_unknown_when_nothing_matches():
    det = _detector(ScreenState.TRAINING_SELECT)
    with patch("bot.detector.match", return_value=None):
        assert det.detect(_frame()) == ScreenState.UNKNOWN


def test_detect_returns_state_when_template_matches():
    det = _detector(ScreenState.CONFIRM_DIALOG)
    fake_result = MagicMock()
    with patch("bot.detector.match", return_value=fake_result):
        assert det.detect(_frame()) == ScreenState.CONFIRM_DIALOG


def test_detect_returns_first_matching_state():
    # Both CONFIRM_DIALOG and TRAINING_SELECT would match, but CONFIRM_DIALOG
    # is listed first so it wins.
    det = _detector(ScreenState.CONFIRM_DIALOG, ScreenState.TRAINING_SELECT)
    fake_result = MagicMock()
    with patch("bot.detector.match", return_value=fake_result):
        assert det.detect(_frame()) == ScreenState.CONFIRM_DIALOG


def test_detect_skips_non_matching_and_returns_next():
    det = _detector(ScreenState.CONFIRM_DIALOG, ScreenState.TRAINING_SELECT)
    fake_result = MagicMock()
    # First call (CONFIRM_DIALOG) → None; second call (TRAINING_SELECT) → match
    with patch("bot.detector.match", side_effect=[None, fake_result]):
        assert det.detect(_frame()) == ScreenState.TRAINING_SELECT


def test_detect_passes_threshold_to_match():
    det = _detector(ScreenState.TRAINING_SELECT, threshold=0.95)
    with patch("bot.detector.match", return_value=None) as mock_match:
        det.detect(_frame())
    _, kwargs = mock_match.call_args
    assert kwargs["threshold"] == 0.95


# ── detection priority ordering ───────────────────────────────────────────────

def test_confirm_dialog_detected_before_training_select():
    """Verify CONFIRM_DIALOG precedes TRAINING_SELECT in _INDICATOR_NAMES."""
    from bot.detector import _INDICATOR_NAMES

    states = [s for s, _ in _INDICATOR_NAMES]
    confirm_idx = states.index(ScreenState.CONFIRM_DIALOG)
    training_idx = states.index(ScreenState.TRAINING_SELECT)
    assert confirm_idx < training_idx


def test_all_five_states_have_indicators():
    from bot.detector import _INDICATOR_NAMES

    detectable = {s for s, _ in _INDICATOR_NAMES}
    expected = {
        ScreenState.CONFIRM_DIALOG,
        ScreenState.SKILL_SELECT,
        ScreenState.RACE_SELECT,
        ScreenState.TRAINING_SELECT,
        ScreenState.RUN_COMPLETE,
    }
    assert expected == detectable


# ── TemplateDetector.load ─────────────────────────────────────────────────────

def test_load_calls_load_template_for_each_indicator():
    from bot.detector import _INDICATOR_NAMES

    sentinel = _template()
    with patch("bot.detector.load_template", return_value=sentinel) as mock_load:
        det = TemplateDetector.load(threshold=0.9)
    assert mock_load.call_count == len(_INDICATOR_NAMES)


def test_load_preserves_threshold():
    sentinel = _template()
    with patch("bot.detector.load_template", return_value=sentinel):
        det = TemplateDetector.load(threshold=0.75)
    assert det._threshold == 0.75
