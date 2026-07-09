const { execSync } = require('child_process');

execSync('npx prisma generate', { stdio: 'inherit' });

if (process.env.VERCEL) {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    console.error(
      `\nFATAL: Missing Vercel environment variables: ${missing.join(', ')}\n`
      + 'Add them in Vercel → Project → Settings → Environment Variables\n'
      + 'Apply to Production, Preview, and Development.\n'
      + 'Or run: VERCEL_TOKEN=xxx node scripts/vercel-sync-env.cjs\n',
    );
    process.exit(1);
  }
}

if (process.env.VERCEL && process.env.DATABASE_URL) {
  try {
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
  } catch (error) {
    console.warn('Neon schema sync skipped:', error.message);
  }
}
