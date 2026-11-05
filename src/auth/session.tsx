import * as SecureStore from 'expo-secure-store'
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { api, setApiKey } from '../api/client'
import type { Client } from '../api/hooks'
import { pushLogin, pushLogout } from '../lib/push'

const KEY_API = 'td_api_key'
const KEY_NAME = 'td_client_name'
const KEY_ID = 'td_client_id'

type Session = { clientId: string; name: string }

type SessionContextValue = {
	session: Session | null
	loading: boolean
	login: (apiKey: string) => Promise<Client>
	logout: () => Promise<void>
	updateApiKey: (newKey: string) => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
	const [session, setSession] = useState<Session | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		;(async () => {
			try {
				const [key, name, id] = await Promise.all([
					SecureStore.getItemAsync(KEY_API),
					SecureStore.getItemAsync(KEY_NAME),
					SecureStore.getItemAsync(KEY_ID),
				])
				if (key && id) {
					setApiKey(key)
					setSession({ clientId: id, name: name ?? '' })
					pushLogin(id)
				}
			} finally {
				setLoading(false)
			}
		})()
	}, [])

	const login = useCallback(async (apiKey: string) => {
		const trimmed = apiKey.trim()
		setApiKey(trimmed)
		try {
			// Credential check: clients/me accepts x-api-key directly — no cookie needed.
			const { client } = await api<{ client: Client }>('/api/v2/clients/me')
			await Promise.all([
				SecureStore.setItemAsync(KEY_API, trimmed),
				SecureStore.setItemAsync(KEY_NAME, client.name ?? ''),
				SecureStore.setItemAsync(KEY_ID, client.id),
			])
			setSession({ clientId: client.id, name: client.name ?? '' })
			pushLogin(client.id)
			return client
		} catch (e) {
			setApiKey(null)
			throw e
		}
	}, [])

	const logout = useCallback(async () => {
		await Promise.all([
			SecureStore.deleteItemAsync(KEY_API),
			SecureStore.deleteItemAsync(KEY_NAME),
			SecureStore.deleteItemAsync(KEY_ID),
		])
		setApiKey(null)
		setSession(null)
		pushLogout()
	}, [])

	// After a key rotation: swap the credential in place, session stays alive.
	const updateApiKey = useCallback(async (newKey: string) => {
		setApiKey(newKey)
		await SecureStore.setItemAsync(KEY_API, newKey)
	}, [])

	const value = useMemo(
		() => ({ session, loading, login, logout, updateApiKey }),
		[session, loading, login, logout, updateApiKey],
	)
	return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
	const ctx = useContext(SessionContext)
	if (!ctx) throw new Error('useSession must be used within SessionProvider')
	return ctx
}
