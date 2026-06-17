import type { ComponentType } from "react"

/** React Navigation `getComponent` helper — defers `require()` until the route is first mounted. */
export function lazyGetComponent<P extends object>(loader: () => ComponentType<P>): () => ComponentType<P> {
    let Resolved: ComponentType<P> | null = null
    return () => {
        if (!Resolved) {
            Resolved = loader()
        }
        return Resolved
    }
}
