"""Tests for bot/layout.py — screen-coordinate constants."""

from bot.layout import STAT_REGIONS, TRAINING_BUTTON_CENTERS
from bot.types import StatName


def test_stat_regions_covers_all_stats():
    assert set(STAT_REGIONS.keys()) == set(StatName)


def test_stat_regions_are_valid_rects():
    for stat, (l, t, r, b) in STAT_REGIONS.items():
        assert l < r, f"{stat.name}: left ({l}) must be < right ({r})"
        assert t < b, f"{stat.name}: top ({t}) must be < bottom ({b})"


def test_stat_regions_have_nonzero_area():
    for stat, (l, t, r, b) in STAT_REGIONS.items():
        assert (r - l) * (b - t) > 0, f"{stat.name} has zero-area region"


def test_training_button_centers_covers_all_stats():
    assert set(TRAINING_BUTTON_CENTERS.keys()) == set(StatName)


def test_training_button_centers_are_positive():
    for stat, (x, y) in TRAINING_BUTTON_CENTERS.items():
        assert x > 0 and y > 0, f"{stat.name} center has non-positive coordinate"
