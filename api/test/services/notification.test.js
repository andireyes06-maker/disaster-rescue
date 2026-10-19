import { describe, it, expect, vi, afterEach } from 'vitest';
import { createMemoryRepo } from '../fakes/memoryRepo.js';
import { createFakeSender } from '../fakes/fakeSender.js';
import { notifyUsers, notifyRole } from '../../src/services/notificationService.js';

const payload = { title: 'Team assigned', body: 'Report DR-AAAAAA was assigned', reportId: 'r1' };

describe('notifyUsers', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('stores one notification per uid and sends to every device token of those uids', async () => {
    const repo = createMemoryRepo();
    const sender = createFakeSender();
    await repo.addDevice('u1', 'tok-1');
    await repo.addDevice('u2', 'tok-2');
    await notifyUsers({ repo, sender }, ['u1', 'u2'], payload);
    expect(await repo.listNotifications('u1')).toEqual([expect.objectContaining({ title: 'Team assigned', reportId: 'r1', read: false })]);
    expect(await repo.listNotifications('u2')).toHaveLength(1);
    expect(sender.calls).toHaveLength(1);
    expect([...sender.calls[0].tokens].sort()).toEqual(['tok-1', 'tok-2']);
    expect(sender.calls[0].payload).toMatchObject({ title: 'Team assigned', body: payload.body, reportId: 'r1' });
  });

  it('still stores the in-app notification and never throws when the sender throws', async () => {
    const repo = createMemoryRepo();
    const sender = createFakeSender({ throws: true });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await repo.addDevice('u1', 'tok-1');
    await expect(notifyUsers({ repo, sender }, ['u1'], payload)).resolves.toBeUndefined();
    expect(await repo.listNotifications('u1')).toHaveLength(1);
    expect(spy).toHaveBeenCalled();
  });

  it('removes the tokens the sender reports as failed, and keeps the others', async () => {
    const repo = createMemoryRepo();
    const sender = createFakeSender({ failedTokens: ['dead'] });
    await repo.addDevice('u1', 'dead');
    await repo.addDevice('u1', 'alive');
    await notifyUsers({ repo, sender }, ['u1'], payload);
    expect(await repo.listDevices('u1')).toEqual(['alive']);
  });
});

describe('notifyRole', () => {
  it('targets only active users with that role', async () => {
    const repo = createMemoryRepo();
    const sender = createFakeSender();
    await repo.createUser('d-active', { role: 'dispatcher', active: true });
    await repo.createUser('d-off', { role: 'dispatcher', active: false });
    await repo.createUser('r-1', { role: 'responder', active: true });
    await notifyRole({ repo, sender }, 'dispatcher', payload);
    expect(await repo.listNotifications('d-active')).toHaveLength(1);
    expect(await repo.listNotifications('d-off')).toHaveLength(0);
    expect(await repo.listNotifications('r-1')).toHaveLength(0);
  });
});

it('late push failure cannot remove a token transferred to another account', async () => {
 const repo=createMemoryRepo();await repo.addDevice('first','rebound');
 const sender={send:async()=>{await repo.removeDeviceOwned('first','rebound');await repo.claimDevice('second','rebound');return{failedTokens:['rebound']};}};
 await notifyUsers({repo,sender},['first'],payload);
 expect(await repo.getDeviceOwner('rebound')).toBe('second');
});
