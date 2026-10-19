import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ConnectionStatus, ConnectionNotice } from './ConnectionStatus';

describe('connection feedback', () => {
  it('shows the offline warning and removes it after reconnection', () => {
    let online = true;
    vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online);
    render(<><ConnectionStatus /><ConnectionNotice fromCache /></>);
    expect(screen.getByRole('status')).toHaveTextContent('Showing saved information');
    act(() => { online = false; window.dispatchEvent(new Event('offline')); });
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('You are offline');
    act(() => { online = true; window.dispatchEvent(new Event('online')); });
    expect(screen.getByRole('status')).toHaveTextContent('Showing saved information');
    vi.restoreAllMocks();
  });
});
