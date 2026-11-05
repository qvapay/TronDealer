import { Stack } from 'expo-router'

import { colors } from '../../theme/tokens'

export const unstable_settings = { initialRouteName: 'index' }

export default function ChargeLayout() {
	return (
		<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ink0 } }}>
			<Stack.Screen name="index" />
			<Stack.Screen name="qr" />
			<Stack.Screen name="paid" options={{ gestureEnabled: false }} />
		</Stack>
	)
}
