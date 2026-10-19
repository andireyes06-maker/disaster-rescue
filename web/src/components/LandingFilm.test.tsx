import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LandingFilm from './LandingFilm';

let preference: EventTarget & { matches: boolean };
let connection: EventTarget & { saveData: boolean };
let intersect: (entries: { isIntersecting: boolean }[]) => void;
const originalConnection = Object.getOwnPropertyDescriptor(navigator, 'connection');
beforeEach(() => {
  preference = Object.assign(new EventTarget(), { matches: false });
  connection = Object.assign(new EventTarget(), { saveData: false });
  vi.stubGlobal('matchMedia', () => preference);
  Object.defineProperty(navigator, 'connection', { configurable: true, value: connection });
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: typeof intersect) { intersect = callback; }
    observe() {} disconnect() {}
  });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  if (originalConnection) Object.defineProperty(navigator, 'connection', originalConnection);
  else Reflect.deleteProperty(navigator, 'connection');
});
const show = () => render(<LandingFilm fallback={<p>Static response workspace</p>} />);

describe('LandingFilm', () => {
  it('plays a muted inline loop and pauses/resumes through the visible control', async () => {
    const user = userEvent.setup(); const view = show();
    const video = view.container.querySelector('video')!;
    expect(video).toHaveAttribute('src', '/media/rescue-response.mp4');
    expect(video.muted).toBe(true); expect(video.loop).toBe(true);
    expect(video).toHaveAttribute('playsinline');
    expect(video.autoplay).toBe(true);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    fireEvent.playing(video);
    await user.click(screen.getByRole('button', { name: 'Pause video' }));
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    fireEvent.pause(video);
    await user.click(screen.getByRole('button', { name: 'Play video' }));
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    const calls = vi.mocked(HTMLMediaElement.prototype.pause).mock.calls.length;
    view.unmount();
    expect(vi.mocked(HTMLMediaElement.prototype.pause).mock.calls.length).toBeGreaterThan(calls);
  });

  it('uses only the poster with reduced motion but allows explicit playback', async () => {
    preference.matches = true; const user = userEvent.setup(); const view = show();
    expect(view.container.querySelector('video')).toBeNull();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/media/rescue-response-poster.png');
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Play video' }));
    expect(view.container.querySelector('video')).not.toBeNull();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it('does not load the video automatically with save-data enabled', () => {
    connection.saveData = true; const view = show();
    expect(view.container.querySelector('video')).toBeNull();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it('pauses offscreen and swaps to the poster when reduced motion changes', () => {
    const view = show();
    fireEvent.playing(view.container.querySelector('video')!);
    act(() => intersect([{ isIntersecting: false }]));
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    act(() => { preference.matches = true; preference.dispatchEvent(new Event('change')); });
    expect(view.container.querySelector('video')).toBeNull();
    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play video' })).toBeInTheDocument();
  });

  it('falls back to the original workspace if the video fails', () => {
    const view = show(); fireEvent.error(view.container.querySelector('video')!);
    expect(screen.getByText('Static response workspace')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('The video is unavailable');
  });

  it('preserves keyboard context when a media failure removes the focused chapter control', () => {
    const view = show();
    screen.getByRole('button', { name: 'Watch: 02 Coordinate' }).focus();
    fireEvent.error(view.container.querySelector('video')!);
    expect(screen.getByRole('region', { name: 'Response workflow' })).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Watch: 02 Coordinate' })).toBeNull();
  });

  it('keeps manual play available after the browser rejects autoplay', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error('autoplay blocked'));
    const user = userEvent.setup(); show();
    await user.click(await screen.findByRole('button', { name: 'Play video' }));
    expect(vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length).toBeGreaterThan(1);
  });

  it('lets the visitor cancel pending autoplay while the video is buffering', async () => {
    const user = userEvent.setup(); const view = show();
    const video = view.container.querySelector('video')!;
    fireEvent.waiting(video);
    expect(screen.getByRole('status')).toHaveTextContent('Loading video…');
    await user.click(screen.getByRole('button', { name: 'Pause video' }));
    expect(video.autoplay).toBe(false);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('button', { name: 'Play video' })).toBeInTheDocument();
  });

  it('seeks to a selected chapter and resumes a paused video', async () => {
    const user = userEvent.setup(); const view = show();
    const video = view.container.querySelector('video')!;
    Object.defineProperty(video, 'readyState', { configurable: true, value: 1 });
    fireEvent.playing(video);
    await user.click(screen.getByRole('button', { name: 'Pause video' }));
    fireEvent.pause(video);
    await user.click(screen.getByRole('button', { name: 'Watch: 02 Coordinate' }));
    expect(video.currentTime).toBe(5);
    expect(video.autoplay).toBe(true);
    expect(screen.getByRole('button', { name: 'Watch: 02 Coordinate' })).toHaveAttribute('aria-pressed', 'true');
    video.currentTime = 12;
    fireEvent.timeUpdate(video);
    expect(screen.getByRole('button', { name: 'Watch: 03 Stay informed' })).toHaveAttribute('aria-pressed', 'true');
    video.currentTime = 0;
    fireEvent.timeUpdate(video);
    expect(screen.getByRole('button', { name: 'Watch: 01 Report' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('loads the requested chapter after metadata arrives when starting from the reduced-motion poster', async () => {
    preference.matches = true; const user = userEvent.setup(); const view = show();
    await user.click(screen.getByRole('button', { name: 'Watch: 03 Stay informed' }));
    const video = view.container.querySelector('video')!;
    fireEvent.loadedMetadata(video);
    expect(video.currentTime).toBe(10.5);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Watch: 03 Stay informed' })).toHaveAttribute('aria-pressed', 'true');
  });
});
