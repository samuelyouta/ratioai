/** Lightweight hook so profile.ts can notify cloud sync without circular imports. */

let onChange: (() => void) | null = null;

export function registerCloudSyncListener(listener: () => void) {
  onChange = listener;
  return () => {
    if (onChange === listener) onChange = null;
  };
}

export function notifyLocalDataChanged() {
  onChange?.();
}
