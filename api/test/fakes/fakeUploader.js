import { sniffImageType } from '../../src/domain/validation.js';

export function createFakeUploader() {
  let n = 0;
  const uploader = {
    calls: [],
    failNext: false,
    async upload(files) {
      uploader.calls.push(files);
      if (uploader.failNext) {
        uploader.failNext = false;
        throw new Error('fake upload failure');
      }
      return files.map((f) => ({
        url: `https://fake.cdn/photo-${++n}.jpg`,
        sizeBytes: f.buffer.length,
        mimeType: sniffImageType(f.buffer),
      }));
    },
  };
  return uploader;
}
