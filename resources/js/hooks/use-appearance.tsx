import { useCallback, useMemo, useSyncExternalStore } from 'react';

export type ResolvedAppearance = 'light';
export type Appearance = 'light';

const listeners = new Set<() => void>();
let currentAppearance: Appearance = 'light';

const setCookie = (name: string, value: string, days = 365): void => {
    if (typeof document === 'undefined') return;
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

const applyTheme = (): void => {
    if (typeof document === 'undefined') return;

    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
};

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

export function initializeTheme(): void {
    if (typeof window === 'undefined') return;

    localStorage.setItem('appearance', 'light');
    setCookie('appearance', 'light');
    currentAppearance = 'light';
    applyTheme();
}

export function useAppearance() {
    const appearance: Appearance = useSyncExternalStore(
        subscribe,
        () => currentAppearance,
        () => 'light',
    );

    const resolvedAppearance: ResolvedAppearance = 'light';

    const updateAppearance = useCallback((_mode: Appearance): void => {
        // Fixed to light mode - no changes allowed
    }, []);

    return { appearance, resolvedAppearance, updateAppearance } as const;
}
