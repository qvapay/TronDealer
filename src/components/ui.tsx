import { ReactNode } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextProps, View, ViewProps } from 'react-native'
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context'

import { colors, fonts, radius } from '../theme/tokens'

// Padding-based safe area. Screens mounted inside the fullScreenModal stack
// (charge/qr opened from Wallets) sometimes read 0 insets from the native
// view; the window metrics captured at app start are the floor.
export function Screen({ children, style, edges }: { children: ReactNode; style?: ViewProps['style']; edges?: ('top' | 'bottom')[] }) {
	const insets = useSafeAreaInsets()
	const initial = initialWindowMetrics?.insets
	const e = edges ?? ['top']
	const top = e.includes('top') ? Math.max(insets.top, initial?.top ?? 0) : 0
	const bottom = e.includes('bottom') ? Math.max(insets.bottom, initial?.bottom ?? 0) : 0
	return <View style={[styles.screen, { paddingTop: top, paddingBottom: bottom }, style]}>{children}</View>
}

export function Eyebrow({ children, style }: { children: ReactNode; style?: TextProps['style'] }) {
	return <Text style={[styles.eyebrow, style]}>{children}</Text>
}

export function Disp({ children, style, bold }: { children: ReactNode; style?: TextProps['style']; bold?: boolean }) {
	return <Text style={[styles.disp, bold && { fontFamily: fonts.dispBold }, style]}>{children}</Text>
}

export function Mono({ children, style }: { children: ReactNode; style?: TextProps['style'] }) {
	return <Text style={[styles.mono, style]}>{children}</Text>
}

export function Body({ children, style }: { children: ReactNode; style?: TextProps['style'] }) {
	return <Text style={[styles.body, style]}>{children}</Text>
}

export function Card({ children, style }: { children: ReactNode; style?: ViewProps['style'] }) {
	return <View style={[styles.card, style]}>{children}</View>
}

export function Chip({ children, active, onPress }: { children: ReactNode; active?: boolean; onPress?: () => void }) {
	return (
		<Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]} hitSlop={6}>
			<Text style={[styles.chipText, active && styles.chipTextActive]}>{children}</Text>
		</Pressable>
	)
}

export function StatusDot({ color, size = 6 }: { color: string; size?: number }) {
	return <View style={{ width: size, height: size, borderRadius: 1, backgroundColor: color }} />
}

export function Button({
	title,
	onPress,
	variant = 'primary',
	loading,
	disabled,
	icon,
}: {
	title: string
	onPress?: () => void
	variant?: 'primary' | 'ghost'
	loading?: boolean
	disabled?: boolean
	icon?: ReactNode
}) {
	const isPrimary = variant === 'primary'
	return (
		<Pressable
			onPress={onPress}
			disabled={disabled || loading}
			style={({ pressed }) => [
				styles.button,
				isPrimary ? styles.buttonPrimary : styles.buttonGhost,
				(disabled || loading) && { opacity: 0.55 },
				pressed && !disabled && (isPrimary ? { backgroundColor: '#C93B40' } : { borderColor: colors.lineHi, backgroundColor: colors.ink2 }),
			]}
		>
			{loading ? (
				<ActivityIndicator color={isPrimary ? colors.bone : colors.boneMid} />
			) : (
				<View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
					{icon}
					<Text style={[styles.buttonText, !isPrimary && { color: colors.bone, fontFamily: fonts.bodySemi, fontSize: 13 }]}>{title}</Text>
				</View>
			)}
		</Pressable>
	)
}

export function Row({ children, style }: { children: ReactNode; style?: ViewProps['style'] }) {
	return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.ink0 },
	eyebrow: {
		fontFamily: fonts.monoMedium,
		fontSize: 10,
		letterSpacing: 1.6,
		textTransform: 'uppercase',
		color: colors.boneLo,
	},
	disp: { fontFamily: fonts.disp, color: colors.bone },
	mono: { fontFamily: fonts.mono, color: colors.boneMid },
	body: { fontFamily: fonts.body, color: colors.boneMid, fontSize: 13 },
	card: {
		backgroundColor: colors.ink1,
		borderWidth: 1,
		borderColor: colors.line,
		borderRadius: radius.card,
	},
	chip: {
		paddingVertical: 7,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: colors.line,
		borderRadius: radius.chip,
		backgroundColor: colors.ink1,
	},
	chipActive: { borderColor: colors.signal },
	chipText: { fontFamily: fonts.mono, fontSize: 11, color: colors.boneMid },
	chipTextActive: { color: colors.bone, fontFamily: fonts.monoSemi },
	button: {
		height: 52,
		borderRadius: radius.card,
		alignItems: 'center',
		justifyContent: 'center',
	},
	buttonPrimary: { backgroundColor: colors.signal },
	buttonGhost: { borderWidth: 1, borderColor: colors.lineHi, height: 48 },
	buttonText: { fontFamily: fonts.disp, fontSize: 15, color: colors.bone },
})
