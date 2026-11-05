import * as Clipboard from 'expo-clipboard'
import { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { t } from '../i18n'
import { colors, fonts, radius } from '../theme/tokens'
import { Body, Button, Disp } from './ui'

// Generic dark edit sheet — Android has no Alert.prompt, so every editable
// setting goes through this modal. onSave may throw: the error shows inline
// (in pending amber — signal red is brand-only) and the sheet stays open.
export type EditSheetConfig = {
	title: string
	hint?: string
	initial: string
	placeholder?: string
	keyboardType?: 'default' | 'number-pad' | 'url' | 'email-address'
	secure?: boolean
	allowClear?: boolean
	onSave: (value: string) => Promise<void>
}

export function EditSheet({ config, onClose }: { config: EditSheetConfig | null; onClose: () => void }) {

	const [value, setValue] = useState('')
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (config) {
			setValue(config.initial)
			setError(null)
			setBusy(false)
		}
	}, [config])

	if (!config) return null

	async function save(v: string) {
		setBusy(true)
		setError(null)
		try {
			await config!.onSave(v.trim())
			onClose()
		} catch (e: any) {
			setError(e?.message ?? t('common.error'))
		} finally {
			setBusy(false)
		}
	}

	async function paste() {
		const text = await Clipboard.getStringAsync()
		if (text) setValue(text.trim())
	}

	return (
		<Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="fade" onRequestClose={onClose}>
			<KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
				<Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
				<View style={styles.sheet}>
					<Disp style={{ fontSize: 17, fontFamily: undefined }}>{config.title}</Disp>
					{config.hint ? <Body style={styles.hint}>{config.hint}</Body> : null}
					<View style={styles.inputRow}>
						<TextInput
							value={value}
							onChangeText={(v) => {
								setValue(v)
								setError(null)
							}}
							placeholder={config.placeholder}
							placeholderTextColor={colors.boneLo}
							keyboardType={config.keyboardType ?? 'default'}
							autoCapitalize="none"
							autoCorrect={false}
							secureTextEntry={config.secure}
							autoFocus
							style={styles.input}
							onSubmitEditing={() => save(value)}
						/>
						<Pressable onPress={paste} style={styles.pasteBtn} hitSlop={8}>
							<Text style={styles.pasteText}>{t('login.paste')}</Text>
						</Pressable>
					</View>
					{error ? <Body style={styles.error}>{error}</Body> : null}
					<Button title={t('common.save')} onPress={() => save(value)} loading={busy} />
					{config.allowClear ? (
						<Pressable onPress={() => save('')} disabled={busy} style={styles.clearBtn} hitSlop={8}>
							<Text style={styles.clearText}>{t('common.clear')}</Text>
						</Pressable>
					) : null}
				</View>
			</KeyboardAvoidingView>
		</Modal>
	)
}

const styles = StyleSheet.create({
	backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(12, 12, 11, 0.82)' },
	sheet: {
		backgroundColor: colors.ink1,
		borderTopWidth: 1,
		borderColor: colors.line,
		borderTopLeftRadius: radius.panel,
		borderTopRightRadius: radius.panel,
		padding: 20,
		paddingBottom: 34,
		gap: 12,
	},
	hint: { fontSize: 12, color: colors.boneLo, lineHeight: 17 },
	inputRow: { flexDirection: 'row', gap: 10 },
	input: {
		flex: 1,
		height: 50,
		backgroundColor: colors.ink0,
		borderWidth: 1,
		borderColor: colors.line,
		borderRadius: radius.card,
		paddingHorizontal: 14,
		color: colors.bone,
		fontFamily: fonts.mono,
		fontSize: 13,
	},
	pasteBtn: {
		height: 50,
		paddingHorizontal: 14,
		borderWidth: 1,
		borderColor: colors.lineHi,
		borderRadius: radius.card,
		alignItems: 'center',
		justifyContent: 'center',
	},
	pasteText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.bone },
	error: { color: colors.pending, fontSize: 12 },
	clearBtn: { alignItems: 'center', paddingVertical: 8 },
	clearText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.boneLo },
})
