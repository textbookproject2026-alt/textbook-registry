// The parity manifest: every place a registry value is still hardcoded, and how to read it.
//
// Each check names a source (parity/sources.json), a file, an extractor, and the
// registry value the file must agree with. Extractors match by the constant's
// NAME, not by line number, so unrelated edits to a file don't break parity; the
// `design` field is the DESIGN.md §0a location, kept for cross-reference only.
//
// RETIRING A CHECK. When a migration step replaces a constant with a registry read,
// the same change (or the registry change that follows it) retires the check. Never
// delete it: a deleted check is indistinguishable from one that was dropped by
// mistake, while a retired one stays in the output with the step that retired it.
// Describe the migration once, in RETIREMENTS below, and point each check at it:
//
//   retired: RETIREMENTS.suggestEditStep2,
//
// A retirement is verified, not trusted. At the pinned commit parity requires that
//   - the constant is gone: the extractor finds zero copies (a constant still there,
//     even partly, fails: the check was retired too early), and
//   - the file reads the registry: `consumes.pattern` matches in `consumes.path`
//     (default: the check's own path). A constant that vanished without a registry
//     read in its place fails too; that is a regression, not a migration.
// When every check is retired, delete the parity job (DESIGN §5 step 1, step 8).
//
// A check whose file still holds a known-stale value that the registry has
// already corrected carries `drift: { value, note }`. The stale value passes with
// a warning, the corrected value passes silently, anything else fails. Remove the
// `drift` entry once the source repo is fixed.

// --- extractors -------------------------------------------------------------
// Each returns { value, line }. They throw when the constant can't be found, or is
// found more than once, because an ambiguous match is a parity failure too.
// "Not found" throws NotFound specifically: a retired check passes only on that.

export class NotFound extends Error {}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

/** First capture group of a pattern that must match exactly once. */
export const once = (pattern) => (text) => {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const matches = [...text.matchAll(new RegExp(pattern.source, flags))];
  if (!matches.length) throw new NotFound(`expected exactly one match for ${pattern}, found 0`);
  if (matches.length !== 1) throw new Error(`expected exactly one match for ${pattern}, found ${matches.length}`);
  return { value: matches[0][1], line: lineOf(text, matches[0].index) };
};

/** The distinct first capture groups of every match; there must be at least one. */
export const every = (pattern) => (text) => {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const matches = [...text.matchAll(new RegExp(pattern.source, flags))];
  if (!matches.length) throw new NotFound(`no match for ${pattern}`);
  return { value: [...new Set(matches.map((m) => m[1]))], line: matches.map((m) => lineOf(text, m.index)).join(',') };
};

/** A top-level key of a JSON file. */
export const jsonKey = (key) => (text) => {
  const obj = JSON.parse(text);
  if (!(key in obj)) throw new NotFound(`no key "${key}"`);
  const m = new RegExp(`^\\s*"${key}"\\s*:`, 'm').exec(text);
  return { value: obj[key], line: m ? lineOf(text, m.index) : '?' };
};

/** The body of `const NAME = <open> ... <close>` in JS source. */
const jsBlock = (text, name, open, close) => {
  const starts = [...text.matchAll(new RegExp(`^const ${name} = ${open}`, 'gm'))];
  if (!starts.length) throw new NotFound(`expected exactly one "const ${name} = ...", found 0`);
  if (starts.length !== 1) throw new Error(`expected exactly one "const ${name} = ...", found ${starts.length}`);
  const [start] = starts;
  const end = text.indexOf(close, start.index);
  if (end < 0) throw new Error(`"const ${name}" is not closed`);
  return { body: text.slice(start.index, end), line: lineOf(text, start.index) };
};

