"""Tests for capture/screen.py — dxcam screen capture wrapper."""

import sys
from unittest.mock import MagicMock, patch

import pytest

# conftest.py has already stubbed dxcam into sys.modules.
import capture.screen as screen_module
from capture.screen import ScreenCapture
from capture.window import WindowInfo

dxcam = sys.modules["dxcam"]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_window(left: int = 100, top: int = 50, right: int = 900, bottom: int = 650) -> WindowInfo:
    return WindowInfo(hwnd=1001, title="ウマ娘", rect=(left, top, right, bottom))


def _make_capture() -> tuple[ScreenCapture, MagicMock]:
    """Return a ScreenCapture and its underlying mock camera."""
    mock_camera = MagicMock()
    dxcam.create.return_value = mock_camera
    cap = ScreenCapture()
    return cap, mock_camera


# ── Construction ──────────────────────────────────────────────────────────────

def test_create_calls_dxcam_with_defaults():
    dxcam.create.reset_mock()
    ScreenCapture()
    dxcam.create.assert_called_once_with(device_idx=0, output_color="BGR")


def test_create_passes_custom_device_idx():
    dxcam.create.reset_mock()
    ScreenCapture(device_idx=1)
    dxcam.create.assert_called_once_with(device_idx=1, output_color="BGR")


def test_create_raises_without_dxcam():
    with patch.object(screen_module, "_DXCAM_AVAILABLE", False):
        with pytest.raises(RuntimeError, match="dxcam not available"):
            ScreenCapture()


# ── grab ──────────────────────────────────────────────────────────────────────

def test_grab_full_screen_passes_none_region():
    cap, camera = _make_capture()
    cap.grab()
    camera.grab.assert_called_once_with(region=None)


def test_grab_with_region():
    cap, camera = _make_capture()
    cap.grab(region=(10, 20, 110, 70))
    camera.grab.assert_called_once_with(region=(10, 20, 110, 70))


def test_grab_returns_camera_result():
    cap, camera = _make_capture()
    sentinel = object()
    camera.grab.return_value = sentinel
    assert cap.grab() is sentinel


def test_grab_returns_none_when_camera_returns_none():
    cap, camera = _make_capture()
    camera.grab.return_value = None
    assert cap.grab() is None


# ── grab_window ───────────────────────────────────────────────────────────────

def test_grab_window_uses_window_rect():
    cap, camera = _make_capture()
    window = _make_window(100, 50, 900, 650)
    cap.grab_window(window)
    camera.grab.assert_called_once_with(region=(100, 50, 900, 650))


def test_grab_window_different_rect():
    cap, camera = _make_capture()
    window = _make_window(0, 0, 1920, 1080)
    cap.grab_window(window)
    camera.grab.assert_called_once_with(region=(0, 0, 1920, 1080))


# ── grab_region_relative ──────────────────────────────────────────────────────

def test_grab_region_relative_offsets_from_window_origin():
    cap, camera = _make_capture()
    window = _make_window(100, 50, 900, 650)
    cap.grab_region_relative(window, left=10, top=20, right=110, bottom=70)
    # expected screen coords: (100+10, 50+20, 100+110, 50+70)
    camera.grab.assert_called_once_with(region=(110, 70, 210, 120))


def test_grab_region_relative_zero_window_origin():
    cap, camera = _make_capture()
    window = _make_window(0, 0, 1920, 1080)
    cap.grab_region_relative(window, 5, 10, 50, 100)
    camera.grab.assert_called_once_with(region=(5, 10, 50, 100))


def test_grab_region_relative_large_offset():
    cap, camera = _make_capture()
    window = _make_window(200, 100, 1200, 900)
    cap.grab_region_relative(window, 0, 0, 400, 300)
    camera.grab.assert_called_once_with(region=(200, 100, 600, 400))


# ── release / context manager ─────────────────────────────────────────────────

def test_release_deletes_camera():
    cap, camera = _make_capture()
    cap.release()
    # Camera attribute is cleared after release.
    assert cap._camera is None


def test_context_manager_releases_on_exit():
    mock_camera = MagicMock()
    dxcam.create.return_value = mock_camera
    with ScreenCapture() as cap:
        pass
    assert cap._camera is None


def test_context_manager_returns_self():
    mock_camera = MagicMock()
    dxcam.create.return_value = mock_camera
    cap = ScreenCapture()
    assert cap.__enter__() is cap
    cap.release()
