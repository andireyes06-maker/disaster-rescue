import { useId } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';

export interface ChartDatum {
  label: string;
  value: number;
}

interface ChartCardProps {
  title: string;
  labelHeader: string;
  data: ChartDatum[];
}

// Each chart has a visible text table of the same data, for screen readers and copy-paste.
export default function ChartCard({ title, labelHeader, data }: ChartCardProps) {
  const titleId = useId();
  return (
    <section className="card chart-card" aria-labelledby={titleId}>
      <h2 id={titleId} className="chart-card__title">{title}</h2>
      {data.length === 0 ? (
        <p className="empty">No data for this range.</p>
      ) : (
        <>
          <div role="img" aria-label={`${title} chart`} className="chart-card__chart">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Bar dataKey="value" className="chart-card__bar" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="table-wrap">
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
