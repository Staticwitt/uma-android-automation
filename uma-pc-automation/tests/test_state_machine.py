"""Tests for bot/state_machine.py — loop control and dispatch logic."""

from unittest.mock import MagicMock, call, patch

import numpy as np
import pytest

from bot.state_machine import BotStateMachine, LoopConfig, ScreenState


# ── helpers ───────────────────────────────────────────────────────────────────

def _fake_frame() -> np.ndarray:
    return np.zeros((600, 800, 3), dtype=np.uint8)


def _sm(detect_sequence: list[ScreenState], **loop_kwargs) -> BotStateMachine:
    """
    Build a BotStateMachine whose detect() returns states from *detect_sequence*
    in order. grab() always returns a fake frame.
    """
    capture = MagicMock()
    window = MagicMock()
    config = LoopConfig(
        poll_interval=0,
        action_settle_time=0,
        **loop_kwargs,
    )
    sm = BotStateMachine(capture=capture, window=window, config=config)
    capture.grab_window.return_value = _fake_frame()

    it = iter(detect_sequence)

    def _detect(frame):
        try:
            return next(it)
        except StopIteration:
            sm.stop()
            # Return ANIMATION (not UNKNOWN) so the streak check doesn't fire
            # before the loop sees _running=False.
            return ScreenState.ANIMATION

    sm.detect = _detect
    return sm


# ── ScreenState enum ──────────────────────────────────────────────────────────

def test_all_states_are_distinct():
    values = [s.value for s in ScreenState]
    assert len(values) == len(set(values))


# ── BotStateMachine.register / dispatch ──────────────────────────────────────

def test_handler_called_for_detected_state():
    handler = MagicMock()
    sm = _sm([ScreenState.TRAINING_SELECT])
    sm.register(ScreenState.TRAINING_SELECT, handler)
    sm.run()
    handler.assert_called_once_with(sm)


def test_handler_not_called_for_other_state():
    handler = MagicMock()
    sm = _sm([ScreenState.RACE_SELECT])
    sm.register(ScreenState.TRAINING_SELECT, handler)
    sm.run()
    handler.assert_not_called()


def test_multiple_handlers_dispatched_correctly():
    train_handler = MagicMock()
    race_handler = MagicMock()
    sm = _sm([ScreenState.TRAINING_SELECT, ScreenState.RACE_SELECT])
    sm.register(ScreenState.TRAINING_SELECT, train_handler)
    sm.register(ScreenState.RACE_SELECT, race_handler)
    sm.run()
    train_handler.assert_called_once()
    race_handler.assert_called_once()


def test_handler_can_stop_loop():
    call_count = [0]

    def handler(sm):
        call_count[0] += 1
        sm.stop()

    sm = _sm([ScreenState.TRAINING_SELECT] * 10)
    sm.register(ScreenState.TRAINING_SELECT, handler)
    sm.run()
    assert call_count[0] == 1


# ── ANIMATION passthrough ─────────────────────────────────────────────────────

def test_animation_state_skips_handler():
    handler = MagicMock()
    sm = _sm([ScreenState.ANIMATION])
    sm.register(ScreenState.ANIMATION, handler)
    sm.run()
    handler.assert_not_called()


def test_animation_does_not_count_as_unknown():
    sm = _sm([ScreenState.ANIMATION], max_unknown_streak=1)
    sm.run()  # Should not raise even though unknown_streak limit is 1


# ── UNKNOWN streak ────────────────────────────────────────────────────────────

def test_unknown_streak_raises_after_limit():
    sm = _sm([ScreenState.UNKNOWN] * 5, max_unknown_streak=3)
    # Override detect so stop() is never called (force the streak)
    sm.detect = lambda frame: ScreenState.UNKNOWN
    with pytest.raises(RuntimeError, match="bot is lost"):
        sm.run()


def test_unknown_streak_resets_on_known_state():
    # Two UNKNOWNs, then a known state, then two UNKNOWNs — should not raise at limit=3
    handler = MagicMock()
    states = iter(
        [ScreenState.UNKNOWN, ScreenState.UNKNOWN, ScreenState.TRAINING_SELECT,
         ScreenState.UNKNOWN, ScreenState.UNKNOWN]
    )

    sm = BotStateMachine(
        capture=MagicMock(),
        window=MagicMock(),
        config=LoopConfig(poll_interval=0, action_settle_time=0, max_unknown_streak=3),
    )
    sm.capture.grab_window.return_value = _fake_frame()
    sm.register(ScreenState.TRAINING_SELECT, handler)

    def _detect(frame):
        try:
            return next(states)
        except StopIteration:
            sm.stop()
            return ScreenState.ANIMATION  # avoid UNKNOWN streak firing on exit

    sm.detect = _detect
    sm.run()  # Should not raise
    handler.assert_called_once()


# ── RUN_COMPLETE ──────────────────────────────────────────────────────────────

