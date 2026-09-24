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
  if (b.site.host.project) b.site.host.project = 'second-book';
  r.books.push(b);
  return b;
};

// A static-host book in the shape MULTI-BOOK-HOSTING §6c gave the interim test book:
// Quartz on a free Pages subdomain, no Publish subscription, no editions. The interim book
// itself is now in registry.json, so this stays a fixture with its own slug, repo and
// domain — reusing the real one's would collide with it instead of testing the rule.
const staticBook = (r) => {
  const b = {
    slug: 'static-fixture-book',
    status: 'preview',
    title: 'Static fixture book',
    summary: 'A static-host book used by the tests below. Not for readers.',
    licence: 'CC-BY-SA-4.0',
    maintainer: { name: 'Platform test', github: 'someone' },
    content: { repo: 'someone/static-fixture-book', live_branch: 'main', drafts_branch: 'drafts' },
    site: {
      domain: 'static-fixture-book.pages.dev',
      aliases: [],
      host: { kind: 'static', provider: 'cloudflare-pages', project: 'static-fixture-book', paid_by: 'platform' },
      legacy_origins: [],
      dark: null,
    },
    analytics: { plausible: null },
    annotations: { hypothesis_groups: [] },
    suggest_edit: { enabled: true, counted_from: null },
    cms: { enabled: false, host: null },
    editions: null,
  };
  r.books.push(b);
  return b;
};

const PORTAL = {
  domain: 'portal.example',
  host: { kind: 'static', provider: 'cloudflare-pages', project: 'portal-fixture' },
  cms_host: 'edit.portal.example',
  book_parent: 'portal.example',
};

// Where staticBook() lands. Derived, so adding a book to registry.json doesn't renumber
// the schema paths asserted below.
const STATIC_AT = real().books.length;

// Book one's own address. The fixtures that collide with it deliberately hold the real
// value, so they have to follow the book when it moves.
const DOMAIN = book(real()).site.domain;

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
  const line = `"domain": ${JSON.stringify(DOMAIN)},`;
  const text = REAL.replace(line, `${line}\n "domain": "evil.example",`);
  assert.notEqual(text, REAL, 'the fixture no longer matches registry.json');
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
test('duplicate slug', () => expectFail((r) => { secondBook(r).slug = 'social-research-methods'; }, 'duplicate slug: social-research-methods'));

for (const bad of ['https://confused4now.org', 'Confused4now.org', 'confused4now.org.', 'confused4now.org:443', 'confused4now.org/path', '*.confused4now.org', 'localhost']) {
  test(`domain format: ${bad}`, () => expectFail((r) => { book(r).site.domain = bad; }, '/books/0/site/domain'));
}
test('duplicate domain', () => expectFail((r) => { secondBook(r).site.domain = book(r).site.domain; }, `duplicate site.domain: ${DOMAIN}`));
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

test('duplicate cms host', () => expectFail((r) => { secondBook(r).cms.host = 'textbook-admin.pages.dev'; }, 'duplicate cms.host'));
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
  expectFail((r) => { book(r).annotations.hypothesis_groups.push({ id: 'ZGY29zLM', label: 'one' }, { id: 'ZGY29zLM', label: 'again' }); }, 'listed twice'));

test('removing a slug relative to the base fails', () => {
  const r = real();
  r.books[0].slug = 'renamed-book';
  const errors = validate(JSON.stringify(r), { baseText: REAL });
  assert.ok(errors.some((e) => e.includes('slug social-research-methods was removed or renamed')), errors.join('\n'));
});

test('removing a sandbox book relative to the base is fine', () => {
  const base = real();
  const b = secondBook(base);
  b.sandbox = true;
  assert.deepEqual(validate(REAL, { baseText: JSON.stringify(base) }), []);
});

test('removing a book that was not a sandbox in the base still fails', () => {
  const base = real();
  secondBook(base);
  const after = real();
  const errors = validate(JSON.stringify(after), { baseText: JSON.stringify(base) });
  assert.ok(errors.some((e) => e.includes('slug second-book was removed')), errors.join('\n'));
});

test('sandbox must be a boolean', () => {
  const r = real();
  book(r).sandbox = 'yes';
  assert.ok(validate(JSON.stringify(r)).some((e) => e.includes('sandbox')));
});

test('adding a book relative to the base is fine', () => {
  const r = real();
  secondBook(r);
  assert.deepEqual(validate(JSON.stringify(r), { baseText: REAL }), []);
});

test('a base with no registry yet protects nothing', () => {
  assert.deepEqual(validate(REAL, { baseText: '' }), []);
});

// --- multi-book hosting (MULTI-BOOK-HOSTING §4, §6) ----------------------------

