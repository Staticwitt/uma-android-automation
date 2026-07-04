"""
State handlers — one callable per ScreenState.

Each ``make_*`` factory captures the context it needs and returns a
``Handler`` compatible with ``BotStateMachine.register``.

Training selection is priority-based: the bot clicks the training button
for the highest-priority stat from ``TrainingConfig.stat_prioritization``
that is currently visible on screen. Full gain-based scoring (via
scoring.py) can be layered on top once stat-gain OCR is in place.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Optional

import numpy as np

from bot.types import StatName, TrainingConfig
from input.controller import click_center, press
from vision.matcher import MatchResult, match

if TYPE_CHECKING:
    from bot.state_machine import BotStateMachine

# Template names for each training button, keyed by stat.
TRAINING_TEMPLATE_NAMES: dict[StatName, str] = {
    StatName.SPEED:   "training_btn_speed.png",
    StatName.STAMINA: "training_btn_stamina.png",
    StatName.POWER:   "training_btn_power.png",
    StatName.GUTS:    "training_btn_guts.png",
    StatName.WIT:     "training_btn_wit.png",
}


def make_confirm_handler(
    window_rect: tuple[int, int, int, int],
    ok_template: np.ndarray,
    threshold: float = 0.8,
):
    """Return a handler that clicks the OK/confirm button in a modal dialog."""

    def handler(sm: "BotStateMachine") -> None:
        frame = sm.grab()
        if frame is None:
            return
        result = match(frame, ok_template, threshold=threshold)
        if result is not None:
            click_center(window_rect, result)

    return handler


def make_training_handler(
    window_rect: tuple[int, int, int, int],
    training_config: TrainingConfig,
    training_templates: dict[StatName, np.ndarray],
    threshold: float = 0.8,
):
    """
    Return a handler that picks and clicks a training button.

    Scans for each training button template; among those visible, clicks the
    one whose stat appears earliest in ``training_config.stat_prioritization``.
    Falls back to the first detected button when none of the priority stats
    are visible.
    """

    def handler(sm: "BotStateMachine") -> None:
        frame = sm.grab()
        if frame is None:
            return

        visible: dict[StatName, MatchResult] = {}
        for stat, template in training_templates.items():
            result = match(frame, template, threshold=threshold)
            if result is not None:
                visible[stat] = result

        if not visible:
            return

        for stat in training_config.stat_prioritization:
            if stat in visible:
                click_center(window_rect, visible[stat])
                return

        # Fallback: no priority stat visible — click the first detected button.
        click_center(window_rect, next(iter(visible.values())))

    return handler


def make_race_skip_handler():
    """Return a handler that dismisses the race-select screen (press Escape)."""

    def handler(sm: "BotStateMachine") -> None:
        press("escape")

    return handler


def make_skill_skip_handler():
    """Return a handler that dismisses the skill-select screen (press Escape)."""

    def handler(sm: "BotStateMachine") -> None:
        press("escape")

    return handler
