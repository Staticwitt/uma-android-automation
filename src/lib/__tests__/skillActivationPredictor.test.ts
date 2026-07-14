import { predictDeckActivations, predictSkillActivation, type RaceContext } from "../skillActivationPredictor"

// Real conditions from skills.json.
const BUDDING_BLOSSOM = "phase>=2&is_finalcorner_laterhalf==1&order>=3&order_rate<=40@phase>=2&is_finalcorner==1&corner==0&order>=3&order_rate<=40"
const SHOOTING_FOR_VICTORY = "is_finalcorner_laterhalf==1&corner!=0&order>=3&order_rate<=40"
const END_CLOSER_CORNERS = "running_style==4&all_corner_random==1"

const ctx = (over: Partial<RaceContext> = {}): RaceContext => ({
    distanceType: "Sprint",
    runningStyle: "Pace",
    hasFinalCorner: true,
    ...over,
})

describe("predictSkillActivation", () => {
    it("treats an empty condition as always active", () => {
        expect(predictSkillActivation("", ctx()).verdict).toBe("Likely")
    })

    it("marks the Final-Corner accel skills position-dependent for a Pace runner on a cornered sprint", () => {
        // The Leo Cup case: Nishino/Taiki as Pace on Nakayama 1200m — both accels can fire.
        expect(predictSkillActivation(BUDDING_BLOSSOM, ctx({ runningStyle: "Pace" })).verdict).toBe("PositionDependent")
        expect(predictSkillActivation(SHOOTING_FOR_VICTORY, ctx({ runningStyle: "Pace" })).verdict).toBe("PositionDependent")
    })

    it("flags the Final-Corner accels as a style mismatch for a Front runner", () => {
        // order>=3 can never hold for a front-runner, so these accels won't fire — the manual insight, automated.
        expect(predictSkillActivation(BUDDING_BLOSSOM, ctx({ runningStyle: "Front" })).verdict).toBe("StyleMismatch")
        expect(predictSkillActivation(SHOOTING_FOR_VICTORY, ctx({ runningStyle: "Front" })).verdict).toBe("StyleMismatch")
    })

    it("kills a final-corner skill on a straight-only course", () => {
        expect(predictSkillActivation(SHOOTING_FOR_VICTORY, ctx({ runningStyle: "Pace", hasFinalCorner: false })).verdict).toBe("Dead")
    })

    it("kills a wrong-distance skill", () => {
        // distance_type==1 is Sprint-only; in a Long race it can never fire.
        expect(predictSkillActivation("distance_type==1", ctx({ distanceType: "Long" })).verdict).toBe("Dead")
        expect(predictSkillActivation("distance_type==1", ctx({ distanceType: "Sprint" })).verdict).toBe("Likely")
    })

    it("matches an End-style skill only for an End runner", () => {
        expect(predictSkillActivation(END_CLOSER_CORNERS, ctx({ runningStyle: "End" })).verdict).toBe("PositionDependent")
        expect(predictSkillActivation(END_CLOSER_CORNERS, ctx({ runningStyle: "Front" })).verdict).toBe("StyleMismatch")
    })

    it("uses the best OR-alternative when one path is blocked", () => {
        // First group needs a corner (dead on a straight), second group is style-only order gating.
        const cond = "is_finalcorner==1&order>=3@order>=3&order_rate<=40"
        // On a straight course for a Pace runner: group 1 dead, group 2 position-dependent -> best is PositionDependent.
        expect(predictSkillActivation(cond, ctx({ runningStyle: "Pace", hasFinalCorner: false })).verdict).toBe("PositionDependent")
    })

    it("treats unknown/dynamic-only conditions as position-dependent, never dead", () => {
        expect(predictSkillActivation("hp_per<=30&is_lastspurt==1", ctx()).verdict).toBe("PositionDependent")
    })

    it("treats a pure phase gate as likely (all phases are reached)", () => {
        expect(predictSkillActivation("phase>=2", ctx()).verdict).toBe("Likely")
    })
})

describe("predictDeckActivations", () => {
    it("sorts firing skills to the top and dead/mismatched to the bottom", () => {
        const skills = [
            { id: 1, name: "Straight Sprint", condition: "distance_type==1" },
            { id: 2, name: "Budding Blossom", condition: BUDDING_BLOSSOM },
            { id: 3, name: "Wrong Distance", condition: "distance_type==4" },
            { id: 4, name: "End Only", condition: END_CLOSER_CORNERS },
        ]
        const result = predictDeckActivations(skills, ctx({ distanceType: "Sprint", runningStyle: "Pace" }))
        // Likely (Straight Sprint) first, Dead (Wrong Distance) last.
        expect(result[0].name).toBe("Straight Sprint")
        expect(result[0].verdict).toBe("Likely")
        expect(result[result.length - 1].verdict).toBe("Dead")
        expect(result[result.length - 1].name).toBe("Wrong Distance")
    })
})
