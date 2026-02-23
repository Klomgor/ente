/**
 * @file Service for the app lock feature.
 *
 * App lock is a purely client-side feature that prevents unauthorized access to
 * the app after it has been authenticated. It supports PIN, password, and
 * local native device lock (macOS Touch ID), uses Argon2id for passphrase hashing, and
 * syncs lock state across tabs via BroadcastChannel.
 *
 * See: [Note: Snapshots and useSyncExternalStore].
 */

import { deriveInteractiveKey, deriveKey } from "ente-base/crypto";
import { getKVN, getKVS, removeKV, setKV } from "ente-base/kv";
import log from "ente-base/log";
import { haveMasterKeyInSession } from "ente-base/session";
import type { NativeDeviceLockCapability } from "ente-base/types/ipc";

/**
 * In-memory state for the app lock feature.
 *
 * Some values are persisted to localStorage (synchronous, for cold-start reads)
 * and some to IndexedDB via KV DB (async, for tamper resistance).
 */
export interface AppLockState {
    /** Whether app lock is enabled. */
    enabled: boolean;
    /** Active lock type. */
    lockType: "pin" | "password" | "device" | "none";
    /** Whether the app is currently locked. */
    isLocked: boolean;
    /** Consecutive failed attempts in current lockout cycle. */
    invalidAttemptCount: number;
    /** Epoch ms when cooldown expires (0 = no cooldown). */
    cooldownExpiresAt: number;
    /** Auto-lock delay in milliseconds. */
    autoLockTimeMs: number;
}

const createDefaultState = (): AppLockState => ({
    enabled: false,
    lockType: "none",
    isLocked: false,
    invalidAttemptCount: 0,
    cooldownExpiresAt: 0,
    autoLockTimeMs: 0,
});

/**
 * Internal in-memory state shared by the functions in this module.
 *
 * This entire object will be reset on logout.
 */
class AppLockModuleState {
    constructor() {
        this.snapshot = createDefaultState();
    }

    /**
     * Subscriptions to {@link AppLockState} updates attached using
     * {@link appLockSubscribe}.
     */
    listeners: (() => void)[] = [];

    /**
     * Snapshot of the {@link AppLockState} returned by
     * {@link appLockSnapshot}.
     */
    snapshot: AppLockState;
}

/** State shared by the functions in this module. */
let _state = new AppLockModuleState();
let _bruteForceStateHydration = Promise.resolve();
let _bruteForceStateHydrationGeneration = 0;

/**
 * A function that can be used to subscribe to updates to {@link AppLockState}.
 *
 * See: [Note: Snapshots and useSyncExternalStore].
 */
export const appLockSubscribe = (onChange: () => void): (() => void) => {
    _state.listeners.push(onChange);
    return () => {
        _state.listeners = _state.listeners.filter((l) => l != onChange);
    };
};

/**
 * Return the last known, cached {@link AppLockState}.
 *
 * See also {@link appLockSubscribe}.
 */
export const appLockSnapshot = () => _state.snapshot;

const setSnapshot = (snapshot: AppLockState) => {
    _state.snapshot = snapshot;
    _state.listeners.forEach((l) => l());
};

// -- localStorage keys (synchronous, for cold-start reads) --

const lsKeyEnabled = "appLock.enabled";
// Stores the selected app-lock method ("pin" | "password" | "device" | "none").
const lsKeyAppLockMethod = "appLock.lockType";
const lsKeyAutoLockTimeMs = "appLock.autoLockTimeMs";
// Removed config key from older app-lock implementation; clear it on resets.
const lsLegacyKeyDeviceLockEnabled = "appLock.deviceLockEnabled";

// -- KV DB keys (IndexedDB, async) --

const kvKeyHash = "appLock.hash";
const kvKeySalt = "appLock.salt";
const kvKeyOpsLimit = "appLock.opsLimit";
const kvKeyMemLimit = "appLock.memLimit";
const kvKeyInvalidAttempts = "appLock.invalidAttempts";
const kvKeyCooldownExpiresAt = "appLock.cooldownExpiresAt";

// -- Device lock constants --

const deviceLockEnablePromptReason = "Enable device lock for Ente";
const deviceLockUnlockPromptReason = "Unlock Ente";
const maxInvalidUnlockAttempts = 10;
const cooldownStartsAtAttempt = 5;
const cooldownBaseSeconds = 30;
const unlockAttemptLockName = "ente-app-lock-unlock-attempt";

