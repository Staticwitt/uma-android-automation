"""
GPU-accelerated screen capture via dxcam (DXGI Desktop Duplication).

Windows-only. Requires dxcam>=0.0.5. On non-Windows the module imports cleanly
but ScreenCapture.__init__ raises RuntimeError — this allows tests to mock freely.

Usage:
    with ScreenCapture() as cap:
        frame = cap.grab_window(window_info)   # full window
        roi   = cap.grab_region_relative(window_info, 10, 20, 110, 70)
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    import numpy as np

from .window import WindowInfo

try:
    import dxcam

    _DXCAM_AVAILABLE = True
except ImportError:
    _DXCAM_AVAILABLE = False


class ScreenCapture:
    """
    Thin wrapper around a dxcam DXCamera. One instance per bot run is enough —
    dxcam holds a DXGI duplication object that is cheap to keep open.
    """

    def __init__(self, device_idx: int = 0, output_color: str = "BGR") -> None:
        if not _DXCAM_AVAILABLE:
            raise RuntimeError(
                "dxcam not available. Install with: pip install dxcam\n"
                "dxcam requires Windows and a DirectX-capable GPU."
            )
        self._camera = dxcam.create(device_idx=device_idx, output_color=output_color)

    def grab(
        self, region: Optional[tuple[int, int, int, int]] = None
    ) -> Optional[np.ndarray]:
        """
        Capture a frame. *region* is (left, top, right, bottom) in screen
        coordinates; omit to capture the full primary display.

        Returns None when dxcam has no new frame ready — callers should retry.
        """
        return self._camera.grab(region=region)

    def grab_window(self, window: WindowInfo) -> Optional[np.ndarray]:
        """Capture the game window's bounding rectangle."""
        return self.grab(region=window.rect)

    def grab_region_relative(
        self,
        window: WindowInfo,
        left: int,
        top: int,
        right: int,
        bottom: int,
    ) -> Optional[np.ndarray]:
        """
        Capture a sub-region whose coordinates are relative to the window's
        top-left corner. Use this for cropping to a specific UI panel.
        """
        wx, wy = window.rect[0], window.rect[1]
        return self.grab(region=(wx + left, wy + top, wx + right, wy + bottom))

    def release(self) -> None:
        """Release the DXGI duplication object."""
        del self._camera
        self._camera = None  # type: ignore[assignment]

    def __enter__(self) -> ScreenCapture:
        return self

    def __exit__(self, *_: object) -> None:
        self.release()
