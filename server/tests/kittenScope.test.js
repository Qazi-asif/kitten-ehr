import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applicationMatchesOwnedKittens,
  kittenOwnerWhere,
  mergeKittenWhere,
  scopesToOwnCats,
} from '../src/utils/kittenScope.js';
import { buildPublicAvailableKittenWhereClause } from '../src/utils/publishTargets.js';

describe('Own Cats scope', () => {
  it('admins stay unscoped and Own Cats users filter by createdByUserId', () => {
    assert.equal(scopesToOwnCats({ user: { role: { scopesToOwnCats: false } } }), false);
    assert.deepEqual(kittenOwnerWhere({ user: { id: 9, role: { scopesToOwnCats: false } } }), {});
    assert.deepEqual(
      kittenOwnerWhere({ user: { id: 9, role: { scopesToOwnCats: true } } }),
      { createdByUserId: 9 },
    );
    assert.deepEqual(
      mergeKittenWhere({ id: 3 }, { createdByUserId: 9 }),
      { AND: [{ id: 3 }, { createdByUserId: 9 }] },
    );
  });

  it('matches pending applications only to owned cats', () => {
    const owned = [{ id: 12, name: 'Miso', externalId: 'PT-000012' }];
    assert.equal(applicationMatchesOwnedKittens({ kittenOfInterest: 'Miso' }, owned), true);
    assert.equal(applicationMatchesOwnedKittens({ kittenOfInterest: 'Nori' }, owned), false);
    assert.equal(applicationMatchesOwnedKittens({
      formData: JSON.stringify({ kittenId: 12 }),
    }, owned), true);
    assert.equal(applicationMatchesOwnedKittens({
      formData: JSON.stringify({ kittenId: 99 }),
    }, owned), false);
  });
});

describe('website listing toggle', () => {
  it('does not require Available/In Foster, and still hides socialization/terminal', () => {
    const where = buildPublicAvailableKittenWhereClause();
    assert.equal(where.isListedOnWebsite, true);
    assert.equal(where.isActive, true);
    assert.deepEqual(where.status.notIn, ['In Socialization', 'Adopted', 'Transferred', 'Deceased', 'Released']);
    assert.equal(where.status.in, undefined);
  });
});
