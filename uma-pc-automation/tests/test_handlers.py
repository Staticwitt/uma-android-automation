"""Tests for bot/handlers.py — per-state action handlers."""

from unittest.mock import MagicMock, call, patch

import numpy as np
import pytest

from bot.handlers import (
    TRAINING_TEMPLATE_NAMES,
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


# ── TRAINING_TEMPLATE_NAMES coverage ─────────────────────────────────────────

def test_training_template_names_covers_all_stats():
    assert set(TRAINING_TEMPLATE_NAMES.keys()) == set(StatName)
