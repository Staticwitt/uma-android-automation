import { NativeModules } from "react-native"

/** Clears the saved multi-run resume checkpoint so the next bot start begins the breeding plan at generation 1. */
export const clearParentFarmingSessionState = async (): Promise<void> => {
    await NativeModules.StartModule.clearParentFarmingSessionState()
}
