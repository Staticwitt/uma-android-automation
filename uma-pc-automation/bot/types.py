from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum, IntEnum
from typing import Optional


class StatName(Enum):
    SPEED = "SPEED"
    STAMINA = "STAMINA"
    POWER = "POWER"
    GUTS = "GUTS"
    WIT = "WIT"

    @classmethod
    def from_name(cls, value: str) -> Optional["StatName"]:
        try:
            return cls[value.upper()]
        except KeyError:
            return None


class DateYear(IntEnum):
    """Career year. Ordinal ordering (JUNIOR < CLASSIC < SENIOR) is relied on by scoring math."""
    JUNIOR = 0
    CLASSIC = 1
    SENIOR = 2

    @classmethod
    def from_name(cls, value: str) -> Optional["DateYear"]:
        for member in cls:
            if member.name == value.upper():
                return member
        return None

    @classmethod
    def from_ordinal(cls, ordinal: int) -> Optional["DateYear"]:
        for member in cls:
            if member.value == ordinal:
                return member
        return None


@dataclass
class GameDateSnapshot:
    year: DateYear
    day: int = 0
    b_is_pre_debut: bool = False
    is_summer: bool = False


@dataclass
class BarFillResult:
    dominant_color: str
    fill_percent: float
    is_trainer_support: bool = False


@dataclass
class TrainingOption:
    name: StatName
    stat_gains: dict[StatName, int]
    relationship_bars: list[BarFillResult]
    num_rainbow: int
    num_skill_hints: int = 0
    training_level: Optional[int] = None


@dataclass
class TrainingScoringConstants:
    ratio_breakpoints: list[float] = field(
        default_factory=lambda: [15.0, 30.0, 45.0, 60.0, 75.0, 90.0]
    )
    ratio_multipliers: list[float] = field(
        default_factory=lambda: [5.0, 4.0, 3.0, 2.0, 1.0, 0.5, 0.3]
    )
    priority_coefficient: float = 0.5
    level_boost_rank1_factor: float = 0.75
    level_boost_rank2_factor: float = 0.25
    level_boost_rank3_factor: float = 0.10
    main_stat_thresholds: dict[StatName, int] = field(
        default_factory=lambda: {
            StatName.SPEED: 30,
            StatName.STAMINA: 30,
            StatName.POWER: 30,
            StatName.GUTS: 30,
            StatName.WIT: 15,
        }
    )
    main_stat_bonus_magnitude: float = 2.0
    relationship_orange_value: float = 0.0
    relationship_green_value: float = 1.0
    relationship_blue_value: float = 2.5
    relationship_diminishing_factor: float = 0.5
    relationship_early_game_bonus: float = 1.3
    relationship_trainer_support_bonus: float = 1.15
    skill_hint_per_hint_score: float = 10.0
    skill_hint_override_score: float = 10000.0
    stat_weight_with_bars: float = 0.6
    stat_weight_without_bars: float = 0.7
    relationship_weight_with_bars: float = 0.1
    misc_weight: float = 0.3
    junior_early_game_flat_bonus: float = 200.0
    relationship_scale: float = 1.5
    rainbow_multiplier_enabled: float = 2.0
    rainbow_multiplier_disabled: float = 1.5
    rainbow_per_instance_base: float = 200.0
    rainbow_per_instance_decay: float = 0.5
    anticipatory_min_fill_percent: float = 50.0
    anticipatory_coefficient: float = 0.2
    anticipatory_cap: float = 0.6

    def __post_init__(self) -> None:
        if len(self.ratio_multipliers) != len(self.ratio_breakpoints) + 1:
            raise ValueError(
                f"ratio_multipliers must have exactly one more entry than ratio_breakpoints "
                f"(got {len(self.ratio_multipliers)} multipliers vs {len(self.ratio_breakpoints)} breakpoints)"
            )


@dataclass
class TrainingConfig:
    current_stats: dict[StatName, int]
    stat_prioritization: list[StatName]
    summer_training_stat_priority: list[StatName]
    stat_targets: dict[StatName, int]
    current_date: GameDateSnapshot
    scenario: str
    enable_rainbow_training_bonus: bool
    blacklist: list[Optional[StatName]] = field(default_factory=list)
    disable_training_on_maxed_stat: bool = False
    skill_hints_per_location: dict[StatName, int] = field(
        default_factory=lambda: {s: 0 for s in StatName}
    )
    enable_prioritize_skill_hints: bool = False
    enable_training_level_weighting: bool = False
    enable_prioritize_near_max_friendship: bool = True
    enable_bond_efficiency_capping: bool = False
    stats_trained_over_buffer: set[StatName] = field(default_factory=set)
    scoring: TrainingScoringConstants = field(default_factory=TrainingScoringConstants)
