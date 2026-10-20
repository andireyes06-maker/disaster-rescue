import { buildScenario } from './scenario.mjs';

const LANDMARKS = [
  'Willow Lane, east of the footbridge', 'Market Street, covered stalls',
  'Hillside Road, north access bend', 'Acacia Lane, residential entrance',
  'Riverwalk, lower-floor homes', 'Civic Square, community meeting hall',
  'Riverbend Lane, upper-floor homes', 'Central Walk, west entrance',
  'Dock Road, warehouse courtyard', 'Hillside Road, south approach',
  'Elm Court, neighborhood meeting point', 'Riverside footbridge, east approach',
  'Market Street, north storage row', 'Civic Square, east building entrance',
  'Riverbend Lane, waterside homes', 'Hillside Road, blocked access lane',
  'Acacia Lane, corner household', 'Elm Court, raised meeting point',
  'Dock Road, south warehouse', 'Civic Square, meeting hall',
  'Willow Lane, river-facing homes', 'Central Walk, east entrance',
  'Riverbend Lane, neighboring household', 'Elm Court, south entrance',
];

// Fictional Harbor content for an isolated presentation workspace. QA keeps its
// own project and records. No generated picture is represented as incident evidence.
export function buildPresentationScenario(options) {
  const scenario = buildScenario(options);
  return {
    ...scenario,
    reports: scenario.reports.map((report, index) => ({
      ...report,
      addressText: `${report.addressText} · ${LANDMARKS[index]}`,
      photos: [],
      ...(report.status === 'Rejected' ? { rejectionReason: 'The reported location could not be confirmed. Submit a new report with a map pin and a nearby landmark if assistance is still needed.' } : {}),
    })),
  };
}
