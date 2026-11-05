// Upload an AAB to Google Play and roll it to a track. Zero dependencies:
// service-account JWT → OAuth token → Android Publisher v3 edits flow.
// usage: node scripts/play-upload.mjs dist/1.1.5/app-release.aab [production|internal|alpha|beta]
import { createSign } from 'node:crypto'
import { readFileSync } from 'node:fs'

const [aabPath, track = 'production'] = process.argv.slice(2)
if (!aabPath) { console.error('usage: play-upload.mjs <aab> [track]'); process.exit(1) }
const sa = JSON.parse(readFileSync(process.env.PLAY_SERVICE_ACCOUNT_JSON, 'utf8'))
const pkg = JSON.parse(readFileSync('app.json', 'utf8')).expo.android.package
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')

async function accessToken() {
	const now = Math.floor(Date.now() / 1000)
	const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: sa.token_uri, iat: now, exp: now + 3600 })}`
	const sig = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url')
	const res = await fetch(sa.token_uri, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }) })
	if (!res.ok) throw new Error(`token: ${res.status} ${await res.text()}`)
	return (await res.json()).access_token
}

const token = await accessToken()
const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${pkg}`
const api = async (path, init = {}, upload = false) => {
	const url = (upload ? base.replace('androidpublisher/v3', 'upload/androidpublisher/v3') : base) + path
	const res = await fetch(url, { ...init, headers: { authorization: `Bearer ${token}`, ...(init.headers ?? {}) } })
	if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path}: ${res.status} ${await res.text()}`)
	return res.json()
}

const edit = await api('/edits', { method: 'POST' })
console.log(`edit ${edit.id} — uploading ${aabPath}`)
const bundle = await api(`/edits/${edit.id}/bundles?uploadType=media`, { method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: readFileSync(aabPath) }, true)
console.log(`uploaded versionCode ${bundle.versionCode}`)
await api(`/edits/${edit.id}/tracks/${track}`, {
	method: 'PUT',
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify({ track, releases: [{ versionCodes: [String(bundle.versionCode)], status: process.env.PLAY_STATUS ?? 'completed' }] }),
})
await api(`/edits/${edit.id}:commit`, { method: 'POST' })
console.log(`→ ${pkg} versionCode ${bundle.versionCode} rolled to ${track}`)
