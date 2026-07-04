"""
Stub out Windows-only libraries so the full test suite runs on any platform.
pytest loads conftest.py before collecting tests, so these stubs are in place
before any capture.* module is first imported.
"""

import sys
from unittest.mock import MagicMock

for _mod_name in ("win32gui", "win32con", "dxcam", "cv2", "easyocr", "pydirectinput"):
    if _mod_name not in sys.modules:
        sys.modules[_mod_name] = MagicMock()
