import React from "react"
import { StyleSheet, Text, View } from "react-native"
import CustomButton from "../CustomButton"
import { recordJsErrorReport } from "../../context/ErrorReportContext"

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
}

/**
 * Top-level error boundary that catches uncaught render-time exceptions anywhere in the app,
 * records them into the in-app error report log, and shows a recoverable fallback screen instead
 * of a blank app. Uses static colors rather than `useTheme` since the crash that triggered this
 * boundary could itself originate from theme context.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false, error: null }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, info: React.ErrorInfo): void {
        recordJsErrorReport("js-crash", error.message, error.stack ?? info.componentStack ?? undefined)
    }

    handleReset = (): void => {
        this.setState({ hasError: false, error: null })
    }

    render(): React.ReactNode {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <Text style={styles.title}>Something went wrong</Text>
                    <Text style={styles.message}>{this.state.error?.message}</Text>
                    <CustomButton variant="primary" onPress={this.handleReset}>
                        Try Again
                    </CustomButton>
                </View>
            )
        }
        return this.props.children
    }
}

export default ErrorBoundary

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16, backgroundColor: "#111111" },
    title: { fontSize: 20, fontWeight: "700", color: "#ffffff" },
    message: { fontSize: 14, color: "#cccccc", textAlign: "center" },
})
