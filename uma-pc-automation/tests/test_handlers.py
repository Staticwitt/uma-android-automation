"""Tests for bot/handlers.py — per-state action handlers."""

from unittest.mock import MagicMock, call, patch

import numpy as np
import pytest

from bot.handlers import (
    TRAINING_TEMPLATE_NAMES,
    _completion_fraction,
    _completion_ranking,
    _effective_value,
    make_confirm_handler,
    make_race_skip_handler,
    make_skill_skip_handler,
    make_training_handler,
)
from bot.types import StatName, TrainingConfig, GameDateSnapshot, DateYear
from vision.matcher import MatchResult


# ── helpers ───────────────────────────────────────────────────────────────────

def _frame() -> np.ndarray:
    return np.zeros((600, 800, 3), dtype=np.uint8)


def _template() -> np.ndarray:
    return np.zeros((20, 30, 3), dtype=np.uint8)


def _rect() -> tuple[int, int, int, int]:
    return (100, 200, 900, 800)


def _result(cx: int = 50, cy: int = 60) -> MatchResult:
    return MatchResult(left=cx - 15, top=cy - 10, width=30, height=20, confidence=0.9)


_UNSET = object()


def _sm(frame=_UNSET) -> MagicMock:
    sm = MagicMock()
    sm.grab.return_value = _frame() if frame is _UNSET else frame
    return sm


def _config(priority: list[StatName]) -> TrainingConfig:
    return TrainingConfig(
        current_stats={s: 500 for s in StatName},
        stat_prioritization=priority,
        summer_training_stat_priority=list(StatName),
        stat_targets={s: 1200 for s in StatName},
        current_date=GameDateSnapshot(year=DateYear.JUNIOR),
        scenario="URA Finals",
        enable_rainbow_training_bonus=False,
    )


# ── make_confirm_handler ──────────────────────────────────────────────────────

def test_confirm_handler_clicks_ok_button():
    ok_template = _template()
    ok_result = _result(cx=400, cy=300)
    handler = make_confirm_handler(_rect(), ok_template)
    sm = _sm()

    with patch("bot.handlers.match", return_value=ok_result) as mock_match, \
         patch("bot.handlers.click_center") as mock_click:
        handler(sm)

    mock_match.assert_called_once_with(sm.grab.return_value, ok_template, threshold=0.8)
    mock_click.assert_called_once_with(_rect(), ok_result)


def test_confirm_handler_does_nothing_when_no_match():
    handler = make_confirm_handler(_rect(), _template())
    sm = _sm()

    with patch("bot.handlers.match", return_value=None), \
         patch("bot.handlers.click_center") as mock_click:
        handler(sm)

    mock_click.assert_not_called()


def test_confirm_handler_does_nothing_on_none_frame():
    handler = make_confirm_handler(_rect(), _template())
    sm = _sm(frame=None)

    with patch("bot.handlers.match") as mock_match, \
         patch("bot.handlers.click_center") as mock_click:
        handler(sm)

    mock_match.assert_not_called()
    mock_click.assert_not_called()


def test_confirm_handler_passes_threshold():
    handler = make_confirm_handler(_rect(), _template(), threshold=0.95)
    sm = _sm()

    with patch("bot.handlers.match", return_value=None) as mock_match:
        handler(sm)

    _, kwargs = mock_match.call_args
    assert kwargs["threshold"] == 0.95


# ── make_training_handler ─────────────────────────────────────────────────────

def test_training_handler_clicks_highest_priority_stat():
    # Priority: [STAMINA, SPEED]. Both visible — STAMINA should be clicked.
    stamina_result = _result(cx=200, cy=100)
    speed_result = _result(cx=300, cy=100)

    templates = {StatName.SPEED: _template(), StatName.STAMINA: _template()}
    config = _config(priority=[StatName.STAMINA, StatName.SPEED])
    handler = make_training_handler(_rect(), config, templates)
    sm = _sm()

    def fake_match(frame, template, threshold=0.8):
        if template is templates[StatName.STAMINA]:
            return stamina_result
        if template is templates[StatName.SPEED]:
            return speed_result
        return None

    with patch("bot.handlers.match", side_effect=fake_match), \
         patch("bot.handlers.click_center") as mock_click:
        handler(sm)

    mock_click.assert_called_once_with(_rect(), stamina_result)


