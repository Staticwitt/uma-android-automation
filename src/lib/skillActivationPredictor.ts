/**
 * Skill activation predictor.
 *
 * Every skill in `skills.json` carries an activation `condition` string (e.g.
 * `phase>=2&is_finalcorner_laterhalf==1&order>=3&order_rate<=40`). This module parses those conditions
 * and predicts, for a given race, which of a trainee's skills will actually be able to fire — flagging
 * the ones that are dead on the track (wrong distance, no final corner) or that your running style can
 * never reach the position for (e.g. a "3rd–4th at the final corner" accel on a front-runner). It
 * automates the by-hand analysis a player does when choosing skills for a Champions Meeting.
 *
 * ## Grammar
 * `A&B` = A and B; `A@B` = A or B (alternatives). Each atom is `key op value` where op ∈
 * `>= <= == != > <`. A skill fires if any OR-group is satisfiable.
 *
 * ## Honesty
 * This is a static reachability check, not a race simulator. Truly dynamic conditions (HP, remaining
 * distance, being blocked, overtakes…) can't be predicted, so a skill gated only on those is reported
 * as position/state-dependent rather than guaranteed. What it CAN state confidently is the negative:
 * a condition the track/distance/running-style makes impossible means the skill will never fire.
 */

/** Running styles, matching the game's `running_style` encoding 1..4. */
export type RunningStyle = "Front" | "Pace" | "Late" | "End"

/** Distance categories, matching the game's `distance_type` encoding 1..4. */
export type DistanceType = "Sprint" | "Mile" | "Medium" | "Long"

/** The static facts about a race that let us reason about a skill's condition. */
export interface RaceContext {
    /** Distance category of the race. */
    distanceType: DistanceType
    /** The trainee's running style for the race. */
    runningStyle: RunningStyle
    /** Whether the course has a final corner. False only for straight-only courses (e.g. Niigata 1000m). */
    hasFinalCorner: boolean
}

/** The verdict for a single skill in a race context. */
export type ActivationVerdict =
    /** Every condition the track/style can decide is met; only ordinary in-race timing remains. */
    | "Likely"
    /** Reachable, but gated on race position/state (HP, overtakes, being mid-pack) we can't predict. */
    | "PositionDependent"
    /** There is a firing path, but it needs a track position this running style effectively never holds. */
    | "StyleMismatch"
    /** No firing path: the distance/track makes every alternative impossible here. */
    | "Dead"

/** A skill's predicted activation in a race context. */
export interface SkillActivation {
    /** Skill id from `skills.json`. */
    id: number
    /** Skill display name. */
    name: string
    /** The predicted verdict. */
    verdict: ActivationVerdict
    /** Human-readable reason for the verdict. */
    reason: string
}

const RUNNING_STYLE_CODE: Record<RunningStyle, number> = { Front: 1, Pace: 2, Late: 3, End: 4 }
const DISTANCE_TYPE_CODE: Record<DistanceType, number> = { Sprint: 1, Mile: 2, Medium: 3, Long: 4 }

/**
 * Approximate position band each running style holds during a race, used to decide whether a
 * position-gated condition (`order`, `order_rate`) is reachable for that style. `order` is the absolute
 * running position (1 = leader) in a nominal field of ~9; `order_rate` is the position as a percentage
 * (0 = front, 100 = back). These are deliberately rough — they exist to answer "can this style ever be
 * in that spot?", which is a coarse question.
 */
const STYLE_ORDER_BAND: Record<RunningStyle, { lo: number; hi: number }> = {
    Front: { lo: 1, hi: 2 },
    Pace: { lo: 2, hi: 5 },
    Late: { lo: 4, hi: 8 },
    End: { lo: 6, hi: 9 },
}
const STYLE_ORDER_RATE_BAND: Record<RunningStyle, { lo: number; hi: number }> = {
    Front: { lo: 0, hi: 20 },
    Pace: { lo: 15, hi: 50 },
    Late: { lo: 40, hi: 75 },
    End: { lo: 55, hi: 100 },
}

type Op = ">=" | "<=" | "==" | "!=" | ">" | "<"

interface Atom {
    key: string
    op: Op
    value: number
}

/** The race phases every race deterministically passes through: 0 opening, 1 middle, 2 late, 3 last spurt. */
const REACHABLE_PHASES = [0, 1, 2, 3]

const ATOM_RE = /^([a-z_]+)(>=|<=|==|!=|>|<)(-?\d+)$/

/** Parses one atom like `order_rate<=40`, or null when it isn't a recognized `key op value` form. */
const parseAtom = (raw: string): Atom | null => {
    const m = ATOM_RE.exec(raw.trim())
    if (!m) return null
    return { key: m[1], op: m[2] as Op, value: Number(m[3]) }
}

const cmp = (a: number, op: Op, b: number): boolean => {
    switch (op) {
        case ">=":
            return a >= b
        case "<=":
            return a <= b
        case "==":
            return a === b
        case "!=":
            return a !== b
        case ">":
            return a > b
        case "<":
            return a < b
    }
}

/** Whether a band [lo,hi] contains any integer value v with `v op value` true — i.e. the style can reach the position. */
const bandCanSatisfy = (band: { lo: number; hi: number }, op: Op, value: number): boolean => {
    switch (op) {
        case ">=":
            return band.hi >= value
        case ">":
            return band.hi > value
        case "<=":
            return band.lo <= value
        case "<":
            return band.lo < value
        case "==":
            return value >= band.lo && value <= band.hi
        case "!=":
            return !(band.lo === value && band.hi === value)
    }
}

/** Per-atom outcome against the static context. */
type AtomOutcome = "pass" | "block" | "style" | "dynamic"