export type DeviceLockMode = "native";

export type DeviceLockUnsupportedReason =
    | "unsupported-platform"
    | "touchid-not-enrolled"
    | "touchid-api-error";

export type DeviceLockFailureReason = "native-prompt-failed" | "unknown";

const logDeviceLockUnsupported = (
    phase: "setup" | "unlock",
    reason: DeviceLockUnsupportedReason,
) => {
    log.warn(`Device lock ${phase} is not supported`, { reason });
};

const logDeviceLockFailure = (
    phase: "setup" | "unlock",
    reason: DeviceLockFailureReason,
    error?: unknown,
) => {
    if (typeof error != "undefined") {
        log.warn(`Device lock ${phase} failed`, { reason, error });
        return;
    }

    log.warn(`Device lock ${phase} failed`, { reason });
};

/**
 * Return the cooldown duration for a failed-attempt count.
 *
 * This policy is shared by both lockout enforcement and cooldown UI.
 */
export const appLockCooldownDurationMs = (attemptCount: number): number => {
    if (attemptCount < cooldownStartsAtAttempt) return 0;
    return (
        Math.pow(2, attemptCount - cooldownStartsAtAttempt) *
        cooldownBaseSeconds *
        1000
    );
};

// -- BroadcastChannel for multi-tab sync --

const _channel =
    typeof BroadcastChannel != "undefined"
        ? new BroadcastChannel("ente-app-lock")
        : undefined;

interface AppLockConfigSyncMessage {
    type: "config-updated";
    enabled: AppLockState["enabled"];
    lockType: AppLockState["lockType"];
    autoLockTimeMs: AppLockState["autoLockTimeMs"];
}

interface AppLockBruteForceSyncMessage {
    type: "bruteforce-updated";
    invalidAttemptCount: AppLockState["invalidAttemptCount"];
    cooldownExpiresAt: AppLockState["cooldownExpiresAt"];
}

type AppLockChannelMessage =
    | { type: "lock" }
    | { type: "unlock" }
    | AppLockConfigSyncMessage
    | AppLockBruteForceSyncMessage;

const postChannelMessage = (payload: AppLockChannelMessage) => {
    _channel?.postMessage(payload);
};

const appLockConfigFromSnapshot = (
    snapshot: AppLockState,
): Omit<AppLockConfigSyncMessage, "type"> => ({
    enabled: snapshot.enabled,
    lockType: snapshot.lockType,
    autoLockTimeMs: snapshot.autoLockTimeMs,
});

const syncConfigAcrossTabs = (snapshot: AppLockState) => {
    const payload: AppLockConfigSyncMessage = {
        type: "config-updated",
        ...appLockConfigFromSnapshot(snapshot),
    };
    postChannelMessage(payload);
};

const syncBruteForceAcrossTabs = (
    invalidAttemptCount: number,
    cooldownExpiresAt: number,
) => {
    const payload: AppLockBruteForceSyncMessage = {
        type: "bruteforce-updated",
        invalidAttemptCount,
        cooldownExpiresAt,
    };
    postChannelMessage(payload);
};

const setBruteForceSnapshot = (
    invalidAttemptCount: number,
    cooldownExpiresAt: number,
    shouldBroadcast = false,
) => {
    if (
        _state.snapshot.invalidAttemptCount !== invalidAttemptCount ||
        _state.snapshot.cooldownExpiresAt !== cooldownExpiresAt
    ) {
        setSnapshot({
            ..._state.snapshot,
            invalidAttemptCount,
            cooldownExpiresAt,
        });
    }
    if (shouldBroadcast) {
        syncBruteForceAcrossTabs(invalidAttemptCount, cooldownExpiresAt);
    }
};

const readBruteForceStateFromKV = async () => {
    const [invalidAttempts, cooldownExpiry] = await Promise.all([
        getKVN(kvKeyInvalidAttempts),
        getKVN(kvKeyCooldownExpiresAt),
    ]);

    return {
        invalidAttemptCount: Math.max(0, invalidAttempts ?? 0),
        cooldownExpiresAt: Math.max(0, cooldownExpiry ?? 0),
    };
};

