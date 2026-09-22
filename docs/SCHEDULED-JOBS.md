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
| every 6 h at :17 | `textbook-registry` | `portal` | nothing. It polls the portal and redeploys if it's behind |
| every 6 h at :41 | `textbook-registry` | `deploy` | nothing. It polls the function and redeploys if it's behind |
| daily 06:17 | `textbook-registry` | `parity` | nothing. It compares the registry with the constants left in other repos |
| Sun 03:00 | `textbook` | `backup-annotations` | the `backups` branch |
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
new book made from `textbook-template` starts with that template's three.

### Signals that look like failures and aren't

- **A green run with no commit.** The generator jobs commit only when their
  output differs from last week's.
- **Zero annotations.** On a book nobody has annotated yet, zero is the true
  count.
- **`deploy`/`portal` saying "Already current; nothing to deploy."** That is the
  normal result of every scheduled run.

### A real failure looks like one of these

- a red run;
- a green run whose output page is visibly broken on the site;
- a chore PR left open (auto-merge didn't arm; see below);
- **a scheduled run that never appeared.** GitHub disables schedules in a repo
  that has been inactive for 60 days. Look for the "scheduled workflows
  disabled" banner, re-enable them, then run each workflow by hand.

---

## Part 1 — the registry (`textbook-registry`)

These four are the platform's own jobs. A red one here can affect every book.

### `validate` (push and PR)

Schema, uniqueness, the depth rule, slug immutability (`registry` job), and the
GitHub facts: every content repo exists and is public, both branches exist, and
every automation login exists (`github-facts` job).

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

---

## Part 2 — book one (`textbookproject2026-alt/textbook`)

These are book one's own jobs. They're listed here because the platform owner
currently looks after them, and because the author's console shows four of them
(Part 4). Book one's maintainer has a pointer to this file from
`textbook/docs/troubleshooting.md`.

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

### Sun 07:00 — `contributors`, Sun 11:00 — `derivatives`, Sun 15:00 — `dashboard`

- **Pass:** green. The PR opened and merged, or nothing changed.
- `derivatives` lists **forks of `textbook-edition-template`**, not forks of the
  book. Cross-check it against that repo's Forks count.
- `dashboard` needs `HYPOTHESIS_API_TOKEN` and the built-in token. It counts
  suggested-edit issues from `suggest_edit.counted_from` onwards, and builds the
  Plausible link from `analytics.plausible.site`. If that field and the name of
  the Plausible site disagree, the published link is dead
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

### `stats.yml`

A stub (`workflow_dispatch` only). It echoes a TODO, is safe to delete, and
does nothing.

---

## Part 3 — the new-book template (`textbook-template`)

`lint`, `link-check` and `apply-config`: the same jobs as book one's, and every
new book inherits them.

> **Known to fail in the template repo itself.** The template's
> `textbook.config.json` has an empty slug on purpose, and `configure.mjs`
> refuses it. So the Monday `apply-config` run in `textbook-template` fails
> every week. That is a workflow defect, not a book problem. See
> [DOCS-AUDIT.md](DOCS-AUDIT.md). In a book made from the template, the slug is
> set and the job works.

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
