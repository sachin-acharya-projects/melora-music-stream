import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { StatusBar } from "expo-status-bar"
import { useEffect } from "react"
import { StatusBar as RNStatusBar } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { RootNavigator } from "@/navigation/RootNavigator"
import { useAuthStore } from "@/store/authStore"
import { ToastHost } from "@/components/ui/Toast"
import { SongActionSheetProvider } from "@/components/ui/SongActionSheet"

const queryClient = new QueryClient()

export default function App() {
    const loadUser = useAuthStore((s) => s.loadUser)

    useEffect(() => {
        void loadUser()
    }, [loadUser])

    return (
        <QueryClientProvider client={queryClient}>
            <SafeAreaProvider >
                <StatusBar />
                <SongActionSheetProvider>
                    <RootNavigator />
                </SongActionSheetProvider>
                <ToastHost />
            </SafeAreaProvider>
        </QueryClientProvider>
    )
}
