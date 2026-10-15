import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { loadConfig } from './config.js';
import { buildApp } from './app.js';
import { createFirestoreRepo } from './adapters/firestoreRepo.js';
import { createCloudinaryUploader } from './adapters/cloudinaryUploader.js';

const config = loadConfig();

admin.initializeApp({
  ...(config.serviceAccountPath
    ? { credential: admin.credential.cert(JSON.parse(readFileSync(config.serviceAccountPath, 'utf8'))) }
    : {}),
  ...(config.firebaseProjectId ? { projectId: config.firebaseProjectId } : {}),
});

const verifyToken = async (token) => {
  const claims = await admin.auth().verifyIdToken(token);
  return { uid: claims.uid, role: claims.role, active: claims.active };
};

// Replaced by the real notification service in a later task.
const notifier = { notifyUsers: async () => {}, notifyRole: async () => {} };

const app = buildApp({
  repo: createFirestoreRepo(getFirestore()),
  uploader: createCloudinaryUploader(config.cloudinary),
  sender: null,
  verifyToken,
  notifier,
});

app.listen(config.port, () => console.log(`API listening on ${config.port}`));
