// Wraps firebase-admin messaging. Returns the tokens FCM says are dead, so the caller can
// remove them. Only permanent token errors count as failed; transient errors keep the device.
const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);
const MAX_TOKENS_PER_CALL = 500;

export function createFcmSender(messaging) {
  return {
    async send(tokens, { title, body, reportId }) {
      const failedTokens = [];
      for (let i = 0; i < tokens.length; i += MAX_TOKENS_PER_CALL) {
        const batch = tokens.slice(i, i + MAX_TOKENS_PER_CALL);
        const res = await messaging.sendEachForMulticast({
          tokens: batch,
          notification: { title, body },
          data: reportId ? { reportId: String(reportId) } : {},
        });
        res.responses.forEach((r, idx) => {
          if (!r.success && DEAD_TOKEN_CODES.has(r.error?.code)) failedTokens.push(batch[idx]);
        });
      }
      return { failedTokens };
    },
  };
}
