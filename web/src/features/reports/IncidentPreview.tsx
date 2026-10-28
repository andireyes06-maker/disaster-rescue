import { Link } from 'react-router-dom';
import { MapPin, CircleHelp, Camera, type LucideIcon } from 'lucide-react';
import { REPORT_TYPE_LIST } from '../../lib/reportTypes';
import { useReportUpdates } from './useReport';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import VerifiedBadge from './VerifiedBadge';
import Banner from '../../components/calm/Banner';
import { formatTime } from './format';
import { nextStep, canActOnReports } from './workflow';
import type { Report, ReportType } from '../../types/domain';

const SEVERITY_LABELS: Record<NonNullable<Report['severity']>, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };

// Decorative category icons and tile classes come from the registry. The type name is always printed beside them.
export const TYPE_ICONS = Object.fromEntries(REPORT_TYPE_LIST.map((t) => [t.key, t.icon])) as Record<ReportType, LucideIcon>;
export const TYPE_CLASS = Object.fromEntries(REPORT_TYPE_LIST.map((t) => [t.key, t.className])) as Record<ReportType, string>;

interface IncidentPreviewProps {
  report: Report;
  reporter?: { name?: string | null; phone?: string | null };
  canAct: boolean;
  outsideFilters: boolean;
  onClearFilters: () => void;
}

const ACTION_LABEL = { verify: 'Validate report', assign: 'Assign team', close: 'Close report' } as const;

// Rendered with key={report.id} so the rescue-updates subscription follows the selection.
export default function IncidentPreview({ report, canAct, outsideFilters, onClearFilters, reporter }: IncidentPreviewProps) {
  const updates = useReportUpdates(report.id);
  const step = nextStep(report);
  const Icon = TYPE_ICONS[report.type] || CircleHelp;
  const photos = report.photos?.length ?? 0;
  const actionTo = `/incidents/${report.id}`;

  return (
    <article className="preview" aria-labelledby="preview-title">
      {outsideFilters && (
        <Banner tone="info" role="status">
          This report is not in the current results.{' '}
          <button type="button" className="btn btn--ghost" onClick={onClearFilters}>Clear filters</button>
        </Banner>
      )}

      <header className="preview__head">
        <span className={`type-icon ${TYPE_CLASS[report.type] || 'type-icon--other'}`} aria-hidden="true"><Icon /></span>
        <div className="preview__title">
          <h2 id="preview-title" tabIndex={-1}>{report.type.charAt(0).toUpperCase() + report.type.slice(1)} report</h2>
          <p className="preview__place"><MapPin aria-hidden="true" /> {report.addressText || 'No address given'}</p>
          <div className="preview__badges">
            <PriorityBadge priority={report.priority} />
            <StatusBadge status={report.status} />
            <VerifiedBadge verified={report.verified} />
          </div>
        </div>
      </header>

      <section className="preview__section" aria-labelledby="situation-title">
        <h3 id="situation-title">Reported situation</h3>
        <p className="plain preview__description">{report.description}</p>
        <dl className="preview__facts">
          <div><dt>Reported</dt><dd>{formatTime(report.createdAt)}</dd></div>
          <div><dt>Verification</dt><dd>{report.verified ? 'Verified' : 'Pending'}</dd></div>
          <div>
            <dt>Evidence</dt>
            <dd>{photos > 0 ? <span className="evidence"><Camera aria-hidden="true" /> {photos} {photos === 1 ? 'photo' : 'photos'}</span> : 'No photos'}</dd>
          </div>
        </dl>
        <dl className="preview__contact-facts">
          <div><dt>Reported by</dt><dd>{reporter?.name || 'Name not recorded'}{reporter?.phone && <a href={`tel:${reporter.phone}`}>{reporter.phone}</a>}</dd></div>
          <div><dt>Severity</dt><dd>{SEVERITY_LABELS[report.severity ?? 'medium']}</dd></div>
        </dl>
      </section>

      <section className="preview__next" aria-labelledby="next-title">
        <h3 id="next-title">Next step</h3>
        <p className="preview__next-title">{step.title}</p>
        <p>{step.body}</p>
        <div className="preview__actions">
          {canAct && step.action && (
            <Link className="btn" to={actionTo}>{ACTION_LABEL[step.action]}</Link>
          )}
          <Link className="preview__open" to={actionTo}>Open full report</Link>
        </div>
      </section>

      <section className="preview__section" aria-labelledby="history-title">
        <h3 id="history-title">Response history</h3>
        {updates.error && (
          <Banner tone="error" role="alert">
            Could not load progress updates.{' '}
            <button className="btn btn--ghost" type="button" onClick={updates.retry}>Try again</button>
          </Banner>
        )}
        <ol className="history">
          <li>
            <strong>Report submitted</strong>
            <span>{formatTime(report.createdAt)}</span>
          </li>
          {updates.updates.map((u) => (
            <li key={u.id}>
              <strong>{u.status}</strong>
              <span>{formatTime(u.at)}</span>
              {u.peopleRescued > 0 && <p>People rescued: {u.peopleRescued}</p>}
              {u.note && <p className="plain">{u.note}</p>}
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