const normalizeLockType = (lockType: string): AppLockState["lockType"] =>
    lockType === "pin" ||
    lockType === "password" ||
    lockType === "device" ||
    lockType === "none"
        ? lockType
        : "none";

const clampNonNegativeInt = (value: number) =>
    Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

const isDesktopMacOS = () =>
    !!globalThis.electron &&
    typeof navigator != "undefined" &&
    navigator.userAgent.toUpperCase().includes("MAC");

const normalizeDeviceLockType = (lockType: AppLockState["lockType"]) =>
    lockType === "device" && !isDesktopMacOS() ? "none" : lockType;

interface PersistedAppLockConfig {
    enabled: boolean;
    lockType: AppLockState["lockType"];
    autoLockTimeMs: number;
}

const readPersistedAppLockConfig = (): PersistedAppLockConfig => {
    let enabled = localStorage.getItem(lsKeyEnabled) === "true";

    // Getting the current applock method.
    const persistedLockType = localStorage.getItem(lsKeyAppLockMethod);

    // Remove stale key from removed "hide content when switching apps" setting.
    localStorage.removeItem("appLock.hideContentOnBlur");

    /**
     * Normalize the persisted lock type value. If an unsupported type is
     * detected, it will be automatically downgraded to "none" to prevent the
     * app from being stuck in a stale state.
     */
    const lockType = normalizeDeviceLockType(
        normalizeLockType(persistedLockType ?? "none"),
    );

    if (enabled && lockType === "none") {
        enabled = false;
        localStorage.setItem(lsKeyEnabled, "false");
    }

    if (lockType === "none") {
        localStorage.removeItem(lsKeyAppLockMethod);
    } else if (persistedLockType !== lockType) {
        localStorage.setItem(lsKeyAppLockMethod, lockType);
    }

    return {
        enabled,
        lockType,
        autoLockTimeMs: clampNonNegativeInt(
            Number(localStorage.getItem(lsKeyAutoLockTimeMs) ?? "0"),
        ),
    };
};

const setSnapshotFromPersistedConfig = (
    config: PersistedAppLockConfig,
    isLocked: boolean,
) => {
    setSnapshot({
        ..._state.snapshot,
        enabled: config.enabled,
        lockType: config.lockType,
        isLocked,
        autoLockTimeMs: config.autoLockTimeMs,
    });
    hydrateBruteForceStateIfNeeded();
};

let _localUnlockAttemptQueue = Promise.resolve();

const withLocalUnlockAttemptLock = async <T>(fn: () => Promise<T>) => {
    const previous = _localUnlockAttemptQueue;
    let releaseCurrent: (() => void) | undefined;

    _localUnlockAttemptQueue = new Promise<void>((resolve) => {
        releaseCurrent = resolve;
    });

    await previous;
    try {
        return await fn();
    } finally {
        releaseCurrent?.();
    }
};

const withUnlockAttemptLock = async <T>(fn: () => Promise<T>) => {
    const locks =
        typeof navigator == "undefined"
            ? undefined
            : (navigator as Navigator & { locks?: LockManager }).locks;

    if (locks && typeof locks.request == "function") {
        const result: unknown = await locks.request(
            unlockAttemptLockName,
            { mode: "exclusive" },
            fn,
        );
        return result as T;
    }

    return withLocalUnlockAttemptLock(fn);
};

if (_channel) {
    _channel.onmessage = (event: MessageEvent) => {
        const data = event.data as AppLockChannelMessage;

        switch (data.type) {
            case "lock":
                setSnapshot({ ..._state.snapshot, isLocked: true });
                hydrateBruteForceStateIfNeeded();
                break;
            case "unlock":
                setSnapshot({
                    ..._state.snapshot,
                    isLocked: false,
                    invalidAttemptCount: 0,
                    cooldownExpiresAt: 0,
                });
                stopBruteForceStateHydration();
                break;
            case "config-updated": {
                const lockType = normalizeLockType(data.lockType);
                const autoLockTimeMs = clampNonNegativeInt(data.autoLockTimeMs);

                if (!data.enabled) {
                    setSnapshot({
                        ..._state.snapshot,
                        enabled: false,
                        lockType: "none",
                        autoLockTimeMs,
                        isLocked: false,
                        invalidAttemptCount: 0,
                        cooldownExpiresAt: 0,
                    });
                    stopBruteForceStateHydration();
                    break;
                }

                setSnapshot({
                    ..._state.snapshot,
                    enabled: data.enabled,
                    lockType: normalizeDeviceLockType(lockType),
                    autoLockTimeMs,
                });
                hydrateBruteForceStateIfNeeded();
                break;
            }
            case "bruteforce-updated":
                setBruteForceSnapshot(
                    clampNonNegativeInt(data.invalidAttemptCount),
                    clampNonNegativeInt(data.cooldownExpiresAt),
                );
                break;
        }
    };
}

