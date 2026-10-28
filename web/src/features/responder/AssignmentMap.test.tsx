import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AssignmentMap } from './AssignmentMap';
import type { Report } from '../../types/domain';

const report = (id: string): Report => ({
  id, reference: `RR-${id}`, type: 'flood', priority: 'critical', status: 'Team Assigned',
  location: { lat: 14.8, lng: 120.8 }, description: '', verified: true, classification: '', addressText: '', photos: [], possibleDuplicates: [], createdAt: new Date(), updatedAt: new Date(),
});

describe('assignment map marker accessibility', () => {
  it('distinguishes equal-priority reports, activates by keyboard, and updates names without losing focus', () => {
    const select = vi.fn();
    const a = report('1'), b = report('2');
    const ui = render(<AssignmentMap reports={[a, b]} onSelect={select} />);
    const marker = screen.getByRole('button', { name: 'Open RR-1: Flood report, critical, Team Assigned' });
    expect(screen.getByRole('button', { name: 'Open RR-2: Flood report, critical, Team Assigned' })).toBeInTheDocument();
    marker.focus();
    fireEvent.keyDown(marker, { key: 'Enter' });
    expect(select).toHaveBeenCalledExactlyOnceWith(a);
    fireEvent.keyDown(marker, { key: ' ', repeat: true });
    expect(select).toHaveBeenCalledTimes(1);
    ui.rerender(<AssignmentMap reports={[{ ...a, status: 'Rescue in Progress' }, b]} onSelect={select} />);
    expect(screen.getByRole('button', { name: 'Open RR-1: Flood report, critical, Rescue in Progress' })).toBe(marker);
    expect(marker).toHaveFocus();
  });
  it('does not turn an inert detail or headquarters marker into a button', () => {
    const { container } = render(<AssignmentMap reports={[report('1')]} hq={{ lat: 14.8, lng: 120.9 }} />);
    expect(container.querySelector('.map-marker-wrap')).not.toHaveAttribute('role', 'button');
    expect(container.querySelector('.hq-pin')).not.toHaveAttribute('role', 'button');
  });
});
