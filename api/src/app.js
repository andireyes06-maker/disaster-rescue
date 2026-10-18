import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler.js';
import { reportsRouter } from './routes/reports.js';
import { teamsRouter } from './routes/teams.js';
import { statsRouter } from './routes/stats.js';
import { exportRouter } from './routes/export.js';
import { auditRouter } from './routes/audit.js';
import { usersRouter } from './routes/users.js';
import { notificationsRouter } from './routes/notifications.js';
import { publicRouter } from './routes/public.js';
import { adminRouter } from './routes/admin.js';
import { createNotifier } from './services/notificationService.js';

const DEFAULT_RATE_LIMIT = { windowMs: 15 * 60 * 1000, limit: 300 };

export function buildApp({
  repo, uploader, sender, verifyToken, auth,
  notifier = createNotifier({ repo, sender }),
  corsOrigins = [],
  rateLimit: rateOptions = DEFAULT_RATE_LIMIT,
  trustProxy = 0,
}) {
  const deps = { repo, uploader, sender, verifyToken, notifier, auth };
  const app = express();
  app.disable('x-powered-by');
  // Behind a host's proxy, count clients by their forwarded address, not the proxy's.
  app.set('trust proxy', trustProxy);
  app.use(helmet());
  // Only configured origins may call the API from a browser. Others get no CORS header.
  // Content-Disposition is exposed so the browser can keep the server's export filename (demo exports say so).
  app.use(cors({ origin: corsOrigins.length ? corsOrigins : false, exposedHeaders: ['Content-Disposition'] }));
  app.use(rateLimit({ ...rateOptions, standardHeaders: 'draft-7', legacyHeaders: false }));
  app.use(express.json({ limit: '100kb' }));
  // Public liveness check for the host. Reveals nothing about data.
  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api/public', publicRouter(deps));
  app.use('/api/admin', adminRouter(deps));
  app.use('/api/reports', reportsRouter(deps));
  app.use('/api/teams', teamsRouter(deps));
  app.use('/api/users', usersRouter(deps));
  app.use('/api/stats', statsRouter(deps));
  app.use('/api/export', exportRouter(deps));
  app.use('/api/audit', auditRouter(deps));
  app.use('/api', notificationsRouter(deps));
  // Any other /api path is unknown. Answer in the same JSON shape as every other error.
  app.use('/api', (req, res) => res.status(404).json({ error: 'not_found' }));
  app.use(errorHandler);
  return app;
}