/** `const NAME = ['a', 'b'];` or `const NAME = new Set(['a', 'b']);` → ['a', 'b'] */
export const jsStrings = (name) => (text) => {
  const { body, line } = jsBlock(text, name, '(new Set\\()?\\[', ';');
  return { value: [...body.matchAll(/'([^']*)'/g)].map((m) => m[1]), line };
};

/** `const NAME = [ { id: 'x', label: 'y' }, ... ];` → [{ id, label }] */
export const jsGroups = (name) => (text) => {
  const { body, line } = jsBlock(text, name, '\\[', '];');
  const value = [...body.matchAll(/\{\s*id:\s*'([^']*)',\s*label:\s*'([^']*)'\s*\}/g)].map((m) => ({ id: m[1], label: m[2] }));
  return { value, line };
};

/** Several `once` extractions joined, e.g. OWNER + '/' + NAME. NotFound only when every part is gone. */
export const joined = (sep, ...extractors) => (text) => {
  const outcomes = extractors.map((x) => { try { return { part: x(text) }; } catch (error) { return { error }; } });
  const errors = outcomes.filter((o) => o.error).map((o) => o.error);
  if (errors.length === outcomes.length && errors.every((e) => e instanceof NotFound))
    throw new NotFound(errors.map((e) => e.message).join('; '));
  if (errors.length) {
    const found = outcomes.length - errors.length;
    throw new Error(`${errors.map((e) => e.message).join('; ')} (${found} of ${outcomes.length} parts still present)`);
  }
  const parts = outcomes.map((o) => o.part);
  return { value: parts.map((p) => p.value).join(sep), line: parts.map((p) => p.line).join(',') };
};

// --- derived values (DESIGN §0b) --------------------------------------------

const origin = (b) => `https://${b.site.domain}`;
const lcfirst = (s) => s[0].toLowerCase() + s.slice(1);

// SPDX id → the heading of the licence text GitHub and CC publish.
const LICENCE_HEADINGS = {
  'CC-BY-SA-4.0': 'Creative Commons Attribution-ShareAlike 4.0 International',
  'CC-BY-4.0': 'Creative Commons Attribution 4.0 International',
};

// --- retirements ---------------------------------------------------------------
// One entry per migration of one repo. `commit` is the source repo's commit that
// replaced the constants; `consumes` is what must be in the file instead.

function cmsStep4(name, key, token, field) {
  return {
    [name]: {
      step: '4',
      source: 'content',
      commit: 'f9c7619',
      reason: `admin/config.yml is rendered by configure.mjs from templates/admin/config.yml, whose \`${key}:\` is the ${token} token filled from the registry's ${field}`,
      consumes: { pattern: new RegExp(`^ {2}${key}: ${token}$`, 'm') },
    },
  };
}

export const RETIREMENTS = {
  suggestEditStep2: {
    step: '2',
    source: 'suggest-edit-function',
    commit: 'f97d018',
    reason: 'the function resolves the book by Origin from the registry bundled at build (registry/bundled.mjs) and takes the origin, content.repo and live_branch from that entry',
    consumes: { pattern: /^import BUNDLE from '\.\.\/registry\/bundled\.mjs';$/m },
  },
  backupStep3b: {
    step: '3b',
    source: 'content',
    commit: 'e856e31',
    reason: 'backup-annotations.mjs fetches the registry at run time (scripts/lib/registry.mjs) and takes the site, legacy origins and Hypothes.is groups from the book\'s entry',
    consumes: { pattern: /^import \{[^}]*\bloadBook\b[^}]*\} from '\.\/lib\/registry\.mjs';$/m },
  },
  dashboardStep3b: {
    step: '3b',
    source: 'content',
    commit: 'e856e31',
    reason: 'gen-dashboard.mjs fetches the registry at run time (scripts/lib/registry.mjs) and takes the repo, site, groups, edition template, fork owners and Plausible dashboard from the book\'s entry; the dashboard URL is derived from analytics.plausible.site, not stored',
    consumes: { path: 'scripts/gen-dashboard.mjs', pattern: /^import \{[^}]*\bloadBook\b[^}]*\} from '\.\/lib\/registry\.mjs';$/m },
  },
  // admin/config.yml is rendered by configure.mjs, so the RENDERED file still holds these
  // values and a retirement checked there would fail. The hand-edited source is the
  // template, so these checks read templates/admin/config.yml. `consumes` requires the
  // token line itself: a template that dropped `branch:` altogether would otherwise pass
  // as "constant gone", and Sveltia would fall back to the repo's default branch, i.e. main.
  // configure.mjs refuses to write admin/config.yml with any token left unfilled. The
  // extractors skip a `__TOKEN__` value: a placeholder is not a hardcoded constant.
  ...cmsStep4('cmsRepoStep4', 'repo', '__CONTENT_REPO__', 'content.repo'),
  ...cmsStep4('cmsDraftsBranchStep4', 'branch', '__DRAFTS_BRANCH__', 'content.drafts_branch'),
  ...cmsStep4('cmsAuthRelayStep4', 'base_url', '__CMS_AUTH_RELAY__', 'platform.cms_auth_relay'),
};

