#!/usr/bin/env python
"""
Template capture utility — crop indicator PNGs from the live game window.

Workflow
--------
1. Start Uma Musume in the DMM client and navigate to the screen you want.
2. Run ``screenshot`` to dump the full window frame:

       python tools/capture_template.py screenshot

   This saves ``screenshot.png`` in the current directory.

3. Open ``screenshot.png`` in any image viewer to read pixel coordinates.

4. Run ``crop`` to extract the indicator region and save it as a template:

       python tools/capture_template.py crop training_select 540 860 620 900

   Saves ``vision/templates/training_select.png``.

5. Repeat for each indicator listed in bot/detector.py:
   - confirm_ok.png        (the OK/confirm button in modals)
   - skill_select.png      (unique element on the skill-purchase screen)
   - race_select.png       (unique element on the race-select screen)
   - training_select.png   (unique element on the main training screen)
   - run_complete.png      (unique element on the end-of-run results screen)

   And for each training button:
   - training_btn_speed.png / stamina / power / guts / wit

   Keep crops small (30-100 px square). Pick a UI element that only appears
   on that screen and does not change between turns (icons, fixed labels —
   not numbers, not health bars).

Commands
--------
  screenshot                        Capture full game window → screenshot.png
  crop <name> <l> <t> <r> <b>      Crop region and save as vision/templates/<name>.png
  list                              List templates already saved
  verify <name>                     Template-match <name> against current window frame
"""

import argparse
import sys
from pathlib import Path

# ── dependency guard ──────────────────────────────────────────────────────────

try:
    import cv2
except ImportError:
    sys.exit("cv2 not available — install opencv-python on Windows.")

import numpy as np

# Add project root to path so local modules resolve.
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_PROJECT_ROOT))

from capture.screen import ScreenCapture
from capture.window import find_game_window
from vision.matcher import TEMPLATES_DIR, match

# ── helpers ───────────────────────────────────────────────────────────────────

def _grab_window_frame() -> tuple[np.ndarray, object]:
    window = find_game_window()
    if window is None:
        sys.exit(
            "Game window not found. Start Uma Musume in the DMM client first."
        )
    with ScreenCapture() as cap:
        frame = cap.grab_window(window)
    if frame is None:
        sys.exit("Screen capture returned None. Is the game window visible?")
    return frame, window


def _save_png(path: Path, image: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(path), image)
    print(f"Saved: {path}  ({image.shape[1]}×{image.shape[0]} px)")


# ── commands ──────────────────────────────────────────────────────────────────

def cmd_screenshot(out_path: Path) -> None:
    frame, window = _grab_window_frame()
    _save_png(out_path, frame)
    print(f"Window rect: {window.rect}  (left, top, right, bottom)")
    print("Open the PNG in an image viewer to read crop coordinates.")


def cmd_crop(name: str, left: int, top: int, right: int, bottom: int) -> None:
    frame, _ = _grab_window_frame()
    crop = frame[top:bottom, left:right]
    if crop.size == 0:
        sys.exit(f"Empty crop region: ({left}, {top}, {right}, {bottom})")
    out = TEMPLATES_DIR / f"{name}.png"
    _save_png(out, crop)


def cmd_list() -> None:
    pngs = sorted(TEMPLATES_DIR.glob("*.png"))
    if not pngs:
        print(f"No templates in {TEMPLATES_DIR}")
        return
    print(f"Templates in {TEMPLATES_DIR}:")
    for p in pngs:
        img = cv2.imread(str(p))
        size = f"{img.shape[1]}×{img.shape[0]}" if img is not None else "unreadable"
        print(f"  {p.name:40s}  {size}")


def cmd_verify(name: str, threshold: float) -> None:
    template_path = TEMPLATES_DIR / f"{name}.png"
    if not template_path.exists():
        sys.exit(f"Template not found: {template_path}")
    template = cv2.imread(str(template_path), cv2.IMREAD_COLOR)
    if template is None:
        sys.exit(f"Failed to load template: {template_path}")

    frame, _ = _grab_window_frame()
    result = match(frame, template, threshold=threshold)
    if result is None:
        print(f"NO MATCH  (threshold={threshold})")
    else:
        print(
            f"MATCH  confidence={result.confidence:.3f}  "
            f"at ({result.left}, {result.top})  "
            f"center=({result.center_x}, {result.center_y})"
        )


# ── CLI ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Capture and verify template PNGs from the Uma Musume game window.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    # screenshot
    p_ss = sub.add_parser("screenshot", help="Save full window frame to PNG")
    p_ss.add_argument(
        "--out", default="screenshot.png", help="Output file (default: screenshot.png)"
    )

    # crop
    p_crop = sub.add_parser("crop", help="Crop a region and save as a template")
    p_crop.add_argument("name", help="Template name (without .png)")
    p_crop.add_argument("left",   type=int)
    p_crop.add_argument("top",    type=int)
    p_crop.add_argument("right",  type=int)
    p_crop.add_argument("bottom", type=int)

    # list
    sub.add_parser("list", help="List saved templates")

    # verify
    p_ver = sub.add_parser("verify", help="Template-match against the current window frame")
    p_ver.add_argument("name", help="Template name (without .png)")
    p_ver.add_argument("--threshold", type=float, default=0.8)

    args = parser.parse_args()

    if args.cmd == "screenshot":
        cmd_screenshot(Path(args.out))
    elif args.cmd == "crop":
        cmd_crop(args.name, args.left, args.top, args.right, args.bottom)
    elif args.cmd == "list":
        cmd_list()
    elif args.cmd == "verify":
        cmd_verify(args.name, args.threshold)


if __name__ == "__main__":
    main()
