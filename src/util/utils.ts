import { useCallback, useState } from "react";

export function useLocalStorageState(key: string, defaultState?: string) {
  const [state, setState] = useState(() => {
    // NOTE: Not sure if this is ok
    const storedState = localStorage.getItem(key);
    if (storedState) {
      try {
        return JSON.parse(storedState);
      } catch (e) {
        console.warn(`Failed to parse localStorage value for key "${key}":`, e);
        // If JSON parsing fails, return the raw string value or default
        // This handles cases where Base58 strings or other non-JSON data is stored
        return storedState || defaultState;
      }
    }
    return defaultState;
  });

  const setLocalStorageState = useCallback(
    (newState) => {
      const changed = state !== newState;
      if (!changed) {
        return;
      }
      setState(newState);
      if (newState === null) {
        localStorage.removeItem(key);
      } else {
        try {
          localStorage.setItem(key, JSON.stringify(newState));
        } catch (e) {
          console.warn(`Failed to stringify value for localStorage key "${key}":`, e);
          // If JSON stringification fails, store as string if possible
          if (typeof newState === 'string') {
            localStorage.setItem(key, newState);
          }
        }
      }
    },
    [state, key]
  );

  return [state, setLocalStorageState];
}
