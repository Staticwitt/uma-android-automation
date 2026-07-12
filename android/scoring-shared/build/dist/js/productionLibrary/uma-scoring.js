(function (factory) {
  if (typeof define === 'function' && define.amd)
    define(['exports', './kotlin-kotlin-stdlib.js'], factory);
  else if (typeof exports === 'object')
    factory(module.exports, require('./kotlin-kotlin-stdlib.js'));
  else {
    if (typeof globalThis['kotlin-kotlin-stdlib'] === 'undefined') {
      throw new Error("Error loading module 'com.steve1316.uma_scoring:scoring-shared'. Its dependency 'kotlin-kotlin-stdlib' was not found. Please, check whether 'kotlin-kotlin-stdlib' is loaded prior to 'com.steve1316.uma_scoring:scoring-shared'.");
    }
    globalThis['com.steve1316.uma_scoring:scoring-shared'] = factory(typeof globalThis['com.steve1316.uma_scoring:scoring-shared'] === 'undefined' ? {} : globalThis['com.steve1316.uma_scoring:scoring-shared'], globalThis['kotlin-kotlin-stdlib']);
  }
}(function (_, kotlin_kotlin) {
  'use strict';
  //region block: imports
  var imul = Math.imul;
  var startsWith = kotlin_kotlin.$_$.e1;
  var coerceAtLeast = kotlin_kotlin.$_$.b1;
  var VOID = kotlin_kotlin.$_$.a;
  var Unit_instance = kotlin_kotlin.$_$.e;
  var last = kotlin_kotlin.$_$.i;
  var toString = kotlin_kotlin.$_$.z;
  var IllegalStateException_init_$Create$ = kotlin_kotlin.$_$.d;
  var coerceIn = kotlin_kotlin.$_$.c1;
  var coerceAtLeast_0 = kotlin_kotlin.$_$.a1;
  var coerceIn_0 = kotlin_kotlin.$_$.d1;
  var numberToInt = kotlin_kotlin.$_$.x;
  var equals = kotlin_kotlin.$_$.o;
  var listOf = kotlin_kotlin.$_$.j;
  var ensureNotNull = kotlin_kotlin.$_$.i1;
  var to = kotlin_kotlin.$_$.k1;
  var mapOf = kotlin_kotlin.$_$.l;
  var isNumber = kotlin_kotlin.$_$.v;
  var numberToDouble = kotlin_kotlin.$_$.w;
  var isFinite = kotlin_kotlin.$_$.j1;
  var collectionSizeOrDefault = kotlin_kotlin.$_$.f;
  var mapCapacity = kotlin_kotlin.$_$.k;
  var LinkedHashMap_init_$Create$ = kotlin_kotlin.$_$.b;
  var protoOf = kotlin_kotlin.$_$.y;
  var initMetadataForCompanion = kotlin_kotlin.$_$.u;
  var THROW_IAE = kotlin_kotlin.$_$.h1;
  var enumEntries = kotlin_kotlin.$_$.m;
  var Enum = kotlin_kotlin.$_$.f1;
  var defineProp = kotlin_kotlin.$_$.n;
  var initMetadataForClass = kotlin_kotlin.$_$.t;
  var getBooleanHashCode = kotlin_kotlin.$_$.p;
  var THROW_CCE = kotlin_kotlin.$_$.g1;
  var getStringHashCode = kotlin_kotlin.$_$.r;
  var getNumberHashCode = kotlin_kotlin.$_$.q;
  var hashCode = kotlin_kotlin.$_$.s;
  var emptyList = kotlin_kotlin.$_$.g;
  var emptySet = kotlin_kotlin.$_$.h;
  var IllegalArgumentException_init_$Create$ = kotlin_kotlin.$_$.c;
  //endregion
  //region block: pre-declaration
  initMetadataForCompanion(Companion);
  initMetadataForClass(StatName, 'StatName', VOID, Enum);
  initMetadataForCompanion(Companion_0);
  initMetadataForClass(DateYear, 'DateYear', VOID, Enum);
  initMetadataForClass(GameDateSnapshot, 'GameDateSnapshot');
  initMetadataForClass(BarFillResult, 'BarFillResult');
  initMetadataForClass(TrainingOption, 'TrainingOption');
  initMetadataForClass(TrainingConfig, 'TrainingConfig');
  initMetadataForClass(TrainingScoringConstants, 'TrainingScoringConstants', TrainingScoringConstants);
  initMetadataForClass(RawScoreBreakdown, 'RawScoreBreakdown');
  //endregion
  function getScenarioStatCap(scenario, statName) {
    var tmp;
    if (startsWith(scenario, 'URA')) {
      tmp = 1400;
    } else if (scenario === 'Unity Cup') {
      tmp = statName.equals(StatName_WIT_getInstance()) ? 1800 : 1300;
    } else if (scenario === 'Trackblazer') {
      switch (statName.z_1) {
        case 1:
          tmp = 1900;
          break;
        case 4:
          tmp = 1500;
          break;
        default:
          tmp = 1200;
          break;
      }
    } else if (scenario === 'Grand Live') {
      tmp = statName.equals(StatName_SPEED_getInstance()) ? 1600 : 1200;
    } else {
      tmp = 1200;
    }
    return tmp;
  }
  function getCurrentStatCap(statName, config) {
    return getScenarioStatCap(config.scenario, statName);
  }
  function getRemainingFinaleRaces(currentDay) {
    // Inline function 'kotlin.comparisons.maxOf' call
    var tmp$ret$0 = Math.max(currentDay, 72);
    return coerceAtLeast(75 - tmp$ret$0 | 0, 0);
  }
  function getFinaleStatBonus(currentDay) {
    return imul(getRemainingFinaleRaces(currentDay), 15);
  }
  function levelBoostMultiplier(priorityRank, trainingLevel, constants) {
    constants = constants === VOID ? new TrainingScoringConstants() : constants;
    var level = trainingLevel == null ? 1 : trainingLevel;
    if (level <= 1)
      return 1.0;
    var priorityFactor;
    switch (priorityRank) {
      case 1:
        priorityFactor = constants.levelBoostRank1Factor;
        break;
      case 2:
        priorityFactor = constants.levelBoostRank2Factor;
        break;
      case 3:
        priorityFactor = constants.levelBoostRank3Factor;
        break;
      default:
        priorityFactor = 0.0;
        break;
    }
    var levelFactor = (level - 1 | 0) / 4.0;
    return 1.0 + priorityFactor * levelFactor;
  }
  function calculateStatEfficiencyScore(config, training) {
    var score = 0.0;
    var activePriority = config.currentDate.isSummer ? config.summerTrainingStatPriority : config.statPrioritization;
    var _iterator__ex2g4s = get_entries().d();
    while (_iterator__ex2g4s.e()) {
      var statName = _iterator__ex2g4s.f();
      var tmp0_elvis_lhs = config.currentStats.u(statName);
      var currentStat = tmp0_elvis_lhs == null ? 0 : tmp0_elvis_lhs;
      var tmp1_elvis_lhs = config.statTargets.u(statName);
      var targetStat = tmp1_elvis_lhs == null ? 0 : tmp1_elvis_lhs;
      var tmp2_elvis_lhs = training.statGains.u(statName);
      var statGain = tmp2_elvis_lhs == null ? 0 : tmp2_elvis_lhs;
      if (statGain > 0 && targetStat > 0) {
        var priorityIndex = activePriority.l(statName);
        // Inline function 'kotlin.comparisons.minOf' call
        var tmp = Math.min(currentStat, 1200);
        // Inline function 'kotlin.comparisons.maxOf' call
        var b = currentStat - 1200;
        var effectiveCurrent = tmp + Math.max(0.0, b) * 0.5;
        // Inline function 'kotlin.comparisons.minOf' call
        var tmp_0 = Math.min(targetStat, 1200);
        // Inline function 'kotlin.comparisons.maxOf' call
        var b_0 = targetStat - 1200;
        var effectiveTarget = tmp_0 + Math.max(0.0, b_0) * 0.5;
        var completionPercent = effectiveTarget > 0.0 ? effectiveCurrent / effectiveTarget * 100.0 : 100.0;
        // Inline function 'kotlin.run' call
        var breakpoints = config.scoring.ratioBreakpoints;
        var multipliers = config.scoring.ratioMultipliers;
        var tmp$ret$5;
        $l$block: {
          // Inline function 'kotlin.collections.indexOfFirst' call
          var index = 0;
          var _iterator__ex2g4s_0 = breakpoints.d();
          while (_iterator__ex2g4s_0.e()) {
            var item = _iterator__ex2g4s_0.f();
            if (completionPercent < item) {
              tmp$ret$5 = index;
              break $l$block;
            }
            index = index + 1 | 0;
          }
          tmp$ret$5 = -1;
        }
        var bucket = tmp$ret$5;
        var ratioMultiplier = bucket === -1 ? last(multipliers) : multipliers.h(bucket);
        var tmp_1;
        if (!(priorityIndex === -1)) {
          tmp_1 = 1.0 + config.scoring.priorityCoefficient * (activePriority.i() - priorityIndex | 0);
        } else {
          tmp_1 = 1.0;
        }
        var priorityMultiplier = tmp_1;
        var tmp_2;
        if (config.enableTrainingLevelWeighting && statName.equals(training.name) && !(priorityIndex === -1)) {
          tmp_2 = levelBoostMultiplier(priorityIndex + 1 | 0, training.trainingLevel, config.scoring);
        } else {
          tmp_2 = 1.0;
        }
        var levelMultiplier = tmp_2;
        var isMainStat = training.name.equals(statName);
        var tmp_3;
        var tmp_4;
        if (isMainStat) {
          var tmp3_elvis_lhs = config.scoring.mainStatThresholds.u(statName);
          var tmp_5;
          if (tmp3_elvis_lhs == null) {
            var message = 'No mainStatThresholds entry for ' + statName.toString();
            throw IllegalStateException_init_$Create$(toString(message));
          } else {
            tmp_5 = tmp3_elvis_lhs;
          }
          tmp_4 = statGain >= tmp_5;
        } else {
          tmp_4 = false;
        }
        if (tmp_4) {
          tmp_3 = config.scoring.mainStatBonusMagnitude;
        } else {
          tmp_3 = 1.0;
        }
        var mainStatBonus = tmp_3;
        var tmp_6;
        if (currentStat >= 1200) {
          tmp_6 = statGain * 0.5;
        } else if ((currentStat + statGain | 0) <= 1200) {
          tmp_6 = statGain;
        } else {
          var belowCap = 1200 - currentStat | 0;
          tmp_6 = belowCap + (statGain - belowCap | 0) * 0.5;
        }
        var effectiveGain = tmp_6;
        var statScore = effectiveGain;
        statScore = statScore * ratioMultiplier;
        statScore = statScore * priorityMultiplier;
        statScore = statScore * levelMultiplier;
        statScore = statScore * mainStatBonus;
        score = score + statScore;
      }
    }
    return score;
  }
  function calculateRelationshipScore(config, training) {
    if (training.relationshipBars.g())
      return 0.0;
    var score = 0.0;
    var maxScore = 0.0;
    var _iterator__ex2g4s = training.relationshipBars.d();
    $l$loop: while (_iterator__ex2g4s.e()) {
      var bar = _iterator__ex2g4s.f();
      if (config.enableBondEfficiencyCapping && isBarFullyMaxed(bar))
        continue $l$loop;
      var baseValue;
      switch (bar.dominantColor) {
        case 'orange':
          baseValue = config.scoring.relationshipOrangeValue;
          break;
        case 'green':
          baseValue = config.scoring.relationshipGreenValue;
          break;
        case 'blue':
          baseValue = config.scoring.relationshipBlueValue;
          break;
        default:
          baseValue = 0.0;
          break;
      }
      if (baseValue > 0) {
        var fillLevel = bar.fillPercent / 100.0;
        var diminishingFactor = 1.0 - fillLevel * config.scoring.relationshipDiminishingFactor;
        var earlyGameBonus = config.currentDate.year.equals(DateYear_JUNIOR_getInstance()) || config.currentDate.bIsPreDebut ? config.scoring.relationshipEarlyGameBonus : 1.0;
        var trainerSupportBonus = bar.isTrainerSupport ? config.scoring.relationshipTrainerSupportBonus : 1.0;
        score = score + baseValue * diminishingFactor * earlyGameBonus * trainerSupportBonus;
        maxScore = maxScore + config.scoring.relationshipBlueValue * config.scoring.relationshipEarlyGameBonus;
      }
    }
    return maxScore > 0 ? score / maxScore * 100.0 : 0.0;
  }
  function calculateMiscScore(config, training) {
    var score = 50.0;
    var tmp0_elvis_lhs = config.skillHintsPerLocation.u(training.name);
    var numSkillHints = tmp0_elvis_lhs == null ? 0 : tmp0_elvis_lhs;
    score = score + config.scoring.skillHintPerHintScore * numSkillHints;
    if (config.enablePrioritizeSkillHints && numSkillHints > 0) {
      return config.scoring.skillHintOverrideScore + score;
    }
    return coerceIn(score, 0.0, 100.0);
  }
  function calculateRawTrainingScore(config, training) {
    return rawTrainingScoreComponents(config, training).total;
  }
  function rawTrainingScoreComponents(config, training) {
    var zero = new RawScoreBreakdown(0.0, 0.0, 0.0, 1.0, 1.0, 0.0);
    if (config.blacklist.j(training.name))
      return zero;
    var tmp0 = config.currentStats;
    // Inline function 'kotlin.collections.getOrElse' call
    var key = training.name;
    var tmp0_elvis_lhs = tmp0.u(key);
    var tmp;
    if (tmp0_elvis_lhs == null) {
      tmp = 0;
    } else {
      tmp = tmp0_elvis_lhs;
    }
    var currentStat = tmp;
    var tmp0_0 = training.statGains;
    // Inline function 'kotlin.collections.getOrElse' call
    var key_0 = training.name;
    var tmp0_elvis_lhs_0 = tmp0_0.u(key_0);
    var tmp_0;
    if (tmp0_elvis_lhs_0 == null) {
      tmp_0 = 0;
    } else {
      tmp_0 = tmp0_elvis_lhs_0;
    }
    var potentialStat = currentStat + tmp_0 | 0;
    var statCap = getCurrentStatCap(training.name, config);
    var finaleBonus = getFinaleStatBonus(config.currentDate.day);
    var effectiveStatCap = (statCap - 100 | 0) - finaleBonus | 0;
    if (currentStat >= statCap)
      return zero;
    if (config.disableTrainingOnMaxedStat && currentStat >= effectiveStatCap) {
      var canUseAllowance = training.numRainbow > 0 && !config.statsTrainedOverBuffer.j(training.name);
      if (!canUseAllowance)
        return zero;
    }
    if (potentialStat >= effectiveStatCap) {
      var canUseAllowance_0 = training.numRainbow > 0 && !config.statsTrainedOverBuffer.j(training.name);
      if (!canUseAllowance_0)
        return zero;
    }
    var statScore = calculateStatEfficiencyScore(config, training);
    var relationshipScore = calculateRelationshipScore(config, training);
    var miscScore = calculateMiscScore(config, training);
    var tmp_1;
    // Inline function 'kotlin.collections.isNotEmpty' call
    if (!training.relationshipBars.g()) {
      tmp_1 = config.scoring.statWeightWithBars;
    } else {
      tmp_1 = config.scoring.statWeightWithoutBars;
    }
    var statWeight = tmp_1;
    var tmp_2;
    // Inline function 'kotlin.collections.isNotEmpty' call
    if (!training.relationshipBars.g()) {
      tmp_2 = config.scoring.relationshipWeightWithBars;
    } else {
      tmp_2 = 0.0;
    }
    var relationshipWeight = tmp_2;
    var miscWeight = config.scoring.miscWeight;
    var statScoreWeighted = statScore * statWeight;
    var relationshipScoreWeighted = relationshipScore * relationshipWeight;
    var miscScoreWeighted = miscScore * miscWeight;
    var totalScore = statScoreWeighted + relationshipScoreWeighted + miscScoreWeighted;
    var tmp_3;
    if (training.numRainbow > 0 && config.currentDate.year.c1(DateYear_JUNIOR_getInstance()) > 0) {
      tmp_3 = config.enableRainbowTrainingBonus ? config.scoring.rainbowMultiplierEnabled : config.scoring.rainbowMultiplierDisabled;
    } else {
      tmp_3 = 1.0;
    }
    var rainbowMultiplier = tmp_3;
    totalScore = totalScore * rainbowMultiplier;
    var anticipatoryMultiplier = 1.0;
    var tmp_4;
    if (config.enablePrioritizeNearMaxFriendship && config.currentDate.year.c1(DateYear_JUNIOR_getInstance()) > 0 && training.numRainbow === 0) {
      // Inline function 'kotlin.collections.isNotEmpty' call
      tmp_4 = !training.relationshipBars.g();
    } else {
      tmp_4 = false;
    }
    if (tmp_4) {
      var contributions = 0.0;
      var qualifyingBars = 0;
      var _iterator__ex2g4s = training.relationshipBars.d();
      while (_iterator__ex2g4s.e()) {
        var bar = _iterator__ex2g4s.f();
        if ((bar.dominantColor === 'green' || bar.dominantColor === 'blue') && bar.fillPercent > config.scoring.anticipatoryMinFillPercent) {
          contributions = contributions + bar.fillPercent / 100.0;
          qualifyingBars = qualifyingBars + 1 | 0;
        }
      }
      if (qualifyingBars > 0) {
        var tmp0_1 = config.scoring.anticipatoryCap;
        // Inline function 'kotlin.comparisons.minOf' call
        var b = config.scoring.anticipatoryCoefficient * contributions;
        anticipatoryMultiplier = 1.0 + Math.min(tmp0_1, b);
        totalScore = totalScore * anticipatoryMultiplier;
      }
    }
    return new RawScoreBreakdown(statScoreWeighted, relationshipScoreWeighted, miscScoreWeighted, rainbowMultiplier, anticipatoryMultiplier, coerceAtLeast_0(totalScore, 0.0));
  }
  function estimateFailureChanceFromEnergy(currentEnergy, statName) {
    statName = statName === VOID ? null : statName;
    var energy = coerceIn_0(currentEnergy, 0, 100);
    var tmp;
    if (equals(statName, StatName_WIT_getInstance())) {
      // Inline function 'kotlin.math.pow' call
      var raw = 161.4 * Math.pow(0.9793, energy) - 81.4;
      tmp = numberToInt(raw);
    } else {
      tmp = energy >= 50 ? 0 : imul(50 - energy | 0, 2);
    }
    var estimated = tmp;
    return coerceIn_0(estimated, 0, 100);
  }
  function scoringConstantsFromMap(settings, defaults) {
    defaults = defaults === VOID ? new TrainingScoringConstants() : defaults;
    return defaults.copy(VOID, listOf([scoringConstantsFromMap$d(settings, 'ratioMultiplier1', defaults.ratioMultipliers.h(0)), scoringConstantsFromMap$d(settings, 'ratioMultiplier2', defaults.ratioMultipliers.h(1)), scoringConstantsFromMap$d(settings, 'ratioMultiplier3', defaults.ratioMultipliers.h(2)), scoringConstantsFromMap$d(settings, 'ratioMultiplier4', defaults.ratioMultipliers.h(3)), scoringConstantsFromMap$d(settings, 'ratioMultiplier5', defaults.ratioMultipliers.h(4)), scoringConstantsFromMap$d(settings, 'ratioMultiplier6', defaults.ratioMultipliers.h(5)), scoringConstantsFromMap$d(settings, 'ratioMultiplier7', defaults.ratioMultipliers.h(6))]), scoringConstantsFromMap$d(settings, 'priorityCoefficient', defaults.priorityCoefficient), scoringConstantsFromMap$d(settings, 'levelBoostRank1Factor', defaults.levelBoostRank1Factor), scoringConstantsFromMap$d(settings, 'levelBoostRank2Factor', defaults.levelBoostRank2Factor), scoringConstantsFromMap$d(settings, 'levelBoostRank3Factor', defaults.levelBoostRank3Factor), mapOf([to(StatName_SPEED_getInstance(), scoringConstantsFromMap$i(settings, 'mainStatThresholdSpeed', ensureNotNull(defaults.mainStatThresholds.u(StatName_SPEED_getInstance())))), to(StatName_STAMINA_getInstance(), scoringConstantsFromMap$i(settings, 'mainStatThresholdStamina', ensureNotNull(defaults.mainStatThresholds.u(StatName_STAMINA_getInstance())))), to(StatName_POWER_getInstance(), scoringConstantsFromMap$i(settings, 'mainStatThresholdPower', ensureNotNull(defaults.mainStatThresholds.u(StatName_POWER_getInstance())))), to(StatName_GUTS_getInstance(), scoringConstantsFromMap$i(settings, 'mainStatThresholdGuts', ensureNotNull(defaults.mainStatThresholds.u(StatName_GUTS_getInstance())))), to(StatName_WIT_getInstance(), scoringConstantsFromMap$i(settings, 'mainStatThresholdWit', ensureNotNull(defaults.mainStatThresholds.u(StatName_WIT_getInstance()))))]), scoringConstantsFromMap$d(settings, 'mainStatBonusMagnitude', defaults.mainStatBonusMagnitude), scoringConstantsFromMap$d(settings, 'relationshipOrangeValue', defaults.relationshipOrangeValue), scoringConstantsFromMap$d(settings, 'relationshipGreenValue', defaults.relationshipGreenValue), scoringConstantsFromMap$d(settings, 'relationshipBlueValue', defaults.relationshipBlueValue), scoringConstantsFromMap$d(settings, 'relationshipDiminishingFactor', defaults.relationshipDiminishingFactor), scoringConstantsFromMap$d(settings, 'relationshipEarlyGameBonus', defaults.relationshipEarlyGameBonus), scoringConstantsFromMap$d(settings, 'relationshipTrainerSupportBonus', defaults.relationshipTrainerSupportBonus), scoringConstantsFromMap$d(settings, 'skillHintPerHintScore', defaults.skillHintPerHintScore), scoringConstantsFromMap$d(settings, 'skillHintOverrideScore', defaults.skillHintOverrideScore), scoringConstantsFromMap$d(settings, 'statWeightWithBars', defaults.statWeightWithBars), scoringConstantsFromMap$d(settings, 'statWeightWithoutBars', defaults.statWeightWithoutBars), scoringConstantsFromMap$d(settings, 'relationshipWeightWithBars', defaults.relationshipWeightWithBars), scoringConstantsFromMap$d(settings, 'miscWeight', defaults.miscWeight), scoringConstantsFromMap$d(settings, 'juniorEarlyGameFlatBonus', defaults.juniorEarlyGameFlatBonus), scoringConstantsFromMap$d(settings, 'relationshipScale', defaults.relationshipScale), scoringConstantsFromMap$d(settings, 'rainbowMultiplierEnabled', defaults.rainbowMultiplierEnabled), scoringConstantsFromMap$d(settings, 'rainbowMultiplierDisabled', defaults.rainbowMultiplierDisabled), scoringConstantsFromMap$d(settings, 'rainbowPerInstanceBase', defaults.rainbowPerInstanceBase), scoringConstantsFromMap$d(settings, 'rainbowPerInstanceDecay', defaults.rainbowPerInstanceDecay), scoringConstantsFromMap$d(settings, 'anticipatoryMinFillPercent', defaults.anticipatoryMinFillPercent), scoringConstantsFromMap$d(settings, 'anticipatoryCoefficient', defaults.anticipatoryCoefficient), scoringConstantsFromMap$d(settings, 'anticipatoryCap', defaults.anticipatoryCap), scoringConstantsFromMap$d(settings, 'unityFillBaseBonus', defaults.unityFillBaseBonus), scoringConstantsFromMap$d(settings, 'unityFillPerGaugeBonus', defaults.unityFillPerGaugeBonus), scoringConstantsFromMap$d(settings, 'unityBurstBaseBonus', defaults.unityBurstBaseBonus), scoringConstantsFromMap$d(settings, 'unityBurstPerGaugeBonus', defaults.unityBurstPerGaugeBonus), scoringConstantsFromMap$d(settings, 'unityFillEnergyPenaltyPerGauge', defaults.unityFillEnergyPenaltyPerGauge), scoringConstantsFromMap$d(settings, 'unityBurstEnergyPenaltyPerGauge', defaults.unityBurstEnergyPenaltyPerGauge));
  }
  function isBarFullyMaxed(bar) {
    return bar.dominantColor === 'orange' && bar.fillPercent >= 99.9;
  }
  function scoringConstantsFromMap$d($settings, key, fallback) {
    var tmp = $settings.u(key);
    var tmp0_safe_receiver = isNumber(tmp) ? tmp : null;
    var tmp1_safe_receiver = tmp0_safe_receiver == null ? null : numberToDouble(tmp0_safe_receiver);
    var tmp_0;
    if (tmp1_safe_receiver == null) {
      tmp_0 = null;
    } else {
      // Inline function 'kotlin.takeIf' call
      var tmp_1;
      if (isFinite(tmp1_safe_receiver)) {
        tmp_1 = tmp1_safe_receiver;
      } else {
        tmp_1 = null;
      }
      tmp_0 = tmp_1;
    }
    var tmp2_elvis_lhs = tmp_0;
    return tmp2_elvis_lhs == null ? fallback : tmp2_elvis_lhs;
  }
  function scoringConstantsFromMap$i($settings, key, fallback) {
    var tmp = $settings.u(key);
    var tmp0_safe_receiver = isNumber(tmp) ? tmp : null;
    var tmp1_elvis_lhs = tmp0_safe_receiver == null ? null : numberToInt(tmp0_safe_receiver);
    return tmp1_elvis_lhs == null ? fallback : tmp1_elvis_lhs;
  }
  var StatName_SPEED_instance;
  var StatName_STAMINA_instance;
  var StatName_POWER_instance;
  var StatName_GUTS_instance;
  var StatName_WIT_instance;
  function Companion() {
    Companion_instance = this;
    var tmp = this;
    // Inline function 'kotlin.collections.associateBy' call
    var this_0 = get_entries();
    var capacity = coerceAtLeast(mapCapacity(collectionSizeOrDefault(this_0, 10)), 16);
    // Inline function 'kotlin.collections.associateByTo' call
    var destination = LinkedHashMap_init_$Create$(capacity);
    var _iterator__ex2g4s = this_0.d();
    while (_iterator__ex2g4s.e()) {
      var element = _iterator__ex2g4s.f();
      var tmp$ret$0 = element.y_1;
      destination.d2(tmp$ret$0, element);
    }
    tmp.o7_1 = destination;
  }
  protoOf(Companion).fromName = function (value) {
    // Inline function 'kotlin.text.uppercase' call
    // Inline function 'kotlin.js.asDynamic' call
    var tmp$ret$1 = value.toUpperCase();
    return this.o7_1.u(tmp$ret$1);
  };
  var Companion_instance;
  function Companion_getInstance() {
    StatName_initEntries();
    if (Companion_instance == null)
      new Companion();
    return Companion_instance;
  }
  function values() {
    return [StatName_SPEED_getInstance(), StatName_STAMINA_getInstance(), StatName_POWER_getInstance(), StatName_GUTS_getInstance(), StatName_WIT_getInstance()];
  }
  function valueOf(value) {
    switch (value) {
      case 'SPEED':
        return StatName_SPEED_getInstance();
      case 'STAMINA':
        return StatName_STAMINA_getInstance();
      case 'POWER':
        return StatName_POWER_getInstance();
      case 'GUTS':
        return StatName_GUTS_getInstance();
      case 'WIT':
        return StatName_WIT_getInstance();
      default:
        StatName_initEntries();
        THROW_IAE('No enum constant value.');
        break;
    }
  }
  function get_entries() {
    if ($ENTRIES == null)
      $ENTRIES = enumEntries(values());
    return $ENTRIES;
  }
  var StatName_entriesInitialized;
  function StatName_initEntries() {
    if (StatName_entriesInitialized)
      return Unit_instance;
    StatName_entriesInitialized = true;
    StatName_SPEED_instance = new StatName('SPEED', 0);
    StatName_STAMINA_instance = new StatName('STAMINA', 1);
    StatName_POWER_instance = new StatName('POWER', 2);
    StatName_GUTS_instance = new StatName('GUTS', 3);
    StatName_WIT_instance = new StatName('WIT', 4);
    Companion_getInstance();
  }
  var $ENTRIES;
  function StatName(name, ordinal) {
    Enum.call(this, name, ordinal);
  }
  var DateYear_JUNIOR_instance;
  var DateYear_CLASSIC_instance;
  var DateYear_SENIOR_instance;
  function Companion_0() {
    Companion_instance_0 = this;
    var tmp = this;
    // Inline function 'kotlin.collections.associateBy' call
    var this_0 = get_entries_0();
    var capacity = coerceAtLeast(mapCapacity(collectionSizeOrDefault(this_0, 10)), 16);
    // Inline function 'kotlin.collections.associateByTo' call
    var destination = LinkedHashMap_init_$Create$(capacity);
    var _iterator__ex2g4s = this_0.d();
    while (_iterator__ex2g4s.e()) {
      var element = _iterator__ex2g4s.f();
      var tmp$ret$0 = element.y_1;
      destination.d2(tmp$ret$0, element);
    }
    tmp.r7_1 = destination;
    var tmp_0 = this;
    // Inline function 'kotlin.collections.associateBy' call
    var this_1 = get_entries_0();
    var capacity_0 = coerceAtLeast(mapCapacity(collectionSizeOrDefault(this_1, 10)), 16);
    // Inline function 'kotlin.collections.associateByTo' call
    var destination_0 = LinkedHashMap_init_$Create$(capacity_0);
    var _iterator__ex2g4s_0 = this_1.d();
    while (_iterator__ex2g4s_0.e()) {
      var element_0 = _iterator__ex2g4s_0.f();
      var tmp$ret$3 = element_0.z_1;
      destination_0.d2(tmp$ret$3, element_0);
    }
    tmp_0.s7_1 = destination_0;
  }
  protoOf(Companion_0).fromName = function (value) {
    // Inline function 'kotlin.text.uppercase' call
    // Inline function 'kotlin.js.asDynamic' call
    var tmp$ret$1 = value.toUpperCase();
    return this.r7_1.u(tmp$ret$1);
  };
  protoOf(Companion_0).fromOrdinal = function (ordinal) {
    return this.s7_1.u(ordinal);
  };
  var Companion_instance_0;
  function Companion_getInstance_0() {
    DateYear_initEntries();
    if (Companion_instance_0 == null)
      new Companion_0();
    return Companion_instance_0;
  }
  function values_0() {
    return [DateYear_JUNIOR_getInstance(), DateYear_CLASSIC_getInstance(), DateYear_SENIOR_getInstance()];
  }
  function valueOf_0(value) {
    switch (value) {
      case 'JUNIOR':
        return DateYear_JUNIOR_getInstance();
      case 'CLASSIC':
        return DateYear_CLASSIC_getInstance();
      case 'SENIOR':
        return DateYear_SENIOR_getInstance();
      default:
        DateYear_initEntries();
        THROW_IAE('No enum constant value.');
        break;
    }
  }
  function get_entries_0() {
    if ($ENTRIES_0 == null)
      $ENTRIES_0 = enumEntries(values_0());
    return $ENTRIES_0;
  }
  var DateYear_entriesInitialized;
  function DateYear_initEntries() {
    if (DateYear_entriesInitialized)
      return Unit_instance;
    DateYear_entriesInitialized = true;
    DateYear_JUNIOR_instance = new DateYear('JUNIOR', 0, 'JUNIOR YEAR');
    DateYear_CLASSIC_instance = new DateYear('CLASSIC', 1, 'CLASSIC YEAR');
    DateYear_SENIOR_instance = new DateYear('SENIOR', 2, 'SENIOR YEAR');
    Companion_getInstance_0();
  }
  var $ENTRIES_0;
  function DateYear(name, ordinal, longName) {
    Enum.call(this, name, ordinal);
    this.longName = longName;
  }
  protoOf(DateYear).v7 = function () {
    return this.longName;
  };
  function GameDateSnapshot(year, day, bIsPreDebut, isSummer) {
    day = day === VOID ? 0 : day;
    bIsPreDebut = bIsPreDebut === VOID ? false : bIsPreDebut;
    isSummer = isSummer === VOID ? false : isSummer;
    this.year = year;
    this.day = day;
    this.bIsPreDebut = bIsPreDebut;
    this.isSummer = isSummer;
  }
  protoOf(GameDateSnapshot).w7 = function () {
    return this.year;
  };
  protoOf(GameDateSnapshot).x7 = function () {
    return this.day;
  };
  protoOf(GameDateSnapshot).y7 = function () {
    return this.bIsPreDebut;
  };
  protoOf(GameDateSnapshot).z7 = function () {
    return this.isSummer;
  };
  protoOf(GameDateSnapshot).c7 = function () {
    return this.year;
  };
  protoOf(GameDateSnapshot).d7 = function () {
    return this.day;
  };
  protoOf(GameDateSnapshot).a8 = function () {
    return this.bIsPreDebut;
  };
  protoOf(GameDateSnapshot).b8 = function () {
    return this.isSummer;
  };
  protoOf(GameDateSnapshot).c8 = function (year, day, bIsPreDebut, isSummer) {
    return new GameDateSnapshot(year, day, bIsPreDebut, isSummer);
  };
  protoOf(GameDateSnapshot).copy = function (year, day, bIsPreDebut, isSummer, $super) {
    year = year === VOID ? this.year : year;
    day = day === VOID ? this.day : day;
    bIsPreDebut = bIsPreDebut === VOID ? this.bIsPreDebut : bIsPreDebut;
    isSummer = isSummer === VOID ? this.isSummer : isSummer;
    return $super === VOID ? this.c8(year, day, bIsPreDebut, isSummer) : $super.c8.call(this, year, day, bIsPreDebut, isSummer);
  };
  protoOf(GameDateSnapshot).toString = function () {
    return 'GameDateSnapshot(year=' + this.year.toString() + ', day=' + this.day + ', bIsPreDebut=' + this.bIsPreDebut + ', isSummer=' + this.isSummer + ')';
  };
  protoOf(GameDateSnapshot).hashCode = function () {
    var result = this.year.hashCode();
    result = imul(result, 31) + this.day | 0;
    result = imul(result, 31) + getBooleanHashCode(this.bIsPreDebut) | 0;
    result = imul(result, 31) + getBooleanHashCode(this.isSummer) | 0;
    return result;
  };
  protoOf(GameDateSnapshot).equals = function (other) {
    if (this === other)
      return true;
    if (!(other instanceof GameDateSnapshot))
      return false;
    var tmp0_other_with_cast = other instanceof GameDateSnapshot ? other : THROW_CCE();
    if (!this.year.equals(tmp0_other_with_cast.year))
      return false;
    if (!(this.day === tmp0_other_with_cast.day))
      return false;
    if (!(this.bIsPreDebut === tmp0_other_with_cast.bIsPreDebut))
      return false;
    if (!(this.isSummer === tmp0_other_with_cast.isSummer))
      return false;
    return true;
  };
  function BarFillResult(dominantColor, fillPercent, isTrainerSupport) {
    isTrainerSupport = isTrainerSupport === VOID ? false : isTrainerSupport;
    this.dominantColor = dominantColor;
    this.fillPercent = fillPercent;
    this.isTrainerSupport = isTrainerSupport;
  }
  protoOf(BarFillResult).d8 = function () {
    return this.dominantColor;
  };
  protoOf(BarFillResult).e8 = function () {
    return this.fillPercent;
  };
  protoOf(BarFillResult).f8 = function () {
    return this.isTrainerSupport;
  };
  protoOf(BarFillResult).c7 = function () {
    return this.dominantColor;
  };
  protoOf(BarFillResult).d7 = function () {
    return this.fillPercent;
  };
  protoOf(BarFillResult).a8 = function () {
    return this.isTrainerSupport;
  };
  protoOf(BarFillResult).g8 = function (dominantColor, fillPercent, isTrainerSupport) {
    return new BarFillResult(dominantColor, fillPercent, isTrainerSupport);
  };
  protoOf(BarFillResult).copy = function (dominantColor, fillPercent, isTrainerSupport, $super) {
    dominantColor = dominantColor === VOID ? this.dominantColor : dominantColor;
    fillPercent = fillPercent === VOID ? this.fillPercent : fillPercent;
    isTrainerSupport = isTrainerSupport === VOID ? this.isTrainerSupport : isTrainerSupport;
    return $super === VOID ? this.g8(dominantColor, fillPercent, isTrainerSupport) : $super.g8.call(this, dominantColor, fillPercent, isTrainerSupport);
  };
  protoOf(BarFillResult).toString = function () {
    return 'BarFillResult(dominantColor=' + this.dominantColor + ', fillPercent=' + this.fillPercent + ', isTrainerSupport=' + this.isTrainerSupport + ')';
  };
  protoOf(BarFillResult).hashCode = function () {
    var result = getStringHashCode(this.dominantColor);
    result = imul(result, 31) + getNumberHashCode(this.fillPercent) | 0;
    result = imul(result, 31) + getBooleanHashCode(this.isTrainerSupport) | 0;
    return result;
  };
  protoOf(BarFillResult).equals = function (other) {
    if (this === other)
      return true;
    if (!(other instanceof BarFillResult))
      return false;
    var tmp0_other_with_cast = other instanceof BarFillResult ? other : THROW_CCE();
    if (!(this.dominantColor === tmp0_other_with_cast.dominantColor))
      return false;
    if (!equals(this.fillPercent, tmp0_other_with_cast.fillPercent))
      return false;
    if (!(this.isTrainerSupport === tmp0_other_with_cast.isTrainerSupport))
      return false;
    return true;
  };
  function TrainingOption(name, statGains, relationshipBars, numRainbow, numSkillHints, trainingLevel) {
    numSkillHints = numSkillHints === VOID ? 0 : numSkillHints;
    trainingLevel = trainingLevel === VOID ? null : trainingLevel;
    this.name = name;
    this.statGains = statGains;
    this.relationshipBars = relationshipBars;
    this.numRainbow = numRainbow;
    this.numSkillHints = numSkillHints;
    this.trainingLevel = trainingLevel;
  }
  protoOf(TrainingOption).a1 = function () {
    return this.name;
  };
  protoOf(TrainingOption).h8 = function () {
    return this.statGains;
  };
  protoOf(TrainingOption).i8 = function () {
    return this.relationshipBars;
  };
  protoOf(TrainingOption).j8 = function () {
    return this.numRainbow;
  };
  protoOf(TrainingOption).k8 = function () {
    return this.numSkillHints;
  };
  protoOf(TrainingOption).l8 = function () {
    return this.trainingLevel;
  };
  protoOf(TrainingOption).c7 = function () {
    return this.name;
  };
  protoOf(TrainingOption).d7 = function () {
    return this.statGains;
  };
  protoOf(TrainingOption).a8 = function () {
    return this.relationshipBars;
  };
  protoOf(TrainingOption).b8 = function () {
    return this.numRainbow;
  };
  protoOf(TrainingOption).m8 = function () {
    return this.numSkillHints;
  };
  protoOf(TrainingOption).n8 = function () {
    return this.trainingLevel;
  };
  protoOf(TrainingOption).o8 = function (name, statGains, relationshipBars, numRainbow, numSkillHints, trainingLevel) {
    return new TrainingOption(name, statGains, relationshipBars, numRainbow, numSkillHints, trainingLevel);
  };
  protoOf(TrainingOption).copy = function (name, statGains, relationshipBars, numRainbow, numSkillHints, trainingLevel, $super) {
    name = name === VOID ? this.name : name;
    statGains = statGains === VOID ? this.statGains : statGains;
    relationshipBars = relationshipBars === VOID ? this.relationshipBars : relationshipBars;
    numRainbow = numRainbow === VOID ? this.numRainbow : numRainbow;
    numSkillHints = numSkillHints === VOID ? this.numSkillHints : numSkillHints;
    trainingLevel = trainingLevel === VOID ? this.trainingLevel : trainingLevel;
    return $super === VOID ? this.o8(name, statGains, relationshipBars, numRainbow, numSkillHints, trainingLevel) : $super.o8.call(this, name, statGains, relationshipBars, numRainbow, numSkillHints, trainingLevel);
  };
  protoOf(TrainingOption).toString = function () {
    return 'TrainingOption(name=' + this.name.toString() + ', statGains=' + toString(this.statGains) + ', relationshipBars=' + toString(this.relationshipBars) + ', numRainbow=' + this.numRainbow + ', numSkillHints=' + this.numSkillHints + ', trainingLevel=' + this.trainingLevel + ')';
  };
  protoOf(TrainingOption).hashCode = function () {
    var result = this.name.hashCode();
    result = imul(result, 31) + hashCode(this.statGains) | 0;
    result = imul(result, 31) + hashCode(this.relationshipBars) | 0;
    result = imul(result, 31) + this.numRainbow | 0;
    result = imul(result, 31) + this.numSkillHints | 0;
    result = imul(result, 31) + (this.trainingLevel == null ? 0 : this.trainingLevel) | 0;
    return result;
  };
  protoOf(TrainingOption).equals = function (other) {
    if (this === other)
      return true;
    if (!(other instanceof TrainingOption))
      return false;
    var tmp0_other_with_cast = other instanceof TrainingOption ? other : THROW_CCE();
    if (!this.name.equals(tmp0_other_with_cast.name))
      return false;
    if (!equals(this.statGains, tmp0_other_with_cast.statGains))
      return false;
    if (!equals(this.relationshipBars, tmp0_other_with_cast.relationshipBars))
      return false;
    if (!(this.numRainbow === tmp0_other_with_cast.numRainbow))
      return false;
    if (!(this.numSkillHints === tmp0_other_with_cast.numSkillHints))
      return false;
    if (!(this.trainingLevel == tmp0_other_with_cast.trainingLevel))
      return false;
    return true;
  };
  function TrainingConfig(currentStats, statPrioritization, summerTrainingStatPriority, statTargets, currentDate, scenario, enableRainbowTrainingBonus, blacklist, disableTrainingOnMaxedStat, skillHintsPerLocation, enablePrioritizeSkillHints, enableTrainingLevelWeighting, enablePrioritizeNearMaxFriendship, enableBondEfficiencyCapping, statsTrainedOverBuffer, scoring) {
    blacklist = blacklist === VOID ? emptyList() : blacklist;
    disableTrainingOnMaxedStat = disableTrainingOnMaxedStat === VOID ? false : disableTrainingOnMaxedStat;
    var tmp;
    if (skillHintsPerLocation === VOID) {
      // Inline function 'kotlin.collections.associateWith' call
      var this_0 = get_entries();
      var result = LinkedHashMap_init_$Create$(coerceAtLeast(mapCapacity(collectionSizeOrDefault(this_0, 10)), 16));
      // Inline function 'kotlin.collections.associateWithTo' call
      var _iterator__ex2g4s = this_0.d();
      while (_iterator__ex2g4s.e()) {
        var element = _iterator__ex2g4s.f();
        result.d2(element, 0);
      }
      tmp = result;
    } else {
      tmp = skillHintsPerLocation;
    }
    skillHintsPerLocation = tmp;
    enablePrioritizeSkillHints = enablePrioritizeSkillHints === VOID ? false : enablePrioritizeSkillHints;
    enableTrainingLevelWeighting = enableTrainingLevelWeighting === VOID ? false : enableTrainingLevelWeighting;
    enablePrioritizeNearMaxFriendship = enablePrioritizeNearMaxFriendship === VOID ? true : enablePrioritizeNearMaxFriendship;
    enableBondEfficiencyCapping = enableBondEfficiencyCapping === VOID ? false : enableBondEfficiencyCapping;
    statsTrainedOverBuffer = statsTrainedOverBuffer === VOID ? emptySet() : statsTrainedOverBuffer;
    scoring = scoring === VOID ? new TrainingScoringConstants() : scoring;
    this.currentStats = currentStats;
    this.statPrioritization = statPrioritization;
    this.summerTrainingStatPriority = summerTrainingStatPriority;
    this.statTargets = statTargets;
    this.currentDate = currentDate;
    this.scenario = scenario;
    this.enableRainbowTrainingBonus = enableRainbowTrainingBonus;
    this.blacklist = blacklist;
    this.disableTrainingOnMaxedStat = disableTrainingOnMaxedStat;
    this.skillHintsPerLocation = skillHintsPerLocation;
    this.enablePrioritizeSkillHints = enablePrioritizeSkillHints;
    this.enableTrainingLevelWeighting = enableTrainingLevelWeighting;
    this.enablePrioritizeNearMaxFriendship = enablePrioritizeNearMaxFriendship;
    this.enableBondEfficiencyCapping = enableBondEfficiencyCapping;
    this.statsTrainedOverBuffer = statsTrainedOverBuffer;
    this.scoring = scoring;
  }
  protoOf(TrainingConfig).p8 = function () {
    return this.currentStats;
  };
  protoOf(TrainingConfig).q8 = function () {
    return this.statPrioritization;
  };
  protoOf(TrainingConfig).r8 = function () {
    return this.summerTrainingStatPriority;
  };
  protoOf(TrainingConfig).s8 = function () {
    return this.statTargets;
  };
  protoOf(TrainingConfig).t8 = function () {
    return this.currentDate;
  };
  protoOf(TrainingConfig).u8 = function () {
    return this.scenario;
  };
  protoOf(TrainingConfig).v8 = function () {
    return this.enableRainbowTrainingBonus;
  };
  protoOf(TrainingConfig).w8 = function () {
    return this.blacklist;
  };
  protoOf(TrainingConfig).x8 = function () {
    return this.disableTrainingOnMaxedStat;
  };
  protoOf(TrainingConfig).y8 = function () {
    return this.skillHintsPerLocation;
  };
  protoOf(TrainingConfig).z8 = function () {
    return this.enablePrioritizeSkillHints;
  };
  protoOf(TrainingConfig).a9 = function () {
    return this.enableTrainingLevelWeighting;
  };
  protoOf(TrainingConfig).b9 = function () {
    return this.enablePrioritizeNearMaxFriendship;
  };
  protoOf(TrainingConfig).c9 = function () {
    return this.enableBondEfficiencyCapping;
  };
  protoOf(TrainingConfig).d9 = function () {
    return this.statsTrainedOverBuffer;
  };
  protoOf(TrainingConfig).e9 = function () {
    return this.scoring;
  };
  protoOf(TrainingConfig).c7 = function () {
    return this.currentStats;
  };
  protoOf(TrainingConfig).d7 = function () {
    return this.statPrioritization;
  };
  protoOf(TrainingConfig).a8 = function () {
    return this.summerTrainingStatPriority;
  };
  protoOf(TrainingConfig).b8 = function () {
    return this.statTargets;
  };
  protoOf(TrainingConfig).m8 = function () {
    return this.currentDate;
  };
  protoOf(TrainingConfig).n8 = function () {
    return this.scenario;
  };
  protoOf(TrainingConfig).f9 = function () {
    return this.enableRainbowTrainingBonus;
  };
  protoOf(TrainingConfig).g9 = function () {
    return this.blacklist;
  };
  protoOf(TrainingConfig).h9 = function () {
    return this.disableTrainingOnMaxedStat;
  };
  protoOf(TrainingConfig).i9 = function () {
    return this.skillHintsPerLocation;
  };
  protoOf(TrainingConfig).j9 = function () {
    return this.enablePrioritizeSkillHints;
  };
  protoOf(TrainingConfig).k9 = function () {
    return this.enableTrainingLevelWeighting;
  };
  protoOf(TrainingConfig).l9 = function () {
    return this.enablePrioritizeNearMaxFriendship;
  };
  protoOf(TrainingConfig).m9 = function () {
    return this.enableBondEfficiencyCapping;
  };
  protoOf(TrainingConfig).n9 = function () {
    return this.statsTrainedOverBuffer;
  };
  protoOf(TrainingConfig).o9 = function () {
    return this.scoring;
  };
  protoOf(TrainingConfig).p9 = function (currentStats, statPrioritization, summerTrainingStatPriority, statTargets, currentDate, scenario, enableRainbowTrainingBonus, blacklist, disableTrainingOnMaxedStat, skillHintsPerLocation, enablePrioritizeSkillHints, enableTrainingLevelWeighting, enablePrioritizeNearMaxFriendship, enableBondEfficiencyCapping, statsTrainedOverBuffer, scoring) {
    return new TrainingConfig(currentStats, statPrioritization, summerTrainingStatPriority, statTargets, currentDate, scenario, enableRainbowTrainingBonus, blacklist, disableTrainingOnMaxedStat, skillHintsPerLocation, enablePrioritizeSkillHints, enableTrainingLevelWeighting, enablePrioritizeNearMaxFriendship, enableBondEfficiencyCapping, statsTrainedOverBuffer, scoring);
  };
  protoOf(TrainingConfig).copy = function (currentStats, statPrioritization, summerTrainingStatPriority, statTargets, currentDate, scenario, enableRainbowTrainingBonus, blacklist, disableTrainingOnMaxedStat, skillHintsPerLocation, enablePrioritizeSkillHints, enableTrainingLevelWeighting, enablePrioritizeNearMaxFriendship, enableBondEfficiencyCapping, statsTrainedOverBuffer, scoring, $super) {
    currentStats = currentStats === VOID ? this.currentStats : currentStats;
    statPrioritization = statPrioritization === VOID ? this.statPrioritization : statPrioritization;
    summerTrainingStatPriority = summerTrainingStatPriority === VOID ? this.summerTrainingStatPriority : summerTrainingStatPriority;
    statTargets = statTargets === VOID ? this.statTargets : statTargets;
    currentDate = currentDate === VOID ? this.currentDate : currentDate;
    scenario = scenario === VOID ? this.scenario : scenario;
    enableRainbowTrainingBonus = enableRainbowTrainingBonus === VOID ? this.enableRainbowTrainingBonus : enableRainbowTrainingBonus;
    blacklist = blacklist === VOID ? this.blacklist : blacklist;
    disableTrainingOnMaxedStat = disableTrainingOnMaxedStat === VOID ? this.disableTrainingOnMaxedStat : disableTrainingOnMaxedStat;
    skillHintsPerLocation = skillHintsPerLocation === VOID ? this.skillHintsPerLocation : skillHintsPerLocation;
    enablePrioritizeSkillHints = enablePrioritizeSkillHints === VOID ? this.enablePrioritizeSkillHints : enablePrioritizeSkillHints;
    enableTrainingLevelWeighting = enableTrainingLevelWeighting === VOID ? this.enableTrainingLevelWeighting : enableTrainingLevelWeighting;
    enablePrioritizeNearMaxFriendship = enablePrioritizeNearMaxFriendship === VOID ? this.enablePrioritizeNearMaxFriendship : enablePrioritizeNearMaxFriendship;
    enableBondEfficiencyCapping = enableBondEfficiencyCapping === VOID ? this.enableBondEfficiencyCapping : enableBondEfficiencyCapping;
    statsTrainedOverBuffer = statsTrainedOverBuffer === VOID ? this.statsTrainedOverBuffer : statsTrainedOverBuffer;
    scoring = scoring === VOID ? this.scoring : scoring;
    return $super === VOID ? this.p9(currentStats, statPrioritization, summerTrainingStatPriority, statTargets, currentDate, scenario, enableRainbowTrainingBonus, blacklist, disableTrainingOnMaxedStat, skillHintsPerLocation, enablePrioritizeSkillHints, enableTrainingLevelWeighting, enablePrioritizeNearMaxFriendship, enableBondEfficiencyCapping, statsTrainedOverBuffer, scoring) : $super.p9.call(this, currentStats, statPrioritization, summerTrainingStatPriority, statTargets, currentDate, scenario, enableRainbowTrainingBonus, blacklist, disableTrainingOnMaxedStat, skillHintsPerLocation, enablePrioritizeSkillHints, enableTrainingLevelWeighting, enablePrioritizeNearMaxFriendship, enableBondEfficiencyCapping, statsTrainedOverBuffer, scoring);
  };
  protoOf(TrainingConfig).toString = function () {
    return 'TrainingConfig(currentStats=' + toString(this.currentStats) + ', statPrioritization=' + toString(this.statPrioritization) + ', summerTrainingStatPriority=' + toString(this.summerTrainingStatPriority) + ', statTargets=' + toString(this.statTargets) + ', currentDate=' + this.currentDate.toString() + ', scenario=' + this.scenario + ', enableRainbowTrainingBonus=' + this.enableRainbowTrainingBonus + ', blacklist=' + toString(this.blacklist) + ', disableTrainingOnMaxedStat=' + this.disableTrainingOnMaxedStat + ', skillHintsPerLocation=' + toString(this.skillHintsPerLocation) + ', enablePrioritizeSkillHints=' + this.enablePrioritizeSkillHints + ', enableTrainingLevelWeighting=' + this.enableTrainingLevelWeighting + ', enablePrioritizeNearMaxFriendship=' + this.enablePrioritizeNearMaxFriendship + ', enableBondEfficiencyCapping=' + this.enableBondEfficiencyCapping + ', statsTrainedOverBuffer=' + toString(this.statsTrainedOverBuffer) + ', scoring=' + this.scoring.toString() + ')';
  };
  protoOf(TrainingConfig).hashCode = function () {
    var result = hashCode(this.currentStats);
    result = imul(result, 31) + hashCode(this.statPrioritization) | 0;
    result = imul(result, 31) + hashCode(this.summerTrainingStatPriority) | 0;
    result = imul(result, 31) + hashCode(this.statTargets) | 0;
    result = imul(result, 31) + this.currentDate.hashCode() | 0;
    result = imul(result, 31) + getStringHashCode(this.scenario) | 0;
    result = imul(result, 31) + getBooleanHashCode(this.enableRainbowTrainingBonus) | 0;
    result = imul(result, 31) + hashCode(this.blacklist) | 0;
    result = imul(result, 31) + getBooleanHashCode(this.disableTrainingOnMaxedStat) | 0;
    result = imul(result, 31) + hashCode(this.skillHintsPerLocation) | 0;
    result = imul(result, 31) + getBooleanHashCode(this.enablePrioritizeSkillHints) | 0;
    result = imul(result, 31) + getBooleanHashCode(this.enableTrainingLevelWeighting) | 0;
    result = imul(result, 31) + getBooleanHashCode(this.enablePrioritizeNearMaxFriendship) | 0;
    result = imul(result, 31) + getBooleanHashCode(this.enableBondEfficiencyCapping) | 0;
    result = imul(result, 31) + hashCode(this.statsTrainedOverBuffer) | 0;
    result = imul(result, 31) + this.scoring.hashCode() | 0;
    return result;
  };
  protoOf(TrainingConfig).equals = function (other) {
    if (this === other)
      return true;
    if (!(other instanceof TrainingConfig))
      return false;
    var tmp0_other_with_cast = other instanceof TrainingConfig ? other : THROW_CCE();
    if (!equals(this.currentStats, tmp0_other_with_cast.currentStats))
      return false;
    if (!equals(this.statPrioritization, tmp0_other_with_cast.statPrioritization))
      return false;
    if (!equals(this.summerTrainingStatPriority, tmp0_other_with_cast.summerTrainingStatPriority))
      return false;
    if (!equals(this.statTargets, tmp0_other_with_cast.statTargets))
      return false;
    if (!this.currentDate.equals(tmp0_other_with_cast.currentDate))
      return false;
    if (!(this.scenario === tmp0_other_with_cast.scenario))
      return false;
    if (!(this.enableRainbowTrainingBonus === tmp0_other_with_cast.enableRainbowTrainingBonus))
      return false;
    if (!equals(this.blacklist, tmp0_other_with_cast.blacklist))
      return false;
    if (!(this.disableTrainingOnMaxedStat === tmp0_other_with_cast.disableTrainingOnMaxedStat))
      return false;
    if (!equals(this.skillHintsPerLocation, tmp0_other_with_cast.skillHintsPerLocation))
      return false;
    if (!(this.enablePrioritizeSkillHints === tmp0_other_with_cast.enablePrioritizeSkillHints))
      return false;
    if (!(this.enableTrainingLevelWeighting === tmp0_other_with_cast.enableTrainingLevelWeighting))
      return false;
    if (!(this.enablePrioritizeNearMaxFriendship === tmp0_other_with_cast.enablePrioritizeNearMaxFriendship))
      return false;
    if (!(this.enableBondEfficiencyCapping === tmp0_other_with_cast.enableBondEfficiencyCapping))
      return false;
    if (!equals(this.statsTrainedOverBuffer, tmp0_other_with_cast.statsTrainedOverBuffer))
      return false;
    if (!this.scoring.equals(tmp0_other_with_cast.scoring))
      return false;
    return true;
  };
  function TrainingScoringConstants(ratioBreakpoints, ratioMultipliers, priorityCoefficient, levelBoostRank1Factor, levelBoostRank2Factor, levelBoostRank3Factor, mainStatThresholds, mainStatBonusMagnitude, relationshipOrangeValue, relationshipGreenValue, relationshipBlueValue, relationshipDiminishingFactor, relationshipEarlyGameBonus, relationshipTrainerSupportBonus, skillHintPerHintScore, skillHintOverrideScore, statWeightWithBars, statWeightWithoutBars, relationshipWeightWithBars, miscWeight, juniorEarlyGameFlatBonus, relationshipScale, rainbowMultiplierEnabled, rainbowMultiplierDisabled, rainbowPerInstanceBase, rainbowPerInstanceDecay, anticipatoryMinFillPercent, anticipatoryCoefficient, anticipatoryCap, unityFillBaseBonus, unityFillPerGaugeBonus, unityBurstBaseBonus, unityBurstPerGaugeBonus, unityFillEnergyPenaltyPerGauge, unityBurstEnergyPenaltyPerGauge) {
    ratioBreakpoints = ratioBreakpoints === VOID ? listOf([15.0, 30.0, 45.0, 60.0, 75.0, 90.0]) : ratioBreakpoints;
    ratioMultipliers = ratioMultipliers === VOID ? listOf([5.0, 4.0, 3.0, 2.0, 1.0, 0.5, 0.3]) : ratioMultipliers;
    priorityCoefficient = priorityCoefficient === VOID ? 0.5 : priorityCoefficient;
    levelBoostRank1Factor = levelBoostRank1Factor === VOID ? 0.75 : levelBoostRank1Factor;
    levelBoostRank2Factor = levelBoostRank2Factor === VOID ? 0.25 : levelBoostRank2Factor;
    levelBoostRank3Factor = levelBoostRank3Factor === VOID ? 0.1 : levelBoostRank3Factor;
    mainStatThresholds = mainStatThresholds === VOID ? mapOf([to(StatName_SPEED_getInstance(), 30), to(StatName_STAMINA_getInstance(), 30), to(StatName_POWER_getInstance(), 30), to(StatName_GUTS_getInstance(), 30), to(StatName_WIT_getInstance(), 15)]) : mainStatThresholds;
    mainStatBonusMagnitude = mainStatBonusMagnitude === VOID ? 2.0 : mainStatBonusMagnitude;
    relationshipOrangeValue = relationshipOrangeValue === VOID ? 0.0 : relationshipOrangeValue;
    relationshipGreenValue = relationshipGreenValue === VOID ? 1.0 : relationshipGreenValue;
    relationshipBlueValue = relationshipBlueValue === VOID ? 2.5 : relationshipBlueValue;
    relationshipDiminishingFactor = relationshipDiminishingFactor === VOID ? 0.5 : relationshipDiminishingFactor;
    relationshipEarlyGameBonus = relationshipEarlyGameBonus === VOID ? 1.3 : relationshipEarlyGameBonus;
    relationshipTrainerSupportBonus = relationshipTrainerSupportBonus === VOID ? 1.15 : relationshipTrainerSupportBonus;
    skillHintPerHintScore = skillHintPerHintScore === VOID ? 10.0 : skillHintPerHintScore;
    skillHintOverrideScore = skillHintOverrideScore === VOID ? 10000.0 : skillHintOverrideScore;
    statWeightWithBars = statWeightWithBars === VOID ? 0.6 : statWeightWithBars;
    statWeightWithoutBars = statWeightWithoutBars === VOID ? 0.7 : statWeightWithoutBars;
    relationshipWeightWithBars = relationshipWeightWithBars === VOID ? 0.1 : relationshipWeightWithBars;
    miscWeight = miscWeight === VOID ? 0.3 : miscWeight;
    juniorEarlyGameFlatBonus = juniorEarlyGameFlatBonus === VOID ? 100.0 : juniorEarlyGameFlatBonus;
    relationshipScale = relationshipScale === VOID ? 1.5 : relationshipScale;
    rainbowMultiplierEnabled = rainbowMultiplierEnabled === VOID ? 2.0 : rainbowMultiplierEnabled;
    rainbowMultiplierDisabled = rainbowMultiplierDisabled === VOID ? 1.5 : rainbowMultiplierDisabled;
    rainbowPerInstanceBase = rainbowPerInstanceBase === VOID ? 200.0 : rainbowPerInstanceBase;
    rainbowPerInstanceDecay = rainbowPerInstanceDecay === VOID ? 0.5 : rainbowPerInstanceDecay;
    anticipatoryMinFillPercent = anticipatoryMinFillPercent === VOID ? 50.0 : anticipatoryMinFillPercent;
    anticipatoryCoefficient = anticipatoryCoefficient === VOID ? 0.2 : anticipatoryCoefficient;
    anticipatoryCap = anticipatoryCap === VOID ? 0.6 : anticipatoryCap;
    unityFillBaseBonus = unityFillBaseBonus === VOID ? 60.0 : unityFillBaseBonus;
    unityFillPerGaugeBonus = unityFillPerGaugeBonus === VOID ? 40.0 : unityFillPerGaugeBonus;
    unityBurstBaseBonus = unityBurstBaseBonus === VOID ? 800.0 : unityBurstBaseBonus;
    unityBurstPerGaugeBonus = unityBurstPerGaugeBonus === VOID ? 400.0 : unityBurstPerGaugeBonus;
    unityFillEnergyPenaltyPerGauge = unityFillEnergyPenaltyPerGauge === VOID ? 0.0 : unityFillEnergyPenaltyPerGauge;
    unityBurstEnergyPenaltyPerGauge = unityBurstEnergyPenaltyPerGauge === VOID ? 0.0 : unityBurstEnergyPenaltyPerGauge;
    this.ratioBreakpoints = ratioBreakpoints;
    this.ratioMultipliers = ratioMultipliers;
    this.priorityCoefficient = priorityCoefficient;
    this.levelBoostRank1Factor = levelBoostRank1Factor;
    this.levelBoostRank2Factor = levelBoostRank2Factor;
    this.levelBoostRank3Factor = levelBoostRank3Factor;
    this.mainStatThresholds = mainStatThresholds;
    this.mainStatBonusMagnitude = mainStatBonusMagnitude;
    this.relationshipOrangeValue = relationshipOrangeValue;
    this.relationshipGreenValue = relationshipGreenValue;
    this.relationshipBlueValue = relationshipBlueValue;
    this.relationshipDiminishingFactor = relationshipDiminishingFactor;
    this.relationshipEarlyGameBonus = relationshipEarlyGameBonus;
    this.relationshipTrainerSupportBonus = relationshipTrainerSupportBonus;
    this.skillHintPerHintScore = skillHintPerHintScore;
    this.skillHintOverrideScore = skillHintOverrideScore;
    this.statWeightWithBars = statWeightWithBars;
    this.statWeightWithoutBars = statWeightWithoutBars;
    this.relationshipWeightWithBars = relationshipWeightWithBars;
    this.miscWeight = miscWeight;
    this.juniorEarlyGameFlatBonus = juniorEarlyGameFlatBonus;
    this.relationshipScale = relationshipScale;
    this.rainbowMultiplierEnabled = rainbowMultiplierEnabled;
    this.rainbowMultiplierDisabled = rainbowMultiplierDisabled;
    this.rainbowPerInstanceBase = rainbowPerInstanceBase;
    this.rainbowPerInstanceDecay = rainbowPerInstanceDecay;
    this.anticipatoryMinFillPercent = anticipatoryMinFillPercent;
    this.anticipatoryCoefficient = anticipatoryCoefficient;
    this.anticipatoryCap = anticipatoryCap;
    this.unityFillBaseBonus = unityFillBaseBonus;
    this.unityFillPerGaugeBonus = unityFillPerGaugeBonus;
    this.unityBurstBaseBonus = unityBurstBaseBonus;
    this.unityBurstPerGaugeBonus = unityBurstPerGaugeBonus;
    this.unityFillEnergyPenaltyPerGauge = unityFillEnergyPenaltyPerGauge;
    this.unityBurstEnergyPenaltyPerGauge = unityBurstEnergyPenaltyPerGauge;
    // Inline function 'kotlin.require' call
    if (!(this.ratioMultipliers.i() === (this.ratioBreakpoints.i() + 1 | 0))) {
      var message = 'ratioMultipliers must have exactly one more entry than ratioBreakpoints (got ' + this.ratioMultipliers.i() + ' multipliers vs ' + this.ratioBreakpoints.i() + ' breakpoints)';
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
  }
  protoOf(TrainingScoringConstants).q9 = function () {
    return this.ratioBreakpoints;
  };
  protoOf(TrainingScoringConstants).r9 = function () {
    return this.ratioMultipliers;
  };
  protoOf(TrainingScoringConstants).s9 = function () {
    return this.priorityCoefficient;
  };
  protoOf(TrainingScoringConstants).t9 = function () {
    return this.levelBoostRank1Factor;
  };
  protoOf(TrainingScoringConstants).u9 = function () {
    return this.levelBoostRank2Factor;
  };
  protoOf(TrainingScoringConstants).v9 = function () {
    return this.levelBoostRank3Factor;
  };
  protoOf(TrainingScoringConstants).w9 = function () {
    return this.mainStatThresholds;
  };
  protoOf(TrainingScoringConstants).x9 = function () {
    return this.mainStatBonusMagnitude;
  };
  protoOf(TrainingScoringConstants).y9 = function () {
    return this.relationshipOrangeValue;
  };
  protoOf(TrainingScoringConstants).z9 = function () {
    return this.relationshipGreenValue;
  };
  protoOf(TrainingScoringConstants).aa = function () {
    return this.relationshipBlueValue;
  };
  protoOf(TrainingScoringConstants).ba = function () {
    return this.relationshipDiminishingFactor;
  };
  protoOf(TrainingScoringConstants).ca = function () {
    return this.relationshipEarlyGameBonus;
  };
  protoOf(TrainingScoringConstants).da = function () {
    return this.relationshipTrainerSupportBonus;
  };
  protoOf(TrainingScoringConstants).ea = function () {
    return this.skillHintPerHintScore;
  };
  protoOf(TrainingScoringConstants).fa = function () {
    return this.skillHintOverrideScore;
  };
  protoOf(TrainingScoringConstants).ga = function () {
    return this.statWeightWithBars;
  };
  protoOf(TrainingScoringConstants).ha = function () {
    return this.statWeightWithoutBars;
  };
  protoOf(TrainingScoringConstants).ia = function () {
    return this.relationshipWeightWithBars;
  };
  protoOf(TrainingScoringConstants).ja = function () {
    return this.miscWeight;
  };
  protoOf(TrainingScoringConstants).ka = function () {
    return this.juniorEarlyGameFlatBonus;
  };
  protoOf(TrainingScoringConstants).la = function () {
    return this.relationshipScale;
  };
  protoOf(TrainingScoringConstants).ma = function () {
    return this.rainbowMultiplierEnabled;
  };
  protoOf(TrainingScoringConstants).na = function () {
    return this.rainbowMultiplierDisabled;
  };
  protoOf(TrainingScoringConstants).oa = function () {
    return this.rainbowPerInstanceBase;
  };
  protoOf(TrainingScoringConstants).pa = function () {
    return this.rainbowPerInstanceDecay;
  };
  protoOf(TrainingScoringConstants).qa = function () {
    return this.anticipatoryMinFillPercent;
  };
  protoOf(TrainingScoringConstants).ra = function () {
    return this.anticipatoryCoefficient;
  };
  protoOf(TrainingScoringConstants).sa = function () {
    return this.anticipatoryCap;
  };
  protoOf(TrainingScoringConstants).ta = function () {
    return this.unityFillBaseBonus;
  };
  protoOf(TrainingScoringConstants).ua = function () {
    return this.unityFillPerGaugeBonus;
  };
  protoOf(TrainingScoringConstants).va = function () {
    return this.unityBurstBaseBonus;
  };
  protoOf(TrainingScoringConstants).wa = function () {
    return this.unityBurstPerGaugeBonus;
  };
  protoOf(TrainingScoringConstants).xa = function () {
    return this.unityFillEnergyPenaltyPerGauge;
  };
  protoOf(TrainingScoringConstants).ya = function () {
    return this.unityBurstEnergyPenaltyPerGauge;
  };
  protoOf(TrainingScoringConstants).c7 = function () {
    return this.ratioBreakpoints;
  };
  protoOf(TrainingScoringConstants).d7 = function () {
    return this.ratioMultipliers;
  };
  protoOf(TrainingScoringConstants).a8 = function () {
    return this.priorityCoefficient;
  };
  protoOf(TrainingScoringConstants).b8 = function () {
    return this.levelBoostRank1Factor;
  };
  protoOf(TrainingScoringConstants).m8 = function () {
    return this.levelBoostRank2Factor;
  };
  protoOf(TrainingScoringConstants).n8 = function () {
    return this.levelBoostRank3Factor;
  };
  protoOf(TrainingScoringConstants).f9 = function () {
    return this.mainStatThresholds;
  };
  protoOf(TrainingScoringConstants).g9 = function () {
    return this.mainStatBonusMagnitude;
  };
  protoOf(TrainingScoringConstants).h9 = function () {
    return this.relationshipOrangeValue;
  };
  protoOf(TrainingScoringConstants).i9 = function () {
    return this.relationshipGreenValue;
  };
  protoOf(TrainingScoringConstants).j9 = function () {
    return this.relationshipBlueValue;
  };
  protoOf(TrainingScoringConstants).k9 = function () {
    return this.relationshipDiminishingFactor;
  };
  protoOf(TrainingScoringConstants).l9 = function () {
    return this.relationshipEarlyGameBonus;
  };
  protoOf(TrainingScoringConstants).m9 = function () {
    return this.relationshipTrainerSupportBonus;
  };
  protoOf(TrainingScoringConstants).n9 = function () {
    return this.skillHintPerHintScore;
  };
  protoOf(TrainingScoringConstants).o9 = function () {
    return this.skillHintOverrideScore;
  };
  protoOf(TrainingScoringConstants).za = function () {
    return this.statWeightWithBars;
  };
  protoOf(TrainingScoringConstants).ab = function () {
    return this.statWeightWithoutBars;
  };
  protoOf(TrainingScoringConstants).bb = function () {
    return this.relationshipWeightWithBars;
  };
  protoOf(TrainingScoringConstants).cb = function () {
    return this.miscWeight;
  };
  protoOf(TrainingScoringConstants).db = function () {
    return this.juniorEarlyGameFlatBonus;
  };
  protoOf(TrainingScoringConstants).eb = function () {
    return this.relationshipScale;
  };
  protoOf(TrainingScoringConstants).fb = function () {
    return this.rainbowMultiplierEnabled;
  };
  protoOf(TrainingScoringConstants).gb = function () {
    return this.rainbowMultiplierDisabled;
  };
  protoOf(TrainingScoringConstants).hb = function () {
    return this.rainbowPerInstanceBase;
  };
  protoOf(TrainingScoringConstants).ib = function () {
    return this.rainbowPerInstanceDecay;
  };
  protoOf(TrainingScoringConstants).jb = function () {
    return this.anticipatoryMinFillPercent;
  };
  protoOf(TrainingScoringConstants).kb = function () {
    return this.anticipatoryCoefficient;
  };
  protoOf(TrainingScoringConstants).lb = function () {
    return this.anticipatoryCap;
  };
  protoOf(TrainingScoringConstants).mb = function () {
    return this.unityFillBaseBonus;
  };
  protoOf(TrainingScoringConstants).nb = function () {
    return this.unityFillPerGaugeBonus;
  };
  protoOf(TrainingScoringConstants).ob = function () {
    return this.unityBurstBaseBonus;
  };
  protoOf(TrainingScoringConstants).pb = function () {
    return this.unityBurstPerGaugeBonus;
  };
  protoOf(TrainingScoringConstants).qb = function () {
    return this.unityFillEnergyPenaltyPerGauge;
  };
  protoOf(TrainingScoringConstants).rb = function () {
    return this.unityBurstEnergyPenaltyPerGauge;
  };
  protoOf(TrainingScoringConstants).sb = function (ratioBreakpoints, ratioMultipliers, priorityCoefficient, levelBoostRank1Factor, levelBoostRank2Factor, levelBoostRank3Factor, mainStatThresholds, mainStatBonusMagnitude, relationshipOrangeValue, relationshipGreenValue, relationshipBlueValue, relationshipDiminishingFactor, relationshipEarlyGameBonus, relationshipTrainerSupportBonus, skillHintPerHintScore, skillHintOverrideScore, statWeightWithBars, statWeightWithoutBars, relationshipWeightWithBars, miscWeight, juniorEarlyGameFlatBonus, relationshipScale, rainbowMultiplierEnabled, rainbowMultiplierDisabled, rainbowPerInstanceBase, rainbowPerInstanceDecay, anticipatoryMinFillPercent, anticipatoryCoefficient, anticipatoryCap, unityFillBaseBonus, unityFillPerGaugeBonus, unityBurstBaseBonus, unityBurstPerGaugeBonus, unityFillEnergyPenaltyPerGauge, unityBurstEnergyPenaltyPerGauge) {
    return new TrainingScoringConstants(ratioBreakpoints, ratioMultipliers, priorityCoefficient, levelBoostRank1Factor, levelBoostRank2Factor, levelBoostRank3Factor, mainStatThresholds, mainStatBonusMagnitude, relationshipOrangeValue, relationshipGreenValue, relationshipBlueValue, relationshipDiminishingFactor, relationshipEarlyGameBonus, relationshipTrainerSupportBonus, skillHintPerHintScore, skillHintOverrideScore, statWeightWithBars, statWeightWithoutBars, relationshipWeightWithBars, miscWeight, juniorEarlyGameFlatBonus, relationshipScale, rainbowMultiplierEnabled, rainbowMultiplierDisabled, rainbowPerInstanceBase, rainbowPerInstanceDecay, anticipatoryMinFillPercent, anticipatoryCoefficient, anticipatoryCap, unityFillBaseBonus, unityFillPerGaugeBonus, unityBurstBaseBonus, unityBurstPerGaugeBonus, unityFillEnergyPenaltyPerGauge, unityBurstEnergyPenaltyPerGauge);
  };
  protoOf(TrainingScoringConstants).copy = function (ratioBreakpoints, ratioMultipliers, priorityCoefficient, levelBoostRank1Factor, levelBoostRank2Factor, levelBoostRank3Factor, mainStatThresholds, mainStatBonusMagnitude, relationshipOrangeValue, relationshipGreenValue, relationshipBlueValue, relationshipDiminishingFactor, relationshipEarlyGameBonus, relationshipTrainerSupportBonus, skillHintPerHintScore, skillHintOverrideScore, statWeightWithBars, statWeightWithoutBars, relationshipWeightWithBars, miscWeight, juniorEarlyGameFlatBonus, relationshipScale, rainbowMultiplierEnabled, rainbowMultiplierDisabled, rainbowPerInstanceBase, rainbowPerInstanceDecay, anticipatoryMinFillPercent, anticipatoryCoefficient, anticipatoryCap, unityFillBaseBonus, unityFillPerGaugeBonus, unityBurstBaseBonus, unityBurstPerGaugeBonus, unityFillEnergyPenaltyPerGauge, unityBurstEnergyPenaltyPerGauge, $super) {
    ratioBreakpoints = ratioBreakpoints === VOID ? this.ratioBreakpoints : ratioBreakpoints;
    ratioMultipliers = ratioMultipliers === VOID ? this.ratioMultipliers : ratioMultipliers;
    priorityCoefficient = priorityCoefficient === VOID ? this.priorityCoefficient : priorityCoefficient;
    levelBoostRank1Factor = levelBoostRank1Factor === VOID ? this.levelBoostRank1Factor : levelBoostRank1Factor;
    levelBoostRank2Factor = levelBoostRank2Factor === VOID ? this.levelBoostRank2Factor : levelBoostRank2Factor;
    levelBoostRank3Factor = levelBoostRank3Factor === VOID ? this.levelBoostRank3Factor : levelBoostRank3Factor;
    mainStatThresholds = mainStatThresholds === VOID ? this.mainStatThresholds : mainStatThresholds;
    mainStatBonusMagnitude = mainStatBonusMagnitude === VOID ? this.mainStatBonusMagnitude : mainStatBonusMagnitude;
    relationshipOrangeValue = relationshipOrangeValue === VOID ? this.relationshipOrangeValue : relationshipOrangeValue;
    relationshipGreenValue = relationshipGreenValue === VOID ? this.relationshipGreenValue : relationshipGreenValue;
    relationshipBlueValue = relationshipBlueValue === VOID ? this.relationshipBlueValue : relationshipBlueValue;
    relationshipDiminishingFactor = relationshipDiminishingFactor === VOID ? this.relationshipDiminishingFactor : relationshipDiminishingFactor;
    relationshipEarlyGameBonus = relationshipEarlyGameBonus === VOID ? this.relationshipEarlyGameBonus : relationshipEarlyGameBonus;
    relationshipTrainerSupportBonus = relationshipTrainerSupportBonus === VOID ? this.relationshipTrainerSupportBonus : relationshipTrainerSupportBonus;
    skillHintPerHintScore = skillHintPerHintScore === VOID ? this.skillHintPerHintScore : skillHintPerHintScore;
    skillHintOverrideScore = skillHintOverrideScore === VOID ? this.skillHintOverrideScore : skillHintOverrideScore;
    statWeightWithBars = statWeightWithBars === VOID ? this.statWeightWithBars : statWeightWithBars;
    statWeightWithoutBars = statWeightWithoutBars === VOID ? this.statWeightWithoutBars : statWeightWithoutBars;
    relationshipWeightWithBars = relationshipWeightWithBars === VOID ? this.relationshipWeightWithBars : relationshipWeightWithBars;
    miscWeight = miscWeight === VOID ? this.miscWeight : miscWeight;
    juniorEarlyGameFlatBonus = juniorEarlyGameFlatBonus === VOID ? this.juniorEarlyGameFlatBonus : juniorEarlyGameFlatBonus;
    relationshipScale = relationshipScale === VOID ? this.relationshipScale : relationshipScale;
    rainbowMultiplierEnabled = rainbowMultiplierEnabled === VOID ? this.rainbowMultiplierEnabled : rainbowMultiplierEnabled;
    rainbowMultiplierDisabled = rainbowMultiplierDisabled === VOID ? this.rainbowMultiplierDisabled : rainbowMultiplierDisabled;
    rainbowPerInstanceBase = rainbowPerInstanceBase === VOID ? this.rainbowPerInstanceBase : rainbowPerInstanceBase;
    rainbowPerInstanceDecay = rainbowPerInstanceDecay === VOID ? this.rainbowPerInstanceDecay : rainbowPerInstanceDecay;
    anticipatoryMinFillPercent = anticipatoryMinFillPercent === VOID ? this.anticipatoryMinFillPercent : anticipatoryMinFillPercent;
    anticipatoryCoefficient = anticipatoryCoefficient === VOID ? this.anticipatoryCoefficient : anticipatoryCoefficient;
    anticipatoryCap = anticipatoryCap === VOID ? this.anticipatoryCap : anticipatoryCap;
    unityFillBaseBonus = unityFillBaseBonus === VOID ? this.unityFillBaseBonus : unityFillBaseBonus;
    unityFillPerGaugeBonus = unityFillPerGaugeBonus === VOID ? this.unityFillPerGaugeBonus : unityFillPerGaugeBonus;
    unityBurstBaseBonus = unityBurstBaseBonus === VOID ? this.unityBurstBaseBonus : unityBurstBaseBonus;
    unityBurstPerGaugeBonus = unityBurstPerGaugeBonus === VOID ? this.unityBurstPerGaugeBonus : unityBurstPerGaugeBonus;
    unityFillEnergyPenaltyPerGauge = unityFillEnergyPenaltyPerGauge === VOID ? this.unityFillEnergyPenaltyPerGauge : unityFillEnergyPenaltyPerGauge;
    unityBurstEnergyPenaltyPerGauge = unityBurstEnergyPenaltyPerGauge === VOID ? this.unityBurstEnergyPenaltyPerGauge : unityBurstEnergyPenaltyPerGauge;
    return $super === VOID ? this.sb(ratioBreakpoints, ratioMultipliers, priorityCoefficient, levelBoostRank1Factor, levelBoostRank2Factor, levelBoostRank3Factor, mainStatThresholds, mainStatBonusMagnitude, relationshipOrangeValue, relationshipGreenValue, relationshipBlueValue, relationshipDiminishingFactor, relationshipEarlyGameBonus, relationshipTrainerSupportBonus, skillHintPerHintScore, skillHintOverrideScore, statWeightWithBars, statWeightWithoutBars, relationshipWeightWithBars, miscWeight, juniorEarlyGameFlatBonus, relationshipScale, rainbowMultiplierEnabled, rainbowMultiplierDisabled, rainbowPerInstanceBase, rainbowPerInstanceDecay, anticipatoryMinFillPercent, anticipatoryCoefficient, anticipatoryCap, unityFillBaseBonus, unityFillPerGaugeBonus, unityBurstBaseBonus, unityBurstPerGaugeBonus, unityFillEnergyPenaltyPerGauge, unityBurstEnergyPenaltyPerGauge) : $super.sb.call(this, ratioBreakpoints, ratioMultipliers, priorityCoefficient, levelBoostRank1Factor, levelBoostRank2Factor, levelBoostRank3Factor, mainStatThresholds, mainStatBonusMagnitude, relationshipOrangeValue, relationshipGreenValue, relationshipBlueValue, relationshipDiminishingFactor, relationshipEarlyGameBonus, relationshipTrainerSupportBonus, skillHintPerHintScore, skillHintOverrideScore, statWeightWithBars, statWeightWithoutBars, relationshipWeightWithBars, miscWeight, juniorEarlyGameFlatBonus, relationshipScale, rainbowMultiplierEnabled, rainbowMultiplierDisabled, rainbowPerInstanceBase, rainbowPerInstanceDecay, anticipatoryMinFillPercent, anticipatoryCoefficient, anticipatoryCap, unityFillBaseBonus, unityFillPerGaugeBonus, unityBurstBaseBonus, unityBurstPerGaugeBonus, unityFillEnergyPenaltyPerGauge, unityBurstEnergyPenaltyPerGauge);
  };
  protoOf(TrainingScoringConstants).toString = function () {
    return 'TrainingScoringConstants(ratioBreakpoints=' + toString(this.ratioBreakpoints) + ', ratioMultipliers=' + toString(this.ratioMultipliers) + ', priorityCoefficient=' + this.priorityCoefficient + ', levelBoostRank1Factor=' + this.levelBoostRank1Factor + ', levelBoostRank2Factor=' + this.levelBoostRank2Factor + ', levelBoostRank3Factor=' + this.levelBoostRank3Factor + ', mainStatThresholds=' + toString(this.mainStatThresholds) + ', mainStatBonusMagnitude=' + this.mainStatBonusMagnitude + ', relationshipOrangeValue=' + this.relationshipOrangeValue + ', relationshipGreenValue=' + this.relationshipGreenValue + ', relationshipBlueValue=' + this.relationshipBlueValue + ', relationshipDiminishingFactor=' + this.relationshipDiminishingFactor + ', relationshipEarlyGameBonus=' + this.relationshipEarlyGameBonus + ', relationshipTrainerSupportBonus=' + this.relationshipTrainerSupportBonus + ', skillHintPerHintScore=' + this.skillHintPerHintScore + ', skillHintOverrideScore=' + this.skillHintOverrideScore + ', statWeightWithBars=' + this.statWeightWithBars + ', statWeightWithoutBars=' + this.statWeightWithoutBars + ', relationshipWeightWithBars=' + this.relationshipWeightWithBars + ', miscWeight=' + this.miscWeight + ', juniorEarlyGameFlatBonus=' + this.juniorEarlyGameFlatBonus + ', relationshipScale=' + this.relationshipScale + ', rainbowMultiplierEnabled=' + this.rainbowMultiplierEnabled + ', rainbowMultiplierDisabled=' + this.rainbowMultiplierDisabled + ', rainbowPerInstanceBase=' + this.rainbowPerInstanceBase + ', rainbowPerInstanceDecay=' + this.rainbowPerInstanceDecay + ', anticipatoryMinFillPercent=' + this.anticipatoryMinFillPercent + ', anticipatoryCoefficient=' + this.anticipatoryCoefficient + ', anticipatoryCap=' + this.anticipatoryCap + ', unityFillBaseBonus=' + this.unityFillBaseBonus + ', unityFillPerGaugeBonus=' + this.unityFillPerGaugeBonus + ', unityBurstBaseBonus=' + this.unityBurstBaseBonus + ', unityBurstPerGaugeBonus=' + this.unityBurstPerGaugeBonus + ', unityFillEnergyPenaltyPerGauge=' + this.unityFillEnergyPenaltyPerGauge + ', unityBurstEnergyPenaltyPerGauge=' + this.unityBurstEnergyPenaltyPerGauge + ')';
  };
  protoOf(TrainingScoringConstants).hashCode = function () {
    var result = hashCode(this.ratioBreakpoints);
    result = imul(result, 31) + hashCode(this.ratioMultipliers) | 0;
    result = imul(result, 31) + getNumberHashCode(this.priorityCoefficient) | 0;
    result = imul(result, 31) + getNumberHashCode(this.levelBoostRank1Factor) | 0;
    result = imul(result, 31) + getNumberHashCode(this.levelBoostRank2Factor) | 0;
    result = imul(result, 31) + getNumberHashCode(this.levelBoostRank3Factor) | 0;
    result = imul(result, 31) + hashCode(this.mainStatThresholds) | 0;
    result = imul(result, 31) + getNumberHashCode(this.mainStatBonusMagnitude) | 0;
    result = imul(result, 31) + getNumberHashCode(this.relationshipOrangeValue) | 0;
    result = imul(result, 31) + getNumberHashCode(this.relationshipGreenValue) | 0;
    result = imul(result, 31) + getNumberHashCode(this.relationshipBlueValue) | 0;
    result = imul(result, 31) + getNumberHashCode(this.relationshipDiminishingFactor) | 0;
    result = imul(result, 31) + getNumberHashCode(this.relationshipEarlyGameBonus) | 0;
    result = imul(result, 31) + getNumberHashCode(this.relationshipTrainerSupportBonus) | 0;
    result = imul(result, 31) + getNumberHashCode(this.skillHintPerHintScore) | 0;
    result = imul(result, 31) + getNumberHashCode(this.skillHintOverrideScore) | 0;
    result = imul(result, 31) + getNumberHashCode(this.statWeightWithBars) | 0;
    result = imul(result, 31) + getNumberHashCode(this.statWeightWithoutBars) | 0;
    result = imul(result, 31) + getNumberHashCode(this.relationshipWeightWithBars) | 0;
    result = imul(result, 31) + getNumberHashCode(this.miscWeight) | 0;
    result = imul(result, 31) + getNumberHashCode(this.juniorEarlyGameFlatBonus) | 0;
    result = imul(result, 31) + getNumberHashCode(this.relationshipScale) | 0;
    result = imul(result, 31) + getNumberHashCode(this.rainbowMultiplierEnabled) | 0;
    result = imul(result, 31) + getNumberHashCode(this.rainbowMultiplierDisabled) | 0;
    result = imul(result, 31) + getNumberHashCode(this.rainbowPerInstanceBase) | 0;
    result = imul(result, 31) + getNumberHashCode(this.rainbowPerInstanceDecay) | 0;
    result = imul(result, 31) + getNumberHashCode(this.anticipatoryMinFillPercent) | 0;
    result = imul(result, 31) + getNumberHashCode(this.anticipatoryCoefficient) | 0;
    result = imul(result, 31) + getNumberHashCode(this.anticipatoryCap) | 0;
    result = imul(result, 31) + getNumberHashCode(this.unityFillBaseBonus) | 0;
    result = imul(result, 31) + getNumberHashCode(this.unityFillPerGaugeBonus) | 0;
    result = imul(result, 31) + getNumberHashCode(this.unityBurstBaseBonus) | 0;
    result = imul(result, 31) + getNumberHashCode(this.unityBurstPerGaugeBonus) | 0;
    result = imul(result, 31) + getNumberHashCode(this.unityFillEnergyPenaltyPerGauge) | 0;
    result = imul(result, 31) + getNumberHashCode(this.unityBurstEnergyPenaltyPerGauge) | 0;
    return result;
  };
  protoOf(TrainingScoringConstants).equals = function (other) {
    if (this === other)
      return true;
    if (!(other instanceof TrainingScoringConstants))
      return false;
    var tmp0_other_with_cast = other instanceof TrainingScoringConstants ? other : THROW_CCE();
    if (!equals(this.ratioBreakpoints, tmp0_other_with_cast.ratioBreakpoints))
      return false;
    if (!equals(this.ratioMultipliers, tmp0_other_with_cast.ratioMultipliers))
      return false;
    if (!equals(this.priorityCoefficient, tmp0_other_with_cast.priorityCoefficient))
      return false;
    if (!equals(this.levelBoostRank1Factor, tmp0_other_with_cast.levelBoostRank1Factor))
      return false;
    if (!equals(this.levelBoostRank2Factor, tmp0_other_with_cast.levelBoostRank2Factor))
      return false;
    if (!equals(this.levelBoostRank3Factor, tmp0_other_with_cast.levelBoostRank3Factor))
      return false;
    if (!equals(this.mainStatThresholds, tmp0_other_with_cast.mainStatThresholds))
      return false;
    if (!equals(this.mainStatBonusMagnitude, tmp0_other_with_cast.mainStatBonusMagnitude))
      return false;
    if (!equals(this.relationshipOrangeValue, tmp0_other_with_cast.relationshipOrangeValue))
      return false;
    if (!equals(this.relationshipGreenValue, tmp0_other_with_cast.relationshipGreenValue))
      return false;
    if (!equals(this.relationshipBlueValue, tmp0_other_with_cast.relationshipBlueValue))
      return false;
    if (!equals(this.relationshipDiminishingFactor, tmp0_other_with_cast.relationshipDiminishingFactor))
      return false;
    if (!equals(this.relationshipEarlyGameBonus, tmp0_other_with_cast.relationshipEarlyGameBonus))
      return false;
    if (!equals(this.relationshipTrainerSupportBonus, tmp0_other_with_cast.relationshipTrainerSupportBonus))
      return false;
    if (!equals(this.skillHintPerHintScore, tmp0_other_with_cast.skillHintPerHintScore))
      return false;
    if (!equals(this.skillHintOverrideScore, tmp0_other_with_cast.skillHintOverrideScore))
      return false;
    if (!equals(this.statWeightWithBars, tmp0_other_with_cast.statWeightWithBars))
      return false;
    if (!equals(this.statWeightWithoutBars, tmp0_other_with_cast.statWeightWithoutBars))
      return false;
    if (!equals(this.relationshipWeightWithBars, tmp0_other_with_cast.relationshipWeightWithBars))
      return false;
    if (!equals(this.miscWeight, tmp0_other_with_cast.miscWeight))
      return false;
    if (!equals(this.juniorEarlyGameFlatBonus, tmp0_other_with_cast.juniorEarlyGameFlatBonus))
      return false;
    if (!equals(this.relationshipScale, tmp0_other_with_cast.relationshipScale))
      return false;
    if (!equals(this.rainbowMultiplierEnabled, tmp0_other_with_cast.rainbowMultiplierEnabled))
      return false;
    if (!equals(this.rainbowMultiplierDisabled, tmp0_other_with_cast.rainbowMultiplierDisabled))
      return false;
    if (!equals(this.rainbowPerInstanceBase, tmp0_other_with_cast.rainbowPerInstanceBase))
      return false;
    if (!equals(this.rainbowPerInstanceDecay, tmp0_other_with_cast.rainbowPerInstanceDecay))
      return false;
    if (!equals(this.anticipatoryMinFillPercent, tmp0_other_with_cast.anticipatoryMinFillPercent))
      return false;
    if (!equals(this.anticipatoryCoefficient, tmp0_other_with_cast.anticipatoryCoefficient))
      return false;
    if (!equals(this.anticipatoryCap, tmp0_other_with_cast.anticipatoryCap))
      return false;
    if (!equals(this.unityFillBaseBonus, tmp0_other_with_cast.unityFillBaseBonus))
      return false;
    if (!equals(this.unityFillPerGaugeBonus, tmp0_other_with_cast.unityFillPerGaugeBonus))
      return false;
    if (!equals(this.unityBurstBaseBonus, tmp0_other_with_cast.unityBurstBaseBonus))
      return false;
    if (!equals(this.unityBurstPerGaugeBonus, tmp0_other_with_cast.unityBurstPerGaugeBonus))
      return false;
    if (!equals(this.unityFillEnergyPenaltyPerGauge, tmp0_other_with_cast.unityFillEnergyPenaltyPerGauge))
      return false;
    if (!equals(this.unityBurstEnergyPenaltyPerGauge, tmp0_other_with_cast.unityBurstEnergyPenaltyPerGauge))
      return false;
    return true;
  };
  function RawScoreBreakdown(statScoreWeighted, relationshipScoreWeighted, miscScoreWeighted, rainbowMultiplier, anticipatoryMultiplier, total) {
    this.statScoreWeighted = statScoreWeighted;
    this.relationshipScoreWeighted = relationshipScoreWeighted;
    this.miscScoreWeighted = miscScoreWeighted;
    this.rainbowMultiplier = rainbowMultiplier;
    this.anticipatoryMultiplier = anticipatoryMultiplier;
    this.total = total;
  }
  protoOf(RawScoreBreakdown).tb = function () {
    return this.statScoreWeighted;
  };
  protoOf(RawScoreBreakdown).ub = function () {
    return this.relationshipScoreWeighted;
  };
  protoOf(RawScoreBreakdown).vb = function () {
    return this.miscScoreWeighted;
  };
  protoOf(RawScoreBreakdown).wb = function () {
    return this.rainbowMultiplier;
  };
  protoOf(RawScoreBreakdown).xb = function () {
    return this.anticipatoryMultiplier;
  };
  protoOf(RawScoreBreakdown).yb = function () {
    return this.total;
  };
  protoOf(RawScoreBreakdown).c7 = function () {
    return this.statScoreWeighted;
  };
  protoOf(RawScoreBreakdown).d7 = function () {
    return this.relationshipScoreWeighted;
  };
  protoOf(RawScoreBreakdown).a8 = function () {
    return this.miscScoreWeighted;
  };
  protoOf(RawScoreBreakdown).b8 = function () {
    return this.rainbowMultiplier;
  };
  protoOf(RawScoreBreakdown).m8 = function () {
    return this.anticipatoryMultiplier;
  };
  protoOf(RawScoreBreakdown).n8 = function () {
    return this.total;
  };
  protoOf(RawScoreBreakdown).zb = function (statScoreWeighted, relationshipScoreWeighted, miscScoreWeighted, rainbowMultiplier, anticipatoryMultiplier, total) {
    return new RawScoreBreakdown(statScoreWeighted, relationshipScoreWeighted, miscScoreWeighted, rainbowMultiplier, anticipatoryMultiplier, total);
  };
  protoOf(RawScoreBreakdown).copy = function (statScoreWeighted, relationshipScoreWeighted, miscScoreWeighted, rainbowMultiplier, anticipatoryMultiplier, total, $super) {
    statScoreWeighted = statScoreWeighted === VOID ? this.statScoreWeighted : statScoreWeighted;
    relationshipScoreWeighted = relationshipScoreWeighted === VOID ? this.relationshipScoreWeighted : relationshipScoreWeighted;
    miscScoreWeighted = miscScoreWeighted === VOID ? this.miscScoreWeighted : miscScoreWeighted;
    rainbowMultiplier = rainbowMultiplier === VOID ? this.rainbowMultiplier : rainbowMultiplier;
    anticipatoryMultiplier = anticipatoryMultiplier === VOID ? this.anticipatoryMultiplier : anticipatoryMultiplier;
    total = total === VOID ? this.total : total;
    return $super === VOID ? this.zb(statScoreWeighted, relationshipScoreWeighted, miscScoreWeighted, rainbowMultiplier, anticipatoryMultiplier, total) : $super.zb.call(this, statScoreWeighted, relationshipScoreWeighted, miscScoreWeighted, rainbowMultiplier, anticipatoryMultiplier, total);
  };
  protoOf(RawScoreBreakdown).toString = function () {
    return 'RawScoreBreakdown(statScoreWeighted=' + this.statScoreWeighted + ', relationshipScoreWeighted=' + this.relationshipScoreWeighted + ', miscScoreWeighted=' + this.miscScoreWeighted + ', rainbowMultiplier=' + this.rainbowMultiplier + ', anticipatoryMultiplier=' + this.anticipatoryMultiplier + ', total=' + this.total + ')';
  };
  protoOf(RawScoreBreakdown).hashCode = function () {
    var result = getNumberHashCode(this.statScoreWeighted);
    result = imul(result, 31) + getNumberHashCode(this.relationshipScoreWeighted) | 0;
    result = imul(result, 31) + getNumberHashCode(this.miscScoreWeighted) | 0;
    result = imul(result, 31) + getNumberHashCode(this.rainbowMultiplier) | 0;
    result = imul(result, 31) + getNumberHashCode(this.anticipatoryMultiplier) | 0;
    result = imul(result, 31) + getNumberHashCode(this.total) | 0;
    return result;
  };
  protoOf(RawScoreBreakdown).equals = function (other) {
    if (this === other)
      return true;
    if (!(other instanceof RawScoreBreakdown))
      return false;
    var tmp0_other_with_cast = other instanceof RawScoreBreakdown ? other : THROW_CCE();
    if (!equals(this.statScoreWeighted, tmp0_other_with_cast.statScoreWeighted))
      return false;
    if (!equals(this.relationshipScoreWeighted, tmp0_other_with_cast.relationshipScoreWeighted))
      return false;
    if (!equals(this.miscScoreWeighted, tmp0_other_with_cast.miscScoreWeighted))
      return false;
    if (!equals(this.rainbowMultiplier, tmp0_other_with_cast.rainbowMultiplier))
      return false;
    if (!equals(this.anticipatoryMultiplier, tmp0_other_with_cast.anticipatoryMultiplier))
      return false;
    if (!equals(this.total, tmp0_other_with_cast.total))
      return false;
    return true;
  };
  function StatName_SPEED_getInstance() {
    StatName_initEntries();
    return StatName_SPEED_instance;
  }
  function StatName_STAMINA_getInstance() {
    StatName_initEntries();
    return StatName_STAMINA_instance;
  }
  function StatName_POWER_getInstance() {
    StatName_initEntries();
    return StatName_POWER_instance;
  }
  function StatName_GUTS_getInstance() {
    StatName_initEntries();
    return StatName_GUTS_instance;
  }
  function StatName_WIT_getInstance() {
    StatName_initEntries();
    return StatName_WIT_instance;
  }
  function DateYear_JUNIOR_getInstance() {
    DateYear_initEntries();
    return DateYear_JUNIOR_instance;
  }
  function DateYear_CLASSIC_getInstance() {
    DateYear_initEntries();
    return DateYear_CLASSIC_instance;
  }
  function DateYear_SENIOR_getInstance() {
    DateYear_initEntries();
    return DateYear_SENIOR_instance;
  }
  //region block: post-declaration
  defineProp(protoOf(StatName), 'name', protoOf(StatName).a1);
  defineProp(protoOf(StatName), 'ordinal', protoOf(StatName).b1);
  defineProp(protoOf(DateYear), 'name', protoOf(DateYear).a1);
  defineProp(protoOf(DateYear), 'ordinal', protoOf(DateYear).b1);
  //endregion
  //region block: exports
  function $jsExportAll$(_) {
    var $com = _.com || (_.com = {});
    var $com$steve1316 = $com.steve1316 || ($com.steve1316 = {});
    var $com$steve1316$uma_scoring = $com$steve1316.uma_scoring || ($com$steve1316.uma_scoring = {});
    $com$steve1316$uma_scoring.getScenarioStatCap = getScenarioStatCap;
    $com$steve1316$uma_scoring.getCurrentStatCap = getCurrentStatCap;
    $com$steve1316$uma_scoring.getRemainingFinaleRaces = getRemainingFinaleRaces;
    $com$steve1316$uma_scoring.getFinaleStatBonus = getFinaleStatBonus;
    $com$steve1316$uma_scoring.levelBoostMultiplier = levelBoostMultiplier;
    $com$steve1316$uma_scoring.calculateStatEfficiencyScore = calculateStatEfficiencyScore;
    $com$steve1316$uma_scoring.calculateRelationshipScore = calculateRelationshipScore;
    $com$steve1316$uma_scoring.calculateMiscScore = calculateMiscScore;
    $com$steve1316$uma_scoring.calculateRawTrainingScore = calculateRawTrainingScore;
    $com$steve1316$uma_scoring.rawTrainingScoreComponents = rawTrainingScoreComponents;
    $com$steve1316$uma_scoring.estimateFailureChanceFromEnergy = estimateFailureChanceFromEnergy;
    $com$steve1316$uma_scoring.scoringConstantsFromMap = scoringConstantsFromMap;
    var $com = _.com || (_.com = {});
    var $com$steve1316 = $com.steve1316 || ($com.steve1316 = {});
    var $com$steve1316$uma_scoring = $com$steve1316.uma_scoring || ($com$steve1316.uma_scoring = {});
    $com$steve1316$uma_scoring.StatName = StatName;
    $com$steve1316$uma_scoring.StatName.values = values;
    $com$steve1316$uma_scoring.StatName.valueOf = valueOf;
    defineProp($com$steve1316$uma_scoring.StatName, 'SPEED', StatName_SPEED_getInstance);
    defineProp($com$steve1316$uma_scoring.StatName, 'STAMINA', StatName_STAMINA_getInstance);
    defineProp($com$steve1316$uma_scoring.StatName, 'POWER', StatName_POWER_getInstance);
    defineProp($com$steve1316$uma_scoring.StatName, 'GUTS', StatName_GUTS_getInstance);
    defineProp($com$steve1316$uma_scoring.StatName, 'WIT', StatName_WIT_getInstance);
    defineProp($com$steve1316$uma_scoring.StatName, 'Companion', Companion_getInstance);
    $com$steve1316$uma_scoring.DateYear = DateYear;
    $com$steve1316$uma_scoring.DateYear.values = values_0;
    $com$steve1316$uma_scoring.DateYear.valueOf = valueOf_0;
    defineProp($com$steve1316$uma_scoring.DateYear, 'JUNIOR', DateYear_JUNIOR_getInstance);
    defineProp($com$steve1316$uma_scoring.DateYear, 'CLASSIC', DateYear_CLASSIC_getInstance);
    defineProp($com$steve1316$uma_scoring.DateYear, 'SENIOR', DateYear_SENIOR_getInstance);
    defineProp($com$steve1316$uma_scoring.DateYear, 'Companion', Companion_getInstance_0);
    $com$steve1316$uma_scoring.GameDateSnapshot = GameDateSnapshot;
    $com$steve1316$uma_scoring.BarFillResult = BarFillResult;
    $com$steve1316$uma_scoring.TrainingOption = TrainingOption;
    $com$steve1316$uma_scoring.TrainingConfig = TrainingConfig;
    $com$steve1316$uma_scoring.TrainingScoringConstants = TrainingScoringConstants;
    $com$steve1316$uma_scoring.RawScoreBreakdown = RawScoreBreakdown;
  }
  $jsExportAll$(_);
  kotlin_kotlin.$jsExportAll$(_);
  //endregion
  return _;
}));

//# sourceMappingURL=uma-scoring.js.map
