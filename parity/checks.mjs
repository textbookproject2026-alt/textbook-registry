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
//     (default: the check's own path) in `consumes.source` (default: the check's
//     own source). A constant that vanished without a registry read in its place
//     fails too; that is a regression, not a migration.
// When every check is retired, delete the parity job (DESIGN §5 step 1, step 8).
//
// A check with `when(registry, book)` applies only when that returns null; otherwise
// it is reported n/a with the reason returned (host kinds, §8 step 13). A check with
// `expectFrom: { source, path, extract }` takes its expected value from a second
// repo instead of from `expect(registry, book)`.
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

// --- the builder (quartz-book) ------------------------------------------------
// A builder book has no copy of the reading site's values: builder/lib.mjs takes
// them from the registry at build time (BOOK-ONE-TO-QUARTZ §0). So a builder check
// reads the two places a value passes through on its way to the reader:
// `bookOptions`, which reads it from the book's entry, and `renderConfig`, which
// puts it into a plugin's options. The first is evaluated against the registry
// being checked, so the value compared is the one the builder would build with.
// An expression the evaluator doesn't know fails: parity must not guess.
// Every extractor gets `(text, { registry, book })`; the others ignore the second.

/** The body of `export function NAME(` up to the first `}` in column 0. */
const fnBody = (text, name) => {
  const starts = [...text.matchAll(new RegExp(`^export function ${name}\\(`, 'gm'))];
  if (!starts.length) throw new NotFound(`expected exactly one "export function ${name}", found 0`);
  if (starts.length !== 1) throw new Error(`expected exactly one "export function ${name}", found ${starts.length}`);
  const end = text.indexOf('\n}\n', starts[0].index);
  if (end < 0) throw new Error(`"function ${name}" is not closed`);
  return { body: text.slice(starts[0].index, end), line: lineOf(text, starts[0].index) };
};

/** The `const NAME = <expr>` lines of a function body, one line each. */
const constsOf = (body) => Object.fromEntries([...body.matchAll(/^\s+const (\w+) = (.+)$/gm)].map((m) => [m[1], m[2]]));

/**
 * The expressions builder/lib.mjs uses to read the registry: `book.a?.b`,
 * `registry.a?.b`, `X ?? ""`, `A ?? B`, `X === true`, `X === "literal"`,
 * `A ? B : ""`, and a name bound by a `const` in the same function.
 */
export function evaluate(expr, scope, consts = {}, depth = 0) {
  const e = expr.trim();
  if (depth > 8) throw new Error(`the builder's expression \`${e}\` nests too deeply to evaluate`);
  const again = (x) => evaluate(x, scope, consts, depth + 1);
  let m;
  if ((m = /^(\w+) \? (\w+) : "([^"]*)"$/.exec(e))) return again(m[1]) ? again(m[2]) : m[3];
  if ((m = /^(.+) === true$/.exec(e))) return again(m[1]) === true;
  if ((m = /^(.+) \?\? "([^"]*)"$/.exec(e))) return again(m[1]) ?? m[2];
  if ((m = /^(.+?) \?\? (.+)$/.exec(e))) return again(m[1]) ?? again(m[2]);
  if ((m = /^(.+) === "([^"]*)"$/.exec(e))) return again(m[1]) === m[2];
  if ((m = /^(book|registry)((?:\??\.\w+)*)$/.exec(e)))
    return m[2].split(/\??\./).slice(1).reduce((v, k) => v?.[k], scope[m[1]]);
  if (/^\w+$/.test(e) && Object.hasOwn(consts, e)) return again(consts[e]);
  throw new Error(`the builder's expression \`${e}\` is not one parity can evaluate`);
}

/**
 * The value the builder gives `plugin`'s option `key` for this book: renderConfig
 * must set it from `opts.<optKey>`, and bookOptions' `<optKey>:` is evaluated.
 */
