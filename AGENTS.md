# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# TronDealer Móvil

React Native/Expo merchant app for TronDealer (trondealer.com), the non-custodial multi-chain crypto payment gateway. The backend lives in a SEPARATE repo at `~/webs/tron-dealer` (Next.js 16) — its `CLAUDE.md` is the source of truth for the API; read it before adding or changing any API call here.

## Commands

```bash
npx expo start        # dev server (Expo Go works — no custom native modules yet)
npx tsc --noEmit      # type check
npx expo export --platform ios   # verify the bundle compiles
npm run release:bump 1.1.6       # version+build → app.json AND the generated ios/ android/ (never prebuild --clean: upload keystore lives in android/app/)
npm run release:android          # signed AAB → dist/<v>/
npm run release:ios              # xcodebuild archive + App Store IPA → dist/<v>/
npm run release:upload:ios       # altool + App Store Connect API key (.env.release)
npm run release:upload:android   # Play Developer API + service account (.env.release)
```

Store releases are local (`scripts/release.sh`, no EAS). Secrets in `.env.release` (see `.env.release.example`); the Android upload keystore + `keystore.properties` are inside the gitignored `android/` dir with a private backup outside the repo.

## Architecture

- `src/app/` — expo-router. `login.tsx` + `register.tsx`; `(tabs)/` = home (index), wallets, activity, settings with a custom tab bar (`(tabs)/_layout.tsx`) whose center red button opens `/charge`; `charge/` = POS flow stack (keypad → `qr` → `paid`), presented as fullScreenModal from the root stack. Code identifiers, file names and routes are ENGLISH; user-facing copy lives in `src/i18n/` (ES default).
- `src/api/client.ts` — fetch wrapper. Base URL `EXPO_PUBLIC_API_URL` (default `https://trondealer.com`); auth is the `x-api-key` header (module-level key set via `setApiKey`). `mePath(chain, resource)` maps the backend's route families: EVM is the un-prefixed `clients/me/*`, the other chains (`tron|sol|sui|btc|ltc|ton`) are prefixed.
- `src/api/hooks.ts` — TanStack Query hooks; the response types mirror the backend routes (verified against source, e.g. stats returns `{stats:{...}}`, lists return `{success, total, wallets|transactions|sweeps}`).
- `src/auth/session.tsx` — session context. Login validates by calling `GET /api/v2/clients/me` with the key (no cookies anywhere); credentials live in `expo-secure-store`.
- `src/theme/tokens.ts` — "The Dealer" tokens ported 1:1 from the web repo's `app/styles/tokens.css`. Brand rules: signal red `#E5484D` is ONLY brand/CTA (never an error state); settle green / pending amber are ONLY on-chain semantic (confirmed / detecting); radii 2/6/10; no gradients; no emoji in content.
- Fonts: Archivo Expanded static TTFs in `assets/fonts/` (instantiated from the variable font — RN has no `font-stretch`), Instrument Sans + IBM Plex Mono via `@expo-google-fonts`. Amounts/hashes/labels are always mono.
- i18n: `src/i18n/index.ts`, ES is the default locale (mirrors the web), EN via device locale.

## Backend constraints to remember

- There is no push: OneSignal was removed on 2026-11-07. `ios/` is generated and untracked, so a copy made before that date still carries the OneSignal extension target; regenerate it with `npx expo prebuild --clean --platform ios` (iOS only: the Android upload keystore lives in `android/app/`). The POS `qr` screen POLLS the chain's transactions endpoint every 4 s for in-screen detection.
- Deposits under 0.50 USDT are dust-filtered server-side — `MIN_CHARGE_USD` in `charge/index.tsx` guards this.
- `clients/me/wallets/assign` label is an idempotency key (same label → same wallet). Cap is **100 ACTIVE wallets per subsystem** (EVM counts as one across its 7 chains) → HTTP 429; inactive ones don't count. `PATCH clients/me/{chain}/wallets/:id` takes `label` (≤50, unique per client → 409; `null`/`""` clears) and/or `status` (`active`|`inactive`; reactivating rescans the inactive window best-effort, 429 past the cap). Backend auto-deactivates after 120 idle days (7 for unfunded `single_use`). No wallet delete. The `single_use` flag is NOT available on the `me/*` assign routes.
- `me/recent`/`me/timeseries` omit TON; `me/search` omits BTC/LTC/TON. Only `me/stats` covers all 7 subsystems.
- Settings rows for Face ID and API-key rotation are disabled placeholders until the backend ships them.
