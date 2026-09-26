# Scheduled jobs: health check

**Audience: the platform owner**, and whoever holds a book's technical-contact
role. This covers every workflow the platform runs, across the repos that have
them, with when each one runs, what a pass looks like, and how to tell a real
failure from a quiet week.

It replaces `textbook/docs/scheduled-actions-health-check.md`, which covered
book one's repository alone.

**Where to look, for all of them:** the repo's **Actions** tab → the workflow in
the left sidebar → the latest run. Each job that runs on a schedule also has
**Run workflow** (`workflow_dispatch`). After fixing something, re-run it by hand
instead of waiting for the next slot.

All times are **UTC**. GitHub's cron is always UTC, and a scheduled run can
start tens of minutes late under load.

---

## The whole week at a glance

| When (UTC) | Repo | Workflow | Writes |
|---|---|---|---|
| every 15 min | Cloudflare Worker `build-nudge` (a Cron Trigger) | dispatches `reconcile` in `quartz-book`, named `cron` | each builder book's Pages deployments, when a book or branch is behind. When `quartz-edition-extras`' `main` is ahead of the pin, it also starts `bump-extras`, which opens a pull request (once per extras commit) |
| on every push to a branch | `textbook` | `nudge` | nothing. It asks `build-nudge` to dispatch `reconcile` for the book, named `nudge` |
| every 6 h at :17 | `textbook-registry` | `portal` | nothing. It polls the portal and redeploys if it's behind |
| every 6 h at :41 | `textbook-registry` | `deploy` | nothing. It polls the function and redeploys if it's behind |
| daily 06:17 | `textbook-registry` | `parity` | nothing. It compares the registry with the constants left in other repos |
| daily 07:29 | `textbook-registry` | `builder-alive` | nothing. It checks that a `cron` run of `reconcile` started in the last hour |
| Sun 03:00 | `textbook` | `backup-annotations` | the `backups` branch |
| Sun 03:00 | `textbook`, `textbook-template` | `weekly-snapshot` | a `snapshot-YYYY-MM-DD` tag on `main`, if `main` changed since the last one. Skipped in the template repo itself |
| Sun 07:00 | `textbook` | `contributors` | `community/contributors.md`, by auto-merged PR |
| Sun 11:00 | `textbook` | `derivatives` | `community/derivatives.md`, by auto-merged PR |
| Sun 15:00 | `textbook` | `dashboard` | `community/dashboard.md`, by auto-merged PR |
| Mon 06:00 | `textbook`, `textbook-template` | `link-check` | nothing |
| Mon 07:00 | `textbook`, `textbook-template` | `apply-config` | a `chore/apply-config` PR, if the rendered files have fallen behind the registry |

On every push or PR, they also run: `validate` and `parity` in the registry;
`deploy` and `portal` after a successful `validate` on `main`; `lint` and
`link-check` in `textbook` and `textbook-template`; `apply-config` on a PR that
touches the config, a template or `configure.mjs`.

**Book two (`platform-test-book`) and `textbook-portal` have no workflows.** A
new book made from `textbook-template` starts with that template's four.

### Signals that look like failures and aren't

- **A green run with no commit.** The generator jobs commit only when their
  output differs from last week's.
- **A Sunday with no new snapshot tag.** `weekly-snapshot` tags only when
  `main` changed.
- **Zero annotations.** On a book nobody has annotated yet, zero is the true
  count.
- **`deploy`/`portal` saying "Already current; nothing to deploy."** That is the
  normal result of every scheduled run.
- **A `reconcile` run every 15 minutes that builds nothing.** Only its `plan` job
  runs, for a few seconds. That is the tick finding every book current.
- **After a merge in `quartz-book`, a `stable` run, then `reconcile: stable, every
  book` rebuilding every book.** Moving the builder commit makes every book stale,
  on purpose (BOOK-ONE-TO-QUARTZ §4b).
- **A skipped `extras` job in most `reconcile` runs.** It runs only on the tick. When
  it does run, it usually finds the pin current, or finds the bot's pull request already
  opened.
- **A `nudge` run in a book, and then a `reconcile` run that builds nothing.** A
  push to a branch other than the live and drafts branches, or a second push
  while the first push's run was still waiting to start (coalesced).

