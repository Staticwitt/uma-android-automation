"""
Python port of android/scoring-shared/src/commonMain/kotlin/com/steve1316/uma_scoring/Scoring.kt.

All logic is a direct translation of the Kotlin source. If the Kotlin changes, update here too
and re-run tests/test_scoring.py to verify parity.
"""

from __future__ import annotations

import math
from typing import Optional

from .types import (
    BarFillResult,
    DateYear,
    StatName,
    TrainingConfig,
    TrainingOption,
    TrainingScoringConstants,
)

_FINALE_RACE_STAT_BONUS = 15
BASE_STAT_CAP = 1200


def get_scenario_stat_cap(scenario: str, stat_name: StatName) -> int:
    if scenario.startswith("URA"):
        return BASE_STAT_CAP + 200
    if scenario == "Unity Cup":
        return BASE_STAT_CAP + 600 if stat_name == StatName.WIT else BASE_STAT_CAP + 100
    if scenario == "Trackblazer":
        if stat_name == StatName.STAMINA:
            return BASE_STAT_CAP + 700
        if stat_name == StatName.WIT:
            return BASE_STAT_CAP + 300
        return BASE_STAT_CAP
    return BASE_STAT_CAP


def get_current_stat_cap(stat_name: StatName, config: TrainingConfig) -> int:
    return get_scenario_stat_cap(config.scenario, stat_name)


def get_remaining_finale_races(current_day: int) -> int:
    return max(0, 75 - max(current_day, 72))


def get_finale_stat_bonus(current_day: int) -> int:
    return get_remaining_finale_races(current_day) * _FINALE_RACE_STAT_BONUS


def level_boost_multiplier(
    priority_rank: int,
    training_level: Optional[int],
    constants: Optional[TrainingScoringConstants] = None,
) -> float:
    if constants is None:
        constants = TrainingScoringConstants()
    level = training_level if training_level is not None else 1
    if level <= 1:
        return 1.0
    priority_factor = {
        1: constants.level_boost_rank1_factor,
        2: constants.level_boost_rank2_factor,
        3: constants.level_boost_rank3_factor,
    }.get(priority_rank, 0.0)
    level_factor = (level - 1) / 4.0
    return 1.0 + priority_factor * level_factor


def calculate_stat_efficiency_score(config: TrainingConfig, training: TrainingOption) -> float:
    score = 0.0
    active_priority = (
        config.summer_training_stat_priority
        if config.current_date.is_summer
        else config.stat_prioritization
    )

    for stat_name in StatName:
        current_stat = config.current_stats.get(stat_name, 0)
        target_stat = config.stat_targets.get(stat_name, 0)
        stat_gain = training.stat_gains.get(stat_name, 0)

        if stat_gain <= 0 or target_stat <= 0:
            continue

        priority_index = active_priority.index(stat_name) if stat_name in active_priority else -1

        # Weight progress above BASE_STAT_CAP at 0.5× to match the in-game soft-cap.
        effective_current = (
            min(float(current_stat), float(BASE_STAT_CAP))
            + max(0.0, float(current_stat) - BASE_STAT_CAP) * 0.5
        )
        effective_target = (
            min(float(target_stat), float(BASE_STAT_CAP))
            + max(0.0, float(target_stat) - BASE_STAT_CAP) * 0.5
        )
        completion_percent = (
            (effective_current / effective_target) * 100.0 if effective_target > 0.0 else 100.0
        )

        breakpoints = config.scoring.ratio_breakpoints
        multipliers = config.scoring.ratio_multipliers
        bucket = next((i for i, bp in enumerate(breakpoints) if completion_percent < bp), -1)
        ratio_multiplier = multipliers[-1] if bucket == -1 else multipliers[bucket]

        if priority_index != -1:
            priority_multiplier = 1.0 + config.scoring.priority_coefficient * (
                len(active_priority) - priority_index
            )
        else:
            priority_multiplier = 1.0

        if (
            config.enable_training_level_weighting
            and stat_name == training.name
            and priority_index != -1
        ):
            level_multiplier = level_boost_multiplier(
                priority_index + 1, training.training_level, config.scoring
            )
        else:
            level_multiplier = 1.0

        is_main_stat = training.name == stat_name
        if is_main_stat:
            threshold = config.scoring.main_stat_thresholds.get(stat_name)
            if threshold is None:
                raise ValueError(f"No main_stat_thresholds entry for {stat_name}")
            main_stat_bonus = (
                config.scoring.main_stat_bonus_magnitude if stat_gain >= threshold else 1.0
            )
        else:
            main_stat_bonus = 1.0

        # Gains above BASE_STAT_CAP are worth half as much in-game (July 2026 soft-cap).
        if current_stat >= BASE_STAT_CAP:
            effective_gain = stat_gain * 0.5
        elif current_stat + stat_gain <= BASE_STAT_CAP:
            effective_gain = float(stat_gain)
        else:
            below_cap = BASE_STAT_CAP - current_stat
            effective_gain = below_cap + (stat_gain - below_cap) * 0.5

        stat_score = effective_gain
        stat_score *= ratio_multiplier
        stat_score *= priority_multiplier
        stat_score *= level_multiplier
        stat_score *= main_stat_bonus
        score += stat_score

    return score


