"""
Screen-coordinate constants for the Uma Musume PC client at 1920×1080.

All regions are (left, top, right, bottom) in pixels relative to the game
window's top-left corner. Calibrate against a real screenshot before use —
the values below are close approximations based on the game's UI layout.

Run ``tools/capture_template.py screenshot`` to dump a full window PNG, then
use an image viewer to read exact pixel coordinates.
"""

from bot.types import StatName

# ── Stat value readout regions ────────────────────────────────────────────────
# The five stat numbers are displayed in a horizontal row near the bottom of
# the main training screen.  Each region should tightly contain only the
# numeric digits (no icons or labels).

STAT_REGIONS: dict[StatName, tuple[int, int, int, int]] = {
    StatName.SPEED:   (148, 952, 248, 982),
    StatName.STAMINA: (308, 952, 408, 982),
    StatName.POWER:   (468, 952, 568, 982),
    StatName.GUTS:    (628, 952, 728, 982),
    StatName.WIT:     (788, 952, 888, 982),
}

# ── Training button regions (for hover-gain reading, future use) ──────────────
# Centre points of each training button at the bottom of the training screen.
# Not used for clicking (that uses template matching); reserved for future
# stat-gain OCR via tooltip hover.

TRAINING_BUTTON_CENTERS: dict[StatName, tuple[int, int]] = {
    StatName.SPEED:   (384,  940),
    StatName.STAMINA: (576,  940),
    StatName.POWER:   (768,  940),
    StatName.GUTS:    (960,  940),
    StatName.WIT:     (1152, 940),
}
