# App Lock End-to-End (Straight Talk)

This is the no-drama version of what app lock is doing right now, from settings click to lock screen to unlock logic to cross-browser behavior.

---

## 1. What app lock actually is

App lock is a **local UI gate** on top of an already authenticated session.

- It does **not** replace account login.
- It does **not** call backend policies for each unlock.
- It blocks the app UI locally until the user unlocks with:
  - PIN
  - password
  - native device lock (desktop macOS Touch ID path)

So think of it as: "You are logged in, but this device/session still needs a local unlock check."

---

## 2. Core files you care about

1. Settings UI  
`web/packages/new/photos/components/sidebar/AppLockSettings.tsx`

2. Lock screen overlay UI  
`web/packages/new/photos/components/AppLockOverlay.tsx`

3. Main logic + persistence + brute-force policy  
`web/packages/new/photos/services/app-lock.ts`

4. App-lock app-level hooks (startup + auto-lock side effects)  
`web/packages/new/photos/components/utils/use-app-lock.ts`

5. App shell wiring (hooks + rendering composition)  
`web/apps/photos/src/pages/_app.tsx`

6. Where settings entry is opened from account sidebar  
`web/apps/photos/src/components/Sidebar.tsx`

7. Desktop native bridge path  
`desktop/src/preload.ts`  
`desktop/src/main/ipc.ts`  
`desktop/src/main/services/device-lock.ts`

---

## 3. High-level architecture

The feature is split into 5 layers:

1. **Configuration layer** (`AppLockSettings.tsx`)  
User chooses lock method and auto-lock delay.

2. **State + policy layer** (`app-lock.ts`)  
Stores state, hashes/verifies passphrase, enforces cooldown/logout, syncs tabs.

3. **App-level hook layer** (`use-app-lock.ts`)  
Owns app-lock bootstrap and auto-lock background event side effects.

4. **Blocking UI layer** (`AppLockOverlay.tsx`)  
Renders full-screen modal and drives unlock flow.

5. **Native desktop layer** (Electron bridge + main process)  
Checks Touch ID capability and prompts native auth.

---

## 4. Entry point: how users get to App Lock settings

In account sidebar:

- App Lock row exists here:  
`web/apps/photos/src/components/Sidebar.tsx:1082`
- Settings component mounted here:  
`web/apps/photos/src/components/Sidebar.tsx:1119`

Before opening App Lock settings, app forces re-auth:

- `handleAppLock` does `await onAuthenticateUser()` first, then opens drawer:  
`web/apps/photos/src/components/Sidebar.tsx:1005`

So settings changes are treated as sensitive actions.

---

## 5. State model (single source of truth)

Defined in `AppLockState`:
`web/packages/new/photos/services/app-lock.ts:24`

Fields:

1. `enabled`
2. `lockType` -> `"pin" | "password" | "device" | "none"`
3. `isLocked`
4. `invalidAttemptCount`
5. `cooldownExpiresAt`
6. `autoLockTimeMs`

Everything UI-related (`AppLockSettings`, `AppLockOverlay`) subscribes to this shared snapshot.

---

## 6. Where data is stored

### 6.1 localStorage (fast sync config)

Keys:

1. `appLock.enabled`
2. `appLock.lockType`
3. `appLock.autoLockTimeMs`

Source: `web/packages/new/photos/services/app-lock.ts:103`

Why localStorage: synchronous reads on startup so lock state can render fast.

### 6.2 KV DB / IndexedDB (sensitive material + brute-force counters)

Keys:

1. `appLock.hash`
2. `appLock.salt`
3. `appLock.opsLimit`
4. `appLock.memLimit`
5. `appLock.invalidAttempts`
6. `appLock.cooldownExpiresAt`

Source: `web/packages/new/photos/services/app-lock.ts:110`

KV implementation: `web/packages/base/kv.ts`

Why KV: async storage and usable with worker-compatible patterns; avoids storing passphrase materials in plain localStorage.

---

## 7. Startup flow (this part is important)

### 7.1 Hook-based boot sequence (`useSetupAppLock`)

On app startup:

1. `_app.tsx` calls `useSetupAppLock()` and uses its readiness flag for gated rendering  
`web/apps/photos/src/pages/_app.tsx:73`

