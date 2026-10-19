import { useEffect, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { ArrowUpRight, Pause, Play, Radio } from 'lucide-react';

const CHAPTERS = [
  { label: 'Report', start: 0, end: 5, description: 'Share the situation. Pin the location.' },
  { label: 'Coordinate', start: 5, end: 10.5, description: 'Review the details. Connect a response team.' },
  { label: 'Stay informed', start: 10.5, end: 16, description: 'Follow your report as the response progresses.' },
];

// Reduced motion and save-data use a poster; explicit play remains available.
export default function LandingFilm({ fallback }: { fallback: ReactNode }) {
  const container = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const pendingSeek = useRef<number | null>(null);
  const restoreFocus = useRef(false);
  const [chapter, setChapter] = useState(0);
  const [automatic, setAutomatic] = useState(false);
  const [manual, setManual] = useState(false);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (failed && restoreFocus.current) container.current?.focus();
  }, [failed]);

  const mediaFailed = () => {
    restoreFocus.current = !!container.current?.contains(document.activeElement);
    setFailed(true);
  };

  useEffect(() => {
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
    const update = () => {
      setAutomatic(!preference?.matches && !connection?.saveData);
      setManual(false);
      setPlaying(false);
      setBuffering(false);
      setChapter(0);
      pendingSeek.current = null;
      CHAPTERS.forEach((_, index) => container.current?.style.setProperty(`--chapter-${index}`, '0'));
    };
    update();
    preference?.addEventListener('change', update);
    connection?.addEventListener('change', update);
    const onVisibility = () => setPageVisible(!document.hidden);
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .1 }) : undefined;
    if (container.current) observer?.observe(container.current);
    return () => {
      preference?.removeEventListener('change', update);
      connection?.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', onVisibility);
      observer?.disconnect();
    };
  }, []);

  const enabled = automatic || manual;
  const shouldPlay = enabled && !paused && visible && pageVisible && !failed;
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    let current = true;
    if (shouldPlay) {
      setBuffering(true);
      element.play()?.catch(() => { if (current) { setPlaying(false); setBuffering(false); } });
    } else { setBuffering(false); element.pause(); }
    return () => { current = false; element.pause(); };
  }, [shouldPlay, enabled]);
  const playbackRequested = playing || (shouldPlay && buffering);

  const syncProgress = () => {
    const element = video.current;
    if (!element) return;
    const index = Math.max(0, element.currentTime >= 10.5 ? 2 : element.currentTime >= 5 ? 1 : 0);
    setChapter(previous => previous === index ? previous : index);
    CHAPTERS.forEach((item, i) => {
      const progress = Math.max(0, Math.min(1, (element.currentTime - item.start) / (item.end - item.start)));
      container.current?.style.setProperty(`--chapter-${i}`, String(progress));
    });
  };
  const seekChapter = (index: number) => {
    pendingSeek.current = CHAPTERS[index].start;
    flushSync(() => { setChapter(index); setManual(true); setPaused(false); });
    const element = video.current;
    if (!element) return;
    if (element.readyState >= 1) {
      element.currentTime = pendingSeek.current;
      pendingSeek.current = null;
      syncProgress();
    }
    element.play()?.catch(() => setPlaying(false));
  };

  if (failed) return <section ref={container} tabIndex={-1} className="service-film-fallback" aria-label="Response workflow">
    <p role="status">The video is unavailable. You can still explore this illustrated response.</p>
    {fallback}
  </section>;
  return <figure ref={container} className="response-scene response-film" aria-label="Report-to-response video">
    <figcaption><span><Radio size={15} aria-hidden="true" />A connected response</span><span>From first report to field update</span></figcaption>
    <div className="response-film__screen">
      {enabled ? <video ref={video} src="/media/rescue-response.mp4" poster="/media/rescue-response-poster.png" preload="metadata" autoPlay={shouldPlay} muted playsInline loop aria-describedby="response-film-summary"
        onTimeUpdate={syncProgress} onSeeked={syncProgress} onLoadedMetadata={() => {
          if (pendingSeek.current !== null && video.current) {
            video.current.currentTime = pendingSeek.current;
            pendingSeek.current = null;
          }
          syncProgress();
        }}
        onWaiting={() => setBuffering(shouldPlay)}
        onPlaying={() => { setPlaying(true); setBuffering(false); }} onPause={() => { setPlaying(false); setBuffering(false); }} onError={mediaFailed} />
        : <img src="/media/rescue-response-poster.png" alt="Incident map, resident report, and team assignment." width={1280} height={720} onError={mediaFailed} />}
    </div>
    <div className="response-film__chapters" role="group" aria-label="Explore the response workflow">
      {CHAPTERS.map((item, index) => <button key={item.label} type="button" className="response-film__chapter" aria-pressed={chapter === index}
        aria-label={`Watch: 0${index + 1} ${item.label}`} onClick={() => seekChapter(index)}>
        <span className="response-film__chapter-track" aria-hidden="true"><span style={{ transform: `scaleX(var(--chapter-${index}, 0))` }} /></span>
        <span className="response-film__chapter-label"><span><small>0{index + 1}</small>{' '}{item.label}</span><ArrowUpRight size={13} aria-hidden="true" /></span>
      </button>)}
    </div>
    <div className="response-film__footer"><div><p id="response-film-summary">Pin an incident. Connect a team. Follow the response.</p><p className="response-film__chapter-description" role={buffering && shouldPlay ? 'status' : undefined}>{buffering && shouldPlay ? 'Loading video…' : CHAPTERS[chapter].description}</p></div>
      <button type="button" className="response-film__control" aria-label={playbackRequested ? 'Pause video' : 'Play video'} onClick={() => {
        if (playbackRequested) setPaused(true);
        else {
          // Mount the source and play within the gesture, including Safari and autoplay refusal.
          flushSync(() => { setManual(true); setPaused(false); });
          video.current?.play()?.catch(() => setPlaying(false));
        }
      }}>{playbackRequested ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}{playbackRequested ? 'Pause' : 'Play video'}</button>
    </div>
  </figure>;
}
