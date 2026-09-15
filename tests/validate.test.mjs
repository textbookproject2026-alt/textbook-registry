// Every rule in the validator has a case here that breaks it and must fail.
// A validator that passes everything is worse than none, so this runs in CI first.
//
//   node --test tests/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validate } from '../scripts/validate.mjs';

const REAL = readFileSync(new URL('../registry.json', import.meta.url), 'utf8');
const real = () => JSON.parse(REAL);
const book = (r) => r.books[0];
const secondBook = (r) => {
  const b = structuredClone(book(r));
  b.slug = 'second-book';
  b.content.repo = 'someone/second';
  b.site.domain = 'second.example';
  b.site.legacy_origins = [];
  b.cms.host = 'second-cms.pages.dev';
  r.books.push(b);
  return b;
};

function expectFail(mutate, fragment) {
  const r = real();
  mutate(r);
  const errors = validate(JSON.stringify(r, null, 2));
  assert.ok(errors.length > 0, 'expected the registry to be rejected, but it validated');
  assert.ok(
    errors.some((e) => e.includes(fragment)),
    `expected an error containing "${fragment}", got:\n  ${errors.join('\n  ')}`,
  );
}

test('the committed registry is valid', () => {
  assert.deepEqual(validate(REAL), []);
});

test('a well-formed second book is accepted', () => {
  const r = real();
  secondBook(r);
  assert.deepEqual(validate(JSON.stringify(r)), []);
});

test('not JSON', () => {
  assert.match(validate('{ "schema_version": 1, ')[0], /not valid JSON/);
});

test('duplicate keys in one object are caught, not silently merged', () => {
  const text = REAL.replace('"domain": "confused4now.org",', '"domain": "confused4now.org",\n "domain": "evil.example",');
  assert.ok(validate(text).some((e) => e.includes('duplicate key /books/0/site/domain')));
});

test('unknown schema_version', () => expectFail((r) => { r.schema_version = 2; }, '/schema_version'));

for (const field of ['slug', 'status', 'title', 'licence', 'maintainer', 'content', 'site', 'analytics', 'annotations', 'suggest_edit', 'cms', 'editions']) {
  test(`required book field: ${field}`, () => expectFail((r) => { delete book(r)[field]; }, `must have required property '${field}'`));
}
for (const field of ['suggest_edit_endpoint', 'cms_auth_relay', 'cms_auth_relay_scope', 'edition_extras_repo', 'console_oauth_client_id', 'automation_logins']) {
  test(`required platform field: ${field}`, () => expectFail((r) => { delete r.platform[field]; }, `must have required property '${field}'`));
}
test('required content.drafts_branch', () => expectFail((r) => { delete book(r).content.drafts_branch; }, "'drafts_branch'"));
test('empty books', () => expectFail((r) => { r.books = []; }, '/books'));

test('misspelt key is rejected, not ignored', () =>
  expectFail((r) => { book(r).content.live_brnach = 'main'; }, 'live_brnach'));

for (const bad of ['Critical-Realism', 'critical_realism', 'cr', '-critical', 'critical-', 'critical--realism', 'a'.repeat(41)]) {
  test(`slug format: ${bad}`, () => expectFail((r) => { book(r).slug = bad; }, '/books/0/slug'));
}
test('duplicate slug', () => expectFail((r) => { secondBook(r).slug = 'critical-realism'; }, 'duplicate slug: critical-realism'));

for (const bad of ['https://confused4now.org', 'Confused4now.org', 'confused4now.org.', 'confused4now.org:443', 'confused4now.org/path', '*.confused4now.org', 'localhost']) {
  test(`domain format: ${bad}`, () => expectFail((r) => { book(r).site.domain = bad; }, '/books/0/site/domain'));
}
test('duplicate domain', () => expectFail((r) => { secondBook(r).site.domain = 'confused4now.org'; }, 'duplicate site.domain: confused4now.org'));
test('domain that is another book\'s legacy origin', () =>
  expectFail((r) => { secondBook(r).site.domain = 'bptext2026.xyz'; }, 'is also a legacy origin'));