// -- Public API --

/**
 * Initialize app lock state from localStorage on cold start.
 *
 * Reads localStorage synchronously so the overlay can render immediately
 * without a flash of unlocked content. On desktop startup, it locks
 * pessimistically while safe-storage hydration is in flight.
 *
 * After the synchronous snapshot, asynchronously restores the brute-force
 * attempt count and cooldown expiry from KV DB so that a page refresh cannot
 * bypass the cooldown.
 */
export const initAppLock = () => {
    const config = readPersistedAppLockConfig();
    const hasSession = haveMasterKeyInSession();

    // On desktop, lock pessimistically while safe-storage hydration is in flight.
    const isLocked = config.enabled && (hasSession || !!globalThis.electron);

    setSnapshotFromPersistedConfig(config, isLocked);
};

/**
 * Restore the brute-force attempt count and cooldown expiry from KV DB into
 * the in-memory snapshot.
 *
 * Called during {@link initAppLock} to ensure that cooldown timers persist
 * across page refreshes.
 */
const restoreBruteForceState = async (generation: number) => {
    try {
        const { invalidAttemptCount, cooldownExpiresAt } =
            await readBruteForceStateFromKV();

        if (generation !== _bruteForceStateHydrationGeneration) {
            return;
        }

        setBruteForceSnapshot(invalidAttemptCount, cooldownExpiresAt);
    } catch (e) {
        log.error("Failed to restore brute-force state from KV DB", e);
    }
};

const stopBruteForceStateHydration = () => {
    _bruteForceStateHydrationGeneration += 1;
    _bruteForceStateHydration = Promise.resolve();
};

const hydrateBruteForceStateIfNeeded = () => {
    const isPassphraseLock =
        _state.snapshot.lockType === "pin" ||
        _state.snapshot.lockType === "password";
    if (!_state.snapshot.isLocked || !isPassphraseLock) {
        stopBruteForceStateHydration();
        return;
    }

    const generation = ++_bruteForceStateHydrationGeneration;
    _bruteForceStateHydration = restoreBruteForceState(generation);
};

const ensureBruteForceStateHydrated = async () => {
    await _bruteForceStateHydration;
};

const unsupportedNativeDeviceLockCapability: NativeDeviceLockCapability = {
    available: false,
    provider: "none",
    reason: "unsupported-platform",
};

const nativeDeviceLockCapability =
    async (): Promise<NativeDeviceLockCapability> => {
        // Native device lock is available only in the desktop (Electron) app.
        // On web, we always treat it as unsupported.
        if (!globalThis.electron) return unsupportedNativeDeviceLockCapability;

        try {
            if (
                typeof globalThis.electron.getNativeDeviceLockCapability ==
                "function"
            ) {
                return await globalThis.electron.getNativeDeviceLockCapability();
            }

            return unsupportedNativeDeviceLockCapability;
        } catch (e) {
            log.warn("Failed to query native device lock support", e);
            return unsupportedNativeDeviceLockCapability;
        }
    };

type DeviceLockCapability =
    | { usable: true; mode: DeviceLockMode }
    | { usable: false; reason: DeviceLockUnsupportedReason };

const nativeCapabilityUnavailableReason = (
    capability: NativeDeviceLockCapability,
): DeviceLockUnsupportedReason => {
    switch (capability.reason) {
        case "touchid-not-enrolled":
        case "touchid-api-error":
            return capability.reason;
        default:
            return "unsupported-platform";
    }
};

const resolveDeviceLockCapability = async (): Promise<DeviceLockCapability> => {
    const nativeCapability = await nativeDeviceLockCapability();
    if (nativeCapability.available) return { usable: true, mode: "native" };

    return {
        usable: false,
        reason: nativeCapabilityUnavailableReason(nativeCapability),
    };
};

