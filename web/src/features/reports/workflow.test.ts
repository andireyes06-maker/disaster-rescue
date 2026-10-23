import { describe, it, expect } from 'vitest';
import { awaitingVerify, canAssign, canActOnReports, nextStep } from './workflow';
import type { ReportStatus } from '../../types/domain';

describe('workflow predicates', () => {
  it.each<[ReportStatus, boolean, boolean]>([
    ['Submitted', true, false],
    ['Under Verification', true, false],
    ['Verified', false, true],
    ['Awaiting Assignment', false, true],
    ['Team Assigned', false, false],
  ])('%s: verify %s, assign %s', (status, verify, assign) => {
    expect(awaitingVerify({ status })).toBe(verify);
    expect(canAssign({ status })).toBe(assign);
  });

  it('gives the verify step for a submitted report and the assign step for a verified one', () => {
    expect(nextStep({ status: 'Submitted' }).action).toBe('verify');
    expect(nextStep({ status: 'Verified' }).action).toBe('assign');
  });

  it('offers no staff action for closed or in-progress reports', () => {
    expect(nextStep({ status: 'Rescue in Progress' }).action).toBeNull();
    expect(nextStep({ status: 'Closed' }).action).toBeNull();
  });

  it('does not describe assignment alone as a rescue already in progress', () => {
    expect(nextStep({ status: 'Team Assigned' }).title).toBe('Team assigned');
    expect(nextStep({ status: 'Rescue in Progress' }).title).toBe('Rescue in progress');
  });

  it('offers close for a resolved report and frees the team with it', () => {
    expect(nextStep({ status: 'Resolved' }).action).toBe('close');
  });

  it('lets dispatchers and admins act, and never DMOs or residents', () => {
    expect(canActOnReports('dispatcher')).toBe(false);
    expect(canActOnReports('admin')).toBe(true);
    expect(canActOnReports('dmo')).toBe(false);
    expect(canActOnReports('resident')).toBe(false);
  });
});
