// The parity extractors must refuse to guess: a constant that is missing or
// declared twice is a failure, not a pass on whichever copy matched first.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once, every, jsonKey, jsStrings, jsGroups, joined, evaluate, builderOption, builderConst, graphBlock, checks, NotFound } from '../parity/checks.mjs';

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
    assert.ok(typeof c.expect === 'function' || typeof c.expectFrom?.extract === 'function', c.id);
    if (c.expectFrom) assert.ok(c.expectFrom.source && c.expectFrom.path, `${c.id}: expectFrom names a source and path`);
    if (c.when) assert.equal(typeof c.when, 'function', c.id);
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

// ---- the builder (§8 step 13) -------------------------------------------------

const LIB = `export function bookOptions(registry, book, branch, { preview = false } = {}) {
  const suggestEnabled = book.suggest_edit?.enabled === true
  const endpoint = registry.platform?.suggest_edit_endpoint ?? ""
  return {
    repo: book.content.repo,
    suggestEndpoint: suggestEnabled ? endpoint : "",
    plausibleScriptSrc: book.analytics?.plausible?.script_src ?? "",
  }
}

export function renderConfig(config, opts, ignorePatterns) {
  Object.assign(plugin("edition-integrations").options, {
    plausibleScriptSrc: opts.plausibleScriptSrc,
  })
  Object.assign(plugin("edit-on-github").options, {
    repo: opts.repo,
    suggestEndpoint: opts.suggestEndpoint,
  })
  return out
}

export function reconcileTargets(registry, { slug = "" } = {}) {
  return chosen.flatMap((book) => {
    const live = book.content.live_branch
  })
}
`;
const REG = { platform: { suggest_edit_endpoint: 'https://f/api/suggest-edit' } };
const BOOK = { content: { repo: 'o/book', live_branch: 'main' }, suggest_edit: { enabled: true }, analytics: { plausible: { script_src: 'https://p/s.js' } } };
const ctx = { registry: REG, book: BOOK };

test('evaluate: the registry reads builder/lib.mjs uses, and nothing else', () => {
  const scope = { registry: REG, book: BOOK };
  assert.equal(evaluate('book.content.repo', scope), 'o/book');
  assert.equal(evaluate('book.analytics?.missing?.x ?? ""', scope), '');
  assert.equal(evaluate('on ? ep : ""', scope, { on: 'book.suggest_edit?.enabled === true', ep: 'registry.platform?.suggest_edit_endpoint ?? ""' }), 'https://f/api/suggest-edit');
  assert.throws(() => evaluate('"o/book"', scope), /not one parity can evaluate/);
  assert.throws(() => evaluate('process.env.REPO', scope), /not one parity can evaluate/);
});

test('builderOption: the value the builder would build this book with', () => {
  assert.deepEqual(builderOption('edit-on-github', 'repo')(LIB, ctx).value, 'o/book');
  assert.equal(builderOption('edit-on-github', 'suggestEndpoint')(LIB, ctx).value, 'https://f/api/suggest-edit');
  assert.equal(builderOption('edit-on-github', 'suggestEndpoint')(LIB, { ...ctx, book: { ...BOOK, suggest_edit: { enabled: false } } }).value, '');
  assert.equal(builderOption('edition-integrations', 'plausibleScriptSrc')(LIB, ctx).value, 'https://p/s.js');
  assert.equal(builderConst('reconcileTargets', 'live')(LIB, ctx).value, 'main');
});

test('builderOption: a hardcoded value, or a renderConfig that stopped passing it on, fails', () => {
  assert.throws(() => builderOption('edit-on-github', 'repo')(LIB.replace('repo: book.content.repo,', 'repo: "o/other",'), ctx), /not one parity can evaluate/);
  assert.throws(() => builderOption('edit-on-github', 'repo')(LIB.replace('repo: opts.repo,', 'repo: "o/other",'), ctx), /does not set edit-on-github's repo/);
  assert.throws(() => builderOption('edit-on-github', 'repo')(LIB.replace('plugin("edit-on-github")', 'plugin("x")'), ctx), /does not fill edit-on-github/);
});

test('graphBlock: comments and blank lines ignored, one graph required', () => {
  const a = `plugins:\n  # the graph\n  - source: github:quartz-community/graph\n    enabled: true # on\n\n    layout:\n      position: right\n  - source: github:quartz-community/search\n    enabled: true\n`;
  const b = `plugins:\n    - source: github:quartz-community/graph\n      enabled: true\n      layout:\n        position: right\n    - source: x\n`;
  assert.deepEqual(graphBlock(a).value, ['- source: github:quartz-community/graph', '  enabled: true', '  layout:', '    position: right']);
  assert.deepEqual(graphBlock(a).value, graphBlock(b).value);
  assert.equal(graphBlock(a).line, 3);
  assert.throws(() => graphBlock('plugins:\n  - source: x\n'), NotFound);
  assert.throws(() => graphBlock(a + a), /found 2/);
});

test('host kinds: publish checks only on obsidian-publish, reading-site only for builder books', () => {
  const host = (h) => ({ ...BOOK, cms: { enabled: true }, site: { host: h } });
  const publish = host({ kind: 'obsidian-publish', builder: 'quartz-book', project: 'p' });
  const stat = host({ kind: 'static', provider: 'cloudflare-pages', project: 'p', builder: 'quartz-book' });
  const plain = host({ kind: 'obsidian-publish' });
  const applies = (id, b) => { const c = checks.find((c) => c.id === id); return !c.when?.(REG, b); };
  for (const id of ['publish.site-id', 'publish.host', 'publish.js.repo', 'publish.js.plausible-script']) {
    assert.ok(applies(id, publish), id);
    assert.ok(!applies(id, stat), id);
  }
  for (const id of ['reading-site.repo', 'reading-site.live-branch', 'reading-site.suggest-edit-endpoint', 'reading-site.plausible-script']) {
    assert.ok(applies(id, publish) && applies(id, stat), id);
    assert.ok(!applies(id, plain), id);
  }
  assert.ok(applies('cms.config.drafts-branch', stat));
});