/**
 * Return true if the current environment supports native device lock app
 * unlocks.
 */
export const isDeviceLockSupported = async () => {
    const capability = await resolveDeviceLockCapability();
    return capability.usable;
};

/**
 * Return true if the current environment should show "Device lock" in the
 * lock-type picker.
 *
 * We show it when native auth is currently available, or when the platform
 * supports it but setup/auth is temporarily unavailable (for example, Touch ID
 * not enrolled).
 */
export const shouldShowDeviceLockOption = async () => {
    const capability = await nativeDeviceLockCapability();
    return capability.available || capability.reason !== "unsupported-platform";
};

const clearPassphraseMaterial = async () =>
    Promise.all([
        removeKV(kvKeyHash),
        removeKV(kvKeySalt),
        removeKV(kvKeyOpsLimit),
        removeKV(kvKeyMemLimit),
    ]);

/**
 * Reset brute-force protection state.
 *
 * Clears persisted invalid-attempt and cooldown values in KV, updates the
 * in-memory snapshot to zero, and optionally broadcasts the reset to other tabs.
 */
const resetBruteForceState = async (shouldBroadcast = false) => {
    await Promise.all([
        setKV(kvKeyInvalidAttempts, 0),
        setKV(kvKeyCooldownExpiresAt, 0),
    ]);
    setBruteForceSnapshot(0, 0, shouldBroadcast);
};

const unlockLocally = () => {
    setSnapshot({
        ..._state.snapshot,
        isLocked: false,
        invalidAttemptCount: 0,
        cooldownExpiresAt: 0,
    });
    stopBruteForceStateHydration();
    postChannelMessage({ type: "unlock" });
};

/**
 * Recompute and refresh whether the app should currently be locked based on
 * session availability.
 *
 * Call this after desktop safe-storage restore to prevent auto-login bypass.
 */
export const refreshAppLockStateFromSession = () => {
    const config = readPersistedAppLockConfig();
    const isLocked = config.enabled && haveMasterKeyInSession();
    setSnapshotFromPersistedConfig(config, isLocked);
};

/**
 * The result of a device lock setup attempt.
 *
 * - `success` - Device lock setup completed and app lock configured.
 * - `not-supported` - Platform authenticator is unavailable in this context.
 * - `failed` - Setup failed or was cancelled by the user.
 */
export type SetupDeviceLockResult =
    | { status: "success"; mode: DeviceLockMode }
    | { status: "not-supported"; reason: DeviceLockUnsupportedReason }
    | { status: "failed"; reason: DeviceLockFailureReason };

/**
 * Set up a PIN for app lock.
 *
 * Derives a key from the PIN using Argon2id with interactive limits, stores
 * the hash and derivation parameters in KV DB, and enables the lock.
 */
const setupPassphraseLock = async (
    lockType: Extract<AppLockState["lockType"], "pin" | "password">,
    input: string,
) => {
    const derived = await deriveInteractiveKey(input);
    await Promise.all([
        setKV(kvKeyHash, derived.key),
        setKV(kvKeySalt, derived.salt),
        setKV(kvKeyOpsLimit, derived.opsLimit),
        setKV(kvKeyMemLimit, derived.memLimit),
        resetBruteForceState(true),
    ]);

    localStorage.setItem(lsKeyAppLockMethod, lockType);
    localStorage.setItem(lsKeyEnabled, "true");

    setSnapshot({
        ..._state.snapshot,
        enabled: true,
        lockType,
        invalidAttemptCount: 0,
        cooldownExpiresAt: 0,
    });
    stopBruteForceStateHydration();
    syncConfigAcrossTabs(_state.snapshot);
};

export const setupPin = async (pin: string) => setupPassphraseLock("pin", pin);

/**
 * Set up a password for app lock.
 *
 * Same as {@link setupPin} but sets the lock type to "password".
 */
export const setupPassword = async (password: string) =>
    setupPassphraseLock("password", password);

/**
 * Set up native device lock authentication for app lock (macOS only).
 */
