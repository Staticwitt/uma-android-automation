"""Tests for capture/window.py — Win32 window targeting."""

import sys
from unittest.mock import MagicMock, call, patch

import pytest

# conftest.py has already stubbed win32gui/win32con into sys.modules.
import capture.window as window_module
from capture.window import (
    CANDIDATE_TITLE_FRAGMENTS,
    WindowInfo,
    bring_to_foreground,
    find_game_window,
)

win32gui = sys.modules["win32gui"]
win32con = sys.modules["win32con"]


# ── WindowInfo properties ─────────────────────────────────────────────────────

def test_window_info_width():
    info = WindowInfo(hwnd=1, title="test", rect=(100, 50, 900, 650))
    assert info.width == 800


def test_window_info_height():
    info = WindowInfo(hwnd=1, title="test", rect=(100, 50, 900, 650))
    assert info.height == 600


def test_window_info_zero_size():
    info = WindowInfo(hwnd=1, title="test", rect=(0, 0, 0, 0))
    assert info.width == 0
    assert info.height == 0


# ── find_game_window ──────────────────────────────────────────────────────────

def _setup_enum(windows: list[tuple[int, str, bool]]) -> None:
    """
    Configure win32gui mocks to simulate a window list.
    *windows* is [(hwnd, title, is_visible), ...].
    """
    visibility = {hwnd: vis for hwnd, _, vis in windows}
    titles = {hwnd: title for hwnd, title, _ in windows}

    def fake_enum(callback, lparam):
        for hwnd, _, _ in windows:
            callback(hwnd, lparam)

    win32gui.EnumWindows.side_effect = fake_enum
    win32gui.IsWindowVisible.side_effect = lambda hwnd: visibility.get(hwnd, False)
    win32gui.GetWindowText.side_effect = lambda hwnd: titles.get(hwnd, "")
    win32gui.GetWindowRect.return_value = (100, 50, 900, 650)


def test_find_game_window_returns_none_when_no_match():
    _setup_enum([(1001, "Notepad", True), (1002, "Calculator", True)])
    assert find_game_window() is None


def test_find_game_window_matches_japanese_title():
    _setup_enum([(1001, "ウマ娘 プリティーダービー", True)])
    result = find_game_window()
    assert result is not None
    assert result.hwnd == 1001
    assert result.title == "ウマ娘 プリティーダービー"
    assert result.rect == (100, 50, 900, 650)


def test_find_game_window_matches_english_title():
    _setup_enum([(1001, "Uma Musume Pretty Derby", True)])
    result = find_game_window()
    assert result is not None
    assert result.hwnd == 1001


def test_find_game_window_matches_umamusume_title():
    # Actual DMM client window title observed in practice.
    _setup_enum([(1001, "Umamusume", True)])
    result = find_game_window()
    assert result is not None
    assert result.hwnd == 1001


def test_find_game_window_matches_dmm_fallback():
    _setup_enum([(1001, "DMM GAME PLAYER", True)])
    result = find_game_window()
    assert result is not None
    assert result.hwnd == 1001


def test_find_game_window_skips_invisible_windows():
    _setup_enum([
        (1001, "ウマ娘 プリティーダービー", False),  # matching but invisible
        (1002, "Notepad", True),
    ])
    assert find_game_window() is None


def test_find_game_window_returns_first_of_multiple_matches():
    _setup_enum([
        (1001, "ウマ娘 プリティーダービー", True),
        (1002, "Uma Musume Pretty Derby", True),
    ])
    result = find_game_window()
    assert result is not None
    assert result.hwnd == 1001


def test_find_game_window_custom_fragments():
    _setup_enum([(1001, "MyCustomGame", True)])
    result = find_game_window(title_fragments=["MyCustomGame"])
    assert result is not None
    assert result.hwnd == 1001


def test_find_game_window_custom_fragments_no_match():
    _setup_enum([(1001, "ウマ娘 プリティーダービー", True)])
    result = find_game_window(title_fragments=["SomethingElse"])
    assert result is None


def test_find_game_window_raises_without_win32():
    with patch.object(window_module, "_WIN32_AVAILABLE", False):
        with pytest.raises(RuntimeError, match="win32gui not available"):
            find_game_window()


# ── bring_to_foreground ───────────────────────────────────────────────────────

def test_bring_to_foreground_calls_show_window():
    info = WindowInfo(hwnd=1001, title="test", rect=(0, 0, 800, 600))
    win32gui.ShowWindow.reset_mock()
    win32gui.SetForegroundWindow.reset_mock()
    bring_to_foreground(info)
    win32gui.ShowWindow.assert_called_once_with(1001, win32con.SW_RESTORE)


def test_bring_to_foreground_calls_set_foreground():
    info = WindowInfo(hwnd=1001, title="test", rect=(0, 0, 800, 600))
    win32gui.SetForegroundWindow.reset_mock()
    bring_to_foreground(info)
    win32gui.SetForegroundWindow.assert_called_once_with(1001)


def test_bring_to_foreground_raises_without_win32():
    info = WindowInfo(hwnd=1001, title="test", rect=(0, 0, 800, 600))
    with patch.object(window_module, "_WIN32_AVAILABLE", False):
        with pytest.raises(RuntimeError, match="win32gui not available"):
            bring_to_foreground(info)
