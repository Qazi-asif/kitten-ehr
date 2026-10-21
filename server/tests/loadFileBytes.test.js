import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadFileBytes } from '../src/utils/loadFileBytes.js';

describe('loadFileBytes', () => {
  it('decodes a data URL into an attachment buffer', async () => {
    const loaded = await loadFileBytes('data:text/plain;base64,aGVsbG8=');
    assert.ok(loaded);
    assert.equal(loaded.contentType, 'text/plain');
    assert.equal(loaded.content.toString('utf8'), 'hello');
  });

  it('returns null for empty or unsupported values', async () => {
    assert.equal(await loadFileBytes(''), null);
    assert.equal(await loadFileBytes('not-a-file'), null);
  });
});
