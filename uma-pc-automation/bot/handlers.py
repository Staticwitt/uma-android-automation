"""
State handlers — one callable per ScreenState.

Each ``make_*`` factory captures the context it needs and returns a
``Handler`` compatible with ``BotStateMachine.register``.

Training selection uses two-level ranking when an OCR reader is provided:

1. Read current stat values from the frame using ``stat_regions`` crops.
2. Compute ``effectiveCompletionPercent`` for each stat (mirrors Scoring.kt:
   values above 1200 count 0.5× so targets above the soft-cap are weighted).
3. Among visible training buttons, pick the stat with the lowest completion
   percent (most room to grow relative to its target).
4. Fall back to ``training_config.stat_prioritization`` order if OCR fails or
   no ``ocr`` reader is provided.

After clicking, ``TurnTracker.record_training`` is called (if a tracker is
provided) to advance ``current_date`` and sync ``current_stats`` in place.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Optional

import numpy as np

from bot.types import StatName, TrainingConfig
from input.controller import click_center, press
from vision.matcher import MatchResult, match

if TYPE_CHECKING:
    from bot.state_machine import BotStateMachine
    from bot.tracker import TurnTracker
    from vision.ocr import StatOcr

logger = logging.getLogger(__name__)

# Template names for each training button, keyed by stat.
TRAINING_TEMPLATE_NAMES: dict[StatName, str] = {
    StatName.SPEED:   "training_btn_speed.png",
    StatName.STAMINA: "training_btn_stamina.png",
    StatName.POWER:   "training_btn_power.png",
    StatName.GUTS:    "training_btn_guts.png",
    StatName.WIT:     "training_btn_wit.png",
}

_BASE_STAT_CAP = 1200


def _effective_value(raw: int) -> float:
    """Soft-cap transform: values above 1200 count at half-weight."""
    return min(float(raw), float(_BASE_STAT_CAP)) + max(0.0, float(raw) - _BASE_STAT_CAP) * 0.5


def _completion_ranking(
    ocr_stats: dict[StatName, Optional[int]],
    training_config: TrainingConfig,
) -> list[StatName]:
    """
    Return stats ordered from most-behind-target to most-ahead.

    Stats whose OCR value is None are treated as 0 (most in need of training).
    """

    def completion(stat: StatName) -> float:
        current = ocr_stats.get(stat) or 0
        target = training_config.stat_targets.get(stat, _BASE_STAT_CAP)
        eff_target = _effective_value(target)
        return _effective_value(current) / eff_target if eff_target > 0.0 else 1.0

    return sorted(StatName, key=completion)


def _read_stats(
    frame: np.ndarray,
    ocr: "StatOcr",
    stat_regions: dict[StatName, tuple[int, int, int, int]],
) -> dict[StatName, Optional[int]]:
    """Crop each stat region from *frame* and OCR it."""
    result: dict[StatName, Optional[int]] = {}
    for stat, (l, t, r, b) in stat_regions.items():
        crop = frame[t:b, l:r]
        try:
            result[stat] = ocr.read_digits(crop)
        except Exception:
            logger.debug("OCR failed for %s", stat.name, exc_info=True)
            result[stat] = None
    return result


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
            logger.info("confirm dialog → clicking OK")
            click_center(window_rect, result)

    return handler


def make_training_handler(
    window_rect: tuple[int, int, int, int],
    training_config: TrainingConfig,
    training_templates: dict[StatName, np.ndarray],
    threshold: float = 0.8,
    ocr: Optional["StatOcr"] = None,
    stat_regions: Optional[dict[StatName, tuple[int, int, int, int]]] = None,
    tracker: Optional["TurnTracker"] = None,
):
    """
    Return a handler that picks and clicks a training button.

    When *ocr* and *stat_regions* are both provided the handler reads current
    stat values from the frame and ranks training buttons by
    ``effectiveCompletionPercent`` (stat farthest below its target wins).

    Without OCR the handler uses ``training_config.stat_prioritization``.

    If *tracker* is provided, ``TurnTracker.record_training`` is called after
    clicking to advance ``current_date`` and sync ``current_stats``.
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
            logger.warning("No training buttons detected on screen")
            return

        ocr_stats: Optional[dict[StatName, Optional[int]]] = None

        if ocr is not None and stat_regions:
            ocr_stats = _read_stats(frame, ocr, stat_regions)
            valid = {s: v for s, v in ocr_stats.items() if v is not None}
            if valid:
                priority = _completion_ranking(ocr_stats, training_config)
                completions = {
                    s.name: f"{_effective_value(v) / _effective_value(training_config.stat_targets.get(s, _BASE_STAT_CAP)) * 100:.1f}%"
                    for s, v in valid.items()
                }
                logger.info("OCR stats: %s", {s.name: v for s, v in valid.items()})
                logger.info("completion%%: %s", completions)
            else:
                logger.warning("OCR returned no values — using config priority")
                priority = training_config.stat_prioritization
        else:
            priority = training_config.stat_prioritization

        selected: Optional[StatName] = None
        for stat in priority:
            if stat in visible:
                selected = stat
                break

        if selected is None:
            selected = next(iter(visible))

        logger.info("selected training: %s", selected.name)
        click_center(window_rect, visible[selected])

        if tracker is not None:
            tracker.record_training(ocr_stats)

    return handler


def make_race_skip_handler():
    """Return a handler that dismisses the race-select screen (press Escape)."""

    def handler(sm: "BotStateMachine") -> None:
        logger.info("race select → skipping (Escape)")
        press("escape")

    return handler


def make_skill_skip_handler():
    """Return a handler that dismisses the skill-select screen (press Escape)."""

    def handler(sm: "BotStateMachine") -> None:
        logger.info("skill select → skipping (Escape)")
        press("escape")

    return handler
