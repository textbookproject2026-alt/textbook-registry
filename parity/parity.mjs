// Parity: every registry value still equals the constant it will replace.
//
//   node parity/parity.mjs                 read the sibling repos from GitHub
//   node parity/parity.mjs --local ..      read them from checkouts beside this repo
//                                          (committed HEAD, via `git show`, so a dirty
//                                          working tree doesn't change the answer);
//                                          sources with no local_dir still use GitHub
//   node parity/parity.mjs --registry <path>   compare a different registry file
//
// GitHub mode needs GITHUB_TOKEN able to read every source, including the private
// authoring-assistant. A source that can't be read FAILS the run: skipping it would
// report parity that wasn't checked.
//
// How each repo is found, and why this survives repos moving:
//   - content, edition template and extras repos are located from registry.json,
//     so moving one is a registry change and parity follows it in the same commit;
//   - the two service repos are named in parity/sources.json;
//   - every repo is first resolved through GET /repos/{owner}/{name}. GitHub answers
//     a renamed or transferred repo with a redirect, so parity keeps reading it at
//     its new home and warns that the name on file is stale;
//   - each repo is pinned to one commit SHA for the whole run, so every file from
//     it is read from the same snapshot, and the SHA is printed for traceability.

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { join, resolve } from 'node:path';
import { checks, unverifiable, NotFound } from './checks.mjs';
import { getRepo, resolveSha, getFile, hasToken } from '../scripts/github.mjs';

// The constants in the five repos are this one book's. Parity is retired before a
// second book is added (DESIGN §5 step 8), so there is exactly one book to compare.
const SLUG = 'social-research-methods';

const args = process.argv.slice(2);
const option = (name) => { const i = args.indexOf(name); return i >= 0 ? (args[i + 1] ?? '') : null; };
const localRoot = option('--local') !== null ? resolve(option('--local') || '..') : null;

const here = new URL('.', import.meta.url);
const registryPath = option('--registry') ?? new URL('../registry.json', here);
const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
const sources = JSON.parse(readFileSync(new URL('sources.json', here), 'utf8'));

const gha = Boolean(process.env.GITHUB_ACTIONS);
const annotate = (level, msg) => console.log(gha ? `::${level}::${msg}` : `${level.toUpperCase()}: ${msg}`);

const book = registry.books.find((b) => b.slug === SLUG);
if (!book) {
  annotate('error', `parity is pinned to slug ${SLUG}, which is not in registry.json`);
  process.exit(1);
}

// --- locate sources ---------------------------------------------------------

function sourceSpec(name) {
  const s = sources[name];
  if (!s) throw new Error(`unknown source "${name}" (add it to parity/sources.json)`);
  switch (name) {
    case 'content': return { ...s, repo: book.content.repo, ref: book.content.live_branch };
    case 'edition-template': return { ...s, repo: book.editions.template_repo, ref: null };
    case 'edition-extras': return { ...s, repo: registry.platform.edition_extras_repo, ref: null };
    default: return s;
  }
}

const opened = new Map();

async function openSource(name) {
  if (opened.has(name)) return opened.get(name);
  const spec = sourceSpec(name);
  const promise = (async () => {
    // A source with no local checkout is read from GitHub even under --local.
    if (localRoot && spec.local_dir) {
      const dir = join(localRoot, spec.local_dir);
      const git = (...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 });
      const ref = spec.ref ?? 'HEAD';
      const sha = git('rev-parse', ref).trim();
      const read = async (path) => {
        try {
          return git('show', `${sha}:${path}`);
        } catch (e) {
          // Same shape as the GitHub client's answer for a missing file.
          if (/does not exist in|exists on disk, but not in/.test(String(e.stderr))) Object.assign(e, { status: 404, message: `${path} does not exist at ${sha.slice(0, 7)}` });
          throw e;
        }
      };
      return { label: `${spec.local_dir} (local)`, sha, read };
    }
    const meta = await getRepo(spec.repo);
    if (meta.full_name.toLowerCase() !== spec.repo.toLowerCase()) {
      const where = ['content', 'edition-template', 'edition-extras'].includes(name) ? 'registry.json' : 'parity/sources.json';
      annotate('warning', `${spec.repo} has moved to ${meta.full_name}; reading it there. Update ${where}.`);
    }
    const ref = spec.ref ?? meta.default_branch;
    const sha = await resolveSha(meta.full_name, ref);
    return { label: `${meta.full_name}@${ref}`, sha, read: (path) => getFile(meta.full_name, path, sha) };
  })();
  opened.set(name, promise);
  return promise;
}

const fileCache = new Map();
function readFile(src, path) {
  const key = `${src.sha}:${path}`;
  if (!fileCache.has(key)) fileCache.set(key, src.read(path));
  return fileCache.get(key);
}

// --- run --------------------------------------------------------------------

const show = (v) => (typeof v === 'string' ? v : JSON.stringify(v));
const results = [];

