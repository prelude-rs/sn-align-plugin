// Module-level reentrancy guard. Matches the on-device-proven pattern in
// sn-dictionary / sn-formula. The flag MUST be cleared synchronously
// before any subsequent await — clearing it after `await closePluginView`
// has been observed to leave it stuck `true` on a real device, which
// then rejects every future button press.

let busy = false;

export const tryAcquire = (): boolean => {
  if (busy) {
    return false;
  }
  busy = true;
  return true;
};

export const release = (): void => {
  busy = false;
};

export const isBusy = (): boolean => busy;
