const { execSync } = require('child_process');

if (process.env.VERCEL && process.env.DATABASE_URL) {
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
}
