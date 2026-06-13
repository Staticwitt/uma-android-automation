type Nullable<T> = T | null | undefined
declare function KtSingleton<T>(): T & (abstract new() => any);
export declare namespace kotlin.collections {
    interface KtList<E> /* extends kotlin.collections.Collection<E> */ {
        asJsReadonlyArrayView(): ReadonlyArray<E>;
        readonly __doNotUseOrImplementIt: {
            readonly "kotlin.collections.KtList": unique symbol;
        };
    }
    abstract class KtList<E> extends KtSingleton<KtList.$metadata$.constructor>() {
        private constructor();
    }
    /** @deprecated $metadata$ is used for internal purposes, please don't use it in your code, because it can be removed at any moment */
    namespace KtList.$metadata$ {
        abstract class constructor {
            fromJsArray<E>(array: ReadonlyArray<E>): kotlin.collections.KtList<E>;
            private constructor();
        }
    }
    interface KtMap<K, V> {
        asJsReadonlyMapView(): ReadonlyMap<K, V>;
        readonly __doNotUseOrImplementIt: {
            readonly "kotlin.collections.KtMap": unique symbol;
        };
    }
    abstract class KtMap<K, V> extends KtSingleton<KtMap.$metadata$.constructor>() {
        private constructor();
    }
    /** @deprecated $metadata$ is used for internal purposes, please don't use it in your code, because it can be removed at any moment */
    namespace KtMap.$metadata$ {
        abstract class constructor {
            fromJsMap<K, V>(map: ReadonlyMap<K, V>): kotlin.collections.KtMap<K, V>;
            private constructor();
        }
    }
    interface KtSet<E> /* extends kotlin.collections.Collection<E> */ {
        asJsReadonlySetView(): ReadonlySet<E>;
        readonly __doNotUseOrImplementIt: {
            readonly "kotlin.collections.KtSet": unique symbol;
        };
    }
    abstract class KtSet<E> extends KtSingleton<KtSet.$metadata$.constructor>() {
        private constructor();
    }
    /** @deprecated $metadata$ is used for internal purposes, please don't use it in your code, because it can be removed at any moment */
    namespace KtSet.$metadata$ {
        abstract class constructor {
            fromJsSet<E>(set: ReadonlySet<E>): kotlin.collections.KtSet<E>;
            private constructor();
        }
    }
}
export declare namespace com.steve1316.uma_scoring {
    function getScenarioStatCap(scenario: string, statName: com.steve1316.uma_scoring.StatName): number;
    function getCurrentStatCap(statName: com.steve1316.uma_scoring.StatName, config: com.steve1316.uma_scoring.TrainingConfig): number;
    function getRemainingFinaleRaces(currentDay: number): number;
    function getFinaleStatBonus(currentDay: number): number;
    function levelBoostMultiplier(priorityRank: number, trainingLevel: Nullable<number>, constants?: com.steve1316.uma_scoring.TrainingScoringConstants): number;
    function calculateStatEfficiencyScore(config: com.steve1316.uma_scoring.TrainingConfig, training: com.steve1316.uma_scoring.TrainingOption): number;
    function calculateRelationshipScore(config: com.steve1316.uma_scoring.TrainingConfig, training: com.steve1316.uma_scoring.TrainingOption): number;
    function calculateMiscScore(config: com.steve1316.uma_scoring.TrainingConfig, training: com.steve1316.uma_scoring.TrainingOption): number;
    function calculateRawTrainingScore(config: com.steve1316.uma_scoring.TrainingConfig, training: com.steve1316.uma_scoring.TrainingOption): number;
    function estimateFailureChanceFromEnergy(currentEnergy: number, statName?: Nullable<com.steve1316.uma_scoring.StatName>): number;
    function scoringConstantsFromMap(settings: kotlin.collections.KtMap<string, Nullable<any>>, defaults?: com.steve1316.uma_scoring.TrainingScoringConstants): com.steve1316.uma_scoring.TrainingScoringConstants;
}
export declare namespace com.steve1316.uma_scoring {
    abstract class StatName {
        private constructor();
        static get SPEED(): com.steve1316.uma_scoring.StatName & {
            get name(): "SPEED";
            get ordinal(): 0;
        };
        static get STAMINA(): com.steve1316.uma_scoring.StatName & {
            get name(): "STAMINA";
            get ordinal(): 1;
        };
        static get POWER(): com.steve1316.uma_scoring.StatName & {
            get name(): "POWER";
            get ordinal(): 2;
        };
        static get GUTS(): com.steve1316.uma_scoring.StatName & {
            get name(): "GUTS";
            get ordinal(): 3;
        };
        static get WIT(): com.steve1316.uma_scoring.StatName & {
            get name(): "WIT";
            get ordinal(): 4;
        };
        get name(): "SPEED" | "STAMINA" | "POWER" | "GUTS" | "WIT";
        get ordinal(): 0 | 1 | 2 | 3 | 4;
        static values(): Array<com.steve1316.uma_scoring.StatName>;
        static valueOf(value: string): com.steve1316.uma_scoring.StatName;
    }
    /** @deprecated $metadata$ is used for internal purposes, please don't use it in your code, because it can be removed at any moment */
    namespace StatName.$metadata$ {
        const constructor: abstract new () => StatName;
    }
    namespace StatName {
        abstract class Companion extends KtSingleton<Companion.$metadata$.constructor>() {
            private constructor();
        }
        /** @deprecated $metadata$ is used for internal purposes, please don't use it in your code, because it can be removed at any moment */
        namespace Companion.$metadata$ {
            abstract class constructor {
                fromName(value: string): Nullable<com.steve1316.uma_scoring.StatName>;
                private constructor();
            }
        }
    }
    abstract class DateYear {
        private constructor();
        static get JUNIOR(): com.steve1316.uma_scoring.DateYear & {
            get name(): "JUNIOR";
            get ordinal(): 0;
        };
        static get CLASSIC(): com.steve1316.uma_scoring.DateYear & {
            get name(): "CLASSIC";
            get ordinal(): 1;
        };
        static get SENIOR(): com.steve1316.uma_scoring.DateYear & {
            get name(): "SENIOR";
            get ordinal(): 2;
        };
        get name(): "JUNIOR" | "CLASSIC" | "SENIOR";
        get ordinal(): 0 | 1 | 2;
        get longName(): string;
        static values(): Array<com.steve1316.uma_scoring.DateYear>;
        static valueOf(value: string): com.steve1316.uma_scoring.DateYear;
    }
    /** @deprecated $metadata$ is used for internal purposes, please don't use it in your code, because it can be removed at any moment */
    namespace DateYear.$metadata$ {
        const constructor: abstract new () => DateYear;
    }
    namespace DateYear {
        abstract class Companion extends KtSingleton<Companion.$metadata$.constructor>() {
            private constructor();
        }
        /** @deprecated $metadata$ is used for internal purposes, please don't use it in your code, because it can be removed at any moment */
        namespace Companion.$metadata$ {
            abstract class constructor {
                fromName(value: string): Nullable<com.steve1316.uma_scoring.DateYear>;
                fromOrdinal(ordinal: number): Nullable<com.steve1316.uma_scoring.DateYear>;
                private constructor();
            }
        }
    }
    class GameDateSnapshot {
        constructor(year: com.steve1316.uma_scoring.DateYear, day?: number, bIsPreDebut?: boolean, isSummer?: boolean);
        get year(): com.steve1316.uma_scoring.DateYear;
        get day(): number;
        get bIsPreDebut(): boolean;
        get isSummer(): boolean;
        copy(year?: com.steve1316.uma_scoring.DateYear, day?: number, bIsPreDebut?: boolean, isSummer?: boolean): com.steve1316.uma_scoring.GameDateSnapshot;
        toString(): string;
        hashCode(): number;
        equals(other: Nullable<any>): boolean;
    }
    /** @deprecated $metadata$ is used for internal purposes, please don't use it in your code, because it can be removed at any moment */
    namespace GameDateSnapshot.$metadata$ {
        const constructor: abstract new () => GameDateSnapshot;
    }
    class BarFillResult {
        constructor(dominantColor: string, fillPercent: number, isTrainerSupport?: boolean);
        get dominantColor(): string;
        get fillPercent(): number;
        get isTrainerSupport(): boolean;
        copy(dominantColor?: string, fillPercent?: number, isTrainerSupport?: boolean): com.steve1316.uma_scoring.BarFillResult;
        toString(): string;
        hashCode(): number;
        equals(other: Nullable<any>): boolean;
    }
    /** @deprecated $metadata$ is used for internal purposes, please don't use it in your code, because it can be removed at any moment */
    namespace BarFillResult.$metadata$ {
        const constructor: abstract new () => BarFillResult;
    }
    class TrainingOption {
        constructor(name: com.steve1316.uma_scoring.StatName, statGains: kotlin.collections.KtMap<com.steve1316.uma_scoring.StatName, number>, relationshipBars: kotlin.collections.KtList<com.steve1316.uma_scoring.BarFillResult>, numRainbow: number, numSkillHints?: number, trainingLevel?: Nullable<number>);
        get name(): com.steve1316.uma_scoring.StatName;
        get statGains(): kotlin.collections.KtMap<com.steve1316.uma_scoring.StatName, number>;
        get relationshipBars(): kotlin.collections.KtList<com.steve1316.uma_scoring.BarFillResult>;
        get numRainbow(): number;
        get numSkillHints(): number;
        get trainingLevel(): Nullable<number>;
        copy(name?: com.steve1316.uma_scoring.StatName, statGains?: kotlin.collections.KtMap<com.steve1316.uma_scoring.StatName, number>, relationshipBars?: kotlin.collections.KtList<com.steve1316.uma_scoring.BarFillResult>, numRainbow?: number, numSkillHints?: number, trainingLevel?: Nullable<number>): com.steve1316.uma_scoring.TrainingOption;
        toString(): string;
        hashCode(): number;
        equals(other: Nullable<any>): boolean;
    }
    /** @deprecated $metadata$ is used for internal purposes, please don't use it in your code, because it can be removed at any moment */
    namespace TrainingOption.$metadata$ {
        const constructor: abstract new () => TrainingOption;
    }
    class TrainingConfig {
        constructor(currentStats: kotlin.collections.KtMap<com.steve1316.uma_scoring.StatName, number>, statPrioritization: kotlin.collections.KtList<com.steve1316.uma_scoring.StatName>, summerTrainingStatPriority: kotlin.collections.KtList<com.steve1316.uma_scoring.StatName>, statTargets: kotlin.collections.KtMap<com.steve1316.uma_scoring.StatName, number>, currentDate: com.steve1316.uma_scoring.GameDateSnapshot, scenario: string, enableRainbowTrainingBonus: boolean, blacklist?: kotlin.collections.KtList<Nullable<com.steve1316.uma_scoring.StatName>>, disableTrainingOnMaxedStat?: boolean, skillHintsPerLocation?: kotlin.collections.KtMap<com.steve1316.uma_scoring.StatName, number>, enablePrioritizeSkillHints?: boolean, enableTrainingLevelWeighting?: boolean, enablePrioritizeNearMaxFriendship?: boolean, statsTrainedOverBuffer?: kotlin.collections.KtSet<com.steve1316.uma_scoring.StatName>, scoring?: com.steve1316.uma_scoring.TrainingScoringConstants);
        get currentStats(): kotlin.collections.KtMap<com.steve1316.uma_scoring.StatName, number>;
        get statPrioritization(): kotlin.collections.KtList<com.steve1316.uma_scoring.StatName>;
        get summerTrainingStatPriority(): kotlin.collections.KtList<com.steve1316.uma_scoring.StatName>;
        get statTargets(): kotlin.collections.KtMap<com.steve1316.uma_scoring.StatName, number>;
        get currentDate(): com.steve1316.uma_scoring.GameDateSnapshot;
        get scenario(): string;
        get enableRainbowTrainingBonus(): boolean;
        get blacklist(): kotlin.collections.KtList<Nullable<com.steve1316.uma_scoring.StatName>>;
        get disableTrainingOnMaxedStat(): boolean;
        get skillHintsPerLocation(): kotlin.collections.KtMap<com.steve1316.uma_scoring.StatName, number>;
        get enablePrioritizeSkillHints(): boolean;
        get enableTrainingLevelWeighting(): boolean;
        get enablePrioritizeNearMaxFriendship(): boolean;
        get statsTrainedOverBuffer(): kotlin.collections.KtSet<com.steve1316.uma_scoring.StatName>;
        get scoring(): com.steve1316.uma_scoring.TrainingScoringConstants;
        copy(currentStats?: kotlin.collections.KtMap<com.steve1316.uma_scoring.StatName, number>, statPrioritization?: kotlin.collections.KtList<com.steve1316.uma_scoring.StatName>, summerTrainingStatPriority?: kotlin.collections.KtList<com.steve1316.uma_scoring.StatName>, statTargets?: kotlin.collections.KtMap<com.steve1316.uma_scoring.StatName, number>, currentDate?: com.steve1316.uma_scoring.GameDateSnapshot, scenario?: string, enableRainbowTrainingBonus?: boolean, blacklist?: kotlin.collections.KtList<Nullable<com.steve1316.uma_scoring.StatName>>, disableTrainingOnMaxedStat?: boolean, skillHintsPerLocation?: kotlin.collections.KtMap<com.steve1316.uma_scoring.StatName, number>, enablePrioritizeSkillHints?: boolean, enableTrainingLevelWeighting?: boolean, enablePrioritizeNearMaxFriendship?: boolean, statsTrainedOverBuffer?: kotlin.collections.KtSet<com.steve1316.uma_scoring.StatName>, scoring?: com.steve1316.uma_scoring.TrainingScoringConstants): com.steve1316.uma_scoring.TrainingConfig;
        toString(): string;
        hashCode(): number;
        equals(other: Nullable<any>): boolean;
    }
    /** @deprecated $metadata$ is used for internal purposes, please don't use it in your code, because it can be removed at any moment */
    namespace TrainingConfig.$metadata$ {
        const constructor: abstract new () => TrainingConfig;
    }
    class TrainingScoringConstants {
        constructor(ratioBreakpoints?: kotlin.collections.KtList<number>, ratioMultipliers?: kotlin.collections.KtList<number>, priorityCoefficient?: number, levelBoostRank1Factor?: number, levelBoostRank2Factor?: number, levelBoostRank3Factor?: number, mainStatThresholds?: kotlin.collections.KtMap<com.steve1316.uma_scoring.StatName, number>, mainStatBonusMagnitude?: number, relationshipOrangeValue?: number, relationshipGreenValue?: number, relationshipBlueValue?: number, relationshipDiminishingFactor?: number, relationshipEarlyGameBonus?: number, relationshipTrainerSupportBonus?: number, skillHintPerHintScore?: number, skillHintOverrideScore?: number, statWeightWithBars?: number, statWeightWithoutBars?: number, relationshipWeightWithBars?: number, miscWeight?: number, juniorEarlyGameFlatBonus?: number, relationshipScale?: number, rainbowMultiplierEnabled?: number, rainbowMultiplierDisabled?: number, rainbowPerInstanceBase?: number, rainbowPerInstanceDecay?: number, anticipatoryMinFillPercent?: number, anticipatoryCoefficient?: number, anticipatoryCap?: number);
        get ratioBreakpoints(): kotlin.collections.KtList<number>;
        get ratioMultipliers(): kotlin.collections.KtList<number>;
        get priorityCoefficient(): number;
        get levelBoostRank1Factor(): number;
        get levelBoostRank2Factor(): number;
        get levelBoostRank3Factor(): number;
        get mainStatThresholds(): kotlin.collections.KtMap<com.steve1316.uma_scoring.StatName, number>;
        get mainStatBonusMagnitude(): number;
        get relationshipOrangeValue(): number;
        get relationshipGreenValue(): number;
        get relationshipBlueValue(): number;
        get relationshipDiminishingFactor(): number;
        get relationshipEarlyGameBonus(): number;
        get relationshipTrainerSupportBonus(): number;
        get skillHintPerHintScore(): number;
        get skillHintOverrideScore(): number;
        get statWeightWithBars(): number;
        get statWeightWithoutBars(): number;
        get relationshipWeightWithBars(): number;
        get miscWeight(): number;
        get juniorEarlyGameFlatBonus(): number;
        get relationshipScale(): number;
        get rainbowMultiplierEnabled(): number;
        get rainbowMultiplierDisabled(): number;
        get rainbowPerInstanceBase(): number;
        get rainbowPerInstanceDecay(): number;
        get anticipatoryMinFillPercent(): number;
        get anticipatoryCoefficient(): number;
        get anticipatoryCap(): number;
        copy(ratioBreakpoints?: kotlin.collections.KtList<number>, ratioMultipliers?: kotlin.collections.KtList<number>, priorityCoefficient?: number, levelBoostRank1Factor?: number, levelBoostRank2Factor?: number, levelBoostRank3Factor?: number, mainStatThresholds?: kotlin.collections.KtMap<com.steve1316.uma_scoring.StatName, number>, mainStatBonusMagnitude?: number, relationshipOrangeValue?: number, relationshipGreenValue?: number, relationshipBlueValue?: number, relationshipDiminishingFactor?: number, relationshipEarlyGameBonus?: number, relationshipTrainerSupportBonus?: number, skillHintPerHintScore?: number, skillHintOverrideScore?: number, statWeightWithBars?: number, statWeightWithoutBars?: number, relationshipWeightWithBars?: number, miscWeight?: number, juniorEarlyGameFlatBonus?: number, relationshipScale?: number, rainbowMultiplierEnabled?: number, rainbowMultiplierDisabled?: number, rainbowPerInstanceBase?: number, rainbowPerInstanceDecay?: number, anticipatoryMinFillPercent?: number, anticipatoryCoefficient?: number, anticipatoryCap?: number): com.steve1316.uma_scoring.TrainingScoringConstants;
        toString(): string;
        hashCode(): number;
        equals(other: Nullable<any>): boolean;
    }
    /** @deprecated $metadata$ is used for internal purposes, please don't use it in your code, because it can be removed at any moment */
    namespace TrainingScoringConstants.$metadata$ {
        const constructor: abstract new () => TrainingScoringConstants;
    }
}
export as namespace com_steve1316_uma_scoring_scoring_shared;