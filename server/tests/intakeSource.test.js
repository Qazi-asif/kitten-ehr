import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { intakeSourceBucket } from '../src/services/reports.js';

describe('intakeSourceBucket', () => {
  it('maps euthanasia-pull text first', () => {
    assert.equal(
      intakeSourceBucket({ intakeSource: 'Euthanasia-Pull Rescue', isTnr: true }),
      'Euthanasia List',
    );
  });

  it('maps TNR and Colony flags', () => {
    assert.equal(intakeSourceBucket({ isTnr: true }), 'TNR');
    assert.equal(intakeSourceBucket({ isColony: true }), 'Colony');
  });

  it('maps Community Save flag and related text', () => {
    assert.equal(intakeSourceBucket({ isCommunitySave: true }), 'Community Save');
    assert.equal(intakeSourceBucket({ intakeSource: 'community save intake' }), 'Community Save');
  });

  it('falls back to Other', () => {
    assert.equal(intakeSourceBucket({ intakeSource: 'Owner surrender' }), 'Other');
  });
});