export const setupDeviceLock = async (): Promise<SetupDeviceLockResult> => {
    // Resolve whether native device lock is currently usable in this environment.
    // Flow: resolveDeviceLockCapability() -> nativeDeviceLockCapability() ->
    // globalThis.electron.getNativeDeviceLockCapability().
    const capability = await resolveDeviceLockCapability();

    // Surface unsupported reasons to callers/UI.
    if (!capability.usable) {
        logDeviceLockUnsupported("setup", capability.reason);
        return { status: "not-supported", reason: capability.reason };
    }

    try {
        // Trigger the OS-native authentication prompt (for example, Touch ID).
        const unlocked = await globalThis.electron?.promptDeviceLock(
            deviceLockEnablePromptReason,
        );
        if (!unlocked) {
            logDeviceLockFailure("setup", "native-prompt-failed");
            return { status: "failed", reason: "native-prompt-failed" };
        }

        // Reset brute-force lockout/cooldown state in KV and in memory.
        await resetBruteForceState(true);

        // Save the selected app-lock method and enabled state in localStorage.
        localStorage.setItem(lsKeyAppLockMethod, "device");
        localStorage.setItem(lsKeyEnabled, "true");

        // Update the in-memory app-lock snapshot.
        setSnapshot({
            ..._state.snapshot,
            enabled: true,
            lockType: "device",
            invalidAttemptCount: 0,
            cooldownExpiresAt: 0,
        });

        // Stop ongoing brute-force hydration and sync config to other tabs/windows.
        stopBruteForceStateHydration();
        syncConfigAcrossTabs(_state.snapshot);

        return { status: "success", mode: "native" };
    } catch (e) {
        log.error("Failed to set up device lock app lock", e);
        return { status: "failed", reason: "unknown" };
    }
};

/**
 * The result of an unlock attempt.
 *
 * - `"success"` - The input was correct; the app is now unlocked.
 * - `"failed"` - The input was incorrect.
 * - `"cooldown"` - Too many recent attempts; currently in cooldown.
 * - `"logout"` - Too many total attempts (>= 10); caller should force logout.
 */
export type UnlockResult = "success" | "failed" | "cooldown" | "logout";

/**
 * The result of a device lock unlock attempt.
 */
export type DeviceLockUnlockResult =
    | { status: "success"; mode: DeviceLockMode }
    | { status: "not-supported"; reason: DeviceLockUnsupportedReason }
    | { status: "failed"; reason: DeviceLockFailureReason };

/**
 * Attempt to unlock the app using native device lock (macOS only).
 */
export const attemptDeviceLockUnlock =
    async (): Promise<DeviceLockUnlockResult> => {
        const capability = await resolveDeviceLockCapability();
        if (!capability.usable) {
            logDeviceLockUnsupported("unlock", capability.reason);
            return { status: "not-supported", reason: capability.reason };
        }

        try {
            const unlocked = await globalThis.electron?.promptDeviceLock(
                deviceLockUnlockPromptReason,
            );
            if (!unlocked) {
                logDeviceLockFailure("unlock", "native-prompt-failed");
                return { status: "failed", reason: "native-prompt-failed" };
            }

            await resetBruteForceState();
            unlockLocally();
            return { status: "success", mode: "native" };
        } catch (e) {
            log.error("Failed device lock unlock attempt", e);
            return { status: "failed", reason: "unknown" };
        }
    };

/**
 * Attempt to unlock the app with the given PIN or password.
 *
 * Implements brute-force protection: after 5 failed attempts, a cooldown
 * period is enforced (exponential backoff starting at 30s). After 10 failed
 * attempts, signals that the caller should force-logout the user.
 */
