"""
Bot assembly — wires capture, detection, and handlers into a runnable BotStateMachine.

Call ``build_bot(run_config)`` to get a fully-configured machine; then call
``.run()`` to start the loop (or ``.detect`` / ``.grab`` for one-shot testing).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

import numpy as np

from bot.detector import TemplateDetector
from bot.handlers import (
    TRAINING_TEMPLATE_NAMES,
    make_confirm_handler,
    make_race_skip_handler,
    make_skill_skip_handler,
    make_training_handler,
)
from bot.layout import STAT_REGIONS
from bot.state_machine import BotStateMachine, LoopConfig, ScreenState
from bot.tracker import TurnTracker
from bot.types import StatName, TrainingConfig, TrainingScoringConstants
from capture.screen import ScreenCapture
from capture.window import find_game_window
from vision.matcher import load_template
from vision.ocr import StatOcr

logger = logging.getLogger(__name__)


@dataclass
class RunConfig:
    """Top-level configuration for one bot run."""

    training_config: TrainingConfig
    scoring_constants: TrainingScoringConstants = field(
        default_factory=TrainingScoringConstants
    )
    loop_config: LoopConfig = field(default_factory=LoopConfig)
    capture_device_idx: int = 0
    detector_threshold: float = 0.8
    ocr_gpu: bool = True
    # Override stat regions if the default layout.STAT_REGIONS don't match
    # your screen resolution or window position.
    stat_regions: Optional[dict[StatName, tuple[int, int, int, int]]] = None
    # Directory for crash screenshots. Created if it doesn't exist.
    log_dir: Path = field(default_factory=lambda: Path("logs"))


def _crash_handler(log_dir: Path):
    """Return a callback that saves a crash screenshot to *log_dir*."""
    try:
        import cv2 as _cv2
    except ImportError:
        _cv2 = None

    def on_crash(frame: np.ndarray) -> None:
        log_dir.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        path = log_dir / f"crash_{ts}.png"
        if _cv2 is not None:
            try:
                _cv2.imwrite(str(path), frame)
                logger.error("Crash screenshot saved: %s", path)
            except Exception:
                logger.exception("Failed to write crash screenshot")
        else:
            logger.error("cv2 unavailable — crash screenshot not saved")

    return on_crash


def build_bot(run_config: RunConfig) -> BotStateMachine:
    """
    Assemble and return a fully-wired BotStateMachine.

    Raises:
        RuntimeError: if the game window is not found or templates are missing.
    """
    window = find_game_window()
    if window is None:
        raise RuntimeError(
            "Uma Musume game window not found. "
            "Start the DMM client and launch the game before running the bot."
        )

    capture = ScreenCapture(device_idx=run_config.capture_device_idx)
    ocr = StatOcr(gpu=run_config.ocr_gpu)
    detector = TemplateDetector.load(threshold=run_config.detector_threshold)
    tracker = TurnTracker(training_config=run_config.training_config)

    sm = BotStateMachine(
        capture=capture,
        window=window,
        config=run_config.loop_config,
    )
    sm.detect = detector.detect
    sm.on_crash = _crash_handler(run_config.log_dir)

    confirm_template = load_template("confirm_ok.png")
    training_templates = {
        stat: load_template(name) for stat, name in TRAINING_TEMPLATE_NAMES.items()
    }
    stat_regions = run_config.stat_regions or STAT_REGIONS

    sm.register(
        ScreenState.CONFIRM_DIALOG,
        make_confirm_handler(
            window.rect, confirm_template, threshold=run_config.detector_threshold
        ),
    )
    sm.register(
        ScreenState.TRAINING_SELECT,
        make_training_handler(
            window.rect,
            run_config.training_config,
            training_templates,
            threshold=run_config.detector_threshold,
            ocr=ocr,
            stat_regions=stat_regions,
            tracker=tracker,
        ),
    )
    sm.register(ScreenState.RACE_SELECT, make_race_skip_handler())
    sm.register(ScreenState.SKILL_SELECT, make_skill_skip_handler())

    logger.info(
        "Bot assembled | window=%s | scenario=%s | ocr_gpu=%s",
        window.title,
        run_config.training_config.scenario,
        run_config.ocr_gpu,
    )
    return sm
