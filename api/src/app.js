import express from 'express';
import { errorHandler } from './middleware/errorHandler.js';
import { reportsRouter } from './routes/reports.js';
import { teamsRouter } from './routes/teams.js';
import { usersRouter } from './routes/users.js';
import { notificationsRouter } from './routes/notifications.js';
import { createNotifier } from './services/notificationService.js';

export function buildApp({ repo, uploader, sender, verifyToken, notifier = createNotifier({ repo, sender }), auth }) {
  const deps = { repo, uploader, sender, verifyToken, notifier, auth };
  const app = express();
  app.use(express.json({ limit: '100kb' }));
  app.use('/api/reports', reportsRouter(deps));
  app.use('/api/teams', teamsRouter(deps));
  app.use('/api/users', usersRouter(deps));
  app.use('/api', notificationsRouter(deps));
  app.use(errorHandler);
  return app;
}
