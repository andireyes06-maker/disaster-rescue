import type { Report } from '../../types/domain';

export function makeReport(over: Partial<Report> = {}): Report {
  return {
    id: 'r1',
    type: 'flood',
    description: 'Water is rising',
    status: 'Submitted',
    verified: false,
    priority: 'medium',
    classification: '',
    location: { lat: 10, lng: 20, source: 'gps' },
    coarseLocation: { lat: 10, lng: 20 },
    addressText: '12 River Road',
    contact: { name: 'Ana', phone: '555-0100' },
    photos: [],
    possibleDuplicates: [],
    createdAt: new Date('2026-01-01T10:00:00Z'),
    updatedAt: new Date('2026-01-01T10:00:00Z'),
    ...over,
  };
}
