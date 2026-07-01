import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { MessageLogDataContext } from "./MessageLogContext"
import { databaseManager } from "../lib/database"

/** Where a captured error report originated from. */
export type ErrorReportSource = "js-crash" | "js-rejection" | "native-error" | "native-warning"

/** A single captured error/crash/warning entry shown in the Error Reports tab. */
export interface ErrorReportEntry {
    /** Stable identifier, unique across the session. */
    id: string
    /** When the entry was captured, in epoch milliseconds. */
    timestamp: number
    /** Where the entry originated from. */
    source: ErrorReportSource
    /** The error/warning message text. */
    message: string
    /** Optional stack trace, when available (JS-side only). */
    stack?: string
}

interface ErrorReportContextValue {
    /** All captured error reports, oldest first. */
    errors: ErrorReportEntry[]
    /** Clears the in-memory and persisted error report log. */
    clearErrors: () => void
}

const ERROR_REPORTS_CATEGORY = "misc"
const ERROR_REPORTS_KEY = "errorReports"
/** Caps how many entries are kept in memory/storage so a crash loop can't grow this unbounded. */
const MAX_STORED_ERRORS = 200

export const ErrorReportContext = createContext<ErrorReportContextValue>({} as ErrorReportContextValue)

type Listener = (entry: ErrorReportEntry) => void
// Module-level (not React state) so non-React code, e.g. the ErrorBoundary class component and the
// global ErrorUtils handler, can record entries without needing to live under the provider.
const listeners = new Set<Listener>()

let nextId = 0
function makeId(): string {
    nextId += 1
    return `err-${Date.now()}-${nextId}`
}

/**
 * Records a JS-side error/rejection report. Safe to call from anywhere, including class component
 * lifecycle methods and global exception handlers, since it does not depend on React context.
 * @param source Where the error originated from.
 * @param message The error message text.
 * @param stack Optional stack trace.
 */
export function recordJsErrorReport(source: "js-crash" | "js-rejection", message: string, stack?: string): void {
    const entry: ErrorReportEntry = { id: makeId(), timestamp: Date.now(), source, message, stack }
    listeners.forEach((listener) => listener(entry))
}

let globalHandlerInstalled = false

/**
 * Installs a global handler for uncaught JS exceptions via React Native's `ErrorUtils`, forwarding
 * them into the error report log while still invoking the original handler (e.g. the dev RedBox).
 */
function installGlobalErrorHandler(): void {
    if (globalHandlerInstalled) return
    globalHandlerInstalled = true

    const errorUtils = (global as any).ErrorUtils
    if (!errorUtils?.setGlobalHandler) return

    const originalHandler = errorUtils.getGlobalHandler?.()
    errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        recordJsErrorReport("js-crash", error?.message || String(error), error?.stack)
        originalHandler?.(error, isFatal)
    })
}

/**
 * Provider for the in-app error report log. Captures three independent sources into one list:
 * uncaught JS exceptions/rejections (via `ErrorUtils` and `recordJsErrorReport`), React render
 * crashes (via `ErrorBoundary` calling `recordJsErrorReport`), and native `[ERROR]`/`[WARNING]`
 * lines already streamed into the message log from the Kotlin bot service. Persists to SQLite so
 * the log survives app restarts.
 * @param children The child components to render within the provider.
 */
export const ErrorReportProvider = ({ children }: { children: React.ReactNode }): React.ReactElement => {
    const [errors, setErrors] = useState<ErrorReportEntry[]>([])
    const mlc = useContext(MessageLogDataContext)
    const lastSeenLogId = useRef(-1)
    const hydrated = useRef(false)

    // Hydrate persisted errors once on mount.
    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const stored = await databaseManager.loadSetting(ERROR_REPORTS_CATEGORY, ERROR_REPORTS_KEY)
                if (cancelled) return
                if (Array.isArray(stored)) {
                    setErrors(stored as ErrorReportEntry[])
                }
            } catch {
                // Best-effort hydrate. A missing row is normal on first launch.
            } finally {
                hydrated.current = true
            }
        })()
        return () => {
            cancelled = true
        }
    }, [])

    // Subscribe to JS crash/rejection reports recorded via the module-level listener set.
    useEffect(() => {
        installGlobalErrorHandler()
        const listener: Listener = (entry) => {
            setErrors((prev) => [...prev, entry].slice(-MAX_STORED_ERRORS))
        }
        listeners.add(listener)
        return () => {
            listeners.delete(listener)
        }
    }, [])

    // Capture unhandled promise rejections, when the runtime exposes the web-style event target.
    useEffect(() => {
        const handler = (event: any) => {
            const reason = event?.reason ?? event
            recordJsErrorReport("js-rejection", reason?.message || String(reason), reason?.stack)
        }
        const g = global as any
        if (typeof g.addEventListener !== "function") return undefined
        g.addEventListener("unhandledrejection", handler)
        return () => g.removeEventListener("unhandledrejection", handler)
    }, [])

    // Mirror native [ERROR]/[WARNING] log lines from the bot service into the same report list.
    useEffect(() => {
        const newEntries: ErrorReportEntry[] = []
        let maxId = lastSeenLogId.current
        for (const entry of mlc.messageLog) {
            if (entry.id <= lastSeenLogId.current) continue
            if (entry.id > maxId) maxId = entry.id
            if (entry.message.includes("[ERROR]")) {
                newEntries.push({ id: `native-${entry.id}`, timestamp: Date.now(), source: "native-error", message: entry.message })
            } else if (entry.message.includes("[WARNING]") || entry.message.includes("[WARN]")) {
                newEntries.push({ id: `native-${entry.id}`, timestamp: Date.now(), source: "native-warning", message: entry.message })
            }
        }
        lastSeenLogId.current = maxId
        if (newEntries.length > 0) {
            setErrors((prev) => [...prev, ...newEntries].slice(-MAX_STORED_ERRORS))
        }
    }, [mlc.messageLog])

    // Persist to SQLite shortly after the list settles, mirroring the debounce pattern used for the message log's settings banner.
    useEffect(() => {
        if (!hydrated.current) return
        const timer = setTimeout(() => {
            databaseManager.saveSetting(ERROR_REPORTS_CATEGORY, ERROR_REPORTS_KEY, errors, true).catch(() => {})
        }, 250)
        return () => clearTimeout(timer)
    }, [errors])

    const clearErrors = useCallback(() => {
        setErrors([])
        databaseManager.saveSetting(ERROR_REPORTS_CATEGORY, ERROR_REPORTS_KEY, [], true).catch(() => {})
    }, [])

    const value = useMemo<ErrorReportContextValue>(() => ({ errors, clearErrors }), [errors, clearErrors])

    return <ErrorReportContext.Provider value={value}>{children}</ErrorReportContext.Provider>
}

/**
 * Hook for reading and clearing the in-app error report log.
 * @returns The current error reports and a function to clear them.
 */
export function useErrorReports(): ErrorReportContextValue {
    return useContext(ErrorReportContext)
}