test('book one needs none of the new per-book fields: its committed entry has none and is valid', () => {
  const b = book(real());
  for (const k of ['aliases', 'dark']) assert.ok(!(k in b.site), `site.${k} is already in registry.json`);
  assert.ok(!('paid_by' in b.site.host), 'site.host.paid_by is already in registry.json');
  assert.deepEqual(validate(REAL), []);
});

// platform.portal went in on 22 Sep 2026, once the portal was actually serving the apex.
// Book one's own hostname is what the depth rule is chiefly there to permit, so assert it
// is exactly one label under book_parent rather than merely that the file validates.
test('the committed portal block records the live portal, and book one sits under it', () => {
  const r = real();
  assert.ok(r.platform.portal, 'platform.portal is missing from registry.json');
  const { domain, book_parent: parent } = r.platform.portal;
  assert.equal(r.platform.portal.host.kind, 'static');
  const d = book(r).site.domain;
  assert.ok(d.endsWith(`.${parent}`), `${d} is not under book_parent ${parent}`);
  assert.ok(!d.slice(0, -parent.length - 1).includes('.'), `${d} is more than one label under ${parent}`);
  assert.notEqual(d, domain, "the portal's address is never a book's");
});

test('book one with every new optional field filled in is valid', () => {
  const r = real();
  r.platform.portal = { ...PORTAL };
  Object.assign(book(r).site, { aliases: ['social-research-methods.portal.example'], dark: null });
  book(r).site.host.paid_by = 'maintainer';
  assert.deepEqual(validate(JSON.stringify(r)), []);
});

test('a §6c-shaped static book is accepted alongside book one', () => {
  const r = real();
  staticBook(r);
  assert.deepEqual(validate(JSON.stringify(r)), []);
});

test('platform.portal with null cms_host and book_parent is accepted', () => {
  const r = real();
  r.platform.portal = { ...PORTAL, cms_host: null, book_parent: null };
  assert.deepEqual(validate(JSON.stringify(r)), []);
});

// status stays preview | live | retired: the function and the console reject an unknown
// status for the whole registry, so 'dark' there would stop suggestions for every book.
test('dark is not a status', () => expectFail((r) => { book(r).status = 'dark'; }, '/books/0/status'));

test('editions: null is accepted', () => {
  const r = real();
  book(r).editions = null;
  assert.deepEqual(validate(JSON.stringify(r)), []);
});
test('editions must still be present (null, not missing)', () => expectFail((r) => { delete book(r).editions; }, "must have required property 'editions'"));
test('editions object still requires template_repo', () => expectFail((r) => { delete book(r).editions.template_repo; }, '/books/0/editions'));

// site.host.builder (BOOK-ONE-TO-QUARTZ §8 step 7). Optional: absent means the builder
// leaves the book alone, which is book two's state until step 21.
test('a static book built by quartz-book is accepted beside one without the field', () => {
  const r = real();
  staticBook(r).site.host.builder = 'quartz-book';
  const other = staticBook(r);
  other.slug = 'static-fixture-unbuilt';
  other.content.repo = 'someone/static-fixture-unbuilt';
  other.site.domain = 'static-fixture-unbuilt.pages.dev';
  other.site.host.project = 'static-fixture-unbuilt';
  assert.ok(!('builder' in other.site.host));
  assert.deepEqual(validate(JSON.stringify(r)), []);
});
// Book one names the builder while Publish still serves it (the 24 Sep amendment to step
// 7): the builder previews it on Pages, and nothing about its address changes.
test('book one is built by quartz-book as a preview, and is still a Publish book at its domain', () => {
  const b = book(real());
  assert.equal(b.slug, 'social-research-methods');
  assert.equal(b.site.host.kind, 'obsidian-publish');
  assert.equal(b.site.host.builder, 'quartz-book');
  assert.equal(b.site.host.project, 'social-research-methods');
  assert.equal(b.site.domain, 'social-research-methods.confused4now.org');
});
test('a Publish book without the builder is accepted', () => {
  const r = real();
  delete book(r).site.host.builder;
  delete book(r).site.host.project;
  assert.deepEqual(validate(JSON.stringify(r)), []);
});
test('builder: unknown value', () => expectFail((r) => { staticBook(r).site.host.builder = 'netlify-build'; }, `/books/${STATIC_AT}/site/host`));
test('builder: null is not a way to say none (leave it out)', () =>
  expectFail((r) => { staticBook(r).site.host.builder = null; }, `/books/${STATIC_AT}/site/host`));
