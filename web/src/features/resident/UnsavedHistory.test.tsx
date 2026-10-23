import { useEffect } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createMemoryRouter, Link, Outlet, RouterProvider, useNavigate } from 'react-router-dom';
import { UnsavedChangesProvider, useUnsavedChanges } from './UnsavedChanges';

function Draft() {
  const { setDirty } = useUnsavedChanges();
  const navigate = useNavigate();
  useEffect(() => { setDirty(true); return () => setDirty(false); }, [setDirty]);
  return <><textarea aria-label="Draft" defaultValue="Unsent incident details" />
    <button onClick={() => navigate(-1)}>Browser Back</button>
    <button onClick={() => navigate(1)}>Browser Forward</button>
    <Link to="/my">Leave through another link</Link>
    <button onClick={() => { setDirty(false); navigate('/my/saved'); }}>Submission completed</button>
  </>;
}

function setup(entries = ['/my', '/my/report'], index = 1) {
  const router = createMemoryRouter([{ path: '/my', element: <UnsavedChangesProvider><Outlet /></UnsavedChangesProvider>, children: [
    { index: true, element: <h1>Report list</h1> },
    { path: 'report', element: <Draft /> },
    { path: 'saved', element: <h1>Saved report</h1> },
  ] }], { initialEntries: entries, initialIndex: index });
  render(<RouterProvider router={router} />);
  return router;
}

describe('unsaved reports through browser history', () => {
  afterEach(() => vi.restoreAllMocks());
  it.each(['Browser Back', 'Leave through another link'])('declining %s retains the draft', async (label) => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const router = setup();
    fireEvent.click(screen.getByText(label));
    await waitFor(() => expect(window.confirm).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('Draft')).toHaveValue('Unsent incident details');
    expect(router.state.location.pathname).toBe('/my/report');
  });
  it('declining Forward retains the draft', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const router = setup(['/my/report', '/my'], 0);
    fireEvent.click(screen.getByText('Browser Forward'));
    await waitFor(() => expect(window.confirm).toHaveBeenCalledTimes(1));
    expect(router.state.location.pathname).toBe('/my/report');
    expect(screen.getByLabelText('Draft')).toHaveValue('Unsent incident details');
  });
  it('confirming Back reaches the list', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    setup();
    fireEvent.click(screen.getByText('Browser Back'));
    expect(await screen.findByRole('heading', { name: 'Report list' })).toBeInTheDocument();
  });
  it('successful submission navigates without an unsent-report warning', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    setup();
    fireEvent.click(screen.getByText('Submission completed'));
    expect(await screen.findByRole('heading', { name: 'Saved report' })).toBeInTheDocument();
    expect(window.confirm).not.toHaveBeenCalled();
  });
});
