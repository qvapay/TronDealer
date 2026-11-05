import {
	InstrumentSans_400Regular,
	InstrumentSans_500Medium,
	InstrumentSans_600SemiBold,
} from '@expo-google-fonts/instrument-sans'
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useFonts } from 'expo-font'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { View } from 'react-native'

import { SessionProvider, useSession } from '../auth/session'
import { AppLock } from '../components/app-lock'
import { initPush, onNotificationClick } from '../lib/push'
import { colors } from '../theme/tokens'

SplashScreen.preventAutoHideAsync()
initPush()

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { retry: 1, refetchOnWindowFocus: false },
	},
})

function AuthGate({ fontsLoaded }: { fontsLoaded: boolean }) {
	const { session, loading } = useSession()
	const segments = useSegments()
	const router = useRouter()

	const ready = fontsLoaded && !loading

	// Tapping a deposit push opens the tx detail (payload from the backend push cron).
	useEffect(() => {
		return onNotificationClick((data) => {
			if (data.type === 'tx' && data.tx_hash) {
				router.push({
					pathname: '/tx/[hash]',
					params: {
						hash: data.tx_hash,
						network: data.network ?? '',
						asset: data.asset ?? '',
						amount: data.amount ?? '',
						status: data.status ?? '',
						created_at: '',
						wallet_address: data.wallet_address ?? '',
						wallet_label: data.wallet_label ?? '',
					},
				})
			}
		})
	}, [router])

	useEffect(() => {
		if (!ready) return
		SplashScreen.hideAsync()
		const onAuthScreen = segments[0] === 'login' || segments[0] === 'register'
		if (!session && !onAuthScreen) router.replace('/login')
		if (session && onAuthScreen) router.replace('/')
	}, [ready, session, segments, router])

	if (!ready) return <View style={{ flex: 1, backgroundColor: colors.ink0 }} />

	return (
		<AppLock>
			<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ink0 } }}>
				<Stack.Screen name="(tabs)" />
				<Stack.Screen name="login" />
				<Stack.Screen name="register" />
				<Stack.Screen name="charge" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
			</Stack>
		</AppLock>
	)
}

export default function RootLayout() {
	const [fontsLoaded] = useFonts({
		'Archivo-Expanded-SemiBold': require('../../assets/fonts/Archivo_Expanded-SemiBold.ttf'),
		'Archivo-Expanded-Bold': require('../../assets/fonts/Archivo_Expanded-Bold.ttf'),
		InstrumentSans_400Regular,
		InstrumentSans_500Medium,
		InstrumentSans_600SemiBold,
		IBMPlexMono_400Regular,
		IBMPlexMono_500Medium,
		IBMPlexMono_600SemiBold,
	})

	return (
		<QueryClientProvider client={queryClient}>
			<SessionProvider>
				<StatusBar style="light" />
				<AuthGate fontsLoaded={fontsLoaded} />
			</SessionProvider>
		</QueryClientProvider>
	)
}