def test_training_handler_skips_to_second_priority_when_first_missing():
    # Priority: [WIT, SPEED]. WIT not visible — should click SPEED.
    speed_result = _result(cx=300, cy=100)
    templates = {StatName.SPEED: _template(), StatName.WIT: _template()}
    config = _config(priority=[StatName.WIT, StatName.SPEED])
    handler = make_training_handler(_rect(), config, templates)
    sm = _sm()

    def fake_match(frame, template, threshold=0.8):
        return speed_result if template is templates[StatName.SPEED] else None

    with patch("bot.handlers.match", side_effect=fake_match), \
         patch("bot.handlers.click_center") as mock_click:
        handler(sm)

    mock_click.assert_called_once_with(_rect(), speed_result)


def test_training_handler_falls_back_when_no_priority_stat_visible():
    # Priority: [GUTS]. Only SPEED visible — falls back to SPEED.
    speed_result = _result(cx=300, cy=100)
    templates = {StatName.SPEED: _template(), StatName.GUTS: _template()}
    config = _config(priority=[StatName.GUTS])
    handler = make_training_handler(_rect(), config, templates)
    sm = _sm()

    def fake_match(frame, template, threshold=0.8):
        return speed_result if template is templates[StatName.SPEED] else None

    with patch("bot.handlers.match", side_effect=fake_match), \
         patch("bot.handlers.click_center") as mock_click:
        handler(sm)

    mock_click.assert_called_once_with(_rect(), speed_result)


def test_training_handler_does_nothing_when_no_buttons_visible():
    templates = {StatName.SPEED: _template()}
    config = _config(priority=[StatName.SPEED])
    handler = make_training_handler(_rect(), config, templates)
    sm = _sm()

    with patch("bot.handlers.match", return_value=None), \
         patch("bot.handlers.click_center") as mock_click:
        handler(sm)

    mock_click.assert_not_called()


def test_training_handler_does_nothing_on_none_frame():
    templates = {StatName.SPEED: _template()}
    config = _config(priority=[StatName.SPEED])
    handler = make_training_handler(_rect(), config, templates)
    sm = _sm(frame=None)

    with patch("bot.handlers.match") as mock_match, \
         patch("bot.handlers.click_center") as mock_click:
        handler(sm)

    mock_match.assert_not_called()
    mock_click.assert_not_called()


# ── make_race_skip_handler ────────────────────────────────────────────────────

def test_race_skip_handler_presses_escape():
    handler = make_race_skip_handler()
    sm = _sm()

    with patch("bot.handlers.press") as mock_press:
        handler(sm)

    mock_press.assert_called_once_with("escape")


# ── make_skill_skip_handler ───────────────────────────────────────────────────

def test_skill_skip_handler_presses_escape():
    handler = make_skill_skip_handler()
    sm = _sm()

    with patch("bot.handlers.press") as mock_press:
        handler(sm)

    mock_press.assert_called_once_with("escape")


# ── make_training_handler with OCR ───────────────────────────────────────────

def _ocr_with_values(values: dict[StatName, int | None]) -> MagicMock:
    ocr = MagicMock()
    def read_digits(crop):
        # We can't distinguish crops by content here, so OCR is mocked at
        # handler level via _read_stats in the integration tests below.
        return 500
    ocr.read_digits.side_effect = read_digits
    return ocr


def _stat_regions() -> dict[StatName, tuple[int, int, int, int]]:
    return {s: (0, 0, 10, 10) for s in StatName}


def test_training_handler_uses_ocr_completion_ranking_when_available():
    # Speed at 1100/1200 (92% complete), Stamina at 100/1200 (8% complete).
    # OCR ranking should put STAMINA first (most behind) → click STAMINA button.
    stamina_result = _result(cx=200, cy=100)
    speed_result   = _result(cx=300, cy=100)

    templates = {StatName.SPEED: _template(), StatName.STAMINA: _template()}
    # Config priority says SPEED first, but OCR should override to STAMINA.
    config = _config(priority=[StatName.SPEED, StatName.STAMINA])
    config.stat_targets = {s: 1200 for s in StatName}

    def fake_match(frame, template, threshold=0.8):
        if template is templates[StatName.STAMINA]:
            return stamina_result
        if template is templates[StatName.SPEED]:
            return speed_result
        return None

    # Patch _read_stats to return controlled stat values.
    ocr_stats = {StatName.SPEED: 1100, StatName.STAMINA: 100,
                 StatName.POWER: 500, StatName.GUTS: 500, StatName.WIT: 500}

    handler = make_training_handler(
        _rect(), config, templates, ocr=MagicMock(), stat_regions=_stat_regions()
    )
    sm = _sm()

    with patch("bot.handlers.match", side_effect=fake_match), \
         patch("bot.handlers._read_stats", return_value=ocr_stats), \
         patch("bot.handlers.click_center") as mock_click:
        handler(sm)

    mock_click.assert_called_once_with(_rect(), stamina_result)


