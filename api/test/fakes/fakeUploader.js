import { sniffImageType } from '../../src/domain/validation.js';

export function createFakeUploader() {
  let n = 0;
  const uploader = {
    calls: [],
    removed: [],
    failNext: false,
    async remove(items) { uploader.removed.push(...items); },
    async upload(files) {
      uploader.calls.push(files);
      if (uploader.failNext) {
        uploader.failNext = false;
        throw new Error('fake upload failure');
      }
      return files.map((f) => ({
        publicId: `fake-${n + 1}`,
        url: `https://fake.cdn/photo-${++n}.jpg`,
        sizeBytes: f.buffer.length,
        mimeType: sniffImageType(f.buffer),
      }));
    },
  };
  return uploader;
}
