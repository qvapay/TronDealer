import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native'

import { useSession } from '../auth/session'
import { authenticateBiometric, isLockEnabled } from '../lib/biometrics'
import { t } from '../i18n'
import { colors, fonts, radius } from '../theme/tokens'
import { LogoTron } from './icons'

// Biometric app lock. Rendered as an overlay ON TOP of the app (never
// unmounting the navigator, so navigation state survives the lock). Re-arms
// whenever the app goes to background while enabled and a session exists.
export function AppLock({ children }: { children: ReactNode }) {
	const { session } = useSession()
	const [locked, setLocked] = useState(false)
	const enabledRef = useRef(false)

	const tryUnlock = useCallback(async () => {
		const ok = await authenticateBiometric(t('lock.prompt'))
		if (ok) setLocked(false)
	}, [])

	// Initial arm on cold start.
	useEffect(() => {
		if (!session) {
			setLocked(false)
			return
		}
		isLockEnabled().then((enabled) => {
			enabledRef.current = enabled
			if (enabled) setLocked(true)
		})
	}, [session?.clientId])

	// Re-arm on background; refresh the preference on foreground.
	useEffect(() => {
		const sub = AppState.addEventListener('change', (state) => {
			if (state === 'background' && enabledRef.current && session) setLocked(true)
			if (state === 'active') isLockEnabled().then((v) => (enabledRef.current = v))
		})
		return () => sub.remove()
	}, [session])

	// Auto-prompt as soon as the lock shows.
	useEffect(() => {
		if (locked) tryUnlock()
	}, [locked, tryUnlock])

	return (
		<View style={{ flex: 1 }}>
			{children}
			{locked && session ? (
				<View style={styles.overlay}>
					<LogoTron size={64} />
					<Text style={styles.title}>{session.name || 'TronDealer'}</Text>
					<Pressable onPress={tryUnlock} style={styles.button}>
						<Text style={styles.buttonText}>{t('lock.unlock')}</Text>
					</Pressable>
				</View>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	overlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: colors.ink0,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 18,
	},
	title: { fontFamily: 'Archivo-Expanded-SemiBold', fontSize: 17, color: colors.bone },
	button: {
		height: 48,
		paddingHorizontal: 28,
		backgroundColor: colors.signal,
		borderRadius: radius.card,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 10,
	},
	buttonText: { fontFamily: fonts.disp, fontSize: 14, color: colors.bone },
})