def test_training_handler_falls_back_to_priority_when_all_ocr_none():
    # All OCR reads fail (return None) → should use config priority.
    speed_result = _result(cx=300, cy=100)
    templates = {StatName.SPEED: _template(), StatName.STAMINA: _template()}
    config = _config(priority=[StatName.SPEED, StatName.STAMINA])

    def fake_match(frame, template, threshold=0.8):
        return speed_result if template is templates[StatName.SPEED] else None

    all_none = {s: None for s in StatName}

    handler = make_training_handler(
        _rect(), config, templates, ocr=MagicMock(), stat_regions=_stat_regions()
    )
    sm = _sm()

    with patch("bot.handlers.match", side_effect=fake_match), \
         patch("bot.handlers._read_stats", return_value=all_none), \
         patch("bot.handlers.click_center") as mock_click:
        handler(sm)

    mock_click.assert_called_once_with(_rect(), speed_result)


def test_training_handler_uses_config_priority_without_ocr():
    speed_result = _result(cx=300, cy=100)
    templates = {StatName.SPEED: _template()}
    config = _config(priority=[StatName.SPEED])
    handler = make_training_handler(_rect(), config, templates)  # no ocr
    sm = _sm()

    with patch("bot.handlers.match", return_value=speed_result), \
         patch("bot.handlers.click_center") as mock_click:
        handler(sm)

    mock_click.assert_called_once()


# ── _effective_value ──────────────────────────────────────────────────────────

def test_effective_value_below_cap_is_identity():
    assert _effective_value(800) == 800.0


def test_effective_value_at_cap_is_cap():
    assert _effective_value(1200) == 1200.0


def test_effective_value_above_cap_is_half_weighted():
    # 1200 + (1400-1200)*0.5 = 1300
    assert _effective_value(1400) == pytest.approx(1300.0)


# ── _completion_ranking ───────────────────────────────────────────────────────

def _target_config(targets: dict[StatName, int]) -> TrainingConfig:
    cfg = _config(priority=list(StatName))
    cfg.stat_targets = targets
    return cfg


def test_completion_ranking_puts_lowest_first():
    ocr = {StatName.SPEED: 100, StatName.STAMINA: 1000,
           StatName.POWER: 500, StatName.GUTS: 500, StatName.WIT: 500}
    targets = {s: 1200 for s in StatName}
    ranked = _completion_ranking(ocr, _target_config(targets))
    assert ranked[0] == StatName.SPEED  # 100/1200 ≈ 8%


def test_completion_ranking_treats_none_as_zero():
    ocr = {StatName.SPEED: None, StatName.STAMINA: 1000,
           StatName.POWER: 500, StatName.GUTS: 500, StatName.WIT: 500}
    targets = {s: 1200 for s in StatName}
    ranked = _completion_ranking(ocr, _target_config(targets))
    assert ranked[0] == StatName.SPEED  # None → treated as 0


def test_completion_ranking_applies_soft_cap_to_target():
    # Target 1400 → eff_target = 1300; current 1200 → eff_current = 1200
    # completion = 1200/1300 ≈ 92%
    # Target 1200 at current 1100: eff = 1100/1200 ≈ 92% — similar
    # Stat with a higher above-cap target appears farther behind.
    ocr = {s: 1200 for s in StatName}
    targets = {StatName.SPEED: 1400, **{s: 1200 for s in StatName if s != StatName.SPEED}}
    ranked = _completion_ranking(ocr, _target_config(targets))
    # SPEED has highest target (1400 → eff 1300) and current 1200 → lowest completion
    assert ranked[0] == StatName.SPEED


def test_completion_ranking_treats_confirmed_zero_same_as_none():
    # A genuine OCR read of 0 (stat truly at zero) must rank as low as a
    # failed read (None) — both represent "most in need of training".
    ocr_zero = {StatName.SPEED: 0, StatName.STAMINA: 1000,
                StatName.POWER: 500, StatName.GUTS: 500, StatName.WIT: 500}
    ocr_none = {StatName.SPEED: None, StatName.STAMINA: 1000,
                StatName.POWER: 500, StatName.GUTS: 500, StatName.WIT: 500}
    targets = {s: 1200 for s in StatName}
    ranked_zero = _completion_ranking(ocr_zero, _target_config(targets))
    ranked_none = _completion_ranking(ocr_none, _target_config(targets))
    assert ranked_zero == ranked_none
    assert ranked_zero[0] == StatName.SPEED


