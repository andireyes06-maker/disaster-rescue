export async function record(repo, { actorUid, action, reportId, before, after }) {
  await repo.addAudit({ actorUid, action, reportId, before, after, at: new Date() });
}
export const auditService = { record };
