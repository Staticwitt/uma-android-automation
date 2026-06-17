import { NavigationContainer } from "@react-navigation/native"
import { createDrawerNavigator } from "@react-navigation/drawer"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { useCallback } from "react"
import { LogBox } from "react-native"
import { PortalHost } from "@rn-primitives/portal"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context"
import { useFonts, Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold } from "@expo-google-fonts/geist"
import { GeistMono_400Regular, GeistMono_500Medium } from "@expo-google-fonts/geist-mono"
import { BotStateProvider } from "./context/BotStateContext"
import { MessageLogProvider } from "./context/MessageLogContext"
import { SettingsProvider } from "./context/SettingsContext"
import { ThemeProvider, useTheme } from "./context/ThemeContext"
import { ToastProvider } from "./context/ToastContext"
import { SearchProvider } from "./context/SearchRegistryContext"
import { ProfileProvider } from "./context/ProfileContext"
import { useBootstrap } from "./hooks/useBootstrap"
import { lazyGetComponent } from "./navigation/lazyScreens"
import Home from "./pages/Home"
import Settings from "./pages/Settings"
import DrawerContent from "./components/DrawerContent"
import { NAV_THEME } from "./lib/navTheme"

export const Tag = "UAA"

const Drawer = createDrawerNavigator()
const Stack = createNativeStackNavigator()

// Suppress deprecation warning from nativewind's transitive dependency
// (react-native-css-interop registers RN's deprecated SafeAreaView via cssInterop).
// Our own code uses SafeAreaView from react-native-safe-area-context.
LogBox.ignoreLogs(["SafeAreaView has been deprecated"])

/**
 * Stack navigator for Settings and all sub-pages.
 * This enables proper back button navigation that respects the navigation history.
 */
function SettingsStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false, freezeOnBlur: true }}>
            <Stack.Screen name="SettingsMain" component={Settings} />
            <Stack.Screen name="TrainingLanding" getComponent={lazyGetComponent(() => require("./pages/TrainingLanding").default)} />
            <Stack.Screen name="RacingLanding" getComponent={lazyGetComponent(() => require("./pages/RacingLanding").default)} />
            <Stack.Screen name="TrainingSettings" getComponent={lazyGetComponent(() => require("./pages/TrainingSettings").default)} />
            <Stack.Screen name="TrainingEventSettings" getComponent={lazyGetComponent(() => require("./pages/TrainingEventSettings").default)} />
            <Stack.Screen name="RacingSettings" getComponent={lazyGetComponent(() => require("./pages/RacingSettings").default)} />
            <Stack.Screen name="ParentFarmingSettings" getComponent={lazyGetComponent(() => require("./pages/ParentFarmingSettings").default)} />
            <Stack.Screen name="SmartRaceSolverSettings" getComponent={lazyGetComponent(() => require("./pages/SmartRaceSolverSettings").default)} />
            <Stack.Screen name="Skills" getComponent={lazyGetComponent(() => require("./pages/Skills").default)} initialParams={{ tab: "skillPointCheck" }} />
            <Stack.Screen name="EventLogVisualizer" getComponent={lazyGetComponent(() => require("./pages/EventLogVisualizer").default)} />
            <Stack.Screen name="ImportSettingsPreview" getComponent={lazyGetComponent(() => require("./pages/ImportSettingsPreview").default)} />
            <Stack.Screen name="ScenarioOverridesSettings" getComponent={lazyGetComponent(() => require("./pages/ScenarioOverridesSettings").default)} />
            <Stack.Screen name="DebugSettings" getComponent={lazyGetComponent(() => require("./pages/DebugSettings").default)} />
            <Stack.Screen name="DiscordSettings" getComponent={lazyGetComponent(() => require("./pages/DiscordSettings").default)} />
            <Stack.Screen name="LLMSettings" getComponent={lazyGetComponent(() => require("./pages/LLMSettings").default)} />
        </Stack.Navigator>
    )
}

function MainDrawer() {
    const { colors } = useTheme()

    // Stabilize the drawerContent callback to prevent unnecessary remounts.
    const renderDrawerContent = useCallback((props: any) => <DrawerContent {...props} />, [])

    return (
        <Drawer.Navigator
            drawerContent={renderDrawerContent}
            screenOptions={{
                headerShown: false,
                drawerType: "front",
                swipeEdgeWidth: 0,
                drawerStyle: {
                    width: 280,
                    backgroundColor: colors.card,
                },
                drawerActiveTintColor: colors.primary,
                drawerInactiveTintColor: colors.foreground,
                overlayColor: colors.glassBackdrop,
            }}
        >
            <Drawer.Screen name="Home" component={Home} />
            <Drawer.Screen name="Settings" component={SettingsStack} />
            <Drawer.Screen name="Chat" getComponent={lazyGetComponent(() => require("./pages/Chat").default)} />
        </Drawer.Navigator>
    )
}

function AppWithBootstrap({ theme, colors }: { theme: string; colors: any }) {
    // Initialize app with bootstrap logic.
    useBootstrap()

    return (
        <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
            <NavigationContainer theme={NAV_THEME[theme as "light" | "dark"]}>
                <StatusBar style={theme === "light" ? "dark" : "light"} />
                <MainDrawer />
                <PortalHost />
            </NavigationContainer>
        </SafeAreaView>
    )
}

function AppContent() {
    const { theme, colors } = useTheme()

    return (
        <SearchProvider>
            <BotStateProvider>
                <ProfileProvider>
                    <MessageLogProvider>
                        <SettingsProvider>
                            <ToastProvider>
                                <AppWithBootstrap theme={theme} colors={colors} />
                            </ToastProvider>
                        </SettingsProvider>
                    </MessageLogProvider>
                </ProfileProvider>
            </BotStateProvider>
        </SearchProvider>
    )
}

function App() {
    // Wait for Geist + Geist Mono to load before rendering navigation so the first paint uses the brand fonts. The OS splash covers this window.
    const [fontsLoaded] = useFonts({
        Geist_400Regular,
        Geist_500Medium,
        Geist_600SemiBold,
        Geist_700Bold,
        GeistMono_400Regular,
        GeistMono_500Medium,
    })

    if (!fontsLoaded) return null

    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <AppContent />
            </ThemeProvider>
        </SafeAreaProvider>
    )
}

export default App
