/// <reference types="node" />
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ user: { uid: 'admin' }, role: 'admin' }) }));

const h = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../../api/client', () => ({ api: h.api }));

import UsersPage from './UsersPage';
// Vitest returns an empty string for CSS imports, so the stylesheet is read from disk (tests run from web/).
const stylesCss = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

// Text inside every @media (max-width: 639px) block in styles.css (phone layout).
function phoneRules(css: string): string {
  const marker = '@media (max-width: 639px) {';
  const blocks: string[] = [];
  let at = css.indexOf(marker);
  while (at !== -1) {
    const open = at + marker.length - 1;
    let depth = 0;
    let close = open;
    for (; close < css.length; close++) {
      if (css[close] === '{') depth++;
      else if (css[close] === '}' && --depth === 0) break;
    }
    blocks.push(css.slice(open + 1, close));
    at = css.indexOf(marker, close);
  }
  return blocks.join('\n');
}

const users = [
  { uid: 'u-resp', email: 'ana@x.test', name: 'Ana', role: 'responder', active: true, team: null },
  { uid: 'u-res', email: 'resident@x.test', name: 'Res', role: 'resident', active: true, team: null },
];
const teams = [{ id: 'tA', name: 'Team A' }];

describe('UsersPage team assignment (F03)', () => {
  beforeEach(() => {
    h.api.mockReset().mockImplementation(async (path: string) => {
      if (path === '/users') return users;
      if (path === '/teams') return teams;
      return { uid: 'u-resp', team: 'tA' };
    });
  });

  it('a responder without a team can be linked to one, through the API', async () => {
    render(<MemoryRouter><UsersPage /></MemoryRouter>);
    const select = await screen.findByRole('combobox', { name: 'Team for Ana' });
    fireEvent.change(select, { target: { value: 'tA' } });
    expect(await screen.findByText('Are you sure?')).toBeInTheDocument();
    expect(h.api).not.toHaveBeenCalledWith('/users/u-resp', expect.anything());
    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    await waitFor(() => expect(h.api).toHaveBeenCalledWith('/users/u-resp', { method: 'PATCH', body: { team: 'tA' } }));
    expect(await screen.findByText('Team assigned.')).toBeInTheDocument();
  });

  it('residents have no team control', async () => {
    render(<MemoryRouter><UsersPage /></MemoryRouter>);
    await screen.findByRole('combobox', { name: 'Team for Ana' });
    expect(screen.queryByRole('combobox', { name: 'Team for Res' })).toBeNull();
  });

  it('keeps a very long name and email in one staff row with its controls (F01)', async () => {
    const longName = 'Ana '.repeat(15).trim();
    const longEmail = `${'a'.repeat(60)}@${'b'.repeat(40)}.test`;
    h.api.mockReset().mockImplementation(async (path: string) => {
      if (path === '/users') return [{ uid: 'u-long', email: longEmail, name: longName, role: 'responder', active: true, team: null }];
      if (path === '/teams') return teams;
      return {};
    });
    const { container } = render(<MemoryRouter><UsersPage /></MemoryRouter>);
    const row = (await screen.findByRole('list', { name: 'Users' })).querySelector('.management-row');
    expect(row).not.toBeNull();
    expect(row!.querySelector('.management-identity')).toHaveTextContent(longName);
    expect(row!.querySelector('.management-identity small')).toHaveTextContent(longEmail);
    expect(row!.querySelector('.management-actions')).not.toBeNull();
    expect(screen.getByRole('combobox', { name: `Team for ${longName}` })).toBeInTheDocument();
    expect(container.querySelectorAll('.management-row')).toHaveLength(1);
  });

  it('stacks the staff row on phone widths, with a full-width team select and wrapping actions (F01)', () => {
    const phone = phoneRules(stylesCss);
    expect(phone).toMatch(/\.management-row\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*;/);
    expect(phone).toMatch(/\.management-actions\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(phone).toMatch(/\.management-actions\s*\{[^}]*flex-direction:\s*row/);
    expect(phone).toMatch(/\.management-team\s*\{[^}]*width:\s*100%/);
    expect(phone).toMatch(/\.management-team select\s*\{[^}]*width:\s*100%/);
    expect(stylesCss).toMatch(/\.management-identity\s*\{[^}]*min-width:\s*0[^}]*overflow-wrap:\s*anywhere/);
  });
});
