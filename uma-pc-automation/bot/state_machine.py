"""
Bot main loop — screen-state detection and action dispatch.

The PC client shows one of several distinct screens during a training run.
This module classifies the current screen by template matching, decides what
to do (via scoring or fixed rules), executes the action, and loops.

All heavy dependencies (cv2, dxcam, pydirectinput) are imported lazily so the
module is importable on non-Windows machines for testing.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Callable, Optional

import numpy as np

logger = logging.getLogger(__name__)


# ── Screen states ─────────────────────────────────────────────────────────────

class ScreenState(Enum):
    """Exhaustive enumeration of recognisable PC-client screens."""

    TRAINING_SELECT = auto()   # Main turn screen — training buttons visible
    RACE_SELECT = auto()       # Race scheduling overlay
    SKILL_SELECT = auto()      # Skill purchase screen (between turns or at end)
    CONFIRM_DIALOG = auto()    # Yes / OK modal (training, race confirm, etc.)
    ANIMATION = auto()         # Training / race animation playing
    RUN_COMPLETE = auto()      # End-of-run results screen
    UNKNOWN = auto()           # Unrecognised; bot will wait and retry


# ── Handler protocol ──────────────────────────────────────────────────────────

# A handler receives (state_machine_instance) and returns the ScreenState the
# bot should expect next, or None to let the loop re-detect.
Handler = Callable[["BotStateMachine"], Optional[ScreenState]]


# ── Configuration ─────────────────────────────────────────────────────────────

@dataclass
class LoopConfig:
    """Tunable parameters for the bot main loop."""

    # Seconds to wait between detection attempts when in ANIMATION or UNKNOWN.
    poll_interval: float = 1.0
    # Maximum consecutive UNKNOWN detections before raising.
    max_unknown_streak: int = 30
    # Seconds to wait after dispatching an action before re-detecting.
    action_settle_time: float = 0.5
    # Whether to stop the loop when RUN_COMPLETE is detected.
    stop_on_run_complete: bool = True


# ── State machine ─────────────────────────────────────────────────────────────

@dataclass
class BotStateMachine:
    """
    Detects the current screen state and dispatches to registered handlers.

    Usage::

        sm = BotStateMachine(capture=..., config=LoopConfig())
        sm.register(ScreenState.TRAINING_SELECT, my_handler)
        sm.run()

    The ``detect`` method is intentionally separate from the ``capture``
    call so both can be unit-tested with numpy arrays alone.
    """

    capture: object  # ScreenCapture instance (or any object with .grab_window())
    window: object   # WindowInfo instance
    config: LoopConfig = field(default_factory=LoopConfig)

    # Internal
    _handlers: dict[ScreenState, Handler] = field(default_factory=dict, init=False)
    _running: bool = field(default=False, init=False)
    _unknown_streak: int = field(default=0, init=False)

    def register(self, state: ScreenState, handler: Handler) -> None:
        """Register *handler* to be called when *state* is detected."""
        self._handlers[state] = handler

    def detect(self, frame: np.ndarray) -> ScreenState:
        """
        Classify *frame* into a ScreenState.

        Subclass or monkey-patch this method to plug in real template matching.
        The default implementation always returns UNKNOWN — useful for testing
        the loop control logic in isolation.
        """
        return ScreenState.UNKNOWN

    def grab(self) -> Optional[np.ndarray]:
        """Capture the current game window frame."""
        return self.capture.grab_window(self.window)

    def stop(self) -> None:
        """Signal the run loop to exit after the current iteration."""
        self._running = False

    def run(self) -> None:
        """
        Main bot loop.

        Runs until:
        - ``stop()`` is called from a handler,
        - ``RUN_COMPLETE`` is detected and ``config.stop_on_run_complete`` is True,
        - or ``max_unknown_streak`` consecutive UNKNOWN detections occur.
        """
        self._running = True
        self._unknown_streak = 0
        logger.info("Bot loop started")

        while self._running:
            frame = self.grab()
            if frame is None:
                logger.warning("grab() returned None — window may be minimised")
                time.sleep(self.config.poll_interval)
                continue

            state = self.detect(frame)
            logger.debug("Detected state: %s", state.name)

            if state == ScreenState.UNKNOWN:
                self._unknown_streak += 1
                if self._unknown_streak >= self.config.max_unknown_streak:
                    raise RuntimeError(
                        f"Unknown screen for {self._unknown_streak} consecutive "
                        f"polls — bot is lost"
                    )
                time.sleep(self.config.poll_interval)
                continue

            self._unknown_streak = 0

            if state == ScreenState.ANIMATION:
                time.sleep(self.config.poll_interval)
                continue

            if state == ScreenState.RUN_COMPLETE:
                logger.info("Run complete")
                handler = self._handlers.get(state)
                if handler:
                    handler(self)
                if self.config.stop_on_run_complete:
                    self._running = False
                continue

            handler = self._handlers.get(state)
            if handler is None:
                logger.warning("No handler registered for %s", state.name)
                time.sleep(self.config.poll_interval)
                continue

            handler(self)
            time.sleep(self.config.action_settle_time)

        logger.info("Bot loop stopped")
