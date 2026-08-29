/**
 * Tests for the startup schema-drift guard.
 *
 * Imports only the prisma-free policy module, for the same reason as the
 * scheduler suite: this database is shared with production and the test run
 * must never connect to it. The two guarantees that actually matter — the
 * check cannot throw and cannot block boot — are asserted here against
 * deliberately hostile inputs.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  expectedTablesFromDatamodel,
  findMissingObjects,
  formatDriftReport,
  isDriftCheckEnabled,
  parseEnumsFromSchema,
  scrubSecrets,
} from '../src/utils/schemaDriftPolicy.js';

describe('reading expected tables from the datamodel', () => {
  const datamodel = {
    models: [
      {
        name: 'SocialPost',
        dbName: 'social_posts',
        fields: [
          { name: 'id', kind: 'scalar' },
          { name: 'status', kind: 'enum' },
          { name: 'attemptCount', kind: 'scalar' },
          { name: 'kitten', kind: 'object' },
        ],
      },
      {
        name: 'Settings',
        dbName: null,
        fields: [{ name: 'groqApiKey', kind: 'scalar', dbName: 'xaiApiKey' }],
      },
    ],
  };

  it('uses the mapped table name from @@map', () => {
    const tables = expectedTablesFromDatamodel(datamodel);
    assert.ok(tables.has('social_posts'));
    assert.equal(tables.has('SocialPost'), false);
  });

  it('counts enum-typed fields as columns and ignores relations', () => {
    const columns = expectedTablesFromDatamodel(datamodel).get('social_posts');
    assert.ok(columns.has('status'));
    assert.ok(columns.has('attemptCount'));
    assert.equal(columns.has('kitten'), false);
  });

  it('uses the mapped column name from @map', () => {
    const columns = expectedTablesFromDatamodel(datamodel).get('Settings');
    assert.ok(columns.has('xaiApiKey'));
    assert.equal(columns.has('groqApiKey'), false);
  });

  it('returns empty rather than throwing on a missing or junk datamodel', () => {
    for (const input of [undefined, null, {}, { models: 'nope' }, { models: [null] }]) {
      assert.equal(expectedTablesFromDatamodel(input).size, 0);
    }
  });
});

describe('parsing enums from schema.prisma', () => {
  it('reads variants and drops comments', () => {
    const enums = parseEnumsFromSchema(`
      enum SocialPostStatus {
        DRAFT
        SCHEDULED
        // Claimed by the scheduler and mid-publish.
        PUBLISHING
        FAILED
      }
    `);
    assert.deepEqual(
      [...enums.get('SocialPostStatus')],
      ['DRAFT', 'SCHEDULED', 'PUBLISHING', 'FAILED'],
    );
  });

  it('skips variant lines it does not understand rather than guessing', () => {
    const enums = parseEnumsFromSchema('enum E {\n  OK\n  ODD @map("odd")\n}');
    assert.deepEqual([...enums.get('E')], ['OK']);
  });

  it('returns empty rather than throwing on junk input', () => {
    for (const input of [undefined, null, '', 42, 'model Foo { id Int }']) {
      assert.equal(parseEnumsFromSchema(input).size, 0);
    }
  });
});

describe('finding missing objects', () => {
  const expectedTables = new Map([
    ['Kitten', new Set(['id', 'coatPattern'])],
    ['social_posts', new Set(['id', 'attemptCount'])],
  ]);
  const expectedEnums = new Map([
    ['SocialPostStatus', new Set(['SCHEDULED', 'PUBLISHING'])],
  ]);

  it('reports a column the database does not have', () => {
    const missing = findMissingObjects({
      expectedTables,
      expectedEnums,
      actualTables: new Map([
        ['Kitten', new Set(['id'])],
        ['social_posts', new Set(['id', 'attemptCount'])],
      ]),
      actualEnums: new Map([['SocialPostStatus', new Set(['SCHEDULED', 'PUBLISHING'])]]),
    });
    assert.deepEqual(missing, [{ kind: 'column', name: 'Kitten.coatPattern' }]);
  });

  it('reports a missing enum value', () => {
    const missing = findMissingObjects({
      expectedTables: new Map(),
      expectedEnums,
      actualTables: new Map(),
      actualEnums: new Map([['SocialPostStatus', new Set(['SCHEDULED'])]]),
    });
    assert.deepEqual(missing, [
      { kind: 'enum value', name: 'SocialPostStatus.PUBLISHING' },
    ]);
  });

  it('reports an absent table once instead of listing all its columns', () => {
    const missing = findMissingObjects({
      expectedTables,
      expectedEnums: new Map(),
      actualTables: new Map([['social_posts', new Set(['id', 'attemptCount'])]]),
      actualEnums: new Map(),
    });
    assert.deepEqual(missing, [{ kind: 'table', name: 'Kitten' }]);
  });

  it('stays silent when the database is ahead of the schema', () => {
    const missing = findMissingObjects({
      expectedTables: new Map([['Kitten', new Set(['id'])]]),
      expectedEnums: new Map(),
      actualTables: new Map([['Kitten', new Set(['id', 'somethingExtra'])]]),
      actualEnums: new Map(),
    });
    assert.deepEqual(missing, []);
  });

  it('reports nothing when the database matches', () => {
    const missing = findMissingObjects({
      expectedTables,
      expectedEnums,
      actualTables: new Map([
        ['Kitten', new Set(['id', 'coatPattern'])],
        ['social_posts', new Set(['id', 'attemptCount'])],
      ]),
      actualEnums: new Map([['SocialPostStatus', new Set(['SCHEDULED', 'PUBLISHING'])]]),
    });
    assert.deepEqual(missing, []);
  });

  it('returns empty rather than throwing when every input is missing', () => {
    assert.deepEqual(findMissingObjects({}), []);
  });
});

describe('formatting the warning', () => {
  it('produces no output when there is no drift', () => {
    assert.deepEqual(formatDriftReport([]), []);
    assert.deepEqual(formatDriftReport(undefined), []);
  });

  it('names every drifted object and points at the fix', () => {
    const lines = formatDriftReport([
      { kind: 'column', name: 'Kitten.coatPattern' },
      { kind: 'enum value', name: 'SocialPostStatus.PUBLISHING' },
    ]).join('\n');
    assert.match(lines, /Kitten\.coatPattern/);
    assert.match(lines, /SocialPostStatus\.PUBLISHING/);
    assert.match(lines, /prisma db push/);
  });

  it('caps the list so a fresh database cannot flood the log', () => {
    const many = Array.from({ length: 500 }, (_, i) => ({
      kind: 'column',
      name: `T.c${i}`,
    }));
    const lines = formatDriftReport(many);
    assert.ok(lines.length < 60);
    assert.match(lines.join('\n'), /and 460 more/);
  });
});

describe('enablement', () => {
  it('is on when NODE_ENV is production', () => {
    assert.equal(isDriftCheckEnabled({ NODE_ENV: 'production' }), true);
  });

  it('is on when NODE_ENV is unset, as it is on Hostinger', () => {
    assert.equal(isDriftCheckEnabled({}), true);
  });

  it('is off in development and under the test runner', () => {
    assert.equal(isDriftCheckEnabled({ NODE_ENV: 'development' }), false);
    assert.equal(isDriftCheckEnabled({ NODE_ENV: 'test' }), false);
  });

  it('can be forced on in development', () => {
    assert.equal(
      isDriftCheckEnabled({ NODE_ENV: 'development', SCHEMA_DRIFT_CHECK: 'true' }),
      true,
    );
  });

  it('can be switched off in production', () => {
    for (const value of ['false', '0', 'off', 'no', 'OFF']) {
      assert.equal(
        isDriftCheckEnabled({ NODE_ENV: 'production', SCHEMA_DRIFT_CHECK: value }),
        false,
        value,
      );
    }
  });
});

describe('scrubbing diagnostics', () => {
  it('removes a connection string', () => {
    const scrubbed = scrubSecrets(
      'connect failed: postgresql://user:hunter2@ep-x.neon.tech/db?sslmode=require',
    );
    assert.match(scrubbed, /\[redacted-url\]/);
    assert.equal(scrubbed.includes('hunter2'), false);
    assert.equal(scrubbed.includes('neon.tech'), false);
  });

  it('removes keyword-style credentials', () => {
    const scrubbed = scrubSecrets('host=ep-x.neon.tech password=hunter2');
    assert.equal(scrubbed.includes('hunter2'), false);
    assert.equal(scrubbed.includes('ep-x.neon.tech'), false);
  });

  it('returns a string rather than throwing on junk input', () => {
    for (const input of [undefined, null, 42, {}]) {
      assert.equal(scrubSecrets(input), '');
    }
  });
});
