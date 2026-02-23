import { isDesktop } from "ente-base/app";
import { subscribeMainWindowFocus } from "ente-base/electron";
import { updateSessionFromElectronSafeStorageIfNeeded } from "ente-base/session";
import { useEffect, useRef, useState } from "react";
import {
    initAppLock,
    lock,
    refreshAppLockStateFromSession,
    type AppLockState,
} from "../../services/app-lock";

/**
 * Initialize app lock and return true once app-lock gated rendering can proceed.
 *
 * This is meant to be called once from the top-level `_app.tsx`.
 */
export const useSetupAppLock = () => {
    const [isAppLockReady, setIsAppLockReady] = useState(() => !isDesktop);

    useEffect(() => {
        const isElectron = !!globalThis.electron;
        const isAppLockEnabled = localStorage.getItem("appLock.enabled") === "true";

        initAppLock();
        if (!isElectron || !isAppLockEnabled) {
            setIsAppLockReady(true);
            return;
        }

        void (async () => {
            try {
                await updateSessionFromElectronSafeStorageIfNeeded();
            } finally {
                refreshAppLockStateFromSession();
                setIsAppLockReady(true);
            }
        })();
    }, []);

    return isAppLockReady;
};

/**
 * Start and clear auto-lock timers as the app moves between background and
 * foreground states.
 */
export const useAutoLockWhenBackgrounded = (
    enabled: AppLockState["enabled"],
    isLocked: AppLockState["isLocked"],
    autoLockTimeMs: AppLockState["autoLockTimeMs"],
) => {
    const autoLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autoLockDeadlineRef = useRef<number | null>(null);

    useEffect(() => {
        if (!enabled) return;

        const clearAutoLockTimer = () => {
            if (autoLockTimerRef.current) {
                clearTimeout(autoLockTimerRef.current);
                autoLockTimerRef.current = null;
            }
            autoLockDeadlineRef.current = null;
        };

        const lockIfDeadlineElapsed = () => {
            const deadline = autoLockDeadlineRef.current;
            if (deadline === null) return false;
            if (Date.now() < deadline) return false;

            clearAutoLockTimer();
            lock();
            return true;
        };

        const startAutoLockTimer = () => {
            if (isLocked) return;

            // Avoid extending the countdown when blur + visibility events both
            // fire for a single background transition.
            const existingDeadline = autoLockDeadlineRef.current;
            if (existingDeadline !== null && Date.now() < existingDeadline) {
                return;
            }

            if (autoLockTimeMs <= 0) {
                clearAutoLockTimer();
                lock();
                return;
            }

            if (autoLockTimerRef.current) {
                clearTimeout(autoLockTimerRef.current);
            }
            autoLockDeadlineRef.current = Date.now() + autoLockTimeMs;
            autoLockTimerRef.current = setTimeout(() => {
                autoLockDeadlineRef.current = null;
                lock();
            }, autoLockTimeMs);
        };

        const handleAppForegrounded = () => {
            if (lockIfDeadlineElapsed()) return;
            clearAutoLockTimer();
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                startAutoLockTimer();
            } else {
                handleAppForegrounded();
            }
        };

        const handleWindowBlur = () => {
            if (!document.hidden) {
                startAutoLockTimer();
            }
        };

        const handleWindowFocus = () => {
            handleAppForegrounded();
        };

        let unsubscribeMainWindowFocus: (() => void) | undefined;
        if (globalThis.electron) {
            unsubscribeMainWindowFocus =
                subscribeMainWindowFocus(handleAppForegrounded);
        }

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleWindowBlur);
        window.addEventListener("focus", handleWindowFocus);
        return () => {
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );
            window.removeEventListener("blur", handleWindowBlur);
            window.removeEventListener("focus", handleWindowFocus);
            unsubscribeMainWindowFocus?.();
            clearAutoLockTimer();
        };
    }, [enabled, isLocked, autoLockTimeMs]);
};