2. Inside `useSetupAppLock()`:
  - `initAppLock()` is called
  - if desktop + app lock enabled:
    - attempt safe-storage session hydration (`updateSessionFromElectronSafeStorageIfNeeded()`)
    - then refresh lock state from session (`refreshAppLockStateFromSession()`)
    - then mark app lock ready

`web/packages/new/photos/components/utils/use-app-lock.ts:17`

### 7.2 Why desktop behaves differently

In `initAppLock()`, lock state is set with this logic:

`isLocked = config.enabled && (haveMasterKeyInSession() || !!globalThis.electron)`  
`web/packages/new/photos/services/app-lock.ts:453`

Meaning:

- Browser: lock depends on `enabled && haveMasterKeyInSession()`
- Electron: if enabled, app starts pessimistically locked while safe-storage/session state settles

This avoids content flash on startup in desktop flows.

---

## 8. Settings behavior in detail (`AppLockSettings.tsx`)

### 8.1 Enable toggle

`handleToggleEnabled`:

- If currently enabled:
  - show disable confirmation
  - on confirm call `disableAppLock()`
- If currently disabled:
  - open PIN setup first by default

`web/packages/new/photos/components/sidebar/AppLockSettings.tsx:85`

### 8.2 PIN setup flow

Dialog component: `PinSetupDialog` (`AppLockSettings.tsx:310`)

Flow:

1. enter 4-digit PIN
2. confirm 4-digit PIN
3. on match -> `setupPin(pinStr)` (`AppLockSettings.tsx:413`)

Service side:

1. derive key with `deriveInteractiveKey(input)`
2. store hash/salt/ops/mem in KV
3. reset brute-force counters
4. set `lockType=pin`, `enabled=true`
5. update snapshot and broadcast config

`web/packages/new/photos/services/app-lock.ts:626`

### 8.3 Password setup flow

Dialog component: `PasswordSetupDialog` (`AppLockSettings.tsx:539`)

Flow:

1. enter password
2. confirm password
3. on match -> `setupPassword(password)` (`AppLockSettings.tsx:611`)

Service side is same as PIN path but with `lockType=password`.

### 8.4 Device lock setup flow

Trigger: `handleSelectDeviceLock` (`AppLockSettings.tsx:110`)

Flow:

1. call `setupDeviceLock()`
2. resolve native capability
3. if usable, prompt native auth (`promptDeviceLock("Enable device lock for Ente")`)
4. on success:
  - set `lockType=device`
  - set `enabled=true`
  - reset brute-force state
  - sync config across tabs

`web/packages/new/photos/services/app-lock.ts:666`

### 8.5 Auto-lock picker (row list)

Options:

1. immediately (0ms)
2. 5s
3. 15s
4. 1m
5. 5m
6. 30m

Defined: `AppLockSettings.tsx:288`

Current UI behavior:

- dialog renders a row for each option with a checkmark on the selected value (`AppLockSettings.tsx:722`)
- tapping a row calls `setAutoLockTime(option.ms)` (`AppLockSettings.tsx:747`)
- `Done` is rendered as a full-width CTA row in the dialog footer (`AppLockSettings.tsx:753`)
- service stores value and syncs tabs (`app-lock.ts:864`)

---

## 9. How lock is triggered during normal usage

Auto-lock trigger is in `useAutoLockWhenBackgrounded`:

- listens to:
  - `document.visibilitychange`
  - `window.blur` / `window.focus`
  - Electron main-window focus callback (desktop)
- when app is backgrounded (hidden or unfocused), it starts auto-lock countdown if not already locked
- if delay is `0`, it locks immediately
- it tracks a deadline so duplicate blur+visibility events do not extend the countdown
- when app is foregrounded again, it:
  - locks immediately if deadline already elapsed (covers throttled background timers)
  - otherwise clears timer/deadline

`web/packages/new/photos/components/utils/use-app-lock.ts:47`

`_app.tsx` only wires this behavior by passing snapshot fields into the hook:
`web/apps/photos/src/pages/_app.tsx:75`

`lock()` service behavior:

1. set `isLocked=true`
2. hydrate brute-force state
3. broadcast `"lock"` to other tabs

`web/packages/new/photos/services/app-lock.ts:839`

