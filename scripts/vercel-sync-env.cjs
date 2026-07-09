/**
 * Sync required env vars from server/.env to Vercel (all environments).
 * Usage: VERCEL_TOKEN=xxx node scripts/vercel-sync-env.cjs
 * Get a token: https://vercel.com/account/tokens
 */
const fs = require('fs');
const path = require('path');

const PROJECT_NAME = 'kitten-ehr';
const REQUIRED_KEYS = ['JWT_SECRET', 'DATABASE_URL', 'CLIENT_URL'];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const values = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

async function vercelFetch(token, url, options = {}) {
  const response = await fetch(`https://api.vercel.com${url}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${url} failed (${response.status}): ${text}`);
  }
  return data;
}

async function main() {
  const token = process.env.VERCEL_TOKEN?.trim();
  if (!token) {
    console.error('VERCEL_TOKEN is required. Create one at https://vercel.com/account/tokens');
    process.exit(1);
  }

  const localEnv = parseEnvFile(path.join(__dirname, '../server/.env'));
  const missing = REQUIRED_KEYS.filter((key) => !localEnv[key]?.trim());
  if (missing.length) {
    console.error(`Missing in server/.env: ${missing.join(', ')}`);
    process.exit(1);
  }

  const user = await vercelFetch(token, '/v2/user');
  const teams = await vercelFetch(token, '/v2/teams');
  const teamId = teams?.teams?.[0]?.id;

  let project;
  try {
    project = await vercelFetch(
      token,
      teamId
        ? `/v9/projects/${PROJECT_NAME}?teamId=${teamId}`
        : `/v9/projects/${PROJECT_NAME}`,
    );
  } catch {
    const projects = await vercelFetch(
      token,
      teamId ? `/v9/projects?teamId=${teamId}` : '/v9/projects',
    );
    project = projects.projects?.find((entry) => entry.name === PROJECT_NAME);
  }

  if (!project?.id) {
    console.error(`Vercel project "${PROJECT_NAME}" not found.`);
    process.exit(1);
  }

  const projectId = project.id;
  const teamQuery = teamId ? `?teamId=${teamId}` : '';
  const existing = await vercelFetch(token, `/v9/projects/${projectId}/env${teamQuery}`);
  const existingByKey = new Map((existing.envs || []).map((entry) => [entry.key, entry]));

  const targets = ['production', 'preview', 'development'];
  for (const key of REQUIRED_KEYS) {
    const value = localEnv[key];
    const current = existingByKey.get(key);
    if (current) {
      await vercelFetch(token, `/v9/projects/${projectId}/env/${current.id}${teamQuery}`, {
        method: 'PATCH',
        body: JSON.stringify({ value, target: targets }),
      });
      console.log(`Updated ${key} on Vercel (${targets.join(', ')})`);
      continue;
    }

    await vercelFetch(token, `/v9/projects/${projectId}/env${teamQuery}`, {
      method: 'POST',
      body: JSON.stringify({
        key,
        value,
        type: key.includes('SECRET') || key.includes('PASSWORD') || key === 'DATABASE_URL' ? 'encrypted' : 'plain',
        target: targets,
      }),
    });
    console.log(`Created ${key} on Vercel (${targets.join(', ')})`);
  }

  if (!localEnv.CLIENT_URL?.includes('vercel.app')) {
    const productionUrl = `https://${project.name}.vercel.app`;
    const clientUrl = localEnv.CLIENT_URL?.includes('localhost') ? productionUrl : localEnv.CLIENT_URL;
    const clientEntry = existingByKey.get('CLIENT_URL');
    if (!clientEntry || clientEntry.value !== clientUrl) {
      if (clientEntry) {
        await vercelFetch(token, `/v9/projects/${projectId}/env/${clientEntry.id}${teamQuery}`, {
          method: 'PATCH',
          body: JSON.stringify({ value: clientUrl, target: targets }),
        });
      }
      console.log(`Set CLIENT_URL=${clientUrl}`);
    }
  }

  console.log('\nDone. Redeploy on Vercel for changes to take effect.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