// --- the manifest -------------------------------------------------------------

export const checks = [
  // ---- textbook (the content repo, read at live_branch) ---------------------
  { id: 'reading-site.repo', source: 'content', path: 'publish.js', design: 'publish.js:12',
    extract: once(/^const REPO = '([^']*)';$/m), expect: (r, b) => b.content.repo },
  { id: 'reading-site.live-branch', source: 'content', path: 'publish.js', design: 'publish.js:13',
    extract: once(/^const BRANCH = '([^']*)';$/m), expect: (r, b) => b.content.live_branch },
  { id: 'reading-site.suggest-edit-endpoint', source: 'content', path: 'publish.js', design: 'publish.js:44',
    extract: once(/^const SUGGEST_EDIT_ENDPOINT = '([^']*)';$/m), expect: (r) => r.platform.suggest_edit_endpoint },
  { id: 'reading-site.plausible-script', source: 'content', path: 'publish.js', design: 'publish.js:791',
    extract: once(/\bs\.src = '(https:\/\/plausible\.io\/[^']*)';/), expect: (r, b) => b.analytics.plausible.script_src },

  { id: 'cms.title-comment', source: 'content', path: 'admin/config.yml', design: 'admin/config.yml:1',
    extract: once(/^# Sveltia CMS configuration — (.+) textbook$/m), expect: (r, b) => b.title },
  { id: 'cms.repo', source: 'content', path: 'templates/admin/config.yml', design: 'admin/config.yml:12',
    extract: once(/^ {2}repo: (?!__[A-Z0-9_]+__$)(\S+)$/m), expect: (r, b) => b.content.repo,
    retired: RETIREMENTS.cmsRepoStep4 },
  { id: 'cms.drafts-branch', source: 'content', path: 'templates/admin/config.yml', design: 'admin/config.yml:31 (load-bearing line)',
    extract: once(/^ {2}branch: (?!__[A-Z0-9_]+__$)(\S+)$/m), expect: (r, b) => b.content.drafts_branch,
    retired: RETIREMENTS.cmsDraftsBranchStep4 },
  { id: 'cms.auth-relay', source: 'content', path: 'templates/admin/config.yml', design: 'admin/config.yml:40',
    extract: once(/^ {2}base_url: (?!__[A-Z0-9_]+__$)(\S+)$/m), expect: (r) => r.platform.cms_auth_relay,
    retired: RETIREMENTS.cmsAuthRelayStep4 },

  { id: 'config.title', source: 'content', path: 'textbook.config.json', design: 'textbook.config.json:2',
    extract: jsonKey('title'), expect: (r, b) => b.title },
  { id: 'config.maintainer', source: 'content', path: 'textbook.config.json', design: 'textbook.config.json:3',
    extract: jsonKey('maintainer'), expect: (r, b) => b.maintainer.name },
  { id: 'config.site-url', source: 'content', path: 'textbook.config.json', design: 'textbook.config.json:4',
    extract: jsonKey('site_url'), expect: (r, b) => origin(b) },
  { id: 'config.licence', source: 'content', path: 'textbook.config.json', design: 'textbook.config.json:5',
    extract: jsonKey('licence'), expect: (r, b) => b.licence },
  { id: 'config.plausible-public-url', source: 'content', path: 'textbook.config.json', design: 'textbook.config.json:6',
    extract: jsonKey('plausible_public_url'), expect: (r, b) => `https://plausible.io/${b.analytics.plausible.site}`,
    retired: RETIREMENTS.dashboardStep3b },

  { id: 'link-check.canonical-origin', source: 'content', path: '.lycheeignore', design: '.lycheeignore:1',
    extract: once(/^(https:\/\/[^\s/]+)\/?$/m), expect: (r, b) => origin(b) },

  { id: 'publish.site-id', source: 'content', path: '.obsidian/publish.json', design: '.obsidian/publish.json:2',
    extract: jsonKey('siteId'), expect: (r, b) => b.site.host.site_id },
  { id: 'publish.host', source: 'content', path: '.obsidian/publish.json', design: '.obsidian/publish.json:3',
    extract: jsonKey('host'), expect: (r, b) => b.site.host.publish_host },

  { id: 'backup.hypothesis-groups', source: 'content', path: 'scripts/backup-annotations.mjs', design: 'backup-annotations.mjs:58-61',
    extract: jsGroups('ANNOTATION_GROUPS'), expect: (r, b) => b.annotations.hypothesis_groups,
    retired: RETIREMENTS.backupStep3b },
  { id: 'backup.default-site', source: 'content', path: 'scripts/backup-annotations.mjs', design: 'backup-annotations.mjs:64',
    extract: once(/^const DEFAULT_SITE = '([^']*)';$/m), expect: (r, b) => origin(b),
    retired: RETIREMENTS.backupStep3b },
  { id: 'backup.legacy-origins', source: 'content', path: 'scripts/backup-annotations.mjs', design: 'backup-annotations.mjs:73',
    extract: jsStrings('LEGACY_SITES'), expect: (r, b) => b.site.legacy_origins,
    retired: RETIREMENTS.backupStep3b },

  { id: 'dashboard.repo-fallback', source: 'content', path: 'scripts/gen-dashboard.mjs', design: 'gen-dashboard.mjs:93',
    extract: once(/process\.env\.GITHUB_REPOSITORY \|\| '([^']*)'/), expect: (r, b) => b.content.repo,
    retired: RETIREMENTS.dashboardStep3b },
  { id: 'dashboard.template-repo', source: 'content', path: 'scripts/gen-dashboard.mjs', design: 'gen-dashboard.mjs:98',
    extract: once(/^const TEMPLATE_REPO = '([^']*)';$/m), expect: (r, b) => b.editions.template_repo,
    retired: RETIREMENTS.dashboardStep3b },
  { id: 'dashboard.skip-fork-owners', source: 'content', path: 'scripts/gen-dashboard.mjs', design: 'gen-dashboard.mjs:99',
    extract: jsStrings('SKIP_FORK_OWNERS'), expect: (r, b) => b.editions.skip_fork_owners,
    retired: RETIREMENTS.dashboardStep3b },
  { id: 'dashboard.hypothesis-groups', source: 'content', path: 'scripts/gen-dashboard.mjs', design: 'gen-dashboard.mjs:109-112',
    extract: jsGroups('ANNOTATION_GROUPS'), expect: (r, b) => b.annotations.hypothesis_groups,
    retired: RETIREMENTS.dashboardStep3b },
  { id: 'dashboard.site-url', source: 'content', path: 'scripts/gen-dashboard.mjs', design: 'gen-dashboard.mjs:674',
    extract: once(/^\s+site_url: '([^']*)',$/m), expect: (r, b) => origin(b),
    retired: RETIREMENTS.dashboardStep3b },

  { id: 'derivatives.template-repo', source: 'content', path: 'scripts/gen-derivatives.mjs', design: 'gen-derivatives.mjs:68',
    extract: once(/^const UPSTREAM = '([^']*)';$/m), expect: (r, b) => b.editions.template_repo },
  { id: 'derivatives.skip-fork-owners', source: 'content', path: 'scripts/gen-derivatives.mjs', design: 'gen-derivatives.mjs:71',
    extract: jsStrings('SKIP_OWNERS'), expect: (r, b) => b.editions.skip_fork_owners },
  { id: 'derivatives-workflow.template-repo', source: 'content', path: '.github/workflows/derivatives.yml', design: 'derivatives.yml:24 (comment)',
    extract: once(/^# The forks of (\S+), over the/m), expect: (r, b) => b.editions.template_repo },

  { id: 'contributors.automation-logins', source: 'content', path: 'scripts/gen-contributors.mjs', design: 'gen-contributors.mjs:61',
    extract: jsStrings('EXTRA_BOTS'), expect: (r) => r.platform.automation_logins },

  { id: 'licence.text', source: 'content', path: 'LICENSE', design: 'LICENSE (not in §0a)',
    extract: (text) => ({ value: text.split('\n')[0].trim(), line: 1 }),
    expect: (r, b) => LICENCE_HEADINGS[b.licence] ?? `(no heading known for ${b.licence}; add it to LICENCE_HEADINGS)` },

  { id: 'landing.title', source: 'content', path: 'index.md', design: 'index.md:1 (rendered from templates/)',
    extract: once(/^# (.+)$/m), expect: (r, b) => b.title },
  { id: 'landing.summary', source: 'content', path: 'templates/index.md', design: 'templates/index.md:3',
    extract: once(/^Welcome\. This is (.+?) — /m), expect: (r, b) => lcfirst(b.summary).replace(/\.$/, '') },

  { id: 'docs.cms-allowed-domains', source: 'content', path: 'OAUTH-SETUP.md', design: 'OAUTH-SETUP.md:107 (stands in for the Worker variable, which no repo holds)',
    extract: once(/^\| `ALLOWED_DOMAINS` \| `([^`]+)` \|/m), expect: (r, b) => b.cms.host },
  { id: 'docs.cms-homepage', source: 'content', path: 'OAUTH-SETUP.md', design: 'OAUTH-SETUP.md:78 (OAuth App homepage)',
    extract: once(/^\| Homepage URL \| `([^`]+)`/m), expect: (r, b) => `https://${b.cms.host}` },
  { id: 'docs.infrastructure.cms-relay', source: 'content', path: 'docs/INFRASTRUCTURE.md', design: 'INFRASTRUCTURE.md §3',
    extract: once(/^- \*\*URL:\*\* `(https:\/\/[^`]*workers\.dev)`$/m), expect: (r) => r.platform.cms_auth_relay },
  { id: 'docs.infrastructure.template-preview', source: 'content', path: 'docs/INFRASTRUCTURE.md', design: 'INFRASTRUCTURE.md §5',
    extract: once(/^## 5\.[^\n]*\n\n- \*\*URL:\*\* <([^>]+)>$/m), expect: (r, b) => b.editions.template_preview },

  // ---- suggest-edit-function ---------------------------------------------------
  { id: 'suggest-edit.allowed-origin', source: 'suggest-edit-function', path: 'api/suggest-edit.js', design: 'suggest-edit.js:27',
    extract: once(/^const ALLOWED_ORIGIN = '([^']*)';$/m), expect: (r, b) => origin(b),
    retired: RETIREMENTS.suggestEditStep2 },
  { id: 'suggest-edit.repo', source: 'suggest-edit-function', path: 'api/suggest-edit.js', design: 'suggest-edit.js:29-30',
    extract: joined('/', once(/^const REPO_OWNER = '([^']*)';$/m), once(/^const REPO_NAME = '([^']*)';$/m)),
    expect: (r, b) => b.content.repo,
    retired: RETIREMENTS.suggestEditStep2 },
  { id: 'suggest-edit.live-branch', source: 'suggest-edit-function', path: 'api/suggest-edit.js', design: 'suggest-edit.js:31',
    extract: once(/^const REPO_BRANCH = '([^']*)';$/m), expect: (r, b) => b.content.live_branch,
    retired: RETIREMENTS.suggestEditStep2 },

  // ---- authoring-assistant (private: needs PARITY_READ_TOKEN) ------------------
  { id: 'console.repo', source: 'authoring-assistant', path: 'app/github.py', design: 'github.py:24-25',
    extract: joined('/', once(/^OWNER = "([^"]*)"$/m), once(/^REPO = "([^"]*)"$/m)), expect: (r, b) => b.content.repo },
  { id: 'console.drafts-branch', source: 'authoring-assistant', path: 'app/github.py', design: 'github.py:32',
    extract: once(/^DRAFTS_BRANCH = "([^"]*)"$/m), expect: (r, b) => b.content.drafts_branch },
  { id: 'console.live-branch', source: 'authoring-assistant', path: 'app/github.py', design: 'github.py:33',
    extract: once(/^LIVE_BRANCH = "([^"]*)"$/m), expect: (r, b) => b.content.live_branch },
  { id: 'console.drafts-pr-base-literal', source: 'authoring-assistant', path: 'app/github.py', design: 'github.py:254',
    extract: once(/[?&]base=([^&"]+)&/), expect: (r, b) => b.content.drafts_branch },
  { id: 'console.site', source: 'authoring-assistant', path: 'app/web/app.js', design: 'app.js:860',
    extract: once(/^const SITE = '([^']*)';$/m), expect: (r, b) => origin(b) },
  { id: 'console.history-url', source: 'authoring-assistant', path: 'app/web/app.js', design: 'app.js:862',
    extract: once(/^const HISTORY_URL = '([^']*)';$/m), expect: (r, b) => `https://github.com/${b.content.repo}/commits/${b.content.live_branch}` },

  // ---- textbook-edition-template ------------------------------------------------
  { id: 'edition.canonical-link', source: 'edition-template', path: 'quartz.config.yaml', design: 'quartz.config.yaml:229',
    extract: once(/^\s+Canonical textbook: (\S+)$/m), expect: (r, b) => origin(b) },
  { id: 'edition.licence', source: 'edition-template', path: 'quartz.config.yaml', design: 'quartz.config.yaml:230',
    extract: once(/^\s+Licence \(([^)]+)\): /m), expect: (r, b) => b.licence },
  { id: 'edition.extras-repo', source: 'edition-template', path: 'quartz.config.yaml', design: 'quartz.config.yaml:293,315',
    extract: every(/^\s+repo: "https:\/\/github\.com\/([^"]+)\.git"$/m),
    expect: (r) => [r.platform.edition_extras_repo] },
  { id: 'edition.upstream-url', source: 'edition-template', path: 'sync-upstream.sh', design: 'sync-upstream.sh:64',
    extract: once(/^UPSTREAM_URL="https:\/\/github\.com\/([^"]+)\.git"$/m), expect: (r, b) => b.editions.template_repo },

  // ---- quartz-edition-extras (docs only; its plugins take these as options) ----
  { id: 'extras.readme.canonical-repo', source: 'edition-extras', path: 'README.md', design: 'README.md:12 (not in §0a)',
    extract: once(/^- \*\*Canonical textbook:\*\* `([^`]+)`$/m), expect: (r, b) => b.content.repo },
  { id: 'extras.readme.template-repo', source: 'edition-extras', path: 'README.md', design: 'README.md:13 (not in §0a)',
    extract: once(/^- \*\*Edition template \(consumer of this repo\):\*\* `([^`]+)`$/m), expect: (r, b) => b.editions.template_repo },

  // ---- CMS auth relay source (a recorded fact, not a constant being replaced) --
  { id: 'cms-relay.github-scope', source: 'cms-auth-worker', path: 'src/index.js', design: 'sveltia-cms-auth src/index.js (not in §0a)',
    // Two shapes: the deployed fork hardcodes `scope: 'repo,user'` in the GitHub branch;
    // newer upstream keeps a `providerScopes.github.default`. Whichever is present.
    extract: (text) => {
      const upstream = /github:\s*\{\s*default:\s*'([^']+)'/.exec(text);
      if (upstream) return { value: upstream[1], line: lineOf(text, upstream.index) };
      return once(/client_id: GITHUB_CLIENT_ID,\s*scope: '([^']+)'/)(text);
    },
    expect: (r) => r.platform.cms_auth_relay_scope },
];

// Registry values that no repository holds, so parity cannot check them. Printed
// on every run so nobody mistakes silence for verification.
export const unverifiable = [
  { field: 'platform.console_oauth_client_id', where: 'each Mac\'s ~/Library/Application Support/Authoring Assistant/state.json (server.py:504-505); verified by hand 2026-09-15' },
  { field: 'books[].maintainer.github', where: 'supplied by the maintainer; no repo records it' },
  { field: 'books[].cms.host (live value)', where: 'the Worker\'s ALLOWED_DOMAINS variable and the Pages project name live in Cloudflare; parity checks the docs that describe them' },
  { field: 'books[].analytics.plausible.site / dashboard_public', where: 'Plausible account settings; checked by hand 2026-09-15' },
  { field: 'books[].status, books[].suggest_edit.enabled, books[].cms.enabled', where: 'registry-only' },
];
