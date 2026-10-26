// Shared domain types. Firestore and API data are mapped into these at the boundary.

export const REPORT_TYPES = ['flood', 'fire', 'earthquake', 'landslide', 'other'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const REPORT_STATUSES = [
  'Submitted',
  'Under Verification',
  'Verified',
  'Awaiting Assignment',
  'Team Assigned',
  'Rescue in Progress',
  'Resolved',
  'Closed',
  'Rejected',
  'Duplicate',
  'Cancelled',
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const TERMINAL_STATUSES: readonly ReportStatus[] = ['Closed', 'Rejected', 'Duplicate', 'Cancelled'];

export type Role = 'dispatcher' | 'dmo' | 'responder' | 'resident' | 'admin';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Location extends GeoPoint {
  source?: string;
}

export interface Contact {
  name: string;
  phone: string;
}

export interface Photo {
  url: string;
}

export interface Report {
  id: string;
  reference?: string;
  reporterId?: string;
  reporterName?: string | null;
  reporterPhone?: string | null;
  type: ReportType;
  description: string;
  status: ReportStatus;
  verified: boolean;
  priority: Priority;
  classification: string;
  location?: Location;
  coarseLocation?: GeoPoint;
  addressText: string;
  contact?: Contact;
  photos: Photo[];
  possibleDuplicates: string[];
  createdAt: Date;
  updatedAt: Date;
  assignedTeamId?: string;
  rejectionReason?: string;
  // Set when an administrator validates the report by hand.
  verifiedBy?: { uid: string; name: string | null };
  verifiedAt?: Date;
}

export interface Team {
  id: string;
  name: string;
  busy: boolean;
  currentReportId?: string | null;
}
