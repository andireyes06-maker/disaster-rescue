import { describe, it, expect, vi, afterEach } from 'vitest';
import { useEffect } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => ({ user: { email: 'resident@x.test' }, logout: vi.fn(() => Promise.resolve()) }),
}));

import ResidentLayout from './ResidentLayout';
import { useUnsavedChanges } from './UnsavedChanges';

// Stands in for the report form: marks the page as holding unsent input.
function DirtyPage({ dirty }: { dirty: boolean }) {
  const { setDirty } = useUnsavedChanges();
  useEffect(() => { setDirty(dirty); }, [dirty, setDirty]);
  return <p>form</p>;
}

function renderLayout(dirty: boolean) {
  return render(
    <MemoryRouter initialEntries={['/my/report']}>
      <ResidentLayout title="Report an emergency" description="Describe what is happening.">
        <DirtyPage dirty={dirty} />
      </ResidentLayout>
    </MemoryRouter>,
  );
}

const isActive = (name: string) => screen.getByRole('link', { name }).getAttribute('aria-current') === 'page';

describe('unsaved report guard (F06)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('asks before leaving unsent input, and stays on the page when declined', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderLayout(true);
    fireEvent.click(screen.getByRole('link', { name: 'My reports' }));
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(isActive('Report an emergency')).toBe(true);
    expect(isActive('My reports')).toBe(false);
  });

  it('leaves the page when the resident confirms', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderLayout(true);
    fireEvent.click(screen.getByRole('link', { name: 'My reports' }));
    expect(isActive('My reports')).toBe(true);
  });

  it('does not ask when there is nothing unsent', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderLayout(false);
    fireEvent.click(screen.getByRole('link', { name: 'My reports' }));
    expect(window.confirm).not.toHaveBeenCalled();
    expect(isActive('My reports')).toBe(true);
  });
});