test('builder on a Publish host with no project', () => expectFail((r) => { delete book(r).site.host.project; }, '/books/0/site/host'));
test('project on a Publish host with no builder', () => expectFail((r) => { delete book(r).site.host.builder; }, '/books/0/site/host'));
test('builder on a Publish host: unknown value', () => expectFail((r) => { book(r).site.host.builder = 'netlify-build'; }, '/books/0/site/host'));
test('provider on a Publish host (the builder deploys only to Pages)', () =>
  expectFail((r) => { book(r).site.host.provider = 'cloudflare-pages'; }, '/books/0/site/host'));
test('a Publish book\'s preview project that is also a static book\'s project', () =>
  expectFail((r) => { staticBook(r).site.host.project = book(r).site.host.project; }, 'duplicate site.host.project: social-research-methods on cloudflare-pages'));
test('two static books on one project', () =>
  expectFail((r) => {
    const a = staticBook(r);
    const b = staticBook(r);
    b.slug = 'static-fixture-two';
    b.content.repo = 'someone/static-fixture-two';
    b.site.domain = 'static-fixture-two.pages.dev';
    b.site.host.project = a.site.host.project;
  }, 'duplicate site.host.project: static-fixture-book on cloudflare-pages'));
test('the same project on different providers is two sites', () => {
  const r = real();
  const b = staticBook(r);
  b.site.host.provider = 'netlify';
  b.site.host.project = book(r).site.host.project;
  assert.deepEqual(validate(JSON.stringify(r)), []);
});
test('builder on the portal host', () =>
  expectFail((r) => { r.platform.portal.host.builder = 'quartz-book'; }, '/platform/portal/host'));

test('static host: unknown provider', () => expectFail((r) => { staticBook(r).site.host.provider = 'geocities'; }, `/books/${STATIC_AT}/site/host`));
test('static host: missing project', () => expectFail((r) => { delete staticBook(r).site.host.project; }, `/books/${STATIC_AT}/site/host`));
test('static host: Publish-only key', () => expectFail((r) => { staticBook(r).site.host.site_id = '1443b409a84e491249da35fdd4b91de6'; }, `/books/${STATIC_AT}/site/host`));
test('unknown host kind', () => expectFail((r) => { book(r).site.host.kind = 'wordpress'; }, '/books/0/site/host'));
test('paid_by: unknown value', () => expectFail((r) => { book(r).site.host.paid_by = 'university'; }, '/books/0/site/host'));
test('paid_by maintainer needs a maintainer login', () =>
  expectFail((r) => { book(r).site.host.paid_by = 'maintainer'; book(r).maintainer.github = null; }, 'maintainer.github must name them'));
test('paid_by platform with no maintainer login is fine', () => {
  const r = real();
  book(r).site.host.paid_by = 'platform';
  book(r).maintainer.github = null;
  assert.deepEqual(validate(JSON.stringify(r)), []);
});

test('static book on a shared suffix may not be live', () =>
  expectFail((r) => { staticBook(r).status = 'live'; }, 'only a static-host book with status preview'));
test('Publish book on a shared suffix', () =>
  expectFail((r) => { book(r).status = 'preview'; book(r).site.domain = 'book.pages.dev'; }, 'only a static-host book with status preview'));
test('domain that is a bare shared suffix', () =>
  expectFail((r) => { staticBook(r).site.domain = 'pages.dev'; }, 'site.domain pages.dev is a shared platform suffix'));
test('static book on its own domain may be live', () => {
  const r = real();
  const b = staticBook(r);
  b.status = 'live';
  b.site.domain = 'test-book.example';
  assert.deepEqual(validate(JSON.stringify(r)), []);
});

test('dark on a live book is accepted', () => {
  const r = real();
  book(r).site.dark = { since: '2026-10-02', reason: 'subscription-lapsed', notified: '2026-09-20' };
  assert.deepEqual(validate(JSON.stringify(r)), []);
});
test('dark on a preview book', () =>
  expectFail((r) => { staticBook(r).site.dark = { since: '2026-10-02', reason: 'unknown', notified: null }; }, 'site.dark may be set only when status is live'));
test('dark on a retired book', () =>
  expectFail((r) => { book(r).status = 'retired'; book(r).site.dark = { since: '2026-10-02', reason: 'unknown', notified: null }; }, 'site.dark may be set only when status is live'));
test('dark: unknown reason', () =>
  expectFail((r) => { book(r).site.dark = { since: '2026-10-02', reason: 'forgot', notified: null }; }, '/books/0/site/dark'));
test('dark: bad date', () =>
  expectFail((r) => { book(r).site.dark = { since: '2026-13-02', reason: 'unknown', notified: null }; }, '/books/0/site/dark'));

