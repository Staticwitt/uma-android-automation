"""
Input injection for the Uma Musume PC client via pydirectinput.

pydirectinput wraps DirectInput so clicks/keystrokes reach the game even when
another window briefly steals focus. All coordinate arguments are absolute
screen pixels unless stated otherwise.

pydirectinput is optional at import time (Windows dep); every public function
raises RuntimeError if it's absent.
"""

from __future__ import annotations

import time

try:
    import pydirectinput

    _PYDIRECTINPUT_AVAILABLE = True
except ImportError:
    _PYDIRECTINPUT_AVAILABLE = False


def _require_input() -> None:
    if not _PYDIRECTINPUT_AVAILABLE:
        raise RuntimeError(
            "pydirectinput not available — install with: pip install pydirectinput"
        )


def click(x: int, y: int, button: str = "left", pause: float = 0.1) -> None:
    """Click at absolute screen coordinates (*x*, *y*)."""
    _require_input()
    pydirectinput.click(x, y, button=button)
    if pause > 0:
        time.sleep(pause)


def click_relative(
    window_rect: tuple[int, int, int, int],
    rel_x: int,
    rel_y: int,
    button: str = "left",
    pause: float = 0.1,
) -> None:
    """Click at (*rel_x*, *rel_y*) relative to the window's top-left corner.

    *window_rect* is ``(left, top, right, bottom)`` in screen coordinates,
    matching the ``WindowInfo.rect`` format from ``capture.window``.
    """
    wx, wy = window_rect[0], window_rect[1]
    click(wx + rel_x, wy + rel_y, button=button, pause=pause)


def click_center(
    window_rect: tuple[int, int, int, int],
    match_result,
    button: str = "left",
    pause: float = 0.1,
) -> None:
    """Click the center of *match_result* (a ``MatchResult``) relative to the window."""
    click_relative(
        window_rect, match_result.center_x, match_result.center_y, button=button, pause=pause
    )


def press(key: str, pause: float = 0.05) -> None:
    """Press and release a single key by name (e.g. ``"enter"``, ``"escape"``)."""
    _require_input()
    pydirectinput.press(key)
    if pause > 0:
        time.sleep(pause)


def move_to(x: int, y: int) -> None:
    """Move the mouse cursor to absolute screen coordinates without clicking."""
    _require_input()
    pydirectinput.moveTo(x, y)
