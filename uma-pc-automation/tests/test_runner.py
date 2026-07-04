"""Tests for bot/runner.py — build_bot assembly."""

from unittest.mock import MagicMock, patch

import pytest

from bot.runner import RunConfig, build_bot
from bot.state_machine import BotStateMachine, LoopConfig, ScreenState
from bot.types import (
    DateYear,
    GameDateSnapshot,
    StatName,
    TrainingConfig,
    TrainingScoringConstants,
)


# ── helpers ───────────────────────────────────────────────────────────────────

def _training_config() -> TrainingConfig:
    return TrainingConfig(
        current_stats={s: 500 for s in StatName},
        stat_prioritization=list(StatName),
        summer_training_stat_priority=list(StatName),
        stat_targets={s: 1200 for s in StatName},
        current_date=GameDateSnapshot(year=DateYear.JUNIOR),
        scenario="URA Finals",
        enable_rainbow_training_bonus=False,
    )


def _run_config(**kwargs) -> RunConfig:
    return RunConfig(training_config=_training_config(), **kwargs)


# ── build_bot ─────────────────────────────────────────────────────────────────

def test_build_bot_raises_when_window_not_found():
    with patch("bot.runner.find_game_window", return_value=None):
        with pytest.raises(RuntimeError, match="game window not found"):
            build_bot(_run_config())


def test_build_bot_returns_bot_state_machine():
    window = MagicMock()
    window.rect = (0, 0, 1920, 1080)
    fake_template = MagicMock()

    with patch("bot.runner.find_game_window", return_value=window), \
         patch("bot.runner.ScreenCapture"), \
         patch("bot.runner.TemplateDetector.load"), \
         patch("bot.runner.load_template", return_value=fake_template):
        sm = build_bot(_run_config())

    assert isinstance(sm, BotStateMachine)


def test_build_bot_wires_detect_to_detector():
    window = MagicMock()
    window.rect = (0, 0, 1920, 1080)
    fake_detector = MagicMock()
    fake_template = MagicMock()

    with patch("bot.runner.find_game_window", return_value=window), \
         patch("bot.runner.ScreenCapture"), \
         patch("bot.runner.TemplateDetector.load", return_value=fake_detector), \
         patch("bot.runner.load_template", return_value=fake_template):
        sm = build_bot(_run_config())

    assert sm.detect == fake_detector.detect


def test_build_bot_registers_four_handlers():
    window = MagicMock()
    window.rect = (0, 0, 1920, 1080)
    fake_template = MagicMock()

    with patch("bot.runner.find_game_window", return_value=window), \
         patch("bot.runner.ScreenCapture"), \
         patch("bot.runner.TemplateDetector.load"), \
         patch("bot.runner.load_template", return_value=fake_template):
        sm = build_bot(_run_config())

    registered = set(sm._handlers.keys())
    assert ScreenState.CONFIRM_DIALOG in registered
    assert ScreenState.TRAINING_SELECT in registered
    assert ScreenState.RACE_SELECT in registered
    assert ScreenState.SKILL_SELECT in registered


def test_build_bot_passes_loop_config():
    window = MagicMock()
    window.rect = (0, 0, 1920, 1080)
    fake_template = MagicMock()
    loop_cfg = LoopConfig(poll_interval=2.5, max_unknown_streak=10)

    with patch("bot.runner.find_game_window", return_value=window), \
         patch("bot.runner.ScreenCapture"), \
         patch("bot.runner.TemplateDetector.load"), \
         patch("bot.runner.load_template", return_value=fake_template):
        sm = build_bot(_run_config(loop_config=loop_cfg))

    assert sm.config.poll_interval == 2.5
    assert sm.config.max_unknown_streak == 10


def test_build_bot_loads_six_templates():
    # confirm_ok.png (1) + 5 training button templates = 6 total load_template calls
    window = MagicMock()
    window.rect = (0, 0, 1920, 1080)
    fake_template = MagicMock()

    with patch("bot.runner.find_game_window", return_value=window), \
         patch("bot.runner.ScreenCapture"), \
         patch("bot.runner.TemplateDetector.load"), \
         patch("bot.runner.load_template", return_value=fake_template) as mock_load:
        build_bot(_run_config())

    assert mock_load.call_count == 6


# ── RunConfig defaults ────────────────────────────────────────────────────────

def test_run_config_defaults():
    cfg = _run_config()
    assert cfg.capture_device_idx == 0
    assert cfg.detector_threshold == 0.8
    assert isinstance(cfg.scoring_constants, TrainingScoringConstants)
    assert isinstance(cfg.loop_config, LoopConfig)
