#!/usr/bin/env python
"""
Uma Musume PC bot — entry point.

Usage
-----
  # Quick start (URA Finals, default stat priority)
  python run.py

  # Specify scenario and priority
  python run.py --scenario "Unity Cup" --priority STAMINA,SPEED,POWER,GUTS,WIT

  # Load full config from JSON (see run_config.example.json)
  python run.py --config my_run.json

  # CPU-only OCR (slower, no CUDA needed)
  python run.py --no-gpu

Config JSON format
------------------
  {
    "scenario": "URA Finals",
    "stat_prioritization": ["SPEED", "STAMINA", "POWER", "GUTS", "WIT"],
    "stat_targets": {
      "SPEED": 1200, "STAMINA": 600, "POWER": 900, "GUTS": 600, "WIT": 600
    }
  }
  Any key may be omitted to use the default value.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from datetime import datetime
from pathlib import Path

# Add project root to path when invoked directly.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from bot.runner import RunConfig, build_bot
from bot.scoring import get_scenario_stat_cap
from bot.state_machine import LoopConfig
from bot.types import (
    DateYear,
    GameDateSnapshot,
    StatName,
    TrainingConfig,
    TrainingScoringConstants,
)

_STAT_BY_NAME: dict[str, StatName] = {s.name: s for s in StatName}


# ── Config helpers ────────────────────────────────────────────────────────────

def _parse_stat_names(raw: list[str]) -> list[StatName]:
    try:
        return [_STAT_BY_NAME[s.upper()] for s in raw]
    except KeyError as e:
        sys.exit(f"Unknown stat {e}. Valid values: {', '.join(_STAT_BY_NAME)}")


def _parse_priority(raw: str) -> list[StatName]:
    return _parse_stat_names([p.strip() for p in raw.split(",")])


def _load_json_config(path: Path) -> dict:
    try:
        return json.loads(path.read_text())
    except (OSError, json.JSONDecodeError) as e:
        sys.exit(f"Failed to read config {path}: {e}")


def _build_training_config(args: argparse.Namespace, json_cfg: dict) -> TrainingConfig:
    scenario = json_cfg.get("scenario", args.scenario)

    raw_priority = json_cfg.get("stat_prioritization")
    if raw_priority:
        priority = _parse_stat_names(raw_priority)
    else:
        priority = _parse_priority(args.priority)

    raw_targets = json_cfg.get("stat_targets", {})
    stat_targets = {
        s: raw_targets.get(s.name, get_scenario_stat_cap(scenario, s)) for s in StatName
    }

    return TrainingConfig(
        current_stats={s: 0 for s in StatName},   # OCR fills these in turn 1
        stat_prioritization=priority,
        summer_training_stat_priority=priority,    # same priority in summer
        stat_targets=stat_targets,
        current_date=GameDateSnapshot(year=DateYear.JUNIOR, day=0),
        scenario=scenario,
        enable_rainbow_training_bonus=True,
    )


# ── Logging setup ─────────────────────────────────────────────────────────────

def _setup_logging(log_dir: Path) -> Path:
    log_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = log_dir / f"run_{ts}.log"

    fmt = "%(asctime)s  %(name)-24s  %(levelname)-7s  %(message)s"
    logging.basicConfig(
        level=logging.INFO,
        format=fmt,
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(log_file, encoding="utf-8"),
        ],
    )
    return log_file


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Uma Musume PC bot",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--scenario", default="URA Finals",
        help="Game scenario (default: 'URA Finals')",
    )
    parser.add_argument(
        "--priority", default="SPEED,STAMINA,POWER,GUTS,WIT",
        help="Comma-separated stat priority order",
    )
    parser.add_argument(
        "--config", type=Path, default=None, metavar="FILE",
        help="Path to JSON config file (overrides --scenario / --priority)",
    )
    parser.add_argument(
        "--no-gpu", action="store_true",
        help="Use CPU for EasyOCR inference (slower, no CUDA needed)",
    )
    parser.add_argument(
        "--threshold", type=float, default=0.8, metavar="N",
        help="Template match confidence threshold (default: 0.8)",
    )
    parser.add_argument(
        "--log-dir", type=Path, default=Path("logs"), metavar="DIR",
        help="Directory for run logs and crash screenshots (default: logs/)",
    )
    parser.add_argument(
        "--poll-interval", type=float, default=1.0, metavar="SEC",
        help="Seconds between screen polls (default: 1.0)",
    )
    parser.add_argument(
        "--unknown-streak", type=int, default=30, metavar="N",
        help="Consecutive UNKNOWN detections before giving up (default: 30)",
    )

    args = parser.parse_args()

    log_file = _setup_logging(args.log_dir)
    log = logging.getLogger("run")
    log.info("Log file: %s", log_file)

    json_cfg = _load_json_config(args.config) if args.config else {}
    training_config = _build_training_config(args, json_cfg)

    run_config = RunConfig(
        training_config=training_config,
        scoring_constants=TrainingScoringConstants(),
        loop_config=LoopConfig(
            poll_interval=args.poll_interval,
            max_unknown_streak=args.unknown_streak,
        ),
        ocr_gpu=not args.no_gpu,
        detector_threshold=args.threshold,
        log_dir=args.log_dir,
    )

    log.info(
        "Starting | scenario=%s | priority=%s | gpu=%s | threshold=%s",
        training_config.scenario,
        [s.name for s in training_config.stat_prioritization],
        not args.no_gpu,
        args.threshold,
    )

    try:
        sm = build_bot(run_config)
        sm.run()
        log.info("Run finished normally")
    except KeyboardInterrupt:
        log.info("Stopped by user (Ctrl-C)")
    except RuntimeError as e:
        log.error("Bot lost: %s", e)
        log.error("Check logs/ for a crash screenshot")
        sys.exit(1)


if __name__ == "__main__":
    main()
