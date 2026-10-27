import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePlaceName } from './usePlaceName';
const h = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock('./placeName', () => ({ approximatePlaceName: h.lookup }));
describe('selected-place label', () => {
  it('ignores a slow reply from a previous pin', async () => {
    let first!: (name: string) => void; let second!: (name: string) => void;
    h.lookup.mockImplementation((lat: number) => new Promise(resolve => { if (lat === 11) first = resolve; else second = resolve; }));
    const view = renderHook(({ lat }) => usePlaceName({ lat, lng: 120 }), { initialProps: { lat: 11 } });
    view.rerender({ lat: 12 });
    await act(async () => second('Second pin')); expect(view.result.current.name).toBe('Second pin');
    await act(async () => first('Old pin')); expect(view.result.current.name).toBe('Second pin');
    expect(view.result.current.coordinates).toBe('12.00000, 120.00000');
  });
  it('keeps the exact coordinates when the lookup cannot name the pin', async () => {
    h.lookup.mockResolvedValue(null);
    const view = renderHook(() => usePlaceName({ lat: 21.12345, lng: 120.12345 }));
    await waitFor(() => expect(view.result.current.loading).toBe(false));
    expect(view.result.current.name).toBeNull(); expect(view.result.current.coordinates).toBe('21.12345, 120.12345');
  });
});