const readHint = (e) => (e.status === 404 && !hasToken() ? ' (no GITHUB_TOKEN set; private repos read as 404)' : e.status === 404 ? ' (missing file, or the token cannot read this repo; is PARITY_READ_TOKEN set?)' : '');

// A retired check is verified at the pinned commit: the constant must be gone, and the
// file must show the registry read that replaced it. See the header of checks.mjs.
async function verifyRetired(check) {
  const ret = check.retired;
  const label = `step ${ret.step}, ${ret.source} ${ret.commit}`;
  let src;
  try {
    src = await openSource(check.source);
  } catch (e) {
    return { check, status: 'FAIL', at: `${check.source} ${check.path}`, detail: `retired (${label}) but the source cannot be read to confirm it: ${e.message}${readHint(e)}` };
  }
  const at = `${src.label} ${src.sha.slice(0, 7)} ${check.path}`;

  let constant;
  try {
    constant = check.extract(await readFile(src, check.path));
  } catch (e) {
    if (!(e instanceof NotFound) && e.status !== 404)
      return { check, status: 'FAIL', at, detail: `retired (${label}) but the constant is not cleanly gone: ${e.message}${readHint(e)}` };
  }
  if (constant)
    return { check, status: 'FAIL', at: `${at}:${constant.line}`, detail: `retired (${label}) but the constant is still there: ${show(constant.value)}. Un-retire the check, or finish removing the constant.` };

  const consumesPath = ret.consumes.path ?? check.path;
  try {
    const { pattern } = ret.consumes;
    const text = await readFile(src, consumesPath);
    const m = new RegExp(pattern.source, pattern.flags.replace('g', '')).exec(text);
    if (!m) throw new Error(`no match for ${pattern}`);
    const line = text.slice(0, m.index).split('\n').length;
    return { check, status: 'retired', at, detail: `${label}: ${ret.reason}. Constant absent; registry read at ${consumesPath}:${line}.` };
  } catch (e) {
    return { check, status: 'FAIL', at, detail: `retired (${label}) and the constant is gone, but ${consumesPath} does not show the registry read (${e.message}${readHint(e)}). A constant that vanished with no registry read in its place is a regression, not a migration.` };
  }
}

for (const check of checks) {
  if (check.retired) {
    results.push(await verifyRetired(check));
    continue;
  }
  const expected = check.expect(registry, book);
  try {
    const src = await openSource(check.source);
    const text = await readFile(src, check.path);
    const { value, line } = check.extract(text);
    const at = `${src.label} ${src.sha.slice(0, 7)} ${check.path}:${line}`;

    if (isDeepStrictEqual(value, expected)) {
      results.push({ check, status: 'ok', at });
    } else if (check.drift && isDeepStrictEqual(value, check.drift.value)) {
      results.push({ check, status: 'drift', at, detail: `${show(value)} (registry: ${show(expected)}). ${check.drift.note}` });
    } else {
      results.push({ check, status: 'FAIL', at, detail: `found ${show(value)}, registry says ${show(expected)}` });
    }
  } catch (e) {
    results.push({ check, status: 'FAIL', at: `${check.source} ${check.path}`, detail: `${e.message}${readHint(e)}` });
  }
}

// --- report -----------------------------------------------------------------

const width = Math.max(...checks.map((c) => c.id.length));
for (const r of results) {
  const tag = { ok: 'ok     ', drift: 'DRIFT  ', retired: 'retired', FAIL: 'FAIL   ' }[r.status];
  console.log(`${tag} ${r.check.id.padEnd(width)}  ${r.at ?? ''}`);
  if (r.status !== 'ok') console.log(`        ${' '.repeat(width)}  ${r.detail}`);
}

for (const r of results.filter((r) => r.status === 'retired'))
  annotate('notice', `parity ${r.check.id} retired by migration and verified: ${r.detail}`);
for (const r of results.filter((r) => r.status === 'drift'))
  annotate('warning', `parity drift accepted for ${r.check.id}: ${r.detail}`);
for (const r of results.filter((r) => r.status === 'FAIL'))
  annotate('error', `parity ${r.check.id} (${r.check.design}): ${r.detail}`);

// Grouped by migration, so the trail reads as "which repos consume the registry now".
const retiredBy = Map.groupBy(results.filter((r) => r.status === 'retired'), (r) => r.check.retired);
if (retiredBy.size) {
  console.log('\nRetired by migration (constant verified absent, registry read verified present):');
  for (const [ret, rs] of retiredBy) console.log(`  - step ${ret.step}, ${ret.source} ${ret.commit}: ${rs.map((r) => r.check.id).join(', ')}`);
}

console.log('\nNot checked by parity (no repository holds these):');
for (const u of unverifiable) console.log(`  - ${u.field}: ${u.where}`);

const count = (s) => results.filter((r) => r.status === s).length;
console.log(`\n${count('ok')} ok, ${count('drift')} known drift, ${count('retired')} retired by migration, ${count('FAIL')} failed.`);

if (count('FAIL')) process.exit(1);
