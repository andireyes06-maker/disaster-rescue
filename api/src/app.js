import express from 'express';
import { errorHandler } from './middleware/errorHandler.js';
import { reportsRouter } from './routes/reports.js';

const noopNotifier = { notifyUsers: async () => {}, notifyRole: async () => {} };

export function buildApp({ repo, uploader, sender, verifyToken, notifier = noopNotifier }) {
  const deps = { repo, uploader, sender, verifyToken, notifier };
  const app = express();
  app.use(express.json({ limit: '100kb' }));
  app.use('/api/reports', reportsRouter(deps));
  app.use(errorHandler);
  return app;
}
