// The parity extractors must refuse to guess: a constant that is missing or
// declared twice is a failure, not a pass on whichever copy matched first.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once, every, jsonKey, jsStrings, jsGroups, joined, checks, NotFound } from '../parity/checks.mjs';

test('once: exactly one match, with its line', () => {
  assert.deepEqual(once(/^const A = '([^']*)';$/m)("x\nconst A = 'v';\n"), { value: 'v', line: 2 });
});

test('once: zero matches throws NotFound', () => {
  assert.throws(() => once(/^const A = '([^']*)';$/m)('nothing'), (e) => e instanceof NotFound && /found 0/.test(e.message));
});

test('once: two matches throws, and is not NotFound (a retired check must not pass on it)', () => {
  assert.throws(() => once(/^const A = '([^']*)';$/m)("const A = 'v';\nconst A = 'w';"), (e) => !(e instanceof NotFound) && /found 2/.test(e.message));
});

test('NotFound from every missing-constant path', () => {
  assert.throws(() => every(/^x(y)$/m)('z'), NotFound);
  assert.throws(() => jsonKey('nope')('{}'), NotFound);
  assert.throws(() => jsStrings('X')('const Y = [];'), NotFound);
  assert.throws(() => jsGroups('X')('const Y = [];'), NotFound);
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

test('joined: NotFound only when every part is gone; a half-removed constant is not', () => {
  const x = joined('/', once(/^O = "(.*)"$/m), once(/^R = "(.*)"$/m));
  assert.throws(() => x('nothing'), NotFound);
  assert.throws(() => x('R = "rep"'), (e) => !(e instanceof NotFound) && /1 of 2 parts still present/.test(e.message));
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

test('manifest: a retired check says which migration retired it and what must replace the constant', () => {
  for (const c of checks.filter((c) => c.retired)) {
    const r = c.retired;
    assert.ok(typeof r === 'object', `${c.id}: retired must be a RETIREMENTS entry, not a string`);
    assert.ok(r.step && r.reason, `${c.id}: step and reason`);
    assert.equal(r.source, c.source, `${c.id}: retirement is for a different source`);
    assert.match(r.commit, /^[0-9a-f]{7,40}$/, `${c.id}: commit`);
    assert.ok(r.consumes?.pattern instanceof RegExp, `${c.id}: consumes.pattern`);
  }
});
