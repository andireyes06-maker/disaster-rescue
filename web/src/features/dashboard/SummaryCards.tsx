import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { fetchStats, type Stats } from '../analytics/stats';
import Banner from '../../components/calm/Banner';
import Card from '../../components/calm/Card';

interface Summary {
  stats: Stats;
  teams: number;
}

export default function SummaryCards() {
  const [result, setResult] = useState<{ summary?: Summary; error?: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchStats(), api('/teams')])
      .then(([stats, teams]) => {
        if (!cancelled) setResult({ summary: { stats, teams: Array.isArray(teams) ? teams.length : 0 } });
      })
      .catch(() => { if (!cancelled) setResult({ error: true }); });
    return () => { cancelled = true; };
  }, []);

  if (!result) return <p role="status" className="loading">Loading...</p>;
  if (result.error || !result.summary) {
    return <Banner tone="error" role="alert">Could not load the summary. Check your connection and try again.</Banner>;
  }

  const { stats, teams } = result.summary;
  const cards: [string, number][] = [
    ['Total reports', stats.total],
    ['Ongoing', stats.open],
    ['Resolved', stats.resolved],
    ['Rescue teams', teams],
  ];

  return (
    <div className="summary">
      {cards.map(([label, n]) => (
        <Card key={label} className="summary__card">
          <span className="summary__label">{label}</span>
          <strong className="summary__value">{n}</strong>
        </Card>
      ))}
    </div>
  );
}