def test_run_complete_stops_loop_by_default():
    sm = _sm([ScreenState.RUN_COMPLETE, ScreenState.TRAINING_SELECT])
    handler = MagicMock()
    sm.register(ScreenState.TRAINING_SELECT, handler)
    sm.run()
    handler.assert_not_called()  # Loop stopped before reaching TRAINING_SELECT


def test_run_complete_calls_handler_if_registered():
    complete_handler = MagicMock()
    sm = _sm([ScreenState.RUN_COMPLETE])
    sm.register(ScreenState.RUN_COMPLETE, complete_handler)
    sm.run()
    complete_handler.assert_called_once_with(sm)


def test_run_complete_continues_when_stop_on_run_complete_false():
    train_handler = MagicMock()
    sm = _sm(
        [ScreenState.RUN_COMPLETE, ScreenState.TRAINING_SELECT],
        stop_on_run_complete=False,
    )
    sm.register(ScreenState.TRAINING_SELECT, train_handler)
    sm.run()
    train_handler.assert_called_once()


# ── grab() returns None ───────────────────────────────────────────────────────

def test_none_frame_does_not_crash_loop():
    handler = MagicMock()
    sm = BotStateMachine(
        capture=MagicMock(),
        window=MagicMock(),
        config=LoopConfig(poll_interval=0, action_settle_time=0),
    )
    # First grab returns None, second grab returns frame with TRAINING_SELECT
    frame = _fake_frame()
    sm.capture.grab_window.side_effect = [None, frame]

    call_count = [0]

    def _detect(f):
        call_count[0] += 1
        sm.stop()
        return ScreenState.TRAINING_SELECT

    sm.detect = _detect
    sm.register(ScreenState.TRAINING_SELECT, handler)
    sm.run()
    assert call_count[0] == 1  # detect called exactly once (after the None)


# ── default detect always returns UNKNOWN ─────────────────────────────────────

def test_default_detect_returns_unknown():
    sm = BotStateMachine(capture=MagicMock(), window=MagicMock(), config=LoopConfig())
    assert sm.detect(_fake_frame()) == ScreenState.UNKNOWN


# ── no handler registered ─────────────────────────────────────────────────────

def test_no_handler_registered_does_not_raise():
    sm = _sm([ScreenState.SKILL_SELECT])
    # No handler registered — should log a warning but not crash
    sm.run()


# ── LoopConfig defaults ───────────────────────────────────────────────────────

def test_loop_config_defaults():
    cfg = LoopConfig()
    assert cfg.poll_interval == 1.0
    assert cfg.action_settle_time == 0.5
    assert cfg.max_unknown_streak == 30
    assert cfg.stop_on_run_complete is True


# ── on_crash callback ─────────────────────────────────────────────────────────

def test_on_crash_called_with_last_frame_on_unknown_streak():
    sm = BotStateMachine(
        capture=MagicMock(),
        window=MagicMock(),
        config=LoopConfig(poll_interval=0, action_settle_time=0, max_unknown_streak=2),
    )
    frame = _fake_frame()
    sm.capture.grab_window.return_value = frame
    sm.detect = lambda f: ScreenState.UNKNOWN

    crash_frames = []
    sm.on_crash = lambda f: crash_frames.append(f)

    with pytest.raises(RuntimeError):
        sm.run()

    assert len(crash_frames) == 1
    assert crash_frames[0] is frame


def test_on_crash_not_called_on_normal_exit():
    sm = _sm([ScreenState.RUN_COMPLETE])
    crash_called = [False]
    sm.on_crash = lambda f: crash_called.__setitem__(0, True)
    sm.run()
    assert crash_called[0] is False


def test_on_crash_exception_does_not_suppress_runtime_error():
    sm = BotStateMachine(
        capture=MagicMock(),
        window=MagicMock(),
        config=LoopConfig(poll_interval=0, action_settle_time=0, max_unknown_streak=1),
    )
    sm.capture.grab_window.return_value = _fake_frame()
    sm.detect = lambda f: ScreenState.UNKNOWN
    sm.on_crash = lambda f: (_ for _ in ()).throw(ValueError("crash cb boom"))

    with pytest.raises(RuntimeError, match="bot is lost"):
        sm.run()


def test_on_crash_not_called_when_grab_always_returns_none():
    sm = BotStateMachine(
        capture=MagicMock(),
        window=MagicMock(),
        config=LoopConfig(poll_interval=0, action_settle_time=0, max_unknown_streak=2),
    )
    # grab always returns None — last_frame stays None
    call_count = [0]

    def _grab(window):
        call_count[0] += 1
        if call_count[0] > 3:
            sm.stop()
        return None

    sm.capture.grab_window.side_effect = _grab
    crash_called = [False]
    sm.on_crash = lambda f: crash_called.__setitem__(0, True)
    sm.run()  # Should not raise — UNKNOWN streak never fires without frames
    assert crash_called[0] is False
