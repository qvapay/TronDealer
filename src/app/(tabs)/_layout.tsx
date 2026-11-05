import { Tabs, useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { IconGear, IconHome, IconList, IconQr, IconWallet } from '../../components/icons'
import { t } from '../../i18n'
import { colors, fonts, radius } from '../../theme/tokens'

const TABS = [
	{ name: 'index', label: () => t('tabs.home'), Icon: IconHome },
	{ name: 'wallets', label: () => t('tabs.wallets'), Icon: IconWallet },
	{ name: 'activity', label: () => t('tabs.activity'), Icon: IconList },
	{ name: 'settings', label: () => t('tabs.settings'), Icon: IconGear },
] as const

// Minimal shape of the tab-bar props — expo-router vendors its own
// @react-navigation/bottom-tabs types, so we avoid importing either copy.
type TabBarProps = {
	state: { index: number; routes: { name: string; key: string }[] }
	navigation: { navigate: (name: string) => void }
}

function DealerTabBar({ state, navigation }: TabBarProps) {
	const insets = useSafeAreaInsets()
	const router = useRouter()
	const activeRoute = state.routes[state.index]?.name

	function renderTab(tab: (typeof TABS)[number]) {
		const active = activeRoute === tab.name
		const color = active ? colors.bone : colors.boneLo
		return (
			<Pressable key={tab.name} style={styles.tab} onPress={() => navigation.navigate(tab.name)} hitSlop={6}>
				<tab.Icon size={20} color={color} strokeWidth={active ? 1.7 : 1.6} />
				<Text style={[styles.tabLabel, { color }]}>{tab.label()}</Text>
			</Pressable>
		)
	}

	return (
		<View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
			{renderTab(TABS[0])}
			{renderTab(TABS[1])}
			<Pressable style={styles.centerTab} onPress={() => router.push('/charge')} hitSlop={6}>
				<View style={styles.centerButton}>
					<IconQr size={22} color={colors.bone} />
				</View>
				<Text style={[styles.tabLabel, { color: colors.bone }]}>{t('tabs.charge')}</Text>
			</Pressable>
			{renderTab(TABS[2])}
			{renderTab(TABS[3])}
		</View>
	)
}

export default function TabsLayout() {
	return (
		<Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.ink0 } }} tabBar={(props) => <DealerTabBar {...props} />}>
			<Tabs.Screen name="index" />
			<Tabs.Screen name="wallets" />
			<Tabs.Screen name="activity" />
			<Tabs.Screen name="settings" />
		</Tabs>
	)
}

const styles = StyleSheet.create({
	bar: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-around',
		borderTopWidth: 1,
		borderTopColor: colors.line,
		backgroundColor: colors.ink0,
		paddingTop: 10,
		paddingHorizontal: 8,
	},
	tab: { alignItems: 'center', gap: 4, width: 64, minHeight: 44 },
	tabLabel: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 0.9 },
	centerTab: { alignItems: 'center', gap: 4, width: 64, marginTop: -14 },
	centerButton: {
		width: 44,
		height: 44,
		backgroundColor: colors.signal,
		borderRadius: radius.card,
		alignItems: 'center',
		justifyContent: 'center',
	},
})