test('null domain on a live book', () => expectFail((r) => { book(r).site.domain = null; }, 'may be null only when status is preview'));
test('null domain on a preview book is fine', () => {
  const r = real();
  book(r).status = 'preview';
  book(r).site.domain = null;
  assert.deepEqual(validate(JSON.stringify(r)), []);
});

test('duplicate content repo, case-insensitively', () =>
  expectFail((r) => { secondBook(r).content.repo = 'TextbookProject2026-alt/Textbook'; }, 'duplicate content.repo'));
test('drafts equals live', () => expectFail((r) => { book(r).content.drafts_branch = 'main'; }, 'must differ'));

test('duplicate cms host', () => expectFail((r) => { secondBook(r).cms.host = 'textbook-cms.pages.dev'; }, 'duplicate cms.host'));
test('cms host that is a bare platform suffix', () => expectFail((r) => { book(r).cms.host = 'pages.dev'; }, 'shared platform suffix'));
test('cms host wildcard', () => expectFail((r) => { book(r).cms.host = '*.pages.dev'; }, '/books/0/cms/host'));

for (const [where, set, bad] of [
  ['platform.suggest_edit_endpoint', (r, v) => { r.platform.suggest_edit_endpoint = v; }, 'http://suggest-edit-function.vercel.app/api/suggest-edit'],
  ['platform.suggest_edit_endpoint', (r, v) => { r.platform.suggest_edit_endpoint = v; }, 'https://suggest-edit-function.vercel.app/api/suggest-edit?x=1'],
  ['platform.suggest_edit_endpoint', (r, v) => { r.platform.suggest_edit_endpoint = v; }, 'https://user:pw@suggest-edit-function.vercel.app/api'],
  ['platform.cms_auth_relay', (r, v) => { r.platform.cms_auth_relay = v; }, 'https://sveltia-cms-auth.brandonproject2026.workers.dev/'],
  ['platform.cms_auth_relay', (r, v) => { r.platform.cms_auth_relay = v; }, 'https://sveltia-cms-auth.brandonproject2026.workers.dev/callback'],
  ['legacy_origins', (r, v) => { book(r).site.legacy_origins = [v]; }, 'bptext2026.xyz'],
  ['legacy_origins', (r, v) => { book(r).site.legacy_origins = [v]; }, 'https://bptext2026.xyz/'],
  ['template_preview', (r, v) => { book(r).editions.template_preview = v; }, 'https://textbook-edition-template.pages.dev:8443'],
  ['script_src', (r, v) => { book(r).analytics.plausible.script_src = v; }, 'https://evil.example/js/pa-x.js'],
  ['script_src', (r, v) => { book(r).analytics.plausible.script_src = v; }, 'https://plausible.io/js/pa x.js'],
]) {
  test(`malformed URL in ${where}: ${bad}`, () => expectFail((r) => set(r, bad), 'schema:'));
}

test('bad repo format', () => expectFail((r) => { book(r).content.repo = 'https://github.com/textbookproject2026-alt/textbook'; }, '/books/0/content/repo'));
test('bad branch name', () => expectFail((r) => { book(r).content.drafts_branch = 'drafts..x'; }, '/books/0/content/drafts_branch'));
test('bad status', () => expectFail((r) => { book(r).status = 'archived'; }, '/books/0/status'));
test('bad Publish site id', () => expectFail((r) => { book(r).site.host.site_id = '1443b409'; }, '/books/0/site/host'));
test('duplicate hypothesis group', () =>
  expectFail((r) => { book(r).annotations.hypothesis_groups.push({ id: 'ZGY29zLM', label: 'again' }); }, 'listed twice'));

test('removing a slug relative to the base fails', () => {
  const r = real();
  r.books[0].slug = 'renamed-book';
  const errors = validate(JSON.stringify(r), { baseText: REAL });
  assert.ok(errors.some((e) => e.includes('slug critical-realism was removed or renamed')), errors.join('\n'));
});

test('adding a book relative to the base is fine', () => {
  const r = real();
  secondBook(r);
  assert.deepEqual(validate(JSON.stringify(r), { baseText: REAL }), []);
});

test('a base with no registry yet protects nothing', () => {
  assert.deepEqual(validate(REAL, { baseText: '' }), []);
});
