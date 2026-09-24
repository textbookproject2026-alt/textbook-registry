// builder-alive's verdict: red with no cron run in the last hour, whatever else
// ran; warnings, never red, for a failing build or a token about to expire.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judge, parseExpiry } from '../scripts/builder-alive.mjs';

const NOW = Date.parse('2026-09-25T07:29:00Z');
const ago = (min) => new Date(NOW - min * 60000).toISOString();
const run = (title, min, conclusion = 'success') => ({
  display_title: title,
  created_at: ago(min),
  status: conclusion ? 'completed' : 'in_progress',
  conclusion,
  html_url: `https://github.com/x/runs/${min}`,
});
const healthy = { version: 'v1', token: 'works', token_expires: '2027-09-24 00:00:00 UTC' };

test('green with a cron run in the last hour', () => {
  const v = judge({ runs: [run('reconcile: cron, every book', 12)], status: healthy, now: NOW });
  assert.equal(v.ok, true);
  assert.deepEqual(v.warnings, []);
});

test('red with no cron run, even with nudged and hand runs', () => {
  const runs = [run('reconcile: nudge, social-research-methods', 5), run('reconcile: by hand, every book', 20)];
  const v = judge({ runs, status: healthy, now: NOW });
  assert.equal(v.ok, false);
  assert.match(v.errors[0], /No reconcile run named "cron"/);
});

test('red when the only cron run is older than an hour', () => {
  assert.equal(judge({ runs: [run('reconcile: cron, every book', 61)], status: healthy, now: NOW }).ok, false);
});

test('red with no runs at all, and the Worker not answering', () => {
  const v = judge({ runs: [], status: null, now: NOW });
  assert.equal(v.ok, false);
  assert.match(v.warnings.join(), /didn't answer/);
});

test('a failed cron build warns, but the tick is alive', () => {
  const runs = [run('reconcile: cron, every book', 2, null), run('reconcile: cron, every book', 17, 'failure')];
  const v = judge({ runs, status: healthy, now: NOW });
  assert.equal(v.ok, true);
  assert.match(v.warnings.join(), /ended "failure"/);
});

test('warns within 30 days of the token expiring, not before', () => {
  const soon = { ...healthy, token_expires: '2026-10-20 00:00:00 UTC' };
  assert.match(judge({ runs: [run('reconcile: cron, every book', 3)], status: soon, now: NOW }).warnings.join(), /expires on 2026-10-20/);
  const later = { ...healthy, token_expires: '2026-10-26 00:00:00 UTC' };
  assert.deepEqual(judge({ runs: [run('reconcile: cron, every book', 3)], status: later, now: NOW }).warnings, []);
});

test('warns when the Worker says its token is refused or missing', () => {
  for (const token of ['refused (401)', 'missing']) {
    const v = judge({ runs: [run('reconcile: cron, every book', 3)], status: { ...healthy, token }, now: NOW });
    assert.match(v.warnings.join(), /Replace DISPATCH_TOKEN/);
  }
});

test('reads both spellings of the expiry header', () => {
  assert.equal(parseExpiry('2027-09-24 00:00:00 UTC'), Date.parse('2027-09-24T00:00:00Z'));
  assert.equal(parseExpiry('2027-09-24 01:00:00 +0100'), Date.parse('2027-09-24T00:00:00Z'));
  assert.ok(Number.isNaN(parseExpiry(null)));
});