export const builderOption = (plugin, key, optKey = key) => (text, { registry, book }) => {
  const render = fnBody(text, 'renderConfig');
  const assign = new RegExp(`Object\\.assign\\(plugin\\("${plugin}"\\)\\.options, \\{([^}]*)\\}\\)`).exec(render.body);
  if (!assign) throw new NotFound(`renderConfig does not fill ${plugin}'s options`);
  if (!new RegExp(`^\\s+${key}: opts\\.${optKey},$`, 'm').test(assign[1]))
    throw new NotFound(`renderConfig does not set ${plugin}'s ${key} from opts.${optKey}`);
  const opts = fnBody(text, 'bookOptions');
  const field = once(new RegExp(`^\\s+${optKey}: (.+),$`, 'm'))(opts.body);
  return { value: evaluate(field.value, { registry, book }, constsOf(opts.body)), line: opts.line + field.line - 1 };
};

/** The value of `const NAME = <expr>` in function `fn`, evaluated for this book. */
export const builderConst = (fn, name) => (text, { registry, book }) => {
  const { body, line } = fnBody(text, fn);
  const found = once(new RegExp(`^\\s+const ${name} = (.+)$`, 'm'))(body);
  return { value: evaluate(found.value, { registry, book }, constsOf(body)), line: line + found.line - 1 };
};

/**
 * The graph's entry in a quartz.config.yaml plugin list (upstream's graph or the
 * platform's textbook-graph), as its lines: comments and blank lines dropped,
 * indentation kept relative to the `- source:` line. D11 wants the same block in
 * the builder and the edition template, so two configs compare line for line.
 */
