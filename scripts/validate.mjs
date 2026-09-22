// Validate registry.json: schema, then the cross-entry rules JSON Schema can't express.
//
//   node scripts/validate.mjs [registry.json] [--base <previous registry.json>]
//
// --base enables the immutability rules (no slug may disappear). CI passes the
// registry as it was on the base branch / before the push.
//
// Exits non-zero on any error. Every problem is printed, not just the first.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Hosts that anyone can get a subdomain of. A cms.host equal to one of these would
// allowlist every site on the platform (DESIGN §1c, §4f).
const SHARED_SUFFIXES = [
  'pages.dev', 'workers.dev', 'vercel.app', 'netlify.app', 'github.io',
  'publish.obsidian.md', 'obsidian.md', 'herokuapp.com', 'web.app', 'firebaseapp.com',
];

// --- strict parse -----------------------------------------------------------
// JSON.parse keeps the last of two duplicate keys without complaint, so a pasted
// `"domain"` twice in one object would silently win. This walks the text once to
// reject duplicate keys, then defers to JSON.parse for the value.

export function findDuplicateKeys(text) {
  const dups = [];
  let i = 0;
  const ws = () => { while (i < text.length && ' \t\r\n'.includes(text[i])) i++; };
  const str = () => {
    const start = i++;
    while (text[i] !== '"') { if (text[i] === '\\') i++; i++; if (i >= text.length) throw new Error('unterminated string'); }
    i++;
    return JSON.parse(text.slice(start, i));
  };
  const value = (path) => {
    ws();
    const c = text[i];
    if (c === '{') {
      i++; const seen = new Set(); ws();
      if (text[i] === '}') { i++; return; }
      for (;;) {
        ws(); const key = str();
        if (seen.has(key)) dups.push(`${path}/${key}`);
        seen.add(key);
        ws(); i++; // ':'
        value(`${path}/${key}`);
        ws();
        if (text[i++] === '}') return;
      }
    } else if (c === '[') {
      i++; ws();
      if (text[i] === ']') { i++; return; }
      for (let n = 0; ; n++) {
        value(`${path}/${n}`); ws();
        if (text[i++] === ']') return;
      }
    } else if (c === '"') {
      str();
    } else {
      while (i < text.length && !',}] \t\r\n'.includes(text[i])) i++;
    }
  };
  value('');
  return dups;
}

// --- helpers ----------------------------------------------------------------

const lc = (s) => s.toLowerCase();

// The host is one of the shared suffixes, or a subdomain of one.
const sharedSuffixOf = (host) => SHARED_SUFFIXES.find((s) => host === s || host.endsWith(`.${s}`));

function duplicates(values) {
  const seen = new Set();
  const dup = new Set();
  for (const v of values) (seen.has(v) ? dup : seen).add(v);
  return [...dup];
}

// A URL is well-formed here if WHATWG URL parsing accepts it and hands back the
// same string: that rejects whitespace, credentials, ports, odd escaping, and
// anything a consumer would normalise into a different value from the one stored.
function checkUrl(errors, where, value, { origin = false } = {}) {
  let u;
  try { u = new URL(value); } catch { errors.push(`${where}: not a parseable URL: ${value}`); return; }
  if (u.protocol !== 'https:') errors.push(`${where}: must be https: ${value}`);
  if (u.username || u.password) errors.push(`${where}: must not carry credentials: ${value}`);
  if (u.port) errors.push(`${where}: must not carry a port: ${value}`);
  if (u.search || u.hash) errors.push(`${where}: must not carry a query or fragment: ${value}`);
  if (origin) {
    if (u.origin !== value) errors.push(`${where}: must be a bare origin (no path or trailing slash), got ${value}, expected ${u.origin}`);
  } else if (u.href !== value && u.href !== `${value}/`) {
    errors.push(`${where}: not in canonical form: ${value} (parses as ${u.href})`);
  }
}

// --- validation -------------------------------------------------------------

