import { useId, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, Cell, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

export interface ChartDatum {
  label: string;
  value: number;
}

interface ChartCardProps {
  title: string;
  labelHeader: string;
  data: ChartDatum[];
  chronological?: boolean;
  palette?: 'type' | 'status' | 'priority';
  /** How a time-axis label is printed. Days drop the year; months are shown as they are. */
  formatLabel?: (label: string) => string;
}

const LABEL_LIMIT = 30;
const CHART_COLORS: Record<string, string> = { flood: '#1D4ED8', fire: '#C2410C', earthquake: '#7C3AED', landslide: '#946314', other: '#64748B', critical: '#B42318', high: '#A15C00', medium: '#4F46E5', low: '#64748B', Submitted: '#64748B', 'Under Verification': '#A15C00', Verified: '#0F766E', 'Awaiting Assignment': '#95600C', 'Team Assigned': '#4F46E5', 'Rescue in Progress': '#1D4ED8', Resolved: '#0F766E', Closed: '#166534', Rejected: '#B42318', Duplicate: '#6B7280', Cancelled: '#64748B' };

// One line per bar. Long names are shortened on the axis; the full name is in the hover title and the table below.
function shortLabel(text: string): string {
  return text.length > LABEL_LIMIT ? `${text.slice(0, LABEL_LIMIT - 1)}…` : text;
}

function CategoryTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const text = payload?.value ?? '';
  return (
    <text x={x} y={y} dy={4} textAnchor="end" style={{ fontSize: '0.8125rem', fill: 'var(--color-muted)' }}>
      <title>{text}</title>
      {shortLabel(text)}
    </text>
  );
}

// Each chart offers a named, keyboard-accessible data table for exact values.
export default function ChartCard({ title, labelHeader, data, chronological = false, formatLabel, palette }: ChartCardProps) {
  const titleId = useId();
  const [axisWidth, setAxisWidth] = useState(210);
  return (
    <section className="card chart-card" aria-labelledby={titleId}>
      <h2 id={titleId} className="chart-card__title">{title}</h2>
      {data.length === 0 ? (
        <p className="empty">No data for this range.</p>
      ) : (
        <>
          <div role="img" aria-label={`${title} chart`} className="chart-card__chart">
            {chronological ? <ResponsiveContainer width="100%" height={250}><AreaChart data={data} margin={{ top: 16, right: 18, bottom: 8, left: -22 }}><CartesianGrid vertical={false} stroke="var(--color-mist)" /><XAxis dataKey="label" tick={{ fontSize: '0.8125rem' }} tickFormatter={(label: string) => (formatLabel ? formatLabel(label) : label.slice(5))} /><YAxis allowDecimals={false} tick={{ fontSize: '0.8125rem' }} /><Tooltip /><Area type="monotone" dataKey="value" stroke="#6D28D9" fill="#EFE8FF" strokeWidth={2} isAnimationActive={false} /></AreaChart></ResponsiveContainer> : <ResponsiveContainer width="100%" height={Math.max(240, data.length * 40 + 24)} onResize={(width) => setAxisWidth(width < 400 ? 140 : 210)}>
              <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <CartesianGrid horizontal={false} stroke="var(--color-mist)" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: '0.8125rem' }} />
                <YAxis type="category" dataKey="label" width={axisWidth} tick={<CategoryTick />} interval={0} tickLine={false} />
                <Bar dataKey="value" radius={[0, 5, 5, 0]} maxBarSize={22} isAnimationActive={false}>{data.map(d => <Cell key={d.label} fill={palette ? CHART_COLORS[d.label] || '#6D28D9' : '#6D28D9'} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>}
          </div>
          <details className="chart-card__data"><summary>View data table</summary><div className="table-wrap" tabIndex={0} aria-labelledby={titleId}>
            <table aria-labelledby={titleId}>
              <thead>
                <tr><th scope="col">{labelHeader}</th><th scope="col">Count</th></tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.label}><td>{d.label}</td><td>{d.value}</td></tr>
                ))}
              </tbody>
            </table>
          </div></details>
        </>
      )}
    </section>
  );
}