for (const bad of ['https://alias.example', 'Alias.example', '*.alias.example']) {
  test(`alias format: ${bad}`, () => expectFail((r) => { book(r).site.aliases = [bad]; }, '/books/0/site/aliases'));
}
test('alias repeated in one book', () => expectFail((r) => { book(r).site.aliases = ['a.example', 'a.example']; }, '/books/0/site/aliases'));
test('alias that is its own book\'s domain', () =>
  expectFail((r) => { book(r).site.aliases = [DOMAIN]; }, `alias ${DOMAIN} of social-research-methods is also site.domain of social-research-methods`));
test('alias that is another book\'s domain', () =>
  expectFail((r) => { secondBook(r).site.aliases = [DOMAIN]; }, 'is also site.domain of social-research-methods'));
test('alias that is a legacy origin', () =>
  expectFail((r) => { secondBook(r).site.aliases = ['bptext2026.xyz']; }, 'is also a legacy origin of social-research-methods'));
test('alias shared by two books', () =>
  expectFail((r) => { book(r).site.aliases = ['a.example']; secondBook(r).site.aliases = ['a.example']; }, 'alias a.example of second-book is also an alias of social-research-methods'));

test('portal: unknown key', () => expectFail((r) => { r.platform.portal = { ...PORTAL, zone: 'x' }; }, '(zone)'));
test('portal: missing domain', () => expectFail((r) => { const { domain, ...rest } = PORTAL; r.platform.portal = rest; }, "must have required property 'domain'"));
test('portal: missing host', () => expectFail((r) => { const { host, ...rest } = PORTAL; r.platform.portal = rest; }, "must have required property 'host'"));
test('portal domain that is a book\'s domain', () =>
  expectFail((r) => { r.platform.portal = { ...PORTAL, domain: DOMAIN, book_parent: null }; }, `platform.portal.domain ${DOMAIN} is also site.domain`));
test('portal domain that is a book\'s alias', () =>
  expectFail((r) => { r.platform.portal = { ...PORTAL }; book(r).site.aliases = ['portal.example']; }, 'is also an alias of social-research-methods'));
test('portal domain that is a legacy origin', () =>
  expectFail((r) => { r.platform.portal = { ...PORTAL, domain: 'bptext2026.xyz', book_parent: null }; }, 'is also a legacy origin'));
test('portal cms host that is a bare platform suffix', () =>
  expectFail((r) => { r.platform.portal = { ...PORTAL, cms_host: 'pages.dev' }; }, 'platform.portal.cms_host pages.dev is a shared platform suffix'));
test('book hostname two labels under book_parent', () =>
  expectFail((r) => { r.platform.portal = { ...PORTAL }; book(r).site.aliases = ['a.b.portal.example']; }, 'more than one label under platform.portal.book_parent'));
test('book domain two labels under book_parent', () =>
  expectFail((r) => { r.platform.portal = { ...PORTAL }; secondBook(r).site.domain = 'www.second.portal.example'; }, 'more than one label under platform.portal.book_parent'));
test('cms host two labels under book_parent', () =>
  expectFail((r) => { r.platform.portal = { ...PORTAL, cms_host: 'a.edit.portal.example' }; }, 'platform.portal.cms_host a.edit.portal.example is more than one label under'));
test('a legacy origin under book_parent is exempt from the depth rule', () => {
  const r = real();
  r.platform.portal = { ...PORTAL };
  book(r).site.legacy_origins = ['https://old.book.portal.example'];
  assert.deepEqual(validate(JSON.stringify(r)), []);
});

test('portal host: unknown provider', () =>
  expectFail((r) => { r.platform.portal = { ...PORTAL, host: { ...PORTAL.host, provider: 'geocities' } }; }, '/platform/portal/host/provider'));
test('portal host: Publish kind is refused', () =>
  expectFail((r) => { r.platform.portal = { ...PORTAL, host: { ...PORTAL.host, kind: 'obsidian-publish' } }; }, '/platform/portal/host/kind'));
test('portal host: paid_by is not a key here', () =>
  expectFail((r) => { r.platform.portal = { ...PORTAL, host: { ...PORTAL.host, paid_by: 'platform' } }; }, '(paid_by)'));
test('portal project that is also a book\'s Pages project', () =>
  expectFail((r) => {
    const b = staticBook(r);
    r.platform.portal = { ...PORTAL, host: { ...PORTAL.host, project: b.site.host.project } };
  }, 'one project serves one site'));
test('portal project that is also a Publish book\'s preview project', () =>
  expectFail((r) => {
    r.platform.portal = { ...PORTAL, host: { ...PORTAL.host, project: book(r).site.host.project } };
  }, "is also social-research-methods's site.host.project"));
test('the same project name on a different provider is fine', () => {
  const r = real();
  const b = staticBook(r);
  r.platform.portal = { ...PORTAL, host: { kind: 'static', provider: 'netlify', project: b.site.host.project } };
  assert.deepEqual(validate(JSON.stringify(r)), []);
});
