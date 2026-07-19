// Capture crashes that happen before any other code runs (e.g. bad native module, wrong Prisma binary)
process.on('uncaughtException', (err) => {
  console.error('[FATAL uncaughtException]', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL unhandledRejection]', reason);
  process.exit(1);
});

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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