def _is_bar_fully_maxed(bar: BarFillResult) -> bool:
    return bar.dominant_color == "orange" and bar.fill_percent >= 99.9


def calculate_relationship_score(config: TrainingConfig, training: TrainingOption) -> float:
    if not training.relationship_bars:
        return 0.0

    score = 0.0
    max_score = 0.0

    for bar in training.relationship_bars:
        if config.enable_bond_efficiency_capping and _is_bar_fully_maxed(bar):
            continue

        base_value = {
            "orange": config.scoring.relationship_orange_value,
            "green": config.scoring.relationship_green_value,
            "blue": config.scoring.relationship_blue_value,
        }.get(bar.dominant_color, 0.0)

        if base_value > 0:
            fill_level = bar.fill_percent / 100.0
            diminishing_factor = 1.0 - fill_level * config.scoring.relationship_diminishing_factor
            early_game_bonus = (
                config.scoring.relationship_early_game_bonus
                if (
                    config.current_date.year == DateYear.JUNIOR
                    or config.current_date.b_is_pre_debut
                )
                else 1.0
            )
            trainer_support_bonus = (
                config.scoring.relationship_trainer_support_bonus
                if bar.is_trainer_support
                else 1.0
            )
            score += base_value * diminishing_factor * early_game_bonus * trainer_support_bonus
            max_score += (
                config.scoring.relationship_blue_value * config.scoring.relationship_early_game_bonus
            )

    return (score / max_score * 100.0) if max_score > 0 else 0.0


def calculate_misc_score(config: TrainingConfig, training: TrainingOption) -> float:
    score = 50.0
    num_skill_hints = config.skill_hints_per_location.get(training.name, 0)
    score += config.scoring.skill_hint_per_hint_score * num_skill_hints

    if config.enable_prioritize_skill_hints and num_skill_hints > 0:
        return config.scoring.skill_hint_override_score + score

    return min(max(score, 0.0), 100.0)


def calculate_raw_training_score(config: TrainingConfig, training: TrainingOption) -> float:
    if training.name in config.blacklist:
        return 0.0

    current_stat = config.current_stats.get(training.name, 0)
    potential_stat = current_stat + training.stat_gains.get(training.name, 0)
    stat_cap = get_current_stat_cap(training.name, config)
    finale_bonus = get_finale_stat_bonus(config.current_date.day)
    effective_stat_cap = stat_cap - 100 - finale_bonus

    if current_stat >= stat_cap:
        return 0.0

    if config.disable_training_on_maxed_stat and current_stat >= effective_stat_cap:
        can_use_allowance = (
            training.num_rainbow > 0 and training.name not in config.stats_trained_over_buffer
        )
        if not can_use_allowance:
            return 0.0

    if potential_stat >= effective_stat_cap:
        can_use_allowance = (
            training.num_rainbow > 0 and training.name not in config.stats_trained_over_buffer
        )
        if not can_use_allowance:
            return 0.0

    stat_score = calculate_stat_efficiency_score(config, training)
    relationship_score = calculate_relationship_score(config, training)
    misc_score = calculate_misc_score(config, training)

    stat_weight = (
        config.scoring.stat_weight_with_bars
        if training.relationship_bars
        else config.scoring.stat_weight_without_bars
    )
    relationship_weight = (
        config.scoring.relationship_weight_with_bars if training.relationship_bars else 0.0
    )
    misc_weight = config.scoring.misc_weight

    total_score = (
        stat_score * stat_weight
        + relationship_score * relationship_weight
        + misc_score * misc_weight
    )

    if training.num_rainbow > 0 and config.current_date.year > DateYear.JUNIOR:
        rainbow_multiplier = (
            config.scoring.rainbow_multiplier_enabled
            if config.enable_rainbow_training_bonus
            else config.scoring.rainbow_multiplier_disabled
        )
    else:
        rainbow_multiplier = 1.0
    total_score *= rainbow_multiplier

    if (
        config.enable_prioritize_near_max_friendship
        and config.current_date.year > DateYear.JUNIOR
        and training.num_rainbow == 0
        and training.relationship_bars
    ):
        contributions = 0.0
        qualifying_bars = 0
        for bar in training.relationship_bars:
            if (
                bar.dominant_color in ("green", "blue")
                and bar.fill_percent > config.scoring.anticipatory_min_fill_percent
            ):
                contributions += bar.fill_percent / 100.0
                qualifying_bars += 1
        if qualifying_bars > 0:
            anticipatory_multiplier = 1.0 + min(
                config.scoring.anticipatory_cap,
                config.scoring.anticipatory_coefficient * contributions,
            )
            total_score *= anticipatory_multiplier

    return max(total_score, 0.0)


def estimate_failure_chance_from_energy(
    current_energy: int, stat_name: Optional[StatName] = None
) -> int:
    energy = max(0, min(current_energy, 100))
    if stat_name == StatName.WIT:
        raw = 161.4 * (0.9793 ** energy) - 81.4
        estimated = int(raw)
    else:
        estimated = 0 if energy >= 50 else (50 - energy) * 2
    return max(0, min(estimated, 100))


