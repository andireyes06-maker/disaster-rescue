import { useId } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

export interface ChartDatum {
  label: string;
  value: number;
}

interface ChartCardProps {
  title: string;
  labelHeader: string;
  data: ChartDatum[];
  chronological?: boolean;
}

// Each chart has a visible text table of the same data, for screen readers and copy-paste.
export default function ChartCard({ title, labelHeader, data, chronological = false }: ChartCardProps) {
  const titleId = useId();
  return (
    <section className="card chart-card" aria-labelledby={titleId}>
      <h2 id={titleId} className="chart-card__title">{title}</h2>
      {data.length === 0 ? (
        <p className="empty">No data for this range.</p>
      ) : (
        <>
          <div role="img" aria-label={`${title} chart`} className="chart-card__chart">
            {chronological ? <ResponsiveContainer width="100%" height={250}><AreaChart data={data} margin={{ top: 16, right: 18, bottom: 8, left: -22 }}><CartesianGrid vertical={false} stroke="var(--color-mist)" /><XAxis dataKey="label" tick={{ fontSize: '0.8125rem' }} tickFormatter={(label: string) => label.slice(5)} /><YAxis allowDecimals={false} tick={{ fontSize: '0.8125rem' }} /><Tooltip /><Area type="monotone" dataKey="value" stroke="#6D28D9" fill="#EFE8FF" strokeWidth={2} isAnimationActive={false} /></AreaChart></ResponsiveContainer> : <ResponsiveContainer width="100%" height={Math.max(220, data.length * 30)}>
              <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                <CartesianGrid horizontal={false} stroke="var(--color-mist)" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: '0.8125rem' }} />
                <YAxis type="category" dataKey="label" width={138} tick={{ fontSize: '0.8125rem' }} interval={0} />
                <Bar dataKey="value" className="chart-card__bar" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>}
          </div>
          <div className="table-wrap" tabIndex={0} aria-labelledby={titleId}>
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
          </div>
        </>
      )}
    </section>
  );
}
