const { execSync } = require('child_process');

execSync('npx prisma generate', { stdio: 'inherit' });

if (process.env.VERCEL && process.env.DATABASE_URL) {
  try {
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
  } catch (error) {
    console.warn('Neon schema sync skipped:', error.message);
  }
}
