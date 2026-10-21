import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CSV_HEADERS,
  buildSnapshotCsv,
  isSnapshotEligible,
  kittenToCsvRow,
} from '../src/services/rescueGroupsCsv.js';
import { mapBreed, mapSex, stripHtml } from '../src/services/syndicationLookups.js';
import { formatExternalId } from '../src/utils/kittenScope.js';

function cat(overrides = {}) {
  return {
    id: 1,
    name: 'Miso',
    status: 'Available for Adoption',
    isActive: true,
    sex: 'Female',
    breed: 'DSH',
    color: 'Orange',
    coatPattern: 'Tabby',
    rescueStory: '<p>Sweet girl</p>',
    fixedStatus: 'Spayed/Neutered',
    ...overrides,
  };
}

describe('syndication lookups', () => {
  it('maps domestic short hair aliases and unknown colors to DSH', () => {
    assert.equal(mapBreed('dsh'), 'Domestic Short Hair');
    assert.equal(mapBreed('tuxedo'), 'Domestic Short Hair');
    assert.equal(mapSex('f'), 'Female');
    assert.equal(mapSex('unknown'), '');
    assert.equal(stripHtml('<b>Hello</b> world'), 'Hello world');
  });
});

describe('snapshot eligibility and CSV', () => {
  it('omits pending, adopted, unknown sex, and inactive cats', () => {
    assert.equal(isSnapshotEligible(cat()), true);
    assert.equal(isSnapshotEligible(cat({ status: 'Adopted' })), false);
    assert.equal(isSnapshotEligible(cat({ status: 'Adoption Pending' })), false);
    assert.equal(isSnapshotEligible(cat({ sex: '' })), false);
    assert.equal(isSnapshotEligible(cat({ isActive: false })), false);
  });

  it('builds a two-cat snapshot with stable headers and external IDs', () => {
    const snapshot = buildSnapshotCsv([
      cat({ id: 12, externalId: formatExternalId(12), name: 'Miso', sex: 'Female' }),
      cat({ id: 34, externalId: formatExternalId(34), name: 'Nori', sex: 'Male' }),
      cat({ id: 99, name: 'Skip', status: 'Adopted', sex: 'Male' }),
    ]);

    assert.equal(snapshot.rowCount, 2);
    assert.deepEqual(snapshot.ids, ['PT-000012', 'PT-000034']);
    assert.match(snapshot.csv, /^externalID,status,internalID/);
    assert.match(snapshot.csv, /PT-000012,Available,12/);
    assert.match(snapshot.csv, /PT-000034,Available,34/);
    assert.equal(snapshot.csv.includes('Skip'), false);
    assert.equal(CSV_HEADERS[0], 'externalID');

    const row = kittenToCsvRow(cat({ id: 12, externalId: 'PT-000012' }), {
      orgName: 'Pawsitive Transformations',
      applyBaseUrl: 'https://example.org',
      photos: ['https://example.org/cdn/cats/PT-000012/abcd.jpg'],
    });
    assert.equal(row.status, 'Available');
    assert.equal(row.priBreed, 'Domestic Short Hair');
    assert.match(row.dsc, /Sweet girl/);
    assert.match(row.dsc, /adopt\/apply\?cat=PT-000012/);
    assert.match(row.dsc, /kittenId=12/);
    assert.equal(row.photo1, 'https://example.org/cdn/cats/PT-000012/abcd.jpg');
    assert.equal(row.okwithdogs, '');
    assert.equal(kittenToCsvRow(cat({ okWithDogs: false, okWithCats: true, okWithKids: null })).okwithdogs, 'No');
    assert.equal(kittenToCsvRow(cat({ okWithDogs: false, okWithCats: true, okWithKids: null })).okwithcats, '');
    assert.equal(kittenToCsvRow(cat({ okWithDogs: false, okWithCats: true, okWithKids: null })).okwithkids, '');
  });
});
