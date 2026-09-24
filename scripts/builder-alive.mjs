// Is the build-nudge Worker still starting builds? (BOOK-ONE-TO-QUARTZ §0a, §8 step 10)
//
// A Worker that stops dispatching makes no red run in quartz-book. It makes no
// run at all. So this looks from outside both: it fails unless a `reconcile` run
// named `cron` started within the last hour. Nudged runs don't count, because
// they can't show that the 15-minute tick is alive.
//
// It also reads the Worker's GET /, and warns a month before the Worker's token
// expires. That part only warns: the missing cron runs are what fail.
//
//   node scripts/builder-alive.mjs
//
// Environment: GITHUB_TOKEN (optional, for the rate limit; quartz-book is public),
// NOW (an ISO time, for trying it against an old day).

import { listWorkflowRuns } from './github.mjs';

export const BUILDER_REPO = 'textbookproject2026-alt/quartz-book';
export const WORKFLOW = 'reconcile.yml';
export const WORKER_URL = 'https://build-nudge.brandonproject2026.workers.dev/';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
export const MAX_SILENCE = HOUR;
export const EXPIRY_WARNING = 30 * DAY;

// reconcile's run-name is "reconcile: <woken_by or 'by hand'>, <slug or 'every book'>".
const isCron = (run) => /^reconcile: cron,/.test(run.display_title ?? '');

// GitHub's github-authentication-token-expiration header: "2027-09-24 00:00:00 UTC",
// or with an offset, "2027-09-24 00:00:00 +0000".
export function parseExpiry(value) {
  const s = String(value ?? '').trim();
  const iso = s.replace(' ', 'T').replace(/ UTC$/, 'Z').replace(/ ([+-]\d\d)(\d\d)$/, '$1:$2');
  return Date.parse(iso);
}

/**
 * The verdict, from the runs created since `now - MAX_SILENCE` and the Worker's
 * status (null if it didn't answer). Returns { ok, errors, warnings, notes }.
 */
export function judge({ runs, status, now }) {
  const errors = [];
  const warnings = [];
  const notes = [];

  const since = now - MAX_SILENCE;
  const cron = runs.filter(isCron).filter((r) => Date.parse(r.created_at) >= since);
  if (cron.length === 0) {
    errors.push(
      `No reconcile run named "cron" has started since ${new Date(since).toISOString()}. ` +
        'The build-nudge Worker, its Cron Trigger or its token has stopped, so nothing rebuilds on its own. ' +
        'Run reconcile by hand (quartz-book → Actions → reconcile → Run workflow, slug empty) until it is fixed. ' +
        'See docs/SCHEDULED-JOBS.md, "builder-alive".',
    );
  } else {
    const latest = cron[0];
    notes.push(`Latest cron run: ${latest.created_at}, ${latest.status}${latest.conclusion ? `, ${latest.conclusion}` : ''}: ${latest.html_url}`);
    const done = cron.find((r) => r.status === 'completed');
    if (done && done.conclusion !== 'success') {
      warnings.push(`The latest finished cron run of reconcile ended "${done.conclusion}": ${done.html_url}. A book's build is failing.`);
    }
  }

  if (!status) {
    warnings.push(`The Worker's status (${WORKER_URL}) didn't answer.`);
  } else {
    notes.push(`Worker version ${status.version}, token ${status.token}, expires ${status.token_expires ?? 'unknown'}.`);
    if (status.token !== 'works') {
      warnings.push(`The Worker says its token is "${status.token}". Replace DISPATCH_TOKEN (build-nudge README, "Changing the token").`);
    }
    const expires = parseExpiry(status.token_expires);
    if (Number.isFinite(expires) && expires - now < EXPIRY_WARNING) {
      const days = Math.floor((expires - now) / DAY);
      warnings.push(
        `The Worker's token expires on ${status.token_expires} (${days} days). ` +
          'Renew it now: docs/INFRASTRUCTURE.md §7, and the build-nudge README, "Changing the token".',
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings, notes };
}

async function readStatus() {
  try {
    const res = await fetch(WORKER_URL, { signal: AbortSignal.timeout(15000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const now = process.env.NOW ? Date.parse(process.env.NOW) : Date.now();
  const created = `>=${new Date(now - MAX_SILENCE).toISOString()}`;
  const runs = await listWorkflowRuns(BUILDER_REPO, WORKFLOW, { event: 'workflow_dispatch', created });
  const verdict = judge({ runs, status: await readStatus(), now });

  for (const n of verdict.notes) console.log(n);
  for (const w of verdict.warnings) console.log(`::warning::${w}`);
  for (const e of verdict.errors) console.log(`::error::${e}`);
  if (verdict.ok) console.log('The Worker is starting builds.');
  process.exit(verdict.ok ? 0 : 1);
}
