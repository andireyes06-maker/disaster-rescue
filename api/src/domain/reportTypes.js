// The report types, in display order. Web (web/src/lib/reportTypes.ts) and the phone app
// (mobile/lib/data/report_models.dart) keep the same keys and labels; api/test/domain/reportTypes.parity.test.js checks them.
export const REPORT_TYPES = Object.freeze([
  { key: 'flood', label: 'Flood', description: 'Rising water or flooding' },
  { key: 'fire', label: 'Fire', description: 'Flames, smoke or a fire' },
  { key: 'earthquake', label: 'Earthquake', description: 'Ground shaking or damage' },
  { key: 'landslide', label: 'Landslide', description: 'Moving soil or blocked slopes' },
  { key: 'medical', label: 'Lifeline', description: 'Someone needs urgent medical help' },
  { key: 'road_hazard', label: 'Roadblock', description: 'Blocked, damaged or unsafe road' },
  { key: 'power_line', label: 'Live Wire', description: 'Fallen, sparking or damaged power line' },
  { key: 'other', label: 'Other', description: 'Something else. You will describe it next' },
]);

export const REPORT_TYPE_KEYS = REPORT_TYPES.map((t) => t.key);

// The name people see. An Other report with typed text reads "Other: gas leak"; an unknown key reads "Other".
export function reportTypeLabel(type, typeDetail) {
  const known = REPORT_TYPES.find((t) => t.key === type);
  if (!known) return 'Other';
  return known.key === 'other' && typeDetail ? `Other: ${typeDetail}` : known.label;
}