# ── _completion_fraction ──────────────────────────────────────────────────────

def test_completion_fraction_normal_case():
    assert _completion_fraction(600, 1200) == pytest.approx(0.5)


def test_completion_fraction_zero_target_does_not_raise():
    # A user-supplied stat_targets of 0 must not trigger ZeroDivisionError.
    assert _completion_fraction(500, 0) == 1.0


def test_completion_fraction_zero_current_and_zero_target():
    assert _completion_fraction(0, 0) == 1.0


# ── training handler with zero stat target (no crash) ────────────────────────

def test_training_handler_does_not_crash_with_zero_stat_target():
    speed_result = _result(cx=300, cy=100)
    templates = {StatName.SPEED: _template()}
    config = _config(priority=[StatName.SPEED])
    config.stat_targets = {StatName.SPEED: 0, **{
        s: 1200 for s in StatName if s != StatName.SPEED
    }}
    ocr_stats = {s: 500 for s in StatName}

    handler = make_training_handler(
        _rect(), config, templates, ocr=MagicMock(), stat_regions=_stat_regions(),
    )
    sm = _sm()

    with patch("bot.handlers.match", return_value=speed_result), \
         patch("bot.handlers._read_stats", return_value=ocr_stats), \
         patch("bot.handlers.click_center"):
        handler(sm)  # Should not raise ZeroDivisionError


# ── tracker integration ───────────────────────────────────────────────────────

def test_training_handler_calls_tracker_after_click():
    speed_result = _result(cx=300, cy=100)
    templates = {StatName.SPEED: _template()}
    config = _config(priority=[StatName.SPEED])
    tracker = MagicMock()

    handler = make_training_handler(_rect(), config, templates, tracker=tracker)
    sm = _sm()

    with patch("bot.handlers.match", return_value=speed_result), \
         patch("bot.handlers.click_center"):
        handler(sm)

    tracker.record_training.assert_called_once()


def test_training_handler_passes_ocr_stats_to_tracker():
    speed_result = _result(cx=300, cy=100)
    templates = {StatName.SPEED: _template()}
    config = _config(priority=[StatName.SPEED])
    tracker = MagicMock()
    ocr_stats = {s: 500 for s in StatName}

    handler = make_training_handler(
        _rect(), config, templates,
        ocr=MagicMock(), stat_regions=_stat_regions(), tracker=tracker,
    )
    sm = _sm()

    with patch("bot.handlers.match", return_value=speed_result), \
         patch("bot.handlers._read_stats", return_value=ocr_stats), \
         patch("bot.handlers.click_center"):
        handler(sm)

    tracker.record_training.assert_called_once_with(ocr_stats)


def test_training_handler_does_not_call_tracker_when_no_buttons_visible():
    templates = {StatName.SPEED: _template()}
    config = _config(priority=[StatName.SPEED])
    tracker = MagicMock()

    handler = make_training_handler(_rect(), config, templates, tracker=tracker)
    sm = _sm()

    with patch("bot.handlers.match", return_value=None), \
         patch("bot.handlers.click_center"):
        handler(sm)

    tracker.record_training.assert_not_called()


def test_training_handler_does_not_call_tracker_when_frame_is_none():
    templates = {StatName.SPEED: _template()}
    config = _config(priority=[StatName.SPEED])
    tracker = MagicMock()

    handler = make_training_handler(_rect(), config, templates, tracker=tracker)
    sm = _sm(frame=None)

    handler(sm)

    tracker.record_training.assert_not_called()


def test_training_handler_no_tracker_does_not_raise():
    speed_result = _result(cx=300, cy=100)
    templates = {StatName.SPEED: _template()}
    config = _config(priority=[StatName.SPEED])

    handler = make_training_handler(_rect(), config, templates)  # tracker=None default
    sm = _sm()

    with patch("bot.handlers.match", return_value=speed_result), \
         patch("bot.handlers.click_center"):
        handler(sm)  # Should not raise AttributeError


# ── TRAINING_TEMPLATE_NAMES coverage ─────────────────────────────────────────

def test_training_template_names_covers_all_stats():
    assert set(TRAINING_TEMPLATE_NAMES.keys()) == set(StatName)