def scoring_constants_from_map(
    settings: dict[str, object],
    defaults: Optional[TrainingScoringConstants] = None,
) -> TrainingScoringConstants:
    if defaults is None:
        defaults = TrainingScoringConstants()

    def d(key: str, fallback: float) -> float:
        val = settings.get(key)
        try:
            result = float(val)  # type: ignore[arg-type]
            return result if math.isfinite(result) else fallback
        except (TypeError, ValueError):
            return fallback

    def i(key: str, fallback: int) -> int:
        val = settings.get(key)
        try:
            return int(val)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return fallback

    return TrainingScoringConstants(
        # Breakpoints are fixed and not user-tunable; always sourced from defaults.
        ratio_breakpoints=defaults.ratio_breakpoints,
        ratio_multipliers=[
            d("ratioMultiplier1", defaults.ratio_multipliers[0]),
            d("ratioMultiplier2", defaults.ratio_multipliers[1]),
            d("ratioMultiplier3", defaults.ratio_multipliers[2]),
            d("ratioMultiplier4", defaults.ratio_multipliers[3]),
            d("ratioMultiplier5", defaults.ratio_multipliers[4]),
            d("ratioMultiplier6", defaults.ratio_multipliers[5]),
            d("ratioMultiplier7", defaults.ratio_multipliers[6]),
        ],
        priority_coefficient=d("priorityCoefficient", defaults.priority_coefficient),
        level_boost_rank1_factor=d("levelBoostRank1Factor", defaults.level_boost_rank1_factor),
        level_boost_rank2_factor=d("levelBoostRank2Factor", defaults.level_boost_rank2_factor),
        level_boost_rank3_factor=d("levelBoostRank3Factor", defaults.level_boost_rank3_factor),
        main_stat_thresholds={
            StatName.SPEED: i(
                "mainStatThresholdSpeed", defaults.main_stat_thresholds[StatName.SPEED]
            ),
            StatName.STAMINA: i(
                "mainStatThresholdStamina", defaults.main_stat_thresholds[StatName.STAMINA]
            ),
            StatName.POWER: i(
                "mainStatThresholdPower", defaults.main_stat_thresholds[StatName.POWER]
            ),
            StatName.GUTS: i(
                "mainStatThresholdGuts", defaults.main_stat_thresholds[StatName.GUTS]
            ),
            StatName.WIT: i("mainStatThresholdWit", defaults.main_stat_thresholds[StatName.WIT]),
        },
        main_stat_bonus_magnitude=d("mainStatBonusMagnitude", defaults.main_stat_bonus_magnitude),
        relationship_orange_value=d(
            "relationshipOrangeValue", defaults.relationship_orange_value
        ),
        relationship_green_value=d("relationshipGreenValue", defaults.relationship_green_value),
        relationship_blue_value=d("relationshipBlueValue", defaults.relationship_blue_value),
        relationship_diminishing_factor=d(
            "relationshipDiminishingFactor", defaults.relationship_diminishing_factor
        ),
        relationship_early_game_bonus=d(
            "relationshipEarlyGameBonus", defaults.relationship_early_game_bonus
        ),
        relationship_trainer_support_bonus=d(
            "relationshipTrainerSupportBonus", defaults.relationship_trainer_support_bonus
        ),
        skill_hint_per_hint_score=d(
            "skillHintPerHintScore", defaults.skill_hint_per_hint_score
        ),
        skill_hint_override_score=d(
            "skillHintOverrideScore", defaults.skill_hint_override_score
        ),
        stat_weight_with_bars=d("statWeightWithBars", defaults.stat_weight_with_bars),
        stat_weight_without_bars=d("statWeightWithoutBars", defaults.stat_weight_without_bars),
        relationship_weight_with_bars=d(
            "relationshipWeightWithBars", defaults.relationship_weight_with_bars
        ),
        misc_weight=d("miscWeight", defaults.misc_weight),
        junior_early_game_flat_bonus=d(
            "juniorEarlyGameFlatBonus", defaults.junior_early_game_flat_bonus
        ),
        relationship_scale=d("relationshipScale", defaults.relationship_scale),
        rainbow_multiplier_enabled=d(
            "rainbowMultiplierEnabled", defaults.rainbow_multiplier_enabled
        ),
        rainbow_multiplier_disabled=d(
            "rainbowMultiplierDisabled", defaults.rainbow_multiplier_disabled
        ),
        rainbow_per_instance_base=d(
            "rainbowPerInstanceBase", defaults.rainbow_per_instance_base
        ),
        rainbow_per_instance_decay=d(
            "rainbowPerInstanceDecay", defaults.rainbow_per_instance_decay
        ),
        anticipatory_min_fill_percent=d(
            "anticipatoryMinFillPercent", defaults.anticipatory_min_fill_percent
        ),
        anticipatory_coefficient=d(
            "anticipatoryCoefficient", defaults.anticipatory_coefficient
        ),
        anticipatory_cap=d("anticipatoryCap", defaults.anticipatory_cap),
    )
