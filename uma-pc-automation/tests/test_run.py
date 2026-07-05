"""Tests for run.py — CLI entry point config helpers."""

import argparse
import sys
from unittest.mock import MagicMock

import pytest

import run
from bot.types import StatName


# ── _parse_stat_names / _parse_priority ──────────────────────────────────────

def test_parse_priority_returns_stat_list():
    result = run._parse_priority("SPEED,STAMINA,POWER,GUTS,WIT")
    assert result == [
        StatName.SPEED, StatName.STAMINA, StatName.POWER,
        StatName.GUTS, StatName.WIT,
    ]


def test_parse_priority_strips_whitespace_and_uppercases():
    result = run._parse_priority(" speed , Stamina ")
    assert result == [StatName.SPEED, StatName.STAMINA]


def test_parse_priority_unknown_stat_exits_with_message(capsys):
    with pytest.raises(SystemExit) as exc_info:
        run._parse_priority("SPEEED,STAMINA")
    assert "Unknown stat" in str(exc_info.value)


def test_parse_stat_names_from_json_list_unknown_exits_with_message():
    with pytest.raises(SystemExit) as exc_info:
        run._parse_stat_names(["SPEEED", "STAMINA"])
    assert "Unknown stat" in str(exc_info.value)
    assert "Valid values" in str(exc_info.value)


def test_parse_stat_names_valid_list():
    result = run._parse_stat_names(["wit", "guts"])
    assert result == [StatName.WIT, StatName.GUTS]


# ── _build_training_config: scenario-aware default targets ──────────────────

def _args(scenario="URA Finals", priority="SPEED,STAMINA,POWER,GUTS,WIT"):
    return argparse.Namespace(scenario=scenario, priority=priority)


def test_default_stat_targets_use_scenario_cap_for_ura_finals():
    cfg = run._build_training_config(_args(scenario="URA Finals"), {})
    # URA Finals soft-caps every stat at BASE_STAT_CAP + 200 = 1400.
    assert cfg.stat_targets[StatName.SPEED] == 1400
    assert cfg.stat_targets[StatName.WIT] == 1400


def test_default_stat_targets_use_scenario_cap_for_unity_cup():
    cfg = run._build_training_config(_args(scenario="Unity Cup"), {})
    assert cfg.stat_targets[StatName.WIT] == 1800   # 1200 + 600
    assert cfg.stat_targets[StatName.SPEED] == 1300  # 1200 + 100


def test_json_stat_targets_override_scenario_default():
    cfg = run._build_training_config(
        _args(scenario="URA Finals"),
        {"stat_targets": {"SPEED": 900}},
    )
    assert cfg.stat_targets[StatName.SPEED] == 900
    # Unspecified stats still fall back to the scenario cap.
    assert cfg.stat_targets[StatName.STAMINA] == 1400


def test_json_stat_prioritization_unknown_stat_exits():
    with pytest.raises(SystemExit):
        run._build_training_config(
            _args(), {"stat_prioritization": ["SPEEED", "STAMINA"]}
        )


def test_json_stat_prioritization_overrides_cli_priority():
    cfg = run._build_training_config(
        _args(priority="SPEED,STAMINA,POWER,GUTS,WIT"),
        {"stat_prioritization": ["WIT", "GUTS", "POWER", "STAMINA", "SPEED"]},
    )
    assert cfg.stat_prioritization[0] == StatName.WIT


# ── main(): --no-focus wiring ─────────────────────────────────────────────────

def _run_main_capturing_run_config(monkeypatch, tmp_path, argv):
    captured = {}

    def fake_build_bot(run_config):
        captured["run_config"] = run_config
        return MagicMock()

    monkeypatch.setattr(run, "build_bot", fake_build_bot)
    monkeypatch.setattr(sys, "argv", ["run.py", "--log-dir", str(tmp_path), *argv])
    run.main()
    return captured["run_config"]


def test_main_no_focus_flag_disables_focus_window(monkeypatch, tmp_path):
    run_config = _run_main_capturing_run_config(monkeypatch, tmp_path, ["--no-focus"])
    assert run_config.focus_window is False


def test_main_focus_window_defaults_true(monkeypatch, tmp_path):
    run_config = _run_main_capturing_run_config(monkeypatch, tmp_path, [])
    assert run_config.focus_window is True
