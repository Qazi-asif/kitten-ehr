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

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
