// The parity extractors must refuse to guess: a constant that is missing or
// declared twice is a failure, not a pass on whichever copy matched first.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once, every, jsonKey, jsStrings, jsGroups, joined, checks } from '../parity/checks.mjs';

test('once: exactly one match, with its line', () => {
  assert.deepEqual(once(/^const A = '([^']*)';$/m)("x\nconst A = 'v';\n"), { value: 'v', line: 2 });
});

test('once: zero matches throws', () => {
  assert.throws(() => once(/^const A = '([^']*)';$/m)('nothing'), /found 0/);
});

test('once: two matches throws', () => {
  assert.throws(() => once(/^const A = '([^']*)';$/m)("const A = 'v';\nconst A = 'w';"), /found 2/);
});

test('every: distinct values, so a disagreeing copy shows up as a second value', () => {
  const text = '  repo: "https://github.com/a/b.git"\n  repo: "https://github.com/a/c.git"\n';
  assert.deepEqual(every(/^\s+repo: "https:\/\/github\.com\/([^"]+)\.git"$/m)(text).value, ['a/b', 'a/c']);
});

test('jsonKey', () => {
  assert.deepEqual(jsonKey('title')('{\n  "title": "T"\n}'), { value: 'T', line: 2 });
  assert.throws(() => jsonKey('nope')('{}'), /no key/);
});

test('jsStrings: array and Set forms', () => {
  assert.deepEqual(jsStrings('X')("const X = ['a', 'b'];").value, ['a', 'b']);
  assert.deepEqual(jsStrings('X')("const X = new Set(['a']);").value, ['a']);
  assert.throws(() => jsStrings('X')("const X = ['a'];\nconst X = ['b'];"), /found 2/);
});

test('jsGroups', () => {
  const text = "const G = [\n  { id: 'ab', label: 'one' },\n  { id: 'cd', label: 'two' },\n];";
  assert.deepEqual(jsGroups('G')(text).value, [{ id: 'ab', label: 'one' }, { id: 'cd', label: 'two' }]);
});

test('joined', () => {
  const x = joined('/', once(/^O = "(.*)"$/m), once(/^R = "(.*)"$/m));
  assert.equal(x('O = "own"\nR = "rep"').value, 'own/rep');
});

test('manifest: ids unique, every check has a source, path, extractor and expectation', () => {
  const ids = checks.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const c of checks) {
    assert.ok(c.source && c.path && c.design, c.id);
    assert.equal(typeof c.extract, 'function', c.id);
    assert.equal(typeof c.expect, 'function', c.id);
  }
});