export const graphBlock = (text) => {
  const lines = text.split('\n');
  const strip = (l) => (/^\s*#/.test(l) ? '' : l.replace(/\s+#.*$/, '').trimEnd());
  const indent = (l) => l.length - l.trimStart().length;
  const blocks = [];
  lines.forEach((l, i) => {
    if (!/^\s*- source:/.test(l)) return;
    const own = indent(l);
    const body = [l.slice(own).trimEnd()];
    for (let j = i + 1; j < lines.length; j++) {
      const s = strip(lines[j]);
      if (!s) continue;
      if (indent(s) <= own) break;
      body.push(s.slice(own));
    }
    if (body.some((b) => /\bquartz-community\/graph\b|\bplugins\/textbook-graph\b/.test(b))) blocks.push({ body, line: i + 1 });
  });
  if (!blocks.length) throw new NotFound('no graph plugin in the plugin list');
  if (blocks.length !== 1) throw new Error(`expected exactly one graph plugin, found ${blocks.length} (lines ${blocks.map((b) => b.line).join(',')})`);
  return { value: blocks[0].body, line: blocks[0].line };
};

// --- when a check applies (by the book's host) -----------------------------------
// `when(registry, book)` returns null when the check applies, or the reason it
// doesn't. A check that doesn't apply is printed as n/a with that reason, so
// nobody mistakes it for a pass.

const onPublish = (r, b) => (b.site.host.kind === 'obsidian-publish' ? null
  : `host is ${b.site.host.kind}, not obsidian-publish; Publish's files are kept only for rollback until §8 step 20`);
const onBuilder = (r, b) => (b.site.host.builder === 'quartz-book' ? null
  : 'the builder does not build this book (no site.host.builder "quartz-book")');
const withCms = (r, b) => (b.cms?.enabled ? null : 'cms.enabled is false');

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

// The builder's copy of the book automation (§8 step 14): quartz-book at `stable`.
const AUTOMATION = 'automation/scripts';

// Each step-14 retirement requires the line that now reads the value, in the
// builder's script that every book's reusable workflow runs.
function automationStep14(name, reason, path, pattern) {
  return {
    [name]: {
      step: '14',
      source: 'builder',
      commit: 'a57c2e0',
      reason,
      consumes: { path, pattern },
    },
  };
}

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

// The console passes the resolved book to every repository call (app/github.py) and
// takes its links from the book the app resolved (app/web/app.js). Each retirement
// requires the line that now carries the value, so a file that merely lost the
// constant does not pass.
function consoleStep5(name, path, reason, pattern) {
  return {
    [name]: {
      step: '5',
      source: 'authoring-assistant',
      commit: 'befb6a8',
      reason,
      consumes: { path, pattern },
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
  // Step 3b made the dashboard read the registry, in the book's scripts/. Step 14
  // moved the script to the builder, so the registry read that replaced
  // textbook.config.json's plausible_public_url is found there now.
  dashboardStep3b: {
    step: '3b',
    source: 'content',
    commit: 'e856e31',
    reason: 'gen-dashboard.mjs fetches the registry at run time (lib/registry.mjs) and takes the repo, site, groups, edition template, fork owners and Plausible dashboard from the book\'s entry; the dashboard URL is derived from analytics.plausible.site, not stored; since §8 step 14 the script is quartz-book\'s',
    consumes: { source: 'builder', path: `${AUTOMATION}/gen-dashboard.mjs`, pattern: /^import \{[^}]*\bloadBook\b[^}]*\} from '\.\/lib\/registry\.mjs';$/m },
  },
  // Step 14 (BOOK-ONE-TO-QUARTZ §8): the book's weekly jobs became quartz-book's
  // reusable workflows, and the scripts that still held a constant read the registry.
  // The backup and the dashboard already did (step 3b, textbook e856e31): their
  // checks moved to the builder's copy with them.
  ...automationStep14('backupStep14',
    'backup-annotations.mjs fetches the registry at run time (lib/registry.mjs) and takes the site, legacy origins and Hypothes.is groups from the book\'s entry (since step 3b, textbook e856e31)',
    `${AUTOMATION}/backup-annotations.mjs`, /^import \{[^}]*\bloadBook\b[^}]*\} from '\.\/lib\/registry\.mjs';$/m),
  ...automationStep14('dashboardStep14',
    'gen-dashboard.mjs fetches the registry at run time (lib/registry.mjs) and takes the repo, site, groups, edition template, fork owners and Plausible dashboard from the book\'s entry (since step 3b, textbook e856e31)',
    `${AUTOMATION}/gen-dashboard.mjs`, /^import \{[^}]*\bloadBook\b[^}]*\} from '\.\/lib\/registry\.mjs';$/m),
  ...automationStep14('derivativesTemplateStep14',
    'gen-derivatives.mjs takes the edition template from the book\'s editions.template_repo',
    `${AUTOMATION}/gen-derivatives.mjs`, /field\(book, 'editions\.template_repo', isString,/),
  ...automationStep14('derivativesOwnersStep14',
    'gen-derivatives.mjs takes the fork owners to skip from the book\'s editions.skip_fork_owners',
    `${AUTOMATION}/gen-derivatives.mjs`, /field\(book, 'editions\.skip_fork_owners', isStringArray,/),
  ...automationStep14('contributorsBotsStep14',
    'gen-contributors.mjs takes the automation accounts from the registry\'s platform.automation_logins',
    `${AUTOMATION}/gen-contributors.mjs`, /const logins = registry\.platform\?\.automation_logins;/),
  ...automationStep14('linkCheckOriginStep14',
    'the link check\'s ignore list holds a __SITE_DOMAIN__ token, which lychee-ignore.mjs fills from the book\'s site.domain',
    `${AUTOMATION}/lychee-ignore.mjs`, /^(?=[\s\S]*domain = field\(book, 'site\.domain', isString, 'a hostname'\);)(?=[\s\S]*replaceAll\('__SITE_DOMAIN__', domain\))/),
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
  // The platform's operator docs moved out of the vault into this repo's docs/ on
  // 22 Sep 2026. The four checks below read values that those docs used to carry
  // as a stand-in for settings no repo holds (the relay allowlist, the relay URL,
  // the template preview). With the files gone from the content repo there is
  // nothing to drift there; the "registry read" that replaces them is the vault's
  // docs index pointing at this repo's copy.
  docsMovedToRegistry: {
    step: 'docs',
    source: 'content',
    commit: '01b83a4',
    reason: 'the platform docs (INFRASTRUCTURE.md, OAUTH-SETUP.md) moved to textbook-registry/docs/, and the vault now points there',
    consumes: { path: 'docs/README.md', pattern: /textbook-registry\/docs\/INFRASTRUCTURE\.md/ },
  },
  ...consoleStep5('consoleRepoStep5', 'app/github.py',
    'the console fetches the registry at launch (app/registry.py), resolves the book from the chosen book or the open vault, and builds every repository URL from that book\'s content.repo',
    /^\s+url = \(f"\{API\}\/repos\/\{book\.repo\}\/issues"$/m),
  ...consoleStep5('consoleDraftsStep5', 'app/github.py',
    'the console lists draft changes against the resolved book\'s content.drafts_branch',
    /^\s+f"&base=\{urllib\.parse\.quote\(book\.drafts_branch\)\}"\)$/m),
  ...consoleStep5('consoleLiveStep5', 'app/github.py',
    'the console opens the publish request from the resolved book\'s drafts_branch into its live_branch',
    /"head": book\.drafts_branch, "base": book\.live_branch\}/),
  ...consoleStep5('consoleLinksStep5', 'app/web/app.js',
    'the page takes the discussion and history links from the book the app resolved; both are derived from site.domain, content.repo and live_branch in app/registry.py, not stored',
    /\bbook\.discussion_url\b[\s\S]*\bbook\.history_url\b/),
};

