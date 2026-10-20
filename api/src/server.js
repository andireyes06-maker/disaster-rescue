import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';
import { loadConfig, validateConfig } from './config.js';
import { startMutationEffectsWorker } from './services/mutationEffectsService.js';
import { startReportEffectsWorker } from './services/reportEffectsService.js';
import { startPhotoCleanupWorker } from './services/photoCleanupService.js';
import { createNotifier } from './services/notificationService.js';
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
  return { uid: claims.uid, role: claims.role, active: claims.active, email: claims.email, emailVerified: claims.email_verified === true };
};

const repo = createFirestoreRepo(getFirestore());
const sender = createFcmSender(getMessaging());
const uploader = createCloudinaryUploader(config.cloudinary);
const app = buildApp({
  repo,
  uploader,
  sender,
  verifyToken,
  auth: getAuth(),
  corsOrigins: config.corsOrigins,
  trustProxy: config.trustProxy,
});

app.listen(config.port, () => console.log(`API listening on ${config.port}`));

startReportEffectsWorker({ repo, notifier: createNotifier({ repo, sender }) });
startMutationEffectsWorker({ repo, notifier: createNotifier({ repo, sender }) });
// Bounded: at most 10 ledger rows per tick, each leased inside a transaction before any destroy.
startPhotoCleanupWorker({ repo, uploader });
