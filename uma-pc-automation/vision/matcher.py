"""
Template matching via OpenCV TM_CCOEFF_NORMED.

cv2 is optional at import time (Windows dep); every public function raises
RuntimeError if it's absent. numpy is a required dependency.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import numpy as np

try:
    import cv2

    _CV2_AVAILABLE = True
except ImportError:
    _CV2_AVAILABLE = False

TEMPLATES_DIR = Path(__file__).parent / "templates"


@dataclass
class MatchResult:
    """Location and confidence of a single template match."""

    left: int
    top: int
    width: int
    height: int
    confidence: float

    @property
    def right(self) -> int:
        return self.left + self.width

    @property
    def bottom(self) -> int:
        return self.top + self.height

    @property
    def center_x(self) -> int:
        return self.left + self.width // 2

    @property
    def center_y(self) -> int:
        return self.top + self.height // 2


def load_template(name: str) -> np.ndarray:
    """
    Load a template PNG from vision/templates/.
    *name* should include the extension, e.g. ``"train_speed.png"``.
    """
    if not _CV2_AVAILABLE:
        raise RuntimeError("cv2 not available — install opencv-python on Windows.")
    path = TEMPLATES_DIR / name
    if not path.exists():
        raise FileNotFoundError(f"Template not found: {path}")
    img = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f"cv2.imread failed for: {path}")
    return img


def match(
    frame: np.ndarray,
    template: np.ndarray,
    threshold: float = 0.8,
) -> Optional[MatchResult]:
    """
    Find the single best match of *template* in *frame*.

    Returns None when the peak correlation is below *threshold*.
    """
    if not _CV2_AVAILABLE:
        raise RuntimeError("cv2 not available — install opencv-python on Windows.")
    result = cv2.matchTemplate(frame, template, cv2.TM_CCOEFF_NORMED)
    _, max_val, _, max_loc = cv2.minMaxLoc(result)
    if max_val < threshold:
        return None
    h, w = template.shape[:2]
    return MatchResult(
        left=int(max_loc[0]),
        top=int(max_loc[1]),
        width=w,
        height=h,
        confidence=float(max_val),
    )


def match_all(
    frame: np.ndarray,
    template: np.ndarray,
    threshold: float = 0.8,
) -> list[MatchResult]:
    """
    Find all non-overlapping matches of *template* in *frame* above *threshold*.

    Uses greedy NMS: candidates are sorted by confidence descending; a candidate
    is accepted if its top-left corner is not within (template.width, template.height)
    of any already-accepted result. Returns results sorted by confidence descending.
    """
    if not _CV2_AVAILABLE:
        raise RuntimeError("cv2 not available — install opencv-python on Windows.")
    result = cv2.matchTemplate(frame, template, cv2.TM_CCOEFF_NORMED)
    h, w = template.shape[:2]

    ys, xs = np.where(result >= threshold)
    candidates = sorted(
        [(float(result[y, x]), int(x), int(y)) for x, y in zip(xs, ys)],
        reverse=True,
    )

    accepted: list[MatchResult] = []
    for conf, x, y in candidates:
        overlaps = any(
            abs(x - r.left) < w and abs(y - r.top) < h for r in accepted
        )
        if not overlaps:
            accepted.append(
                MatchResult(left=x, top=y, width=w, height=h, confidence=conf)
            )

    return accepted
