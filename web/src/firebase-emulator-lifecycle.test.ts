import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const network = vi.hoisted(() => ({ disable: vi.fn(), enable: vi.fn() }));
vi.mock('firebase/firestore', () => ({ disableNetwork: network.disable, enableNetwork: network.enable }));
import { attachEmulatorLifecycle } from './firebase-emulator-lifecycle';
import type { Firestore } from 'firebase/firestore';
let detach: () => void;
beforeEach(() => {
  vi.useFakeTimers();
  network.disable.mockReset().mockResolvedValue(undefined);
  network.enable.mockReset().mockResolvedValue(undefined);
  detach = attachEmulatorLifecycle({} as Firestore);
});
afterEach(() => { detach(); vi.useRealTimers(); });
it('pauses before unload, before the document starts leaving', () => {
  window.dispatchEvent(new Event('beforeunload'));
  expect(network.disable).toHaveBeenCalledTimes(1);
  window.dispatchEvent(new Event('pagehide'));
  vi.advanceTimersByTime(2000);
  expect(network.enable).not.toHaveBeenCalled();
});
it('restores live data if navigation is cancelled', () => {
  window.dispatchEvent(new Event('beforeunload'));
  vi.advanceTimersByTime(999);
  expect(network.enable).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(network.enable).toHaveBeenCalledTimes(1);
});
it('restores a page returned from the back-forward cache', () => {
  window.dispatchEvent(new Event('beforeunload'));
  window.dispatchEvent(new Event('pagehide'));
  window.dispatchEvent(new Event('pageshow'));
  expect(network.enable).toHaveBeenCalledTimes(1);
});
it('does not pause twice or leave duplicate recovery timers', () => {
  window.dispatchEvent(new Event('beforeunload'));
  window.dispatchEvent(new Event('beforeunload'));
  expect(network.disable).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(1);
  vi.advanceTimersByTime(1000);
  expect(network.enable).toHaveBeenCalledTimes(1);
});
it('removes its listeners and timer on hot replacement', () => {
  window.dispatchEvent(new Event('beforeunload'));
  detach();
  expect(vi.getTimerCount()).toBe(0);
  window.dispatchEvent(new Event('beforeunload'));
  expect(network.disable).toHaveBeenCalledTimes(1);
});
