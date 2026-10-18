import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const fs = vi.hoisted(() => ({
  listener: null as null | ((snap: { data: () => unknown }) => void),
  onError: null as null | (() => void),
}));
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...path: string[]) => path.join('/'),
  onSnapshot: (_ref: unknown, next: (snap: { data: () => unknown }) => void, error: () => void) => {
    fs.listener = next;
    fs.onError = error;
    return () => {};
  },
}));
vi.mock('../../firebase', () => ({ getFirebaseDb: () => ({}) }));

import { useDemoIndicator } from './useDemoIndicator';

describe('useDemoIndicator', () => {
  beforeEach(() => { fs.listener = null; fs.onError = null; });

  it('shows the label when the demo flag is active', async () => {
    const { result } = renderHook(() => useDemoIndicator());
    fs.listener!({ data: () => ({ active: true, label: 'Demo workspace · Sample data' }) });
    await waitFor(() => expect(result.current?.label).toBe('Demo workspace · Sample data'));
  });

  it('shows nothing when the flag is missing or inactive', async () => {
    const { result } = renderHook(() => useDemoIndicator());
    fs.listener!({ data: () => undefined });
    await waitFor(() => expect(result.current).toBeNull());
  });

  it('shows nothing after a failed read, so no demo label is invented', async () => {
    const { result } = renderHook(() => useDemoIndicator());
    fs.listener!({ data: () => ({ active: true, label: 'Demo workspace · Sample data' }) });
    await waitFor(() => expect(result.current).not.toBeNull());
    fs.onError!();
    await waitFor(() => expect(result.current).toBeNull());
  });
});