### A real failure looks like one of these

- a red run;
- a green run whose output page is visibly broken on the site;
- a chore PR left open (auto-merge didn't arm; see below);
- **a scheduled run that never appeared.** GitHub disables schedules in a repo
  that has been inactive for 60 days. Look for the "scheduled workflows
  disabled" banner, re-enable them, then run each workflow by hand.

---

## Part 1 — the registry (`textbook-registry`)

These five are the platform's own jobs. A red one here can affect every book.

### `validate` (push and PR)

Schema, uniqueness, the depth rule, slug immutability (`registry` job), and the
GitHub facts: every content repo exists and is public, both branches exist,
a builder book's two branches can be read with no credentials, and every
automation login exists (`github-facts` job).

- **Red on a PR:** the registry change is wrong. Read the message; each rule
  names what it refused.
- **Red on `github-facts` for a book nobody touched:** a *live* book's repo was
  deleted, privatised or renamed, or a branch was deleted. **This also stops
  every deploy for every book,** because `deploy` and `portal` run only after a
  green `validate`. The fix is the PR that retires or corrects that book, and
  that PR has to merge while its own check is red, since it's the thing that
  fixes the check (see BOOK-LIFECYCLE.md).
- A domain that doesn't answer only produces a **warning**.

### `deploy` (after `validate` on `main`; every 6 h at :41)

It POSTs the Vercel deploy hook, then polls the function's `X-Registry-Version`
for up to 10 minutes.

| Result | Meaning | Do |
|---|---|---|
| green, "Already current" | production is on this commit or a later one | nothing |
| green after "Deploy hook accepted" | a merge deployed normally | nothing |
| red, "`SUGGEST_EDIT_DEPLOY_HOOK` is not set" | the secret is missing | recreate the hook in Vercel and store it |
| red, "still serving … ten minutes after the deploy hook" | the function's build failed. It usually refused the registry or a test failed. The old deployment is still live | read the Vercel build log |
| red on a **schedule** run, "had fallen behind" | a merge-time deploy was missed. This run caught it up, and is red so that someone asks why | find the missed run |
| permanently red with a registry pin | `REGISTRY_REF` is set on Vercel | remove the pin when you mean to |

Check it by hand:

```sh
curl -sI -X OPTIONS https://suggest-edit-function.vercel.app/api/suggest-edit | grep -i x-registry-version
git -C textbook-registry rev-parse origin/main
```

### `portal` (after `validate` on `main`; every 6 h at :17)

The same shape, for the portal: it POSTs the Pages hook and polls
`https://confused4now.org/version.txt`.

| Result | Meaning |
|---|---|
| red, "has no `platform.portal.domain`" | the registry lost its portal block |
| red, "`PORTAL_DEPLOY_HOOK` is not set" | the secret is missing |
| red, still behind after 10 minutes | the portal build refused the registry (an unknown `schema_version`, or no book it could list). The previous page is still up. Read the Pages build log |
| `/version.txt` returns HTML | the apex redirect rule is catching it, and needs an exemption for `/version.txt` |

`PORTAL_VERSION_URL` (a repo variable) redirects the poll during setup. It is
unset now and should stay that way: polling the apex is what proves readers see
the change.

### `parity` (push, PR, daily 06:17, and on `repository_dispatch: parity`)

It compares each registry value with the constant that still holds it in
another repo. It is temporary, and is deleted when nothing un-retired is left.

- **Red, "`PARITY_READ_TOKEN` is not available":** the secret is missing or
  expired. It is a fine-grained PAT with read access to repository contents, and
  it needs to see the private `authoring-assistant`. PRs from forks never get it,
  so they always fail.
- **Red on a specific check:** a repo changed a constant without the registry,
  or the other way round. The output names `repo@branch sha path:line`.
- **Red on a retired check, "constant is still there" or "does not show the
  registry read":** a retirement was declared before its source repo landed the
  change. Merge the source repo's change and re-run.
- **It runs daily for a reason.** The constants live in other repos and can
  drift with nothing pushed here.

### `builder-alive` (daily 07:29)

Added 24 Sep 2026 (BOOK-ONE-TO-QUARTZ §8 step 10). It asks the Actions API for
`quartz-book`'s `reconcile` runs from the last hour, and fails unless one is
named `reconcile: cron, …`. Nudged and hand runs don't count, because they can't
show that the 15-minute tick is alive. It then reads the Worker's status page
(`https://build-nudge.brandonproject2026.workers.dev/`) for two warnings.

| Result | Meaning | Do |
|---|---|---|
| green | the Worker's Cron Trigger dispatched within the hour | nothing |
| red, "No reconcile run named "cron"" | **nothing rebuilds on its own.** The Worker is gone or failing, its Cron Trigger was removed, or its token expired or was revoked. Every book keeps serving its last deployment | run `reconcile` by hand now (below), then open the Worker's status page: `"token"` other than `"works"` means replace the token; no answer means redeploy the Worker (`build-nudge` README) |
| warning, "token expires on …" | the Worker's token lapses within 30 days | renew it (INFRASTRUCTURE.md §7) |
| warning, "ended "failure"" | the Worker is fine, but a book's build is failing | read the red `reconcile` run in `quartz-book` |
| warning, "didn't answer" alone | the status page didn't answer, but cron runs are arriving | look again tomorrow |

**Running `reconcile` by hand**, while the Worker is down: `quartz-book` → Actions
→ `reconcile` → Run workflow, branch `main`, `slug` empty. It is as correct as any
other run, because it compares state. Run it again after each change until the
Worker is back.

**A book's nudge**, checked by hand when you look over these jobs: `quartz-book` → Actions →
`reconcile`. A book that had pushes in the last 7 days but no
`reconcile: nudge, <slug>` run has lost its `nudge.yml` or has Actions off. It
still rebuilds on the tick, up to 15 minutes late.

**Latency, measured** (24 Sep 2026, the step 10 live proof):

| Path | Measured | Runs |
|---|---|---|
| Nudge, push → `reconcile` started | **9 s**, both times: `main` pushed 12:35:56, run 12:36:05; `drafts` pushed 12:45:52, run 12:46:01 | `nudge` 36000070939 and its `drafts` run; `reconcile` 36000081378, 36001144292 |
| Nudge, push → new marker served | **1 min 30 s**: `drafts` pushed 12:45:52; the deploy job confirmed `drafts.social-research-methods.pages.dev` serving `e7145120` at 12:47:22 | `reconcile` 36001144292 |
| Tick, Cron time → `reconcile` started | **2-3 s**: 12:30:03, 12:45:02, 13:00:03 | `reconcile` 35999438082, 36001034740, 36002687607 |

So a push is on the preview in about a minute and a half, plus build time for a
bigger book. A missed nudge costs at most 15 minutes more. The tick isn't delayed
the way GitHub's `schedule:` runs are.

### Dates to act on

| When | What | Where |
|---|---|---|
| by **24 Aug 2027** | renew the Cloudflare token `quartz-book reconcile` (expires 25 Sep 2027, as the dashboard shows it in CEST) | INFRASTRUCTURE.md §7 |
| by **23 Aug 2027** | renew the GitHub token `build-nudge dispatch` (expires 23 Sep 2027, 22:00 UTC). `builder-alive` also warns from 24 Aug | INFRASTRUCTURE.md §7, `build-nudge` README |

---

## Part 2 — book one (`textbookproject2026-alt/textbook`)

These are book one's own jobs. They're listed here because the platform owner
currently looks after them, and because the author's console shows four of them
(Part 4). Book one's maintainer has a pointer to this file from
`textbook/docs/troubleshooting.md`.

**Since BOOK-ONE-TO-QUARTZ §8 step 14, the jobs themselves are the platform's.**
Book one's `backup-annotations`, `weekly-snapshot`, `contributors`, `derivatives`,
`dashboard`, `lint` and `link-check` are callers of about ten lines. They keep
their names and schedules, and each calls a reusable workflow in `quartz-book`
(`.github/workflows/book-*.yml`) at the `stable` tag. The scripts are in
`quartz-book/automation/`. The run and its log are still in `textbook`'s Actions
tab, under the caller's name. Each run's log starts with the line
`quartz-book at stable: <commit>`. A change to a job reaches every book when
`stable` moves (the `quartz-book` README, "Book automation").

### Auto-merge, and when it quietly doesn't

`contributors`, `derivatives`, `dashboard` and the weekly `apply-config` push a
machine-owned branch, open a PR, and arm auto-merge. Before arming, the job
re-reads the PR and requires all of the following:

1. the author is `github-actions[bot]`;
2. **for the three generators:** exactly one file changed, and it is that
   workflow's page;
3. **for `apply-config`:** at least one file changed, and every changed file is
   a *managed* file (a path that `templates/` on `main` renders to).

A PR that fails any of those is left open for a human. The branch name is never
trusted.

**The failure to watch for is a quiet one.** Arming needs "Allow auto-merge"
switched on (verified on 22 Sep) and needs `main`'s protection to let the bot
satisfy it. If either is missing, the step logs a **warning** and leaves the PR
open. The run is still green. The symptom is chore PRs piling up. More than one
open `chore/…` PR, or one older than a week, means auto-merge isn't arming.

Two things are correct even though they look wrong: an already-mergeable PR is
merged directly, and a still-open PR isn't re-pushed with an identical render.

### Sun 03:00 — `backup-annotations`

- **Pass:** a new `backups/annotations-YYYY-MM-DD.json` on the `backups` branch.
  It pushes directly and opens no PR, because `main` is protected. Each file has
  `meta.complete: true`.
- **Fail:** red at export. The usual causes are a bad `HYPOTHESIS_API_TOKEN` (an
  expired token returns **200 with empty results**, so the script checks
  `/api/profile` first and refuses to run), a group the account has lost access
  to, or a Hypothes.is outage. The job also fails if it can't read the registry
  or the book is retired.
- **Pruning** keeps 12 files, and has never run: there were six backups on
  22 Sep (from 2026-08-17). The first run with a 13th file to delete is
  **Sunday 8 November 2026**. On that day, confirm the branch holds 12 files,
  not 13, and that the commit deletes one.

### Sun 03:00 — `weekly-snapshot`

A named, dated point in time for the book's content: an annotated tag
`snapshot-YYYY-MM-DD` on `main`, which GitHub serves as a browsable tree and a
zip (`archive/refs/tags/snapshot-YYYY-MM-DD.zip`). The maintainer's side is the
book's `docs/weekly-snapshots.md`. How a snapshot differs from a `v` version tag
is in its `docs/how-versioning-works.md`.

- **Pass:** green, and either a new tag whose message lists the files changed
  since the last snapshot, or "has not changed since snapshot-…" and no tag.
  The first one is `snapshot-2026-09-22` (`1120318`), made by hand before the
  workflow merged.
- **What counts as a change:** any path on `main` except the three
  `community/` pages the later Sunday jobs regenerate (`IGNORE` in the
  workflow). Those pages are in every snapshot but never cause one.
- **Same slot as `backup-annotations`, on purpose.** A week's snapshot and
  annotation backup share a date, so they restore as a pair. They can't
  collide: one writes a tag, the other the `backups` branch.
- **"already exists, and tags never move":** a second run on the same day. Not
  a failure.
- **Fail:** red at `git push` means tag creation was refused. `main`'s branch
  protection doesn't cover tags, and there's no tag ruleset (checked 22 Sep). A
  ruleset that restricts tag *creation* would cause this. One that restricts
  only updates and deletions is fine.
- **Retention:** every snapshot is kept, deliberately. People cite them, and a
  pruned tag is a dead link. Annotation backups prune to 12 files, but pruned
  files stay in the `backups` branch history, so an old week's pair can still
  be restored together.

### Sun 07:00 — `contributors`, Sun 11:00 — `derivatives`, Sun 15:00 — `dashboard`

- **Pass:** green. The PR opened and merged, or nothing changed.
- `derivatives` lists **forks of `textbook-edition-template`**, not forks of the
  book. Cross-check it against that repo's Forks count.
- `dashboard` needs `HYPOTHESIS_API_TOKEN` and the built-in token. It counts
  suggested-edit issues from `suggest_edit.counted_from` onwards, and builds the
  Plausible link from `platform.analytics.plausible.site`, filtered to the book's
  hostname, for a live book. If that field and the name of the Plausible site
  disagree, the published link is dead
  (INFRASTRUCTURE.md §9). The script throws rather than publish zeros.
- A page that renders as raw text on the site is a template failure behind a
  green tick. Read the page, not only the tick.

### Mon 06:00 — `link-check`

Lychee runs on pushes and PRs touching `.md`, plus weekly. It excludes `docs/`
and `templates/`, **so a broken link inside `docs/` is never caught.** It calls
the `lychee` binary directly because the action crashes on apostrophes in
filenames. Don't switch it back to the action.

### Mon 07:00 — `apply-config` (also on PRs)

- **On a PR** touching `textbook.config.json`, `templates/**` or
  `configure.mjs`, it renders and commits into that PR. A PR that never gets its
  "Apply config to generated files" commit is this job failing.
- **On the Monday schedule** it renders against registry `main` and opens a
  `chore/apply-config` PR if anything changed, under the auto-merge guard above.
  This is how a registry-only change (a new relay, endpoint, domain, content
  repo or analytics script) reaches the files rendered from `templates/`
  (`admin/config.yml`, `publish.js`, and anything else using a registry token).
  Book one's **title, maintainer, licence and `site_url` are rendered from its
  own `textbook.config.json`**, not the registry, so a registry change to those
  needs the matching config edit too. Parity flags the pair until both land.
  A book made from `textbook-template` renders everything from the registry.
- **The rendered `publish.js` on `main` is not the live one.** The live site
  gets `publish.js` only when the author publishes it from Obsidian.
- **Fails every week once the book is retired,** because `configure.mjs`
  refuses a retired book.

### `lint`

markdownlint on pushes to `main` and on every PR. `docs/**` is ignored.

### `nudge` (every push to a branch)

Sends the job's GitHub OIDC token to the `build-nudge` Worker, which dispatches
`reconcile` for the book (Part 1, `builder-alive`). It holds no secret and asks for
`id-token: write` only. **It must be on every branch whose pushes should rebuild
quickly**, because a push runs the workflow file on the pushed branch: on `main`
and on `drafts`.

- **Green:** the Worker answered. The log shows `"dispatched": true`, or
  `false` with the reason (not a built branch, or coalesced).
- **Red, 403:** the registry doesn't list this repository as a book on the
  builder. **Red, 502:** the Worker couldn't dispatch, usually its token. Either
  way the book still rebuilds on the 15-minute tick, and `builder-alive` catches
  a Worker problem.

### `stats.yml`

A stub (`workflow_dispatch` only). It echoes a TODO, is safe to delete, and
does nothing.

---

## Part 3 — the new-book template (`textbook-template`)

`lint`, `link-check`, `apply-config` and `weekly-snapshot`: the same jobs as
book one's, and every new book inherits them. The template's `weekly-snapshot`
starts with an empty `IGNORE`, because a new book has no self-rewriting pages.

**`apply-config` and `weekly-snapshot` are skipped in the template repo
itself** (a `github.repository` guard). The template's content is placeholder
and its slug is empty, so a render there can only fail and a snapshot would be
nobody's book. A skipped run is grey, not red. In a book made from the template,
both run normally.

---

## Part 4 — what the author's console shows

The Authoring Assistant's **Weekly jobs** strip is hardcoded as `WEEKLY_JOBS`
in `authoring-assistant/app/github.py`: `backup-annotations.yml`,
`contributors.yml`, `derivatives.yml`, `dashboard.yml`. It queries those
filenames **on whichever book is open**.

- Renaming, adding or retiring one of those workflows in book one means changing
  `WEEKLY_JOBS` too, and shipping a new build of the app.
- **A book that doesn't have those four files** (book two, or any book made from
  `textbook-template`) gets a 404, which the console shows as a standing
  **"Weekly jobs:"** error banner. That banner also hides the green "Nothing is
  waiting" note. This is a defect in the app, recorded in DOCS-AUDIT.md.
  Until it is fixed, tell the authors of those books to ignore the banner.
