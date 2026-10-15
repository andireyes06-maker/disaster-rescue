import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { loadConfig, validateConfig } from './config.js';
import { buildApp } from './app.js';
import { createFirestoreRepo } from './adapters/firestoreRepo.js';
import { createCloudinaryUploader } from './adapters/cloudinaryUploader.js';
import { createFcmSender } from './adapters/fcmSender.js';

const config = validateConfig(loadConfig());

admin.initializeApp({
  ...(config.serviceAccountPath
    ? { credential: admin.credential.cert(JSON.parse(readFileSync(config.serviceAccountPath, 'utf8'))) }
    : {}),
  ...(config.firebaseProjectId ? { projectId: config.firebaseProjectId } : {}),
});

const verifyToken = async (token) => {
  const claims = await admin.auth().verifyIdToken(token, true);
  return { uid: claims.uid, role: claims.role, active: claims.active };
};

const app = buildApp({
  repo: createFirestoreRepo(getFirestore()),
  uploader: createCloudinaryUploader(config.cloudinary),
  sender: createFcmSender(admin.messaging()),
  verifyToken,
  auth: admin.auth(),
});

app.listen(config.port, () => console.log(`API listening on ${config.port}`));
