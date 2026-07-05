"""
Locate and manage the DMM Game Player window running Umamusume (Uma Musume
Pretty Derby).

Windows-only. Requires pywin32. On non-Windows the module imports cleanly but
every function raises RuntimeError — this allows tests to import and mock freely.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

try:
    import win32con
    import win32gui

    _WIN32_AVAILABLE = True
except ImportError:
    _WIN32_AVAILABLE = False

# Title substrings tried in order. The DMM client window title changes to the
# game name once the game has loaded; search for all of them so the bot can
# find it during the launch phase as well as mid-run.
CANDIDATE_TITLE_FRAGMENTS: list[str] = [
    "ウマ娘",          # Japanese title — most reliable once loaded
    "Umamusume",       # Actual DMM client window title (no space, no "Pretty Derby")
    "Uma Musume",      # Alternate English title seen in some locale configurations
    "DMM GAME PLAYER", # Fallback: DMM launcher before the game title appears
]


@dataclass
class WindowInfo:
    """Snapshot of a located game window."""

    hwnd: int
    title: str
    rect: tuple[int, int, int, int]  # (left, top, right, bottom) in screen coords

    @property
    def width(self) -> int:
        return self.rect[2] - self.rect[0]

    @property
    def height(self) -> int:
        return self.rect[3] - self.rect[1]


def find_game_window(
    title_fragments: list[str] = CANDIDATE_TITLE_FRAGMENTS,
) -> Optional[WindowInfo]:
    """
    Enumerate visible top-level windows and return the first one whose title
    contains any of *title_fragments*. Returns None if no match is found.
    """
    if not _WIN32_AVAILABLE:
        raise RuntimeError(
            "win32gui not available — window targeting requires Windows and pywin32."
        )

    found: list[WindowInfo] = []

    def _callback(hwnd: int, _lparam: object) -> None:
        if not win32gui.IsWindowVisible(hwnd):
            return
        title = win32gui.GetWindowText(hwnd)
        if any(frag in title for frag in title_fragments):
            rect: tuple[int, int, int, int] = win32gui.GetWindowRect(hwnd)
            found.append(WindowInfo(hwnd=hwnd, title=title, rect=rect))

    win32gui.EnumWindows(_callback, None)
    return found[0] if found else None


def bring_to_foreground(info: WindowInfo) -> None:
    """Restore and focus the window so clicks land in the right place."""
    if not _WIN32_AVAILABLE:
        raise RuntimeError(
            "win32gui not available — window targeting requires Windows and pywin32."
        )
    win32gui.ShowWindow(info.hwnd, win32con.SW_RESTORE)
    win32gui.SetForegroundWindow(info.hwnd)
