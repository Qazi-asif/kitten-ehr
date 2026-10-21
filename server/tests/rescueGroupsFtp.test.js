import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getRescueGroupsFtpConfig } from '../src/services/rescueGroupsFtp.js';

describe('RescueGroups FTP config', () => {
  it('skips remote upload unless host, user, and password are all set', () => {
    const previous = {
      RG_FTP_HOST: process.env.RG_FTP_HOST,
      RG_FTP_USER: process.env.RG_FTP_USER,
      RG_FTP_PASSWORD: process.env.RG_FTP_PASSWORD,
    };
    delete process.env.RG_FTP_HOST;
    delete process.env.RG_FTP_USER;
    delete process.env.RG_FTP_PASSWORD;
    assert.equal(getRescueGroupsFtpConfig(), null);

    process.env.RG_FTP_HOST = 'ftp.example.test';
    process.env.RG_FTP_USER = 'rg';
    process.env.RG_FTP_PASSWORD = 'secret';
    const config = getRescueGroupsFtpConfig();
    assert.equal(config.host, 'ftp.example.test');
    assert.equal(config.fileName, 'animals.csv');

    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
});