export const attemptUnlock = async (input: string): Promise<UnlockResult> => {
    const isPassphraseLock =
        _state.snapshot.lockType === "pin" ||
        _state.snapshot.lockType === "password";
    if (!isPassphraseLock) {
        return "failed";
    }

    return withUnlockAttemptLock<UnlockResult>(async () => {
        // Ensure persisted lockout state has been rehydrated before enforcing.
        await ensureBruteForceStateHydrated();

        // Refresh lockout state from KV so stale tabs cannot reset counters.
        const persistedState = await readBruteForceStateFromKV();
        const invalidAttemptCount = Math.max(
            _state.snapshot.invalidAttemptCount,
            persistedState.invalidAttemptCount,
        );
        const cooldownExpiresAt = Math.max(
            _state.snapshot.cooldownExpiresAt,
            persistedState.cooldownExpiresAt,
        );
        setBruteForceSnapshot(invalidAttemptCount, cooldownExpiresAt);

        // Check cooldown from in-memory state.
        if (
            _state.snapshot.cooldownExpiresAt > 0 &&
            Date.now() < _state.snapshot.cooldownExpiresAt
        ) {
            return "cooldown";
        }

        // Read stored derivation parameters and hash from KV DB.
        const salt = await getKVS(kvKeySalt);
        const storedHash = await getKVS(kvKeyHash);
        const opsLimit = await getKVN(kvKeyOpsLimit);
        const memLimit = await getKVN(kvKeyMemLimit);

        if (!salt || !storedHash || !opsLimit || !memLimit) {
            log.error("App lock credentials missing from KV DB");
            return "failed";
        }

        // Derive key from input using the stored parameters.
        const derivedKey = await deriveKey(input, salt, opsLimit, memLimit);

        if (derivedKey === storedHash) {
            // Correct input: reset attempts, unlock.
            await resetBruteForceState(true);
            unlockLocally();
            return "success";
        }

        // Incorrect input: increment attempts.
        const count = invalidAttemptCount + 1;
        await setKV(kvKeyInvalidAttempts, count);

        if (count >= maxInvalidUnlockAttempts) {
            // Too many attempts: signal logout.
            await setKV(kvKeyCooldownExpiresAt, 0);
            setBruteForceSnapshot(count, 0, true);
            return "logout";
        }

        if (count >= cooldownStartsAtAttempt) {
            // Enforce cooldown with exponential backoff.
            const expiresAt = Date.now() + appLockCooldownDurationMs(count);
            await setKV(kvKeyCooldownExpiresAt, expiresAt);
            setBruteForceSnapshot(count, expiresAt, true);

            // The current failed attempt has triggered cooldown, so surface the
            // cooldown state immediately to callers/UI.
            return "cooldown";
        } else {
            setBruteForceSnapshot(count, 0, true);
        }

        return "failed";
    });
};

/**
 * Lock the app and broadcast to other tabs.
 */
export const lock = () => {
    setSnapshot({ ..._state.snapshot, isLocked: true });
    hydrateBruteForceStateIfNeeded();
    postChannelMessage({ type: "lock" });
};

/**
 * Clear all app lock data on logout.
 *
 * Removes all localStorage and KV DB keys, and resets in-memory state to
 * defaults.
 */
export const logoutAppLock = async () => {
    localStorage.removeItem(lsKeyEnabled);
    localStorage.removeItem(lsKeyAppLockMethod);
    localStorage.removeItem(lsKeyAutoLockTimeMs);
    localStorage.removeItem(lsLegacyKeyDeviceLockEnabled);

    await Promise.all([
        clearPassphraseMaterial(),
        removeKV(kvKeyInvalidAttempts),
        removeKV(kvKeyCooldownExpiresAt),
    ]);

    stopBruteForceStateHydration();
    _state = new AppLockModuleState();
    syncConfigAcrossTabs(_state.snapshot);
    syncBruteForceAcrossTabs(0, 0);
    postChannelMessage({ type: "unlock" });
};

/**
 * Update the auto-lock delay.
 */
export const setAutoLockTime = (ms: number) => {
    const autoLockTimeMs = clampNonNegativeInt(ms);
    localStorage.setItem(lsKeyAutoLockTimeMs, String(autoLockTimeMs));
    setSnapshot({ ..._state.snapshot, autoLockTimeMs });
    syncConfigAcrossTabs(_state.snapshot);
};

/**
 * Disable app lock entirely.
 *
 * Clears all stored credentials from KV DB, resets attempts and cooldown, and
 * updates localStorage and in-memory state.
 */
export const disableAppLock = async () => {
    await Promise.all([
        clearPassphraseMaterial(),
        removeKV(kvKeyInvalidAttempts),
        removeKV(kvKeyCooldownExpiresAt),
    ]);

    localStorage.setItem(lsKeyEnabled, "false");
    localStorage.removeItem(lsKeyAppLockMethod);
    localStorage.removeItem(lsLegacyKeyDeviceLockEnabled);

    setSnapshot({
        ..._state.snapshot,
        enabled: false,
        lockType: "none",
        isLocked: false,
        invalidAttemptCount: 0,
        cooldownExpiresAt: 0,
    });
    stopBruteForceStateHydration();
    syncConfigAcrossTabs(_state.snapshot);
    syncBruteForceAcrossTabs(0, 0);
};
