import { Waves, Flame, Building2, Mountain, HeartPulse, TriangleAlert, Zap, CircleHelp, type LucideIcon } from 'lucide-react';
import type { ReportType } from '../types/domain';

// The report types, in display order. The API (api/src/domain/reportTypes.js) and the phone app
// (mobile/lib/data/report_models.dart) keep the same keys and labels; api/test/domain/reportTypes.parity.test.js checks them.
// Icons are decorative: the label is always printed beside them.
export interface ReportTypeMeta {
  key: ReportType;
  label: string;
  description: string;
  icon: LucideIcon;
  /** The tinted icon tile class defined in styles.css. */
  className: string;
}

export const REPORT_TYPE_LIST: readonly ReportTypeMeta[] = [
  { key: 'flood', label: 'Flood', description: 'Rising water or flooding', icon: Waves, className: 'type-icon--flood' },
  { key: 'fire', label: 'Fire', description: 'Flames, smoke or a fire', icon: Flame, className: 'type-icon--fire' },
  { key: 'earthquake', label: 'Earthquake', description: 'Ground shaking or damage', icon: Building2, className: 'type-icon--earthquake' },
  { key: 'landslide', label: 'Landslide', description: 'Moving soil or blocked slopes', icon: Mountain, className: 'type-icon--landslide' },
  { key: 'medical', label: 'Lifeline', description: 'Someone needs urgent medical help', icon: HeartPulse, className: 'type-icon--medical' },
  { key: 'road_hazard', label: 'Roadblock', description: 'Blocked, damaged or unsafe road', icon: TriangleAlert, className: 'type-icon--road_hazard' },
  { key: 'power_line', label: 'Live Wire', description: 'Fallen, sparking or damaged power line', icon: Zap, className: 'type-icon--power_line' },
  { key: 'other', label: 'Other', description: 'Something else. You will describe it next', icon: CircleHelp, className: 'type-icon--other' },
];

const OTHER = REPORT_TYPE_LIST[REPORT_TYPE_LIST.length - 1];

/** The entry for a key. A key this build does not know (or an empty one) reads as Other. */
export function typeMeta(type: string | undefined | null): ReportTypeMeta {
  return REPORT_TYPE_LIST.find((t) => t.key === type) ?? OTHER;
}

/** The name people see. An Other report with typed text reads "Other: gas leak". */
export function typeLabel(type: string | undefined | null, typeDetail?: string | null): string {
  const meta = typeMeta(type);
  return meta.key === 'other' && typeDetail ? `Other: ${typeDetail}` : meta.label;
}