---

## 10. Overlay rendering logic (`AppLockOverlay.tsx`)

If `isLocked` is false: returns `null`.  
If true: full-screen MUI `Modal` blocks app.

`web/packages/new/photos/components/AppLockOverlay.tsx:54`

Form selection order:

1. `lockType === "pin"` -> PIN form
2. `lockType === "password"` -> password form
3. `lockType === "device"` -> device lock form
4. fallback -> PIN form (should normally not happen for valid enabled config)

`web/packages/new/photos/components/AppLockOverlay.tsx:116`

Overlay extras:

- top logout button
- logout confirmation modal
- cooldown screen with countdown/progress

---

## 11. Unlock pipeline (PIN/password)

UI calls `attemptUnlock(input)`:

- PIN path: `AppLockOverlay.tsx:302`
- password path: `AppLockOverlay.tsx:468`

Service algorithm in `attemptUnlock`:

1. ensure lock type is passphrase-based (`pin` or `password`)
2. serialize attempt execution:
  - Web Locks API if available (`navigator.locks.request`)
  - fallback local in-tab promise queue if not
3. ensure brute-force state has hydrated
4. re-read persisted brute-force counters from KV and merge with in-memory max
5. if cooldown active and not expired -> return `"cooldown"`
6. read salt/hash/ops/mem from KV
7. derive key from input and compare with stored hash
8. if match:
  - reset brute-force state
  - unlock locally
  - broadcast unlock
  - return `"success"`
9. if mismatch:
  - increment invalid attempt count
  - if count >= 10 -> return `"logout"`
  - else if count >= 5 -> set cooldown and return `"cooldown"`
  - else return `"failed"`

Source: `web/packages/new/photos/services/app-lock.ts:758`

UI reaction mapping is in `handleUnlockResult`:
`web/packages/new/photos/components/AppLockOverlay.tsx:884`

---

## 12. Cooldown and lockout policy (exact)

Constants:

- cooldown starts at attempt 5
- base duration = 30 seconds
- exponential backoff
- max attempts before forced logout = 10

`web/packages/new/photos/services/app-lock.ts:123`

Durations:

1. 5th wrong attempt: 30s
2. 6th: 60s
3. 7th: 120s
4. 8th: 240s
5. 9th: 480s
6. 10th: logout path

Cooldown formula source:  
`web/packages/new/photos/services/app-lock.ts:162`

Cooldown UI component:  
`web/packages/new/photos/components/AppLockOverlay.tsx:759`

---

## 13. Device lock path (desktop native) end-to-end

Renderer service calls:

- `setupDeviceLock()` or `attemptDeviceLockUnlock()`

These use:

- `globalThis.electron.getNativeDeviceLockCapability()`
- `globalThis.electron.promptDeviceLock(reason)`

`web/packages/new/photos/services/app-lock.ts:505`

### 13.1 Electron bridge chain

1. Renderer -> preload `promptDeviceLock`  
`desktop/src/preload.ts:141`

2. Preload -> IPC `"promptDeviceLock"`  
`desktop/src/preload.ts:148`

3. Main IPC handler routes to service  
`desktop/src/main/ipc.ts:142`

4. Native service checks capability + triggers Touch ID  
`desktop/src/main/services/device-lock.ts:10`  
`desktop/src/main/services/device-lock.ts:66`

### 13.2 Capability rules

In main device-lock service:

1. macOS + Touch ID available -> supported
2. macOS but Touch ID not enrolled -> `touchid-not-enrolled`
3. non-macOS -> `unsupported-platform`

`desktop/src/main/services/device-lock.ts:11`

### 13.3 Prompt throttling

Preload throttles device prompt to 1.5s minimum interval:

- `minDeviceLockPromptIntervalMs = 1500`
- if called too fast, it returns false immediately

`desktop/src/preload.ts:138`

---

## 14. Multi-tab behavior

App lock uses `BroadcastChannel("ente-app-lock")` when available.

Message types:

1. `lock`
2. `unlock`
3. `config-updated`
4. `bruteforce-updated`

Source: `web/packages/new/photos/services/app-lock.ts:173`

If `BroadcastChannel` is unavailable:

- no tab sync
- single-tab behavior still works

