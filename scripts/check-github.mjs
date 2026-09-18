// Facts about the outside world that the registry asserts (DESIGN §1c, §2d).
//
//   node scripts/check-github.mjs [registry.json]
//
// Fails:  a content repo that is missing or not public (the console's public_repo
//         scope makes "every registered content repo is public" a platform
//         invariant); a live or drafts branch that doesn't exist; a template or
//         extras repo that doesn't exist (a book with editions: null has no
//         template repo to check); a repo that has moved (the registry
//         must name it where it is, since services match on it exactly); an
//         automation login with no account behind it (parity only proves the
//         registry and the scripts agree, and they once agreed on a misspelling).
// Warns:  a domain, CMS host or preview URL that doesn't answer right now. A new
//         domain may not be live yet, so this is never a failure.
//
// Run with a registry that has already passed validate.mjs.

import { readFileSync } from 'node:fs';
import { getRepo, getUser, branchExists } from './github.mjs';

const path = process.argv[2] ?? new URL('../registry.json', import.meta.url);
const reg = JSON.parse(readFileSync(path, 'utf8'));

const gha = Boolean(process.env.GITHUB_ACTIONS);
let failures = 0;
const fail = (msg) => { failures++; console.log(gha ? `::error::${msg}` : `FAIL  ${msg}`); };
const warn = (msg) => console.log(gha ? `::warning::${msg}` : `warn  ${msg}`);
const ok = (msg) => console.log(`ok    ${msg}`);

async function repoAt(fullName, label) {
  let repo;
  try {
    repo = await getRepo(fullName);
  } catch (e) {
    fail(`${label}: ${fullName} can't be read (${e.status ?? e.message})`);
    return null;
  }
  if (repo.full_name.toLowerCase() !== fullName.toLowerCase()) {
    fail(`${label}: ${fullName} has moved to ${repo.full_name}; update the registry`);
  }
  return repo;
}

async function answers(url) {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(15000) });
    return res.status < 400 ? null : `HTTP ${res.status}`;
  } catch (e) {
    return e.cause?.code ?? e.name ?? 'unreachable';
  }
}

for (const [label, fullName] of [['platform.edition_extras_repo', reg.platform.edition_extras_repo]]) {
  if (await repoAt(fullName, label)) ok(`${label}: ${fullName}`);
}

for (const login of reg.platform.automation_logins) {
  let user;
  try {
    user = await getUser(login);
  } catch (e) {
    fail(`platform.automation_logins: ${login} can't be looked up (${e.status ?? e.message})`);
    continue;
  }
  if (!user) fail(`platform.automation_logins: there is no GitHub account called ${login}`);
  else if (user.login.toLowerCase() !== login.toLowerCase()) fail(`platform.automation_logins: ${login} resolves to ${user.login}; record the account's own login`);
  else ok(`platform.automation_logins: ${login} exists (${user.type})`);
}

for (const b of reg.books) {
  if (b.status === 'retired') { ok(`${b.slug}: retired, skipped`); continue; }

  const repo = await repoAt(b.content.repo, `${b.slug} content.repo`);
  if (repo) {
    if (repo.visibility !== 'public' || repo.private) fail(`${b.slug}: ${b.content.repo} is ${repo.visibility}; content repos must be public`);
    else ok(`${b.slug}: ${b.content.repo} exists and is public`);

    for (const key of ['live_branch', 'drafts_branch']) {
      const branch = b.content[key];
      if (await branchExists(b.content.repo, branch)) ok(`${b.slug}: branch ${branch} exists (${key})`);
      else fail(`${b.slug}: content.${key} ${branch} does not exist on ${b.content.repo}`);
    }
  }

  if (!b.editions) ok(`${b.slug}: no department editions (editions is null)`);
  else if (await repoAt(b.editions.template_repo, `${b.slug} editions.template_repo`)) ok(`${b.slug}: ${b.editions.template_repo} exists`);

  const probes = [];
  if (b.site.domain) probes.push(['site.domain', `https://${b.site.domain}/`]);
  if (b.cms.enabled && b.cms.host) probes.push(['cms.host', `https://${b.cms.host}/`]);
  if (b.editions?.template_preview) probes.push(['editions.template_preview', `${b.editions.template_preview}/`]);
  for (const [key, url] of probes) {
    const problem = await answers(url);
    if (problem) warn(`${b.slug}: ${key} ${url} does not answer (${problem}). Not a failure; a new host may not be live yet.`);
    else ok(`${b.slug}: ${key} ${url} answers`);
  }
}

if (failures) {
  console.log(`\n${failures} failure(s).`);
  process.exit(1);
}
console.log('\nAll GitHub facts hold.');
