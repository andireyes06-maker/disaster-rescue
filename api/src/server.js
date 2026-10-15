import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';
import { loadConfig, validateConfig } from './config.js';
import { buildApp } from './app.js';
import { createFirestoreRepo } from './adapters/firestoreRepo.js';
import { createCloudinaryUploader } from './adapters/cloudinaryUploader.js';
import { createFcmSender } from './adapters/fcmSender.js';

const config = validateConfig(loadConfig());

initializeApp({
  ...(config.serviceAccountPath
    ? { credential: cert(JSON.parse(readFileSync(config.serviceAccountPath, 'utf8'))) }
    : {}),
  ...(config.firebaseProjectId ? { projectId: config.firebaseProjectId } : {}),
});

const verifyToken = async (token) => {
  const claims = await getAuth().verifyIdToken(token, true);
  return { uid: claims.uid, role: claims.role, active: claims.active };
};

const app = buildApp({
  repo: createFirestoreRepo(getFirestore()),
  uploader: createCloudinaryUploader(config.cloudinary),
  sender: createFcmSender(getMessaging()),
  verifyToken,
  auth: getAuth(),
  corsOrigins: config.corsOrigins,
  trustProxy: config.trustProxy,
});

app.listen(config.port, () => console.log(`API listening on ${config.port}`));
