"""
Screen-state classifier using template matching.

Each detectable state has a single small indicator template (stored in
vision/templates/) whose presence on the frame identifies that state.
CONFIRM_DIALOG is checked first because it can overlay any other screen.
"""

from __future__ import annotations

import numpy as np

from bot.state_machine import ScreenState
from vision.matcher import load_template, match

# Detection priority: earlier entries win when multiple templates could match.
_INDICATOR_NAMES: list[tuple[ScreenState, str]] = [
    (ScreenState.CONFIRM_DIALOG,  "confirm_ok.png"),
    (ScreenState.SKILL_SELECT,    "skill_select.png"),
    (ScreenState.RACE_SELECT,     "race_select.png"),
    (ScreenState.TRAINING_SELECT, "training_select.png"),
    (ScreenState.RUN_COMPLETE,    "run_complete.png"),
]


class TemplateDetector:
    """Classifies a frame into a ScreenState by scanning indicator templates."""

    def __init__(
        self,
        indicators: list[tuple[ScreenState, np.ndarray]],
        threshold: float = 0.8,
    ) -> None:
        self._indicators = indicators
        self._threshold = threshold

    @classmethod
    def load(cls, threshold: float = 0.8) -> "TemplateDetector":
        """Load all indicator templates from the templates directory."""
        indicators = [
            (state, load_template(name)) for state, name in _INDICATOR_NAMES
        ]
        return cls(indicators, threshold)

    def detect(self, frame: np.ndarray) -> ScreenState:
        """Return the first state whose indicator template matches *frame*."""
        for state, template in self._indicators:
            if match(frame, template, threshold=self._threshold) is not None:
                return state
        return ScreenState.UNKNOWN
