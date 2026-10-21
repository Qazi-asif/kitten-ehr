import { Client } from 'basic-ftp';

export function getRescueGroupsFtpConfig() {
  const host = process.env.RG_FTP_HOST?.trim();
  const user = process.env.RG_FTP_USER?.trim();
  const password = process.env.RG_FTP_PASSWORD;
  if (!host || !user || password == null || password === '') {
    return null;
  }

  const parsedPort = Number.parseInt(process.env.RG_FTP_PORT, 10);
  return {
    host,
    user,
    password,
    port: Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 21,
    secure: /^(1|true|yes)$/i.test(String(process.env.RG_FTP_SECURE || '')),
    fileName: process.env.RG_FTP_FILENAME?.trim() || 'animals.csv',
    remoteDir: process.env.RG_FTP_REMOTE_DIR?.trim() || '',
  };
}

export async function uploadRescueGroupsSnapshot(localPath, fileName = 'animals.csv') {
  const config = getRescueGroupsFtpConfig();
  if (!config) {
    return {
      uploaded: false,
      skipped: true,
      reason: 'RG_FTP_HOST, RG_FTP_USER, and RG_FTP_PASSWORD are not configured',
    };
  }

  const client = new Client(15000);
  const remoteName = config.fileName || fileName;
  const tempName = `${remoteName}.tmp`;

  try {
    await client.access({
      host: config.host,
      user: config.user,
      password: config.password,
      port: config.port,
      secure: config.secure,
    });
    if (config.remoteDir) {
      await client.ensureDir(config.remoteDir);
    }
    await client.uploadFrom(localPath, tempName);
    try {
      await client.remove(remoteName);
    } catch {
      // Destination may not exist yet on first import.
    }
    await client.rename(tempName, remoteName);
    return { uploaded: true, skipped: false, remoteFile: remoteName };
  } finally {
    client.close();
  }
}