/** Keys that describe being on/at a corner; a "must be in a corner" atom is impossible when the course has none. */
const CORNER_KEYS = new Set(["is_finalcorner", "is_finalcorner_laterhalf", "is_finalcorner_random", "corner"])

const evalAtom = (atom: Atom, ctx: RaceContext): AtomOutcome => {
    switch (atom.key) {
        case "running_style":
            return cmp(RUNNING_STYLE_CODE[ctx.runningStyle], atom.op, atom.value) ? "pass" : "style"
        case "distance_type":
            return cmp(DISTANCE_TYPE_CODE[ctx.distanceType], atom.op, atom.value) ? "pass" : "block"
        case "order":
            return bandCanSatisfy(STYLE_ORDER_BAND[ctx.runningStyle], atom.op, atom.value) ? "dynamic" : "style"
        case "order_rate":
            return bandCanSatisfy(STYLE_ORDER_RATE_BAND[ctx.runningStyle], atom.op, atom.value) ? "dynamic" : "style"
        case "phase":
            // Every race deterministically passes through phases 0..3, so a pure phase gate is reachable unless it names a phase that never occurs.
            return REACHABLE_PHASES.some((p) => cmp(p, atom.op, atom.value)) ? "pass" : "block"
        default:
            // Corner presence: a "must be at the final corner" atom is impossible on a straight-only course.
            if (CORNER_KEYS.has(atom.key)) {
                const wantsCorner = cmp(1, atom.op, atom.value) && !cmp(0, atom.op, atom.value)
                if (wantsCorner && !ctx.hasFinalCorner) return "block"
                return "dynamic"
            }
            // Everything else (phase, hp, remain_distance, blocked_*, *_random, overtakes…) is in-race state we don't predict.
            return "dynamic"
    }
}

type GroupVerdict = "likely" | "conditional" | "style" | "dead"

/** Evaluates one AND-group (atoms joined by `&`). */
const evalGroup = (group: string, ctx: RaceContext): GroupVerdict => {
    const atoms = group
        .split("&")
        .map((a) => a.trim())
        .filter((a) => a.length > 0)
    let sawStyle = false
    let sawDynamic = false
    for (const raw of atoms) {
        const atom = parseAtom(raw)
        if (!atom) {
            // Unparseable atom: treat as dynamic so we never wrongly declare a skill dead.
            sawDynamic = true
            continue
        }
        const outcome = evalAtom(atom, ctx)
        if (outcome === "block") return "dead"
        if (outcome === "style") sawStyle = true
        if (outcome === "dynamic") sawDynamic = true
    }
    if (sawStyle) return "style"
    if (sawDynamic) return "conditional"
    return "likely"
}

const GROUP_RANK: Record<GroupVerdict, number> = { likely: 3, conditional: 2, style: 1, dead: 0 }
const VERDICT_FOR_GROUP: Record<GroupVerdict, ActivationVerdict> = {
    likely: "Likely",
    conditional: "PositionDependent",
    style: "StyleMismatch",
    dead: "Dead",
}

const REASON: Record<ActivationVerdict, (ctx: RaceContext) => string> = {
    Likely: () => "Track and running style meet every static condition; fires on ordinary race timing.",
    PositionDependent: () => "Reachable, but gated on in-race state (position, HP, overtakes) that can't be predicted up front.",
    StyleMismatch: (ctx) => `Needs a track position a ${ctx.runningStyle} runner effectively never holds, so it will rarely fire.`,
    Dead: (ctx) => `No firing path on a ${ctx.distanceType}${ctx.hasFinalCorner ? "" : " straight-only"} course — the condition is impossible here.`,
}

/**
 * Predicts whether a single skill condition can fire in a race context.
 *
 * @param condition The raw `condition` string from `skills.json`. An empty/absent condition means the skill has no gate and always applies.
 * @param ctx The race's static facts.
 * @returns The verdict and a human-readable reason.
 */
export function predictSkillActivation(condition: string, ctx: RaceContext): { verdict: ActivationVerdict; reason: string } {
    const trimmed = condition.trim()
    if (trimmed.length === 0) {
        return { verdict: "Likely", reason: "Unconditional skill; always active." }
    }
    const groups = trimmed
        .split("@")
        .map((g) => g.trim())
        .filter((g) => g.length > 0)
    // A skill fires if ANY alternative fires, so take the best group.
    let best: GroupVerdict = "dead"
    for (const group of groups) {
        const gv = evalGroup(group, ctx)
        if (GROUP_RANK[gv] > GROUP_RANK[best]) best = gv
    }
    const verdict = VERDICT_FOR_GROUP[best]
    return { verdict, reason: REASON[verdict](ctx) }
}

/**
 * Predicts activation for a list of skills in a race context, most-firing-first, so dead and
 * style-mismatched skills sort to the bottom where they're easy to spot.
 *
 * @param skills The skills to evaluate (id, name, and their `condition`).
 * @param ctx The race's static facts.
 * @returns Per-skill activation verdicts, ordered Likely → PositionDependent → StyleMismatch → Dead.
 */
export function predictDeckActivations(skills: { id: number; name: string; condition: string }[], ctx: RaceContext): SkillActivation[] {
    const order: Record<ActivationVerdict, number> = { Likely: 0, PositionDependent: 1, StyleMismatch: 2, Dead: 3 }
    return skills
        .map(({ id, name, condition }) => {
            const { verdict, reason } = predictSkillActivation(condition, ctx)
            return { id, name, verdict, reason }
        })
        .sort((a, b) => order[a.verdict] - order[b.verdict] || a.name.localeCompare(b.name))
}
