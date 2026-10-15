import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler.js';
import { reportsRouter } from './routes/reports.js';
import { teamsRouter } from './routes/teams.js';
import { usersRouter } from './routes/users.js';
import { notificationsRouter } from './routes/notifications.js';
import { createNotifier } from './services/notificationService.js';

const DEFAULT_RATE_LIMIT = { windowMs: 15 * 60 * 1000, limit: 300 };

export function buildApp({
  repo, uploader, sender, verifyToken, auth,
  notifier = createNotifier({ repo, sender }),
  corsOrigins = [],
  rateLimit: rateOptions = DEFAULT_RATE_LIMIT,
}) {
  const deps = { repo, uploader, sender, verifyToken, notifier, auth };
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  // Only configured origins may call the API from a browser. Others get no CORS header.
  app.use(cors({ origin: corsOrigins.length ? corsOrigins : false }));
  app.use(rateLimit({ ...rateOptions, standardHeaders: 'draft-7', legacyHeaders: false }));
  app.use(express.json({ limit: '100kb' }));
  app.use('/api/reports', reportsRouter(deps));
  app.use('/api/teams', teamsRouter(deps));
  app.use('/api/users', usersRouter(deps));
  app.use('/api', notificationsRouter(deps));
  app.use(errorHandler);
  return app;
}
