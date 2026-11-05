const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://trondealer.com'

let currentApiKey: string | null = null

export function setApiKey(key: string | null) {
	currentApiKey = key
}

export class ApiError extends Error {
	status: number
	constructor(message: string, status: number) {
		super(message)
		this.status = status
	}
}

type ApiOptions = {
	method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
	body?: unknown
	auth?: boolean
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
	const { method = 'GET', body, auth = true } = opts
	const headers: Record<string, string> = { 'Content-Type': 'application/json' }
	if (auth) {
		if (!currentApiKey) throw new ApiError('No hay sesión', 401)
		headers['x-api-key'] = currentApiKey
	}
	const res = await fetch(`${BASE_URL}${path}`, {
		method,
		headers,
		body: body !== undefined ? JSON.stringify(body) : undefined,
	})
	let json: any = null
	try {
		json = await res.json()
	} catch {
		// non-JSON body (e.g. HTML error page)
	}
	if (!res.ok || json?.error) {
		const message = typeof json?.error === 'string' ? json.error : json?.error?.message ?? `Error ${res.status}`
		throw new ApiError(message, res.status)
	}
	return json as T
}

// Chain path helper: EVM is the un-prefixed clients/me family; the rest are prefixed.
export type Chain = 'evm' | 'tron' | 'sol' | 'sui' | 'btc' | 'ltc' | 'ton'
export const CHAINS: Chain[] = ['evm', 'tron', 'sol', 'sui', 'btc', 'ltc', 'ton']

export function mePath(chain: Chain, resource: string): string {
	return chain === 'evm' ? `/api/v2/clients/me/${resource}` : `/api/v2/clients/me/${chain}/${resource}`
}