---

## 15. Cross-browser / cross-environment reality

### 15.1 Normal browser (non-Electron)

Works:

1. PIN/password app lock
2. brute-force cooldown
3. background-aware auto-lock (hidden/unfocused with deadline check)
4. optional tab sync if BroadcastChannel exists
5. optional cross-tab lock serialization if Web Locks API exists

Not available:

1. native device lock via Electron bridge

### 15.2 Electron on macOS

Works:

1. all browser features above
2. native Touch ID capability/prompt path
3. startup pessimistic lock + safe-storage session refresh

### 15.3 Electron on Windows/Linux

Works:

1. PIN/password lock path
2. cooldown + lockout

Native device lock:

1. currently resolved as unsupported in desktop service

### 15.4 Browser feature caveats

1. Missing BroadcastChannel -> no cross-tab sync.
2. Missing Web Locks API -> fallback queue only protects current tab.
3. IndexedDB/KV failures -> setup/unlock can fail.
4. PIN field masking in overlay uses `WebkitTextSecurity` style, so visual masking behavior can vary by engine:
   `web/packages/new/photos/components/AppLockOverlay.tsx:401`

---

## 16. Why things can feel weird in practice

Common confusion points:

1. Auto-lock now combines visibility + focus/blur signals, and re-checks elapsed deadline on foreground to avoid missed delayed locks.
2. Device lock is now a primary `lockType`, not a fallback toggle.
3. `_app.tsx` intentionally does not own app-lock side effects anymore; those are isolated in `use-app-lock.ts` for SRP.
4. Device lock failures do not increment passphrase brute-force counter.
5. App lock is local state, not a server-enforced security policy.

---

## 17. Logout behavior

From lock screen, pressing logout eventually calls `photosLogout()`:
`web/apps/photos/src/services/logout.ts:26`

In that flow, `logoutAppLock()` is called:
`web/apps/photos/src/services/logout.ts:62`

`logoutAppLock()` does:

1. remove all app-lock localStorage keys
2. remove app-lock KV keys
3. reset in-memory app-lock module state
4. broadcast reset/unlock messages

Note: reset paths also remove legacy `appLock.deviceLockEnabled` if present from older builds.

`web/packages/new/photos/services/app-lock.ts:851`

---

## 18. Debug checklist (when behavior looks broken)

Use this sequence while reproducing issues:

1. Check `appLock.enabled`, `appLock.lockType`, `appLock.autoLockTimeMs` in localStorage.
2. Confirm overlay is mounted and `appLock.isLocked` state changes.
3. Confirm `_app.tsx` is invoking `useAutoLockWhenBackgrounded(...)`.
4. Confirm at least one background signal fires in your scenario (`visibilitychange` hidden or `window.blur`).
5. Confirm timeout duration/deadline matches `autoLockTimeMs` and that foreground re-check locks if delay elapsed.
6. During wrong unlock attempts, verify `invalidAttemptCount` increments.
7. At attempt >=5, verify `cooldownExpiresAt` is set and cooldown UI appears.
8. At attempt 10, verify logout path triggers.
9. On desktop mac, verify native prompt capability response and prompt timing.
10. If multi-tab, verify BroadcastChannel updates are received.
11. If unlock races happen, check whether Web Locks API is available in that environment.

---

## 19. End-to-end timeline (single flow)

1. User opens Account -> App Lock (after re-auth).
2. User sets PIN/password/device lock + auto-lock delay.
3. Config and secrets persist (localStorage + KV DB).
4. App goes hidden or loses focus.
5. Auto-lock timer fires -> `lock()` -> `isLocked=true`.
6. `AppLockOverlay` blocks UI.
7. User unlocks via passphrase or native device prompt.
8. On success, state unlocks and broadcasts.
9. On repeated failures, cooldown escalates.
10. On max passphrase failures, logout path is enforced.

---

## 20. Final practical summary

If you want one sentence:

App lock in this app is a local, state-driven lock overlay with configurable methods, persisted credentials/attempt counters, background-aware auto-lock (hidden/unfocused + deadline re-check), app-level side effects isolated in dedicated hooks (`use-app-lock.ts`), optional tab sync, and a desktop Touch ID bridge on supported macOS paths.