// --- the manifest -------------------------------------------------------------

export const checks = [
  // ---- the reading site: what the builder builds (BOOK-ONE-TO-QUARTZ §8 step 13) --
  // Read at the `stable` tag, the builder commit every book is built with.
  { id: 'reading-site.repo', source: 'builder', path: 'builder/lib.mjs', design: 'quartz-book lib.mjs bookOptions → renderConfig (edit-on-github repo)',
    when: onBuilder, extract: builderOption('edit-on-github', 'repo'), expect: (r, b) => b.content.repo },
  { id: 'reading-site.live-branch', source: 'builder', path: 'builder/lib.mjs', design: 'quartz-book lib.mjs reconcileTargets (the branch deployed to production)',
    when: onBuilder, extract: builderConst('reconcileTargets', 'live'), expect: (r, b) => b.content.live_branch },
  { id: 'reading-site.suggest-edit-endpoint', source: 'builder', path: 'builder/lib.mjs', design: 'quartz-book lib.mjs bookOptions → renderConfig (edit-on-github suggestEndpoint)',
    when: onBuilder, extract: builderOption('edit-on-github', 'suggestEndpoint'),
    expect: (r, b) => (b.suggest_edit?.enabled ? r.platform.suggest_edit_endpoint : '') },
  { id: 'reading-site.plausible-script', source: 'builder', path: 'builder/lib.mjs', design: 'quartz-book lib.mjs bookOptions → renderConfig (edition-integrations plausibleScriptSrc)',
    when: onBuilder, extract: builderOption('edition-integrations', 'plausibleScriptSrc'),
    // D19 (§8 step 17a): the platform's one site, for live books only.
    expect: (r, b) => (b.status === 'live' ? r.platform.analytics.plausible?.script_src ?? '' : '') },

  // D11: the edition template's graph is the builder's graph. The expected value is
  // read from the builder's config, not from the registry.
  { id: 'graph.edition-template-matches-builder', source: 'edition-template', path: 'quartz.config.yaml', design: 'BOOK-ONE-TO-QUARTZ §4a, D11',
    extract: graphBlock, expectFrom: { source: 'builder', path: 'quartz.config.yaml', extract: graphBlock },
    drift: { value: ['- source: github:quartz-community/graph', '  enabled: false', '  layout:', '    position: right', '    priority: 10'],
      note: 'The edition template still ships upstream\'s graph, switched off. §8 step 22 gives it the builder\'s block; then remove this drift entry.' } },

  // ---- textbook (the content repo, read at live_branch) ---------------------
  // Publish's copy of the reading site's values. Checked only while Publish serves
  // readers; from §8 step 17 these files are the rollback copy, and step 20 deletes them.
  { id: 'publish.js.repo', source: 'content', path: 'publish.js', design: 'publish.js:12',
    when: onPublish, extract: once(/^const REPO = '([^']*)';$/m), expect: (r, b) => b.content.repo },
  { id: 'publish.js.live-branch', source: 'content', path: 'publish.js', design: 'publish.js:13',
    when: onPublish, extract: once(/^const BRANCH = '([^']*)';$/m), expect: (r, b) => b.content.live_branch },
  { id: 'publish.js.suggest-edit-endpoint', source: 'content', path: 'publish.js', design: 'publish.js:44',
    when: onPublish, extract: once(/^const SUGGEST_EDIT_ENDPOINT = '([^']*)';$/m), expect: (r) => r.platform.suggest_edit_endpoint },
  { id: 'publish.js.plausible-script', source: 'content', path: 'publish.js', design: 'publish.js:791',
    when: onPublish, extract: once(/\bs\.src = '(https:\/\/plausible\.io\/[^']*)';/), expect: (r) => r.platform.analytics.plausible?.script_src },

  // D7: admin/config.yml is hand-kept once configure.mjs goes (§8 step 18), so the
  // file the CMS host serves is compared with the registry directly. Until then it
  // is configure.mjs's output, and these pass for the same reason.
  { id: 'cms.config.repo', source: 'content', path: 'admin/config.yml', design: 'admin/config.yml backend.repo (D7)',
    when: withCms, extract: once(/^ {2}repo: (\S+)$/m), expect: (r, b) => b.content.repo },
  { id: 'cms.config.drafts-branch', source: 'content', path: 'admin/config.yml', design: 'admin/config.yml backend.branch (D7, load-bearing line)',
    when: withCms, extract: once(/^ {2}branch: (\S+)$/m), expect: (r, b) => b.content.drafts_branch },
  { id: 'cms.config.auth-relay', source: 'content', path: 'admin/config.yml', design: 'admin/config.yml backend.base_url (D7)',
    when: withCms, extract: once(/^ {2}base_url: (\S+)$/m), expect: (r) => r.platform.cms_auth_relay },

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
    extract: jsonKey('plausible_public_url'), expect: (r) => `https://plausible.io/${r.platform.analytics.plausible?.site}`,
    retired: RETIREMENTS.dashboardStep3b },

  // ---- book automation: quartz-book's automation/, read at `stable` (§8 step 14) ----
  // These scripts were the book's own until step 14. A `__TOKEN__` is a placeholder,
  // not a hardcoded value.
  { id: 'link-check.canonical-origin', source: 'builder', path: 'automation/.lycheeignore', design: 'book one\'s .lycheeignore:1, until §8 step 14',
    extract: once(/^(https:\/\/(?!__[A-Z0-9_]+__)[^\s/]+)\/?$/m), expect: (r, b) => origin(b),
    retired: RETIREMENTS.linkCheckOriginStep14 },

  { id: 'publish.site-id', source: 'content', path: '.obsidian/publish.json', design: '.obsidian/publish.json:2',
    when: onPublish, extract: jsonKey('siteId'), expect: (r, b) => b.site.host.site_id },
  { id: 'publish.host', source: 'content', path: '.obsidian/publish.json', design: '.obsidian/publish.json:3',
    when: onPublish, extract: jsonKey('host'), expect: (r, b) => b.site.host.publish_host },

  { id: 'backup.hypothesis-groups', source: 'builder', path: 'automation/scripts/backup-annotations.mjs', design: 'backup-annotations.mjs:58-61',
    extract: jsGroups('ANNOTATION_GROUPS'), expect: (r, b) => b.annotations.hypothesis_groups,
    retired: RETIREMENTS.backupStep14 },
  { id: 'backup.default-site', source: 'builder', path: 'automation/scripts/backup-annotations.mjs', design: 'backup-annotations.mjs:64',
    extract: once(/^const DEFAULT_SITE = '([^']*)';$/m), expect: (r, b) => origin(b),
    retired: RETIREMENTS.backupStep14 },
  { id: 'backup.legacy-origins', source: 'builder', path: 'automation/scripts/backup-annotations.mjs', design: 'backup-annotations.mjs:73',
    extract: jsStrings('LEGACY_SITES'), expect: (r, b) => b.site.legacy_origins,
    retired: RETIREMENTS.backupStep14 },

  { id: 'dashboard.repo-fallback', source: 'builder', path: 'automation/scripts/gen-dashboard.mjs', design: 'gen-dashboard.mjs:93',
    extract: once(/process\.env\.GITHUB_REPOSITORY \|\| '([^']*)'/), expect: (r, b) => b.content.repo,
    retired: RETIREMENTS.dashboardStep14 },
  { id: 'dashboard.template-repo', source: 'builder', path: 'automation/scripts/gen-dashboard.mjs', design: 'gen-dashboard.mjs:98',
    extract: once(/^const TEMPLATE_REPO = '([^']*)';$/m), expect: (r, b) => b.editions.template_repo,
    retired: RETIREMENTS.dashboardStep14 },
  { id: 'dashboard.skip-fork-owners', source: 'builder', path: 'automation/scripts/gen-dashboard.mjs', design: 'gen-dashboard.mjs:99',
    extract: jsStrings('SKIP_FORK_OWNERS'), expect: (r, b) => b.editions.skip_fork_owners,
    retired: RETIREMENTS.dashboardStep14 },
  { id: 'dashboard.hypothesis-groups', source: 'builder', path: 'automation/scripts/gen-dashboard.mjs', design: 'gen-dashboard.mjs:109-112',
    extract: jsGroups('ANNOTATION_GROUPS'), expect: (r, b) => b.annotations.hypothesis_groups,
    retired: RETIREMENTS.dashboardStep14 },
  { id: 'dashboard.site-url', source: 'builder', path: 'automation/scripts/gen-dashboard.mjs', design: 'gen-dashboard.mjs:674',
    extract: once(/^\s+site_url: '([^']*)',$/m), expect: (r, b) => origin(b),
    retired: RETIREMENTS.dashboardStep14 },

  { id: 'derivatives.template-repo', source: 'builder', path: 'automation/scripts/gen-derivatives.mjs', design: 'gen-derivatives.mjs:68',
    extract: once(/^const UPSTREAM = '([^']*)';$/m), expect: (r, b) => b.editions.template_repo,
    retired: RETIREMENTS.derivativesTemplateStep14 },
  { id: 'derivatives.skip-fork-owners', source: 'builder', path: 'automation/scripts/gen-derivatives.mjs', design: 'gen-derivatives.mjs:71',
    extract: jsStrings('SKIP_OWNERS'), expect: (r, b) => b.editions.skip_fork_owners,
    retired: RETIREMENTS.derivativesOwnersStep14 },
  // The book's derivatives.yml named the template in a comment; the workflow is the
  // builder's book-community-page.yml since step 14, and the book's is a caller.
  { id: 'derivatives-workflow.template-repo', source: 'builder', path: '.github/workflows/book-community-page.yml', design: 'book one\'s derivatives.yml:24 (comment), until §8 step 14',
    extract: once(/^# The forks of (\S+), over the/m), expect: (r, b) => b.editions.template_repo,
    retired: RETIREMENTS.derivativesTemplateStep14 },

  { id: 'contributors.automation-logins', source: 'builder', path: 'automation/scripts/gen-contributors.mjs', design: 'gen-contributors.mjs:61',
    extract: jsStrings('EXTRA_BOTS'), expect: (r) => r.platform.automation_logins,
    retired: RETIREMENTS.contributorsBotsStep14 },

  { id: 'licence.text', source: 'content', path: 'LICENSE', design: 'LICENSE (not in §0a)',
    extract: (text) => ({ value: text.split('\n')[0].trim(), line: 1 }),
    expect: (r, b) => LICENCE_HEADINGS[b.licence] ?? `(no heading known for ${b.licence}; add it to LICENCE_HEADINGS)` },

  { id: 'landing.title', source: 'content', path: 'index.md', design: 'index.md:1 (rendered from templates/)',
    extract: once(/^# (.+)$/m), expect: (r, b) => b.title },
  { id: 'landing.summary', source: 'content', path: 'templates/index.md', design: 'templates/index.md:3',
    extract: once(/^Welcome\. This is (.+?) — /m), expect: (r, b) => lcfirst(b.summary).replace(/\.$/, '') },

  { id: 'docs.cms-allowed-domains', source: 'content', path: 'OAUTH-SETUP.md', design: 'OAUTH-SETUP.md:107 (stands in for the Worker variable, which no repo holds)',
    extract: once(/^\| `ALLOWED_DOMAINS` \| `([^`]+)` \|/m), expect: (r, b) => b.cms.host,
    retired: RETIREMENTS.docsMovedToRegistry },
  { id: 'docs.cms-homepage', source: 'content', path: 'OAUTH-SETUP.md', design: 'OAUTH-SETUP.md:78 (OAuth App homepage)',
    extract: once(/^\| Homepage URL \| `([^`]+)`/m), expect: (r, b) => `https://${b.cms.host}`,
    retired: RETIREMENTS.docsMovedToRegistry },
  { id: 'docs.infrastructure.cms-relay', source: 'content', path: 'docs/INFRASTRUCTURE.md', design: 'INFRASTRUCTURE.md §3',
    extract: once(/^- \*\*URL:\*\* `(https:\/\/[^`]*workers\.dev)`$/m), expect: (r) => r.platform.cms_auth_relay,
    retired: RETIREMENTS.docsMovedToRegistry },
  { id: 'docs.infrastructure.template-preview', source: 'content', path: 'docs/INFRASTRUCTURE.md', design: 'INFRASTRUCTURE.md §5',
    extract: once(/^## 5\.[^\n]*\n\n- \*\*URL:\*\* <([^>]+)>$/m), expect: (r, b) => b.editions.template_preview,
    retired: RETIREMENTS.docsMovedToRegistry },

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
    extract: joined('/', once(/^OWNER = "([^"]*)"$/m), once(/^REPO = "([^"]*)"$/m)), expect: (r, b) => b.content.repo,
    retired: RETIREMENTS.consoleRepoStep5 },
  { id: 'console.drafts-branch', source: 'authoring-assistant', path: 'app/github.py', design: 'github.py:32',
    extract: once(/^DRAFTS_BRANCH = "([^"]*)"$/m), expect: (r, b) => b.content.drafts_branch,
    retired: RETIREMENTS.consoleDraftsStep5 },
  { id: 'console.live-branch', source: 'authoring-assistant', path: 'app/github.py', design: 'github.py:33',
    extract: once(/^LIVE_BRANCH = "([^"]*)"$/m), expect: (r, b) => b.content.live_branch,
    retired: RETIREMENTS.consoleLiveStep5 },
  { id: 'console.drafts-pr-base-literal', source: 'authoring-assistant', path: 'app/github.py', design: 'github.py:254',
    extract: once(/[?&]base=([^&"]+)&/), expect: (r, b) => b.content.drafts_branch,
    retired: RETIREMENTS.consoleDraftsStep5 },
  { id: 'console.site', source: 'authoring-assistant', path: 'app/web/app.js', design: 'app.js:860',
    extract: once(/^const SITE = '([^']*)';$/m), expect: (r, b) => origin(b),
    retired: RETIREMENTS.consoleLinksStep5 },
  { id: 'console.history-url', source: 'authoring-assistant', path: 'app/web/app.js', design: 'app.js:862',
    extract: once(/^const HISTORY_URL = '([^']*)';$/m), expect: (r, b) => `https://github.com/${b.content.repo}/commits/${b.content.live_branch}`,
    retired: RETIREMENTS.consoleLinksStep5 },

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
  { field: 'platform.console_oauth_client_id', where: 'read by the console from the registry at launch since step 5 (no repo holds a copy); a value pasted into a Mac\'s state.json still overrides it; verified by hand 2026-09-15' },
  { field: 'books[].maintainer.github', where: 'supplied by the maintainer; no repo records it' },
  { field: 'books[].cms.host (live value)', where: 'the Worker\'s ALLOWED_DOMAINS variable and the Pages project name live in Cloudflare; parity checks the docs that describe them' },
  { field: 'platform.analytics.plausible.site / dashboard_public', where: 'Plausible account settings (one site for the platform since §8 step 17a); checked by hand when the site was renamed' },
  { field: 'books[].status, books[].suggest_edit.enabled, books[].cms.enabled', where: 'registry-only' },
  { field: 'books[].site.host.builder', where: 'registry-only: quartz-book reads it at build time (BOOK-ONE-TO-QUARTZ §8 step 8), so no repo holds a copy. check-github.mjs proves each builder book can be read anonymously' },
  { field: 'books[].site.host.project (on an obsidian-publish host)', where: 'the Pages project the builder previews a Publish book on (BOOK-ONE-TO-QUARTZ §8 step 7, amended 24 Sep 2026) lives in Cloudflare; the build marker at <project>.pages.dev/.well-known/textbook.json shows it is the one being deployed' },
  { field: 'books[].site.host.paid_by, books[].site.dark, books[].site.aliases', where: 'registry-only (MULTI-BOOK-HOSTING §4b); paid_by is a fact about a subscription, dark is declared by the platform owner, and no repo holds the aliases' },
  { field: 'platform.portal.host.project, platform.portal.book_parent, platform.portal.cms_host', where: 'the Pages project lives in Cloudflare; book_parent is a convention new-book.mjs reads at run time and validate.mjs enforces; cms_host is null until DESIGN step 5b' },
  { field: 'platform.portal.domain', where: "no longer duplicated in a repo: .github/workflows/portal.yml reads it from registry.json at run time (22 Sep 2026). textbook-portal's own README and package.json describe it in prose, which parity does not read" },
];
