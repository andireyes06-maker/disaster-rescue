export function createFakeSender({ failedTokens = [], throws = false } = {}) {
  const sender = {
    calls: [],
    async send(tokens, payload) {
      sender.calls.push({ tokens, payload });
      if (throws) throw new Error('fake send failure');
      return { failedTokens: tokens.filter((t) => failedTokens.includes(t)) };
    },
  };
  return sender;
}
