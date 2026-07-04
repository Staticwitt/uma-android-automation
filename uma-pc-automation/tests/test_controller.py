"""Tests for input/controller.py — pydirectinput wrapper."""

import sys
import time
from unittest.mock import MagicMock, call, patch

import pytest

import input.controller as controller_module
from input.controller import click, click_center, click_relative, move_to, press

pydirectinput = sys.modules["pydirectinput"]


# ── helpers ───────────────────────────────────────────────────────────────────

def _rect(left: int = 100, top: int = 200) -> tuple[int, int, int, int]:
    return (left, top, left + 800, top + 600)


def _match(center_x: int, center_y: int) -> MagicMock:
    m = MagicMock()
    m.center_x = center_x
    m.center_y = center_y
    return m


# ── RuntimeError guard ────────────────────────────────────────────────────────

def test_click_raises_without_pydirectinput():
    with patch.object(controller_module, "_PYDIRECTINPUT_AVAILABLE", False):
        with pytest.raises(RuntimeError, match="pydirectinput not available"):
            click(0, 0)


def test_click_relative_raises_without_pydirectinput():
    with patch.object(controller_module, "_PYDIRECTINPUT_AVAILABLE", False):
        with pytest.raises(RuntimeError, match="pydirectinput not available"):
            click_relative(_rect(), 10, 20)


def test_click_center_raises_without_pydirectinput():
    with patch.object(controller_module, "_PYDIRECTINPUT_AVAILABLE", False):
        with pytest.raises(RuntimeError, match="pydirectinput not available"):
            click_center(_rect(), _match(5, 5))


def test_press_raises_without_pydirectinput():
    with patch.object(controller_module, "_PYDIRECTINPUT_AVAILABLE", False):
        with pytest.raises(RuntimeError, match="pydirectinput not available"):
            press("enter")


def test_move_to_raises_without_pydirectinput():
    with patch.object(controller_module, "_PYDIRECTINPUT_AVAILABLE", False):
        with pytest.raises(RuntimeError, match="pydirectinput not available"):
            move_to(0, 0)


# ── click ─────────────────────────────────────────────────────────────────────

def test_click_calls_pydirectinput_click():
    pydirectinput.click.reset_mock()
    with patch("time.sleep"):
        click(300, 400)
    pydirectinput.click.assert_called_once_with(300, 400, button="left")


def test_click_right_button():
    pydirectinput.click.reset_mock()
    with patch("time.sleep"):
        click(10, 20, button="right")
    pydirectinput.click.assert_called_once_with(10, 20, button="right")


def test_click_sleeps_after():
    with patch("time.sleep") as mock_sleep:
        click(0, 0, pause=0.2)
    mock_sleep.assert_called_once_with(0.2)


def test_click_skips_sleep_when_pause_zero():
    with patch("time.sleep") as mock_sleep:
        click(0, 0, pause=0)
    mock_sleep.assert_not_called()


# ── click_relative ────────────────────────────────────────────────────────────

def test_click_relative_adds_window_origin():
    pydirectinput.click.reset_mock()
    with patch("time.sleep"):
        click_relative(_rect(left=100, top=200), rel_x=50, rel_y=30)
    pydirectinput.click.assert_called_once_with(150, 230, button="left")


def test_click_relative_zero_offset():
    pydirectinput.click.reset_mock()
    with patch("time.sleep"):
        click_relative(_rect(left=400, top=300), rel_x=0, rel_y=0)
    pydirectinput.click.assert_called_once_with(400, 300, button="left")


# ── click_center ──────────────────────────────────────────────────────────────

def test_click_center_uses_match_center():
    pydirectinput.click.reset_mock()
    with patch("time.sleep"):
        click_center(_rect(left=100, top=200), _match(center_x=40, center_y=15))
    pydirectinput.click.assert_called_once_with(140, 215, button="left")


def test_click_center_passes_button():
    pydirectinput.click.reset_mock()
    with patch("time.sleep"):
        click_center(_rect(left=0, top=0), _match(5, 5), button="right")
    args, kwargs = pydirectinput.click.call_args
    assert kwargs["button"] == "right"


# ── press ─────────────────────────────────────────────────────────────────────

def test_press_calls_pydirectinput_press():
    pydirectinput.press.reset_mock()
    with patch("time.sleep"):
        press("enter")
    pydirectinput.press.assert_called_once_with("enter")


def test_press_sleeps_after():
    with patch("time.sleep") as mock_sleep:
        press("escape", pause=0.1)
    mock_sleep.assert_called_once_with(0.1)


def test_press_skips_sleep_when_pause_zero():
    with patch("time.sleep") as mock_sleep:
        press("space", pause=0)
    mock_sleep.assert_not_called()


# ── move_to ───────────────────────────────────────────────────────────────────

def test_move_to_calls_pydirectinput_move_to():
    pydirectinput.moveTo.reset_mock()
    move_to(123, 456)
    pydirectinput.moveTo.assert_called_once_with(123, 456)
