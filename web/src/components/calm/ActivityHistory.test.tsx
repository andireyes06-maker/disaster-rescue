import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActivityHistory, { ActivityNote } from './ActivityHistory';

interface Item { id: string; note?: string; label: string }

function makeItems(count: number, noteFor: (i: number) => string | undefined = (i) => `Note ${i}`): Item[] {
  // Oldest first, as useReportUpdates delivers them.
  return Array.from({ length: count }, (_, i) => ({ id: `u${i}`, label: `Update ${i}`, note: noteFor(i) }));
}

function renderHistory(items: Item[], recentCount?: number) {
  return render(
    <ActivityHistory
      updates={items}
      recentCount={recentCount}
      renderItem={(u) => (
        <>
          <strong>{u.label}</strong>
          {u.note && <ActivityNote text={u.note} />}
        </>
      )}
    />,
  );
}

function renderedLabels(): string[] {
  const list = screen.getByRole('list');
  return within(list).getAllByRole('listitem').map((li) => li.querySelector('strong')?.textContent ?? '');
}

describe('ActivityHistory', () => {
  it('shows the 5 newest updates, newest first, by default', () => {
    renderHistory(makeItems(50));
    expect(renderedLabels()).toEqual(['Update 49', 'Update 48', 'Update 47', 'Update 46', 'Update 45']);
    expect(screen.getByRole('button', { name: 'Show 45 older updates' })).toBeInTheDocument();
  });

  it('reveals older updates above the recent block in chronological order', async () => {
    renderHistory(makeItems(50));
    await userEvent.click(screen.getByRole('button', { name: 'Show 45 older updates' }));
    const labels = renderedLabels();
    expect(labels).toHaveLength(50);
    expect(labels.slice(0, 45)).toEqual(Array.from({ length: 45 }, (_, i) => `Update ${i}`));
    expect(labels.slice(45)).toEqual(['Update 49', 'Update 48', 'Update 47', 'Update 46', 'Update 45']);
  });

  it('renders no reveal button when there are not more than recentCount updates', () => {
    renderHistory(makeItems(5));
    expect(renderedLabels()).toHaveLength(5);
    expect(screen.queryByRole('button', { name: /older update/i })).not.toBeInTheDocument();
  });

  it('uses the singular label for exactly one older update', () => {
    renderHistory(makeItems(6));
    expect(screen.getByRole('button', { name: 'Show 1 older update' })).toBeInTheDocument();
  });

  it('honours a custom recentCount', () => {
    renderHistory(makeItems(10), 3);
    expect(renderedLabels()).toEqual(['Update 9', 'Update 8', 'Update 7']);
    expect(screen.getByRole('button', { name: 'Show 7 older updates' })).toBeInTheDocument();
  });

  it('shows a Load older updates button beneath the list when more history exists', async () => {
    const onLoadOlder = vi.fn();
    render(
      <ActivityHistory updates={makeItems(20)} hasMore onLoadOlder={onLoadOlder}
        renderItem={(u) => <strong>{u.label}</strong>} />,
    );
    const button = screen.getByRole('button', { name: 'Load older updates' });
    expect(button.tagName).toBe('BUTTON');
    expect(screen.getByRole('list').compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await userEvent.click(button);
    expect(onLoadOlder).toHaveBeenCalledTimes(1);
  });

  it('shows the Load older button without hiding the existing reveal control', () => {
    render(
      <ActivityHistory updates={makeItems(20)} hasMore onLoadOlder={() => {}}
        renderItem={(u) => <strong>{u.label}</strong>} />,
    );
    expect(screen.getByRole('button', { name: 'Show 15 older updates' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load older updates' })).toBeInTheDocument();
  });

  it('does not show the Load older button when hasMore is false or omitted', () => {
    renderHistory(makeItems(20));
    expect(screen.queryByRole('button', { name: 'Load older updates' })).not.toBeInTheDocument();
    render(<ActivityHistory updates={makeItems(20)} hasMore={false} onLoadOlder={() => {}}
      renderItem={(u) => <strong>{u.label}</strong>} />);
    expect(screen.queryByRole('button', { name: 'Load older updates' })).not.toBeInTheDocument();
  });

  it('keeps the full text of a long note in the DOM and offers a disclosure', () => {
    const long = 'x'.repeat(600) + ' END-OF-NOTE';
    renderHistory([{ id: 'u1', label: 'Long', note: long }]);
    expect(screen.getByText(long)).toBeInTheDocument();
    expect(screen.getByText('Show full note')).toBeInTheDocument();
  });

  it('renders a short note without a disclosure', () => {
    renderHistory([{ id: 'u1', label: 'Short', note: 'On site' }]);
    expect(screen.getByText('On site')).toBeInTheDocument();
    expect(screen.queryByText('Show full note')).not.toBeInTheDocument();
  });

  it('keeps the full text of a 50-update fixture with long notes', async () => {
    const long = (i: number) => `Note ${i} ` + 'y'.repeat(400) + ` tail-${i}`;
    renderHistory(makeItems(50, long));
    await userEvent.click(screen.getByRole('button', { name: 'Show 45 older updates' }));
    for (let i = 0; i < 50; i++) expect(screen.getByText(long(i))).toBeInTheDocument();
  });
});
