import { describe, it, expect } from 'vitest';
import { STATUS as S, canTransition, assertTransition, isOpen } from '../../src/domain/workflow.js';

describe('workflow', () => {
  it('allows the happy path with the right roles', () => {
    expect(canTransition(S.SUBMITTED, S.UNDER_VERIFICATION, 'dispatcher')).toBe(true);
    expect(canTransition(S.UNDER_VERIFICATION, S.VERIFIED, 'dispatcher')).toBe(true);
    expect(canTransition(S.VERIFIED, S.AWAITING_ASSIGNMENT, 'dispatcher')).toBe(true);
    expect(canTransition(S.AWAITING_ASSIGNMENT, S.TEAM_ASSIGNED, 'dispatcher')).toBe(true);
    expect(canTransition(S.TEAM_ASSIGNED, S.IN_PROGRESS, 'responder')).toBe(true);
    expect(canTransition(S.IN_PROGRESS, S.RESOLVED, 'responder')).toBe(true);
    expect(canTransition(S.RESOLVED, S.CLOSED, 'dispatcher')).toBe(true);
  });
  it('lets a resident cancel only from Submitted', () => {
    expect(canTransition(S.SUBMITTED, S.CANCELLED, 'resident')).toBe(true);
    expect(canTransition(S.VERIFIED, S.CANCELLED, 'resident')).toBe(false);
  });
  it('rejects only from Submitted or Under Verification', () => {
    expect(canTransition(S.SUBMITTED, S.REJECTED, 'dispatcher')).toBe(true);
    expect(canTransition(S.UNDER_VERIFICATION, S.REJECTED, 'dispatcher')).toBe(true);
    expect(canTransition(S.VERIFIED, S.REJECTED, 'dispatcher')).toBe(false);
  });
  it('409 on skipped steps', () => {
    expect(() => assertTransition(S.SUBMITTED, S.RESOLVED, 'dispatcher')).toThrow(expect.objectContaining({ status: 409 }));
  });
  it('403 when edge exists but role is wrong', () => {
    expect(() => assertTransition(S.TEAM_ASSIGNED, S.IN_PROGRESS, 'resident')).toThrow(expect.objectContaining({ status: 403 }));
  });
  it('dmo can never transition', () => {
    for (const to of Object.values(S)) expect(canTransition(S.SUBMITTED, to, 'dmo')).toBe(false);
  });
  it('terminal states have no exits', () => {
    for (const from of [S.CLOSED, S.REJECTED, S.DUPLICATE, S.CANCELLED])
      for (const to of Object.values(S)) expect(canTransition(from, to, 'dispatcher')).toBe(false);
  });
  it('isOpen', () => { expect(isOpen(S.VERIFIED)).toBe(true); expect(isOpen(S.CLOSED)).toBe(false); });
});
