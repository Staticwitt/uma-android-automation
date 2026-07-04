"""
Turn tracker — advances current_date and syncs current_stats after each training turn.

Uma Musume has approximately 72 training turns spread across three year segments
(Junior → Classic → Senior, ~24 turns each). The tracker derives year and approximate
day from a turn counter, which is accurate enough for the date-sensitive scoring
multipliers even if the actual in-game calendar doesn't align turn-for-turn.

Usage::

    tracker = TurnTracker(training_config)
    # inside the training handler, after clicking:
    tracker.record_training(ocr_stats)   # advances date, syncs stats
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import ClassVar, Optional

from bot.types import DateYear, GameDateSnapshot, StatName, TrainingConfig

logger = logging.getLogger(__name__)


@dataclass
class TurnTracker:
    """
    Maintains turn count, advances ``current_date``, and syncs ``current_stats``
    in the shared ``TrainingConfig`` after every training turn.
    """

    training_config: TrainingConfig
    turns_completed: int = 0

    # Approximate turns per year segment (72 total across three years).
    _JUNIOR_TURNS:  ClassVar[int] = 24
    _CLASSIC_TURNS: ClassVar[int] = 24

    # Day numbers within a year segment that fall in the summer window.
    _SUMMER_DAYS: ClassVar[frozenset[int]] = frozenset(range(7, 13))

    def record_training(
        self,
        ocr_stats: Optional[dict[StatName, Optional[int]]] = None,
    ) -> None:
        """
        Advance the turn counter by one, update ``current_date``, and
        (optionally) write valid OCR stat reads into ``current_stats``.

        Call this once per training-select handler invocation, after the
        training button has been clicked.
        """
        self.turns_completed += 1
        self._update_date()
        if ocr_stats:
            self._sync_stats(ocr_stats)
        logger.info(
            "turn %d | year=%s day=%d summer=%s | stats=%s",
            self.turns_completed,
            self.training_config.current_date.year.name,
            self.training_config.current_date.day,
            self.training_config.current_date.is_summer,
            {s.name: v for s, v in self.training_config.current_stats.items()},
        )

    def _update_date(self) -> None:
        t = self.turns_completed
        if t <= self._JUNIOR_TURNS:
            year, day = DateYear.JUNIOR, t
        elif t <= self._JUNIOR_TURNS + self._CLASSIC_TURNS:
            year, day = DateYear.CLASSIC, t - self._JUNIOR_TURNS
        else:
            year, day = DateYear.SENIOR, t - self._JUNIOR_TURNS - self._CLASSIC_TURNS
        self.training_config.current_date = GameDateSnapshot(
            year=year,
            day=day,
            is_summer=(day in self._SUMMER_DAYS),
        )

    def _sync_stats(self, ocr_stats: dict[StatName, Optional[int]]) -> None:
        for stat, value in ocr_stats.items():
            if value is not None:
                self.training_config.current_stats[stat] = value
