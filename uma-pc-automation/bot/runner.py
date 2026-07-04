"""
Bot assembly — wires capture, detection, and handlers into a runnable BotStateMachine.

Call ``build_bot(run_config)`` to get a fully-configured machine; then call
``.run()`` to start the loop (or ``.detect`` / ``.grab`` for one-shot testing).
"""

from __future__ import annotations

from dataclasses import dataclass, field

from bot.detector import TemplateDetector
from bot.handlers import (
    TRAINING_TEMPLATE_NAMES,
    make_confirm_handler,
    make_race_skip_handler,
    make_skill_skip_handler,
    make_training_handler,
)
from bot.state_machine import BotStateMachine, LoopConfig, ScreenState
from bot.types import TrainingConfig, TrainingScoringConstants
from capture.screen import ScreenCapture
from capture.window import find_game_window
from vision.matcher import load_template


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
    detector = TemplateDetector.load(threshold=run_config.detector_threshold)

    sm = BotStateMachine(
        capture=capture,
        window=window,
        config=run_config.loop_config,
    )
    sm.detect = detector.detect

    confirm_template = load_template("confirm_ok.png")
    training_templates = {
        stat: load_template(name) for stat, name in TRAINING_TEMPLATE_NAMES.items()
    }

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
        ),
    )
    sm.register(ScreenState.RACE_SELECT, make_race_skip_handler())
    sm.register(ScreenState.SKILL_SELECT, make_skill_skip_handler())

    return sm
