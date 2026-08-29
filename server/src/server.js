// Fatal sync failures (bad native module, corrupt heap) still exit so Passenger
// can restart cleanly. Transient async failures (SMTP, AI, DB blips) must NOT
// kill the process on Hostinger — exit-on-rejection was causing intermittent
// outages under the plan resource ceiling.
process.on('uncaughtException', (err) => {
  console.error('[FATAL uncaughtException]', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

import http from 'http';
import './loadEnv.js';

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is not defined. Set it in server/.env before starting the server.');
  process.exit(1);
}

if (!process.env.JWT_SECRET?.trim()) {
  console.error('FATAL: JWT_SECRET is not defined. Set it in server/.env before starting the server.');
  process.exit(1);
}

const { default: app } = await import('./app.js');
const { syncPermissionsFromDefaults } = await import('./utils/syncPermissions.js');

try {
  const result = await syncPermissionsFromDefaults();
  console.log(
    `[permissions] Synced ${result.permissionCount} keys for ${result.roleCount} default roles`,
  );
} catch (err) {
  console.error('[permissions] Sync failed (continuing boot):', err.message || err);
}

// The scheduled-social-post runner. On by default because Hostinger runs this as
// a persistent process; SOCIAL_SCHEDULER_ENABLED=false disables it.
try {
  const { startInProcessSocialScheduler } = await import('./services/socialPostScheduler.js');
  const started = startInProcessSocialScheduler();
  console.log(
    started.started
      ? `[social-scheduler] In-process runner started, every ${Math.round(started.intervalMs / 1000)}s (pid ${process.pid})`
      : `[social-scheduler] In-process runner not started (${started.reason})`,
  );
} catch (err) {
  console.error('[social-scheduler] Failed to start:', err.message || err);
}

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  // Warn if the database is behind schema.prisma (a deploy without db push).
  // Started only once we are already accepting requests, imported dynamically
  // and inside try/catch, so neither the check nor loading it can affect boot.
  import('./utils/schemaDriftCheck.js')
    .then(({ startSchemaDriftCheck }) => startSchemaDriftCheck())
    .catch(() => {});
});
