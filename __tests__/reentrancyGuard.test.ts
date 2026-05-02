import {isBusy, release, tryAcquire} from '../src/core/reentrancyGuard';

afterEach(() => release());

describe('reentrancyGuard', () => {
  it('starts free', () => {
    expect(isBusy()).toBe(false);
  });

  it('first acquire succeeds, second fails', () => {
    expect(tryAcquire()).toBe(true);
    expect(tryAcquire()).toBe(false);
    expect(isBusy()).toBe(true);
  });

  it('release lets the next acquire succeed', () => {
    tryAcquire();
    release();
    expect(isBusy()).toBe(false);
    expect(tryAcquire()).toBe(true);
  });
});
