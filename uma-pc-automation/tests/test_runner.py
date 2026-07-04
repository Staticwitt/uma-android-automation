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
         patch("bot.runner.StatOcr"), \
         patch("bot.runner.TemplateDetector.load"), \
         patch("bot.runner.load_template", return_value=fake_template) as mock_load:
        build_bot(_run_config())

    assert mock_load.call_count == 6


def test_build_bot_creates_stat_ocr():
    window = MagicMock()
    window.rect = (0, 0, 1920, 1080)
    fake_template = MagicMock()

    with patch("bot.runner.find_game_window", return_value=window), \
         patch("bot.runner.ScreenCapture"), \
         patch("bot.runner.StatOcr") as mock_ocr_cls, \
         patch("bot.runner.TemplateDetector.load"), \
         patch("bot.runner.load_template", return_value=fake_template):
        build_bot(_run_config(ocr_gpu=False))

    mock_ocr_cls.assert_called_once_with(gpu=False)


def test_build_bot_custom_stat_regions_override_defaults():
    window = MagicMock()
    window.rect = (0, 0, 1920, 1080)
    fake_template = MagicMock()
    custom_regions = {s: (0, 0, 5, 5) for s in StatName}

    with patch("bot.runner.find_game_window", return_value=window), \
         patch("bot.runner.ScreenCapture"), \
         patch("bot.runner.StatOcr"), \
         patch("bot.runner.TemplateDetector.load"), \
         patch("bot.runner.load_template", return_value=fake_template), \
         patch("bot.runner.make_training_handler") as mock_mth:
        build_bot(_run_config(stat_regions=custom_regions))

    _, kwargs = mock_mth.call_args
    assert kwargs["stat_regions"] is custom_regions


# ── RunConfig defaults ────────────────────────────────────────────────────────

def test_run_config_defaults():
    cfg = _run_config()
    assert cfg.capture_device_idx == 0
    assert cfg.detector_threshold == 0.8
    assert cfg.ocr_gpu is True
    assert cfg.stat_regions is None
    assert isinstance(cfg.scoring_constants, TrainingScoringConstants)
    assert isinstance(cfg.loop_config, LoopConfig)


def test_run_config_log_dir_default_is_logs():
    from pathlib import Path
    cfg = _run_config()
    assert cfg.log_dir == Path("logs")


def test_run_config_log_dir_can_be_overridden():
    from pathlib import Path
    cfg = _run_config(log_dir=Path("/tmp/mybot"))
    assert cfg.log_dir == Path("/tmp/mybot")


# ── TurnTracker creation ──────────────────────────────────────────────────────

def test_build_bot_creates_turn_tracker_and_passes_to_training_handler():
    from bot.tracker import TurnTracker

    window = MagicMock()
    window.rect = (0, 0, 1920, 1080)
    fake_template = MagicMock()

    with patch("bot.runner.find_game_window", return_value=window), \
         patch("bot.runner.ScreenCapture"), \
         patch("bot.runner.StatOcr"), \
         patch("bot.runner.TemplateDetector.load"), \
         patch("bot.runner.load_template", return_value=fake_template), \
         patch("bot.runner.TurnTracker") as mock_tracker_cls, \
         patch("bot.runner.make_training_handler") as mock_mth:
        build_bot(_run_config())

    mock_tracker_cls.assert_called_once()
    _, kwargs = mock_mth.call_args
    assert kwargs["tracker"] is mock_tracker_cls.return_value


# ── crash handler ─────────────────────────────────────────────────────────────

def test_build_bot_sets_on_crash_callback():
    window = MagicMock()
    window.rect = (0, 0, 1920, 1080)
    fake_template = MagicMock()

    with patch("bot.runner.find_game_window", return_value=window), \
         patch("bot.runner.ScreenCapture"), \
         patch("bot.runner.StatOcr"), \
         patch("bot.runner.TemplateDetector.load"), \
         patch("bot.runner.load_template", return_value=fake_template):
        sm = build_bot(_run_config())

    assert sm.on_crash is not None
    assert callable(sm.on_crash)


def test_crash_handler_saves_png_when_cv2_available(tmp_path):
    import numpy as np

    # _crash_handler uses a lazy `import cv2` inside the closure.
    # Patch the module-level cv2 that the closure will import.
    fake_cv2 = MagicMock()
    frame = np.zeros((100, 100, 3), dtype=np.uint8)

    with patch.dict("sys.modules", {"cv2": fake_cv2}):
        import importlib
        import bot.runner as runner_mod
        importlib.reload(runner_mod)
        handler = runner_mod._crash_handler(tmp_path)
        handler(frame)

    fake_cv2.imwrite.assert_called_once()
    saved_path = fake_cv2.imwrite.call_args[0][0]
    assert saved_path.startswith(str(tmp_path))
    assert saved_path.endswith(".png")


def test_crash_handler_does_not_raise_when_cv2_unavailable(tmp_path):
    import numpy as np
    from bot.runner import _crash_handler

    handler = _crash_handler(tmp_path)
    frame = np.zeros((10, 10, 3), dtype=np.uint8)
    # Should not raise even if cv2 write fails (cv2 may be a MagicMock here)
    handler(frame)


def test_crash_handler_creates_log_dir_if_missing(tmp_path):
    import numpy as np
    from bot.runner import _crash_handler

    log_dir = tmp_path / "new_subdir" / "logs"
    assert not log_dir.exists()
    handler = _crash_handler(log_dir)
    frame = np.zeros((10, 10, 3), dtype=np.uint8)
    handler(frame)
    assert log_dir.exists()
