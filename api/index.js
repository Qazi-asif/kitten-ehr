import '../server/src/loadEnv.js';

const missing = ['DATABASE_URL', 'JWT_SECRET'].filter((key) => !process.env[key]?.trim());
if (missing.length) {
  console.error(`FATAL: Missing environment variables on Vercel: ${missing.join(', ')}`);
}

export { default } from '../server/src/app.js';
