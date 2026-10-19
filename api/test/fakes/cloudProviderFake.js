// In-memory stand-in for the media provider (Cloudinary). No network. Faults are injected explicitly and are
// labelled [injected] in the tests that use them. The provider refuses to overwrite, and it never reuses an id it has seen.
import { sniffImageType } from '../../src/domain/validation.js';

export function createCloudProviderFake() {
  const used = new Set(); // every id ever offered to an upload (no overwrite, no reuse)
  const accepted = new Map(); // publicId -> { bytes }: stored and retrievable
  const held = new Map(); // publicId -> resolve(): an upload still in flight, not yet accepted
  const destroyLog = []; // every destroy call, in order
  const faults = { unknownNext: 0, lostResponseNext: 0, holdNext: 0, destroyErrorNext: 0 };

  const provider = {
    accepted, held, used, destroyLog, faults,

    // Pre-reserved ids are required: the provider never picks its own id.
    async upload(files, { publicIds } = {}) {
      if (!publicIds || publicIds.length !== files.length) throw new Error('[fake] publicIds must match files');
      const out = [];
      for (let i = 0; i < files.length; i++) {
        const id = publicIds[i];
        const f = files[i];
        if (used.has(id)) throw new Error(`[fake] id already used, refusing to overwrite: ${id}`);
        used.add(id);
        if (faults.unknownNext > 0) { faults.unknownNext--; throw new Error('[injected] upload timed out, outcome unknown'); }
        if (faults.lostResponseNext > 0) {
          faults.lostResponseNext--;
          accepted.set(id, { bytes: f.buffer.length });
          throw new Error('[injected] upload accepted but the response was lost');
        }
        if (faults.holdNext > 0) {
          faults.holdNext--;
          await new Promise((resolve) => held.set(id, resolve));
        }
        accepted.set(id, { bytes: f.buffer.length });
        out.push({ publicId: id, url: `https://fake.cdn/${encodeURIComponent(id)}.jpg`, sizeBytes: f.buffer.length, mimeType: sniffImageType(f.buffer) });
      }
      return out;
    },

    // Completes an upload that was held in flight. It lands only now, which is the late-upload case.
    land(publicId) {
      const resolve = held.get(publicId);
      if (!resolve) throw new Error(`[fake] nothing held for ${publicId}`);
      held.delete(publicId);
      resolve();
    },

    // Eager removal used by the request path. Removing an absent asset is a no-op.
    async remove(items) { for (const it of items) accepted.delete(it.publicId); },

    // 'ok' when stored, 'not_found' when absent (including an upload still in flight), error when injected.
    async destroy(publicId) {
      destroyLog.push(publicId);
      if (faults.destroyErrorNext > 0) { faults.destroyErrorNext--; throw new Error('[injected] destroy failed'); }
      if (accepted.delete(publicId)) return 'ok';
      return 'not_found';
    },
  };
  return provider;
}
