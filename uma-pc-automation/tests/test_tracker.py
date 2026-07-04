"""Tests for bot/tracker.py — turn counter and date/stat tracking."""

import pytest

from bot.tracker import TurnTracker
from bot.types import DateYear, GameDateSnapshot, StatName, TrainingConfig


# ── helpers ───────────────────────────────────────────────────────────────────

def _config() -> TrainingConfig:
    return TrainingConfig(
        current_stats={s: 0 for s in StatName},
        stat_prioritization=list(StatName),
        summer_training_stat_priority=list(StatName),
        stat_targets={s: 1200 for s in StatName},
        current_date=GameDateSnapshot(year=DateYear.JUNIOR, day=0),
        scenario="URA Finals",
        enable_rainbow_training_bonus=False,
    )


def _tracker() -> TurnTracker:
    return TurnTracker(training_config=_config())


# ── record_training: turn counter ─────────────────────────────────────────────

def test_record_training_increments_turns():
    t = _tracker()
    assert t.turns_completed == 0
    t.record_training()
    assert t.turns_completed == 1
    t.record_training()
    assert t.turns_completed == 2


def test_record_training_increments_each_call():
    t = _tracker()
    for i in range(10):
        t.record_training()
    assert t.turns_completed == 10


# ── _update_date: year segments ───────────────────────────────────────────────

def test_first_turn_is_junior():
    t = _tracker()
    t.record_training()
    assert t.training_config.current_date.year == DateYear.JUNIOR
    assert t.training_config.current_date.day == 1


def test_turn_24_is_still_junior():
    t = _tracker()
    for _ in range(24):
        t.record_training()
    assert t.training_config.current_date.year == DateYear.JUNIOR
    assert t.training_config.current_date.day == 24


def test_turn_25_is_classic():
    t = _tracker()
    for _ in range(25):
        t.record_training()
    assert t.training_config.current_date.year == DateYear.CLASSIC
    assert t.training_config.current_date.day == 1


def test_turn_48_is_last_classic():
    t = _tracker()
    for _ in range(48):
        t.record_training()
    assert t.training_config.current_date.year == DateYear.CLASSIC
    assert t.training_config.current_date.day == 24


def test_turn_49_is_senior():
    t = _tracker()
    for _ in range(49):
        t.record_training()
    assert t.training_config.current_date.year == DateYear.SENIOR
    assert t.training_config.current_date.day == 1


def test_turn_72_is_senior():
    t = _tracker()
    for _ in range(72):
        t.record_training()
    assert t.training_config.current_date.year == DateYear.SENIOR
    assert t.training_config.current_date.day == 24


# ── _update_date: summer window ───────────────────────────────────────────────

def test_is_summer_false_before_window():
    t = _tracker()
    for _ in range(6):  # day 6
        t.record_training()
    assert t.training_config.current_date.is_summer is False


def test_is_summer_true_at_day_7():
    t = _tracker()
    for _ in range(7):
        t.record_training()
    assert t.training_config.current_date.is_summer is True


def test_is_summer_true_at_day_12():
    t = _tracker()
    for _ in range(12):
        t.record_training()
    assert t.training_config.current_date.is_summer is True


def test_is_summer_false_at_day_13():
    t = _tracker()
    for _ in range(13):
        t.record_training()
    assert t.training_config.current_date.is_summer is False


# ── _sync_stats: writes valid values back ────────────────────────────────────

def test_sync_stats_updates_valid_ocr_values():
    t = _tracker()
    ocr = {StatName.SPEED: 800, StatName.STAMINA: 600,
           StatName.POWER: 700, StatName.GUTS: 500, StatName.WIT: 400}
    t.record_training(ocr_stats=ocr)
    assert t.training_config.current_stats[StatName.SPEED] == 800
    assert t.training_config.current_stats[StatName.STAMINA] == 600


def test_sync_stats_skips_none_values():
    t = _tracker()
    ocr = {StatName.SPEED: 800, StatName.STAMINA: None,
           StatName.POWER: 700, StatName.GUTS: None, StatName.WIT: 400}
    t.record_training(ocr_stats=ocr)
    assert t.training_config.current_stats[StatName.SPEED] == 800
    assert t.training_config.current_stats[StatName.STAMINA] == 0   # unchanged from init
    assert t.training_config.current_stats[StatName.GUTS] == 0      # unchanged from init


def test_sync_stats_not_called_when_ocr_stats_none():
    t = _tracker()
    t.record_training(ocr_stats=None)
    # Stats should remain at their initial values (all 0)
    assert all(v == 0 for v in t.training_config.current_stats.values())


def test_sync_stats_not_called_when_ocr_stats_empty():
    t = _tracker()
    t.record_training(ocr_stats={})
    assert all(v == 0 for v in t.training_config.current_stats.values())


def test_sync_stats_overwrites_previous_values():
    t = _tracker()
    t.record_training(ocr_stats={StatName.SPEED: 500})
    t.record_training(ocr_stats={StatName.SPEED: 750})
    assert t.training_config.current_stats[StatName.SPEED] == 750