const schema = JSON.parse(readFileSync(join(ROOT, 'registry.schema.json'), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateSchema = ajv.compile(schema);

export function validate(text, { baseText } = {}) {
  const errors = [];

  let reg;
  try { reg = JSON.parse(text); } catch (e) { return [`not valid JSON: ${e.message}`]; }
  for (const d of findDuplicateKeys(text)) errors.push(`duplicate key ${d}`);

  if (!validateSchema(reg)) {
    for (const e of validateSchema.errors) {
      const extra = e.params?.additionalProperty ? ` (${e.params.additionalProperty})` : '';
      errors.push(`schema: ${e.instancePath || '/'} ${e.message}${extra}`);
    }
    // Cross-entry rules assume the shape is right; don't pile noise on top.
    return errors;
  }

  const { platform, books } = reg;

  checkUrl(errors, 'platform.suggest_edit_endpoint', platform.suggest_edit_endpoint);
  checkUrl(errors, 'platform.cms_auth_relay', platform.cms_auth_relay, { origin: true });

  for (const [n, b] of books.entries()) {
    const at = `books[${n}] (${b.slug})`;

    if (b.site.domain === null && b.status !== 'preview')
      errors.push(`${at}: site.domain may be null only when status is preview (status is ${b.status})`);

    // A hostname on someone else's platform suffix can't be parked or redirected by the
    // platform (MULTI-BOOK-HOSTING §4c). Only a static preview book may use one.
    const domainSuffix = b.site.domain && sharedSuffixOf(b.site.domain);
    if (domainSuffix && domainSuffix === b.site.domain)
      errors.push(`${at}: site.domain ${b.site.domain} is a shared platform suffix; it must name one exact site`);
    else if (domainSuffix && (b.site.host.kind !== 'static' || b.status !== 'preview'))
      errors.push(`${at}: site.domain ${b.site.domain} is on the shared suffix ${domainSuffix}, which only a static-host book with status preview may use (this one is ${b.site.host.kind}, ${b.status})`);

    // Declared dark is about a site that was up and went away. A preview book that never
    // came up stays preview; a retired one needs nothing more.
    if (b.site.dark && b.status !== 'live')
      errors.push(`${at}: site.dark may be set only when status is live (status is ${b.status})`);

    if (b.site.host.paid_by === 'maintainer' && b.maintainer.github === null)
      errors.push(`${at}: site.host.paid_by is maintainer, so maintainer.github must name them; the site-health alert has to reach whoever can pay`);

    if (b.content.live_branch === b.content.drafts_branch)
      errors.push(`${at}: content.drafts_branch must differ from content.live_branch (both ${b.content.live_branch})`);

    for (const [k, o] of b.site.legacy_origins.entries()) checkUrl(errors, `${at}.site.legacy_origins[${k}]`, o, { origin: true });
    if (b.editions?.template_preview) checkUrl(errors, `${at}.editions.template_preview`, b.editions.template_preview, { origin: true });
    if (b.analytics.plausible) checkUrl(errors, `${at}.analytics.plausible.script_src`, b.analytics.plausible.script_src);

    const host = b.cms.host;
    if (host && SHARED_SUFFIXES.includes(host))
      errors.push(`${at}: cms.host ${host} is a shared platform suffix; it must name one exact site`);

    for (const g of duplicates(b.annotations.hypothesis_groups.map((g) => g.id)))
      errors.push(`${at}: hypothesis group ${g} listed twice`);
  }

  for (const s of duplicates(books.map((b) => b.slug))) errors.push(`duplicate slug: ${s}`);
  for (const r of duplicates(books.map((b) => lc(b.content.repo)))) errors.push(`duplicate content.repo: ${r}`);
  for (const h of duplicates(books.map((b) => b.cms.host).filter(Boolean))) errors.push(`duplicate cms.host: ${h}`);

  const domains = books.map((b) => b.site.domain).filter(Boolean);
  for (const d of duplicates(domains)) errors.push(`duplicate site.domain: ${d}`);

  const legacyHosts = books.flatMap((b) => b.site.legacy_origins.map((o) => ({ slug: b.slug, host: new URL(o).hostname })));
  for (const h of duplicates(legacyHosts.map((l) => l.host))) errors.push(`legacy origin ${h} listed more than once`);
  for (const { slug, host } of legacyHosts)
    if (domains.includes(host)) errors.push(`site.domain ${host} is also a legacy origin of ${slug}; lookups must be unambiguous`);

  // Every hostname a book answers on, with what it is, so aliases and the portal can be
  // checked against all of them. Domains and legacy origins among themselves are
  // checked above.
  const named = books.flatMap((b) => [
    ...(b.site.domain ? [{ slug: b.slug, host: b.site.domain, role: 'site.domain' }] : []),
    ...(b.site.aliases ?? []).map((host) => ({ slug: b.slug, host, role: 'an alias' })),
    ...legacyHosts.filter((l) => l.slug === b.slug).map(({ host }) => ({ slug: b.slug, host, role: 'a legacy origin' })),
  ]);
  for (const [k, a] of named.entries()) {
    if (a.role !== 'an alias') continue;
    for (const [j, other] of named.entries())
      if (j !== k && other.host === a.host && (other.role !== 'an alias' || j < k))
        errors.push(`alias ${a.host} of ${a.slug} is also ${other.role} of ${other.slug}; a hostname belongs to one book, once`);
  }

  const portal = platform.portal;
  if (portal) {
    for (const n of named)
      if (n.host === portal.domain) errors.push(`platform.portal.domain ${portal.domain} is also ${n.role} of ${n.slug}; the portal's address is never a book's`);
    if (portal.cms_host && sharedSuffixOf(portal.cms_host) === portal.cms_host)
      errors.push(`platform.portal.cms_host ${portal.cms_host} is a shared platform suffix; it must name one exact site`);

    // One Pages (or Netlify) project serves one site, so the portal's cannot also be a
    // book's: whichever was bound second would have taken the other's hostname.
    for (const b of books)
      if (b.site.host.kind === 'static' && b.site.host.provider === portal.host.provider && b.site.host.project === portal.host.project)
        errors.push(`platform.portal.host.project ${portal.host.project} on ${portal.host.provider} is also ${b.slug}'s site.host.project; one project serves one site`);

    // <slug>.<book_parent> is covered by Universal SSL; <a>.<b>.<book_parent> is not (§2a).
    // A legacy origin is exempt: it is a hostname the book used to answer on, which the
    // platform may not hold and cannot re-certify. Everything the platform serves today
    // is in scope, the CMS host included.
    if (portal.book_parent) {
      const under = `.${portal.book_parent}`;
      const tooDeep = (host) => host.endsWith(under) && host.slice(0, -under.length).includes('.');
      const why = `certificates cover only <label>.${portal.book_parent}`;
      for (const n of named)
        if (n.role !== 'a legacy origin' && tooDeep(n.host))
          errors.push(`${n.slug}: ${n.role} ${n.host} is more than one label under platform.portal.book_parent ${portal.book_parent}; ${why}`);
      if (portal.cms_host && tooDeep(portal.cms_host))
        errors.push(`platform.portal.cms_host ${portal.cms_host} is more than one label under platform.portal.book_parent ${portal.book_parent}; ${why}`);
    }
  }

  if (baseText !== undefined) {
    let base;
    try { base = JSON.parse(baseText); } catch { base = null; }
    // A base that doesn't parse (or predates the registry) has no slugs to protect.
    const before = Array.isArray(base?.books) ? base.books.map((b) => b.slug) : [];
    const after = new Set(books.map((b) => b.slug));
    for (const s of before)
      if (!after.has(s)) errors.push(`slug ${s} was removed or renamed; slugs are permanent (set status: retired instead)`);
  }

  return errors;
}

// --- CLI --------------------------------------------------------------------

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const baseAt = args.indexOf('--base');
  const basePath = baseAt >= 0 ? args.splice(baseAt, 2)[1] : undefined;
  const path = args[0] ?? join(ROOT, 'registry.json');

  const errors = validate(readFileSync(path, 'utf8'), {
    baseText: basePath ? readFileSync(basePath, 'utf8') : undefined,
  });

  if (errors.length) {
    for (const e of errors) console.log(process.env.GITHUB_ACTIONS ? `::error file=registry.json::${e}` : `error: ${e}`);
    console.log(`\n${path}: ${errors.length} problem(s). The registry is NOT valid.`);
    process.exit(1);
  }
  console.log(`${path}: valid${basePath ? ` (and no slug removed since ${basePath})` : ''}.`);
}
