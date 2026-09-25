# Infrastructure inventory

**Audience: the platform owner.** Every account, service and credential the
platform runs on, what each one does, how it is deployed, and what breaks if it
disappears. Read it first when you inherit the platform, and check it when
something is broken and you can't tell which system owns the problem.

**This file never records a secret value.** It records only *where* each secret
is kept. If you find a token, key, password or deploy-hook URL written here, that
is a bug: remove it and rotate the credential.

This file covers the platform. A book's own pieces (its Publish site, its
repository's workflows, its Hypothes.is token) are the book maintainer's, and are
described in the book's own `docs/`. They appear here only where the platform
depends on them, or where the platform currently holds them on a book's behalf.

Where an owner couldn't be established from a repository or a live check, this
file says **confirm at handover** instead of guessing. Resolve those rows first.

**Last checked live: 22 September 2026.** Facts marked *(verified)* were checked
against the running service that day. Everything else comes from the repositories.
**Updated 25 Sep 2026** for the three workstreams of 24 Sep (the in-site editor,
portal sections and graphs, book requests). Those facts come from their records and
the repositories, and from GitHub checks on 25 Sep where this file says so. Where
a record doesn't give a credential's scope or expiry, it says **unconfirmed**.

---

## At a glance

### The seven shared services

These are the services every book uses. Each one bakes in or reads
`registry.json`, and none of them has any book hardcoded.

| # | Service | Where it runs | Reads the registry | Breaks if gone |
|---|---|---|---|---|
| S1 | **The registry** (`textbook-registry`) | GitHub | — it *is* the registry | No service can learn about a change. What is already deployed keeps working |
| S2 | **Suggest-edit function** | Vercel, project `suggest-edit-function` | bundled at build | Every book's *Suggest an edit* button fails, and the suggestion is lost |
| S3 | **CMS auth relay** | Cloudflare Worker `sveltia-cms-auth` | no: `ALLOWED_DOMAINS` is set by hand | No contributor on any book can sign in to a browser editor |
| S4 | **Portal** (`textbook-portal`) | Cloudflare Pages, project `textbook-portal`, on `confused4now.org` | generated at build | The front page is gone. Old book-one links keep redirecting, because the redirect rule is in the zone, not in Pages |
| S5 | **Authoring Assistant** (author's console) | each author's Mac, a signed app | fetched at launch, cached copy as fallback | Authors can't work through their queues from the app. Books and sites are unaffected |
| S6 | **Edition extras** (`quartz-edition-extras`) | GitHub, installed by department-edition builds | named in `platform.edition_extras_repo` | Every department edition's next build fails |
| S7 | **The builder** (`quartz-book`), **started by the `build-nudge` Worker** | GitHub Actions. Its `reconcile` workflow builds each book and uploads it to the book's Pages project in `brandonproject2026` (Direct Upload). The Cloudflare Worker `build-nudge` in the same account starts `reconcile`: on each book's pushes, and every 15 minutes | `quartz-book`: fetched from `main` at every build. `build-nudge`: fetched at most every 5 minutes, only to filter nudges | `quartz-book` gone: no book rebuilds, and each keeps serving its last deployment. `build-nudge` gone: nothing rebuilds **on its own**, but `reconcile` still runs by hand. Nothing a reader sees is served from it until the cutover, BOOK-ONE-TO-QUARTZ §8 step 16 (added 23 Sep 2026, §8 step 8; deploys from 24 Sep, step 9; the Worker from 24 Sep, step 10) |

### The books

| Slug | Status | Content repo (owner) | Site | Host | Paid by |
|---|---|---|---|---|---|
| `social-research-methods` | `live` | `textbookproject2026-alt/textbook` | <https://social-research-methods.confused4now.org> | Obsidian Publish, site `1443b409…` | not recorded (`paid_by` absent) — **confirm at handover** |
| `platform-test-book` | `preview` | `dept-coordinator-test/platform-test-book` | <https://platform-test-book-2.pages.dev> | Cloudflare Pages `platform-test-book-2` (Direct Upload, built by `quartz-book`; the old Git-integrated `platform-test-book` is retired, §8 step 21) | `platform` |

The registry is the source of truth for everything in this table. If it and this
table disagree, the registry wins, and this table needs correcting.

### Credentials that expire

Every credential with an expiry date is listed here, with what stops when it
lapses. Renew a month early. `docs/SCHEDULED-JOBS.md` ("Dates to act on") has the
same dates as reminders. Add a row whenever a step creates an expiring credential.

| Credential | Expires | Kept in | When it lapses |
|---|---|---|---|
| Cloudflare API token `quartz-book reconcile` (§7) | **25 Sep 2027**, as the Cloudflare dashboard shows it in CEST (a day after the date recorded before) | `quartz-book` secret `CLOUDFLARE_API_TOKEN` | `reconcile` builds but can't deploy: every run goes red, and every book keeps serving its last deployment |
| GitHub fine-grained token `build-nudge dispatch` (§7) | **23 Sep 2027**, 22:00 UTC (the date GitHub set, a day before the one entered) | `build-nudge` Worker secret `DISPATCH_TOKEN` | the Worker can't start `reconcile`: nothing rebuilds on its own (no nudges, no 15-minute tick). `builder-alive` goes red within a day. `reconcile` still works by hand |
| `PARITY_READ_TOKEN` (fine-grained, SCHEDULED-JOBS Part 1) | **not recorded — confirm** | registry secret | parity goes red every day |
| `PLATFORM_TOKEN` (§1, `book-requests`) | **unconfirmed** | `book-requests` secret | `provision` and `remove` fail: no approved request becomes a book, and no sandbox book can be removed. Nothing live breaks |
| `GITHUB_OAUTH_CLIENT_SECRET`, the *Textbook sign-in* OAuth App's secret (§2f) | **unconfirmed** | Vercel env | "Sign in with GitHub" in the editor fails. Anonymous proposals still work |
| `HYPOTHESIS_API_TOKEN` (§9) | **not recorded — confirm** whether it expires | `textbook` secret | book one's Sunday annotation backup and dashboard fail |

Book two is a throwaway test book (`MULTI-BOOK-HOSTING.md` §6). It is meant to be
retired once the multi-book test is over (see [BOOK-LIFECYCLE.md](BOOK-LIFECYCLE.md)).

### The accounts

| Account | Kind | Holds | Who holds the login |
|---|---|---|---|
| `textbookproject2026-alt` | GitHub user | The platform and book-one repositories (§1), the registry's CODEOWNERS entry, the suggest-edit GitHub App (§2c), the GitHub App `quartz-book-bot` (§7), the fine-grained token `build-nudge dispatch` (§7), the classic token `PLATFORM_TOKEN` (§1, `book-requests`), and every book made from a request | the platform owner |
| `dept-coordinator-test` | GitHub user | `platform-test-book` (book two) and the one department-edition fork | the platform owner, as a test identity. SSH alias `github-coord` |
| `aldogobot` | GitHub user (machine) | the fallback `BOT_TOKEN` (§2d), which is no longer set in Vercel (25 Sep) | **confirm at handover** |
| `brandonproject2026` | Cloudflare | the relay Worker (S3), `textbook-admin` Pages (book one's CMS host), the portal Pages project (S4), book one's Quartz Pages project `social-research-methods` (S7), the API token `quartz-book` deploys with, and the Worker `build-nudge` (S7) | the platform owner (confirmed on their word, 20 Sep) |
| a second Cloudflare account | Cloudflare | not established from any repository: probably `platform-test-book` Pages and the `textbook-edition-template-5cm` test project (§8) | **confirm at handover** |
| Vercel | Vercel | the suggest-edit function (S2) | **confirm at handover** |
| Plausible | Plausible | one *site* per book or edition that has analytics | **confirm at handover** |
| `AlecGordon` | Hypothes.is | book one's API token. No groups are in use | a person, not the platform. Transfer at handover (§9) |
| Obsidian | Obsidian Publish | book one's Publish site | **confirm at handover** |
| Apple Developer | Apple | the Developer ID that signs the Authoring Assistant | **confirm at handover** |
| DNS registrar for `confused4now.org` | registrar | the portal domain and every `<slug>.confused4now.org` book | **confirm at handover** (§5) |

---

## 1. GitHub: repositories

### Under `textbookproject2026-alt`

| Repo | Visibility | What it holds | Owner role |
|---|---|---|---|
| `textbook-registry` | public | `registry.json`, its validator, parity, the deploy workflows, the design record (`design/`) and these docs | platform |
| `suggest-edit-function` | public | S2 | platform |
| `textbook-portal` | public | S4 | platform |
| `authoring-assistant` | **private** | S5. Cloned over HTTPS, not over the SSH alias | platform |
| `quartz-edition-extras` | public | S6: the `edition-integrations` and `edit-on-github` Quartz plugins | platform |
| `quartz-book` | public | S7: the shared builder. Quartz v5, the one shared `quartz.config.yaml`, `build-book.sh`, the extras pinned in `quartz.lock.json`, and the `reconcile` workflow that deploys. Secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (§7) | platform |
| `build-nudge` | public | S7's trigger: the `build-nudge` Cloudflare Worker. Deployed by hand with `wrangler`, so the repo holds no credential (§7) | platform |
| `sveltia-cms-auth` | public | the relay's source (S3). A copy of upstream `sveltia/sveltia-cms-auth` that hardcodes scope `repo,user` | platform |
| `textbook-template` | public | the starting point for a new book (`SETUP.md`, `scripts/new-book.mjs`) | platform |
| `book-requests` | **private** | the "Publish your textbook" requests: one issue per request, the uploaded manuscripts under `requests/`, and the `provision` and `remove` workflows. Private so that requesters' emails and unpublished manuscripts never reach a public repo. Added 24 Sep 2026 (see below) | platform |
| `authoring-assistant-releases` | public | meant to host the Authoring Assistant's `.dmg` for authors, as a release asset named `Authoring-Assistant.dmg`. Created 24 Sep 2026, 19:10 UTC. **It had no releases on 25 Sep** (§6) | platform |
| `<slug>`, one per book made from a request | public | a request-made book's content repo, created by `provision` with `PLATFORM_TOKEN`. None exists on 25 Sep: the only one, the sandbox test, was removed (registry #27, #28) | the book (held by the platform, `paid_by: platform`) |
| `textbook` | public | **book one's** content repo, its weekly workflows and its maintainer docs | book one |
| `textbook-edition-template` | public | **book one's** department-edition template (`editions.template_repo`) | book one |
| `code_repo` | private | not mentioned in any repository or doc | **unaccounted for — confirm at handover** |

### `book-requests`: the request workflow's credentials

Added 24 Sep 2026. The portal's form posts to the function's `/api/request-book`
(§2), which files the request as an issue here with the App. The `approved` label
starts `provision`; the `remove` label, or a manual run, starts `remove`, which
refuses anything that isn't `sandbox: true`. The full procedure is in
`book-requests/README.md`, and in [BOOK-LIFECYCLE.md](BOOK-LIFECYCLE.md). Under
Settings → Secrets and variables → Actions:

| Name | Kind | What | If it's missing or wrong |
|---|---|---|---|
| `PLATFORM_TOKEN` | secret, set 24 Sep 18:20 UTC | Classic personal access token of `textbookproject2026-alt`. **Scopes, per `book-requests/README.md`:** `repo`, `workflow`, `delete_repo` (not confirmed against the token's own settings page). **Expiry: unconfirmed.** It creates and deletes book repos, pushes their workflows, adds each new repo to the App's installation (an endpoint that takes only a user token), opens and merges registry PRs, and starts `reconcile`. `provision` refuses a token that belongs to anyone else. The delivered follow-up `2ff0f51`, which isn't on `main` on 25 Sep, also uses it to check out the private `authoring-assistant` for the app's converter | `provision` and `remove` fail |
| `CLOUDFLARE_API_TOKEN` | secret | *Account → Cloudflare Pages → Edit*, and *Zone → DNS → Edit* for `confused4now.org` only. It's a different token from `quartz-book reconcile` (§7). **Expiry: unconfirmed** | new books get no Pages project, custom domain or DNS record |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID` | secrets | `brandonproject2026`'s account ID, and the `confused4now.org` zone ID | as above |
| `PORTAL_DEPLOY_HOOK` | secret | the portal's deploy hook, the same URL as the registry's (§4) | the portal doesn't list a new book until its next build |
| `APP_INSTALLATION_ID` | variable | `161872702`, the suggest-edit App's installation on `textbookproject2026-alt` (§2c) | new repos aren't added to the App |
| `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_REPLY_TO` | optional | the welcome email. **Not set on 25 Sep**, so the maintainer sends the prepared email by hand | — |
| `APP_DOWNLOAD_URL`, `PANDOC_VERSION` | variables, used by the delivered follow-up | the welcome email's download link (meant to be `…/authoring-assistant-releases/releases/latest/download/Authoring-Assistant.dmg`), and the pandoc version, pinned to the app build's own. **Neither is set on 25 Sep** | — |
| `APPROVERS` | variable, optional | a JSON list of logins, besides the repo owner, whose `approved` and `remove` labels count. Not set | only the owner's labels count |

The suggest-edit App must be installed on `book-requests` with *Issues* and
*Contents* read and write, or the form's requests fail.

Book one's two repositories sit under the platform account for historical
reasons: book one came first. The registry doesn't require this.
`textbook-registry/README.md` notes that one person currently holds both the
platform owner's and book one's maintainer's roles.

### Under `dept-coordinator-test`

| Repo | What |
|---|---|
| `platform-test-book` | book two (`preview`) |
| `textbook-edition-template` | a department-edition **fork** of book one's template, from the coordinator test. It still names `bptext2026.xyz` as the canonical textbook, two moves behind |

### Push identity on the platform owner's Mac

| SSH alias | Key | Account |
|---|---|---|
| `github-textbook` | `~/.ssh/id_ed25519_textbook` | `textbookproject2026-alt` |
| `github-coord` | `~/.ssh/id_ed25519_coord` | `dept-coordinator-test` |

Remotes are written as `git@github-textbook:…` and `git@github-coord:…`, so a
fresh machine needs both aliases in `~/.ssh/config` before any push works.
`authoring-assistant`, `textbook-template` and `textbook-portal` are cloned over
HTTPS and authenticate through `gh`.

### Branch protection (verified)

| Repo | `main` |
|---|---|
| `textbook` | Pull request required, **0 approvals**, admins not enforced. A direct admin push succeeds and is logged as a bypass |
| `textbook-registry` | **Not protected.** See the warning below |
| every other platform repo | Not protected |

> **The registry's review gate isn't switched on.** `.github/CODEOWNERS` names
> the platform owner, and `README.md` says every change needs an approving
> review that administrators can't bypass. That is true only once branch
> protection is enabled, and today it isn't. Right now anyone with write access
> can push `registry.json` straight to `main`, and `deploy.yml` then ships it to
> the function. The design treats registry review as one of the two gates on
> credentials (`DESIGN.md` §4e). Enable protection. Before you do, decide how a
> sole owner gets approval (README, "Who approves changes").

---

## 2. S2 — the suggest-edit function (Vercel)

- **URL:** `https://suggest-edit-function.vercel.app/api/suggest-edit`
  (`platform.suggest_edit_endpoint`). This endpoint is **permanent**: every
  book's rendered front end has it baked in, and not every book will republish
  (`MULTI-BOOK-HOSTING.md` §5a). Add a new version beside it rather than moving it.
- **Account owner:** **confirm at handover.**
- **What it does:** it resolves the request's `Origin` header to exactly one
  registered book (`https://` + `site.domain`, for `preview` and `live` books), then
  files the suggestion as an issue on that book's `content.repo`, labelled
  `suggested-edit` and `needs-triage`. An unknown origin, a missing origin or a
  retired book gets 403. The full contract is in `suggest-edit-function/README.md`.
- **Its other endpoints (added 24 Sep 2026)**, beside `/api/suggest-edit`:
  `/api/propose-edit`, the in-site editor's back end. A GET reads a page's source
  from `drafts`. A POST makes one commit on a `proposed-edits/…` branch and opens a
  PR into `drafts`, labelled `proposed-edit` and `needs-triage`. If `drafts` has
  moved under the reader, it files an issue with the diff instead.
  `/api/github-auth` handles "Sign in with GitHub" (§2f). `/api/request-book` takes
  the portal's "Publish your textbook" form and files the request in `book-requests`
  (§1). **Origins:** a builder book (`host.builder: "quartz-book"`) or a book on
  Cloudflare Pages is also accepted from its own Pages deployments,
  `https://<project>.pages.dev` and `https://<label>.<project>.pages.dev`, where
  `project` is `site.host.project`. The function refuses to load a registry in which
  two books share a Pages project.
- **Registry version (verified):** every response carries `X-Registry-Version`.
  On 22 Sep it was `051597c`, which is registry `main`.

### 2a. Deploy pipeline

1. A push to the function's `main` deploys production through Vercel's Git
   integration. Other branches get preview deployments.
2. A registry merge triggers `textbook-registry/.github/workflows/deploy.yml`
   after `validate` passes. The workflow POSTs the Vercel **deploy hook**, then
   polls `X-Registry-Version` for up to 10 minutes and fails red on the merge
   commit if production hasn't caught up.
3. The Vercel build (`npm run vercel-build`) resolves registry `main` to a SHA,
   fetches `registry.json` at that SHA, validates it, writes
   `registry/bundled.mjs` and runs the tests. **If any step fails, the old
   deployment stays live.**
4. A schedule at `41 */6 * * *` re-runs the same check as a staleness alarm.

Vercel's instant rollback rolls back code and registry together.

### 2b. Secrets and settings

| Name | Where | What | If it's missing or wrong |
|---|---|---|---|
| `GITHUB_APP_ID` | Vercel env (production) | the App's numeric ID | falls back to `BOT_TOKEN`, or 500 |
| `GITHUB_APP_PRIVATE_KEY` | Vercel env, **Sensitive** | the App's `.pem`, base64 on one line | as above |
| `BOT_TOKEN` | **not set** (the platform owner checked Vercel, 25 Sep) | was the temporary fallback PAT (§2d) | nothing: a repo without the App gets a 502 |
| `GITHUB_OAUTH_CLIENT_ID` | Vercel env | the *Textbook sign-in* OAuth App's client ID (§2f). Not the GitHub App's | "Sign in with GitHub" fails. Anonymous proposals still work |
| `GITHUB_OAUTH_CLIENT_SECRET` | Vercel env, **Sensitive** | that OAuth App's client secret. **Expiry: unconfirmed** | as above |
| `IDENTITY_SECRET` | Vercel env | 32 or more random characters that sign the editor's identity tokens (§2f). It doesn't expire. Rotating it signs every reader out | as above |
| `GITHUB_OAUTH_REDIRECT_URI` | Vercel env, optional | defaults to `https://<request host>/api/github-auth`. **Unconfirmed** whether it's set | sign-in's callback fails if the OAuth App's callback URL differs |
| `REQUESTS_REPO` | Vercel env, optional | only needed if `book-requests` is ever renamed | — |
| `GITHUB_APP_INSTALLATION_ID` | Vercel env | **no longer read**. If it's set, startup logs a warning | delete it |
| `REGISTRY_REF` | Vercel build env, optional | pins the registry to a SHA or branch | while set, `deploy.yml` stays red by design |
| `SUGGEST_EDIT_DEPLOY_HOOK` | `textbook-registry` repo secret | the Vercel deploy hook's URL, a credential | `deploy.yml` fails and says so |

The App's `.pem` file itself is kept outside any repository. **Where the only
copy is kept is not recorded. Confirm at handover.** If it's lost, generate a
new key in the App's settings. No code changes.

**`BOT_TOKEN` is not set (25 Sep 2026, checked in Vercel by the platform
owner).** On 22 Sep this couldn't be checked, and it mattered: while `BOT_TOKEN`
was set, a book whose repo didn't have the App installed still got its
suggestions, filed silently under the bot's personal token. That hid a missing
installation, which is the trap `INTERIM-BOOK.md` warns about. The fallback's code
is still in the function, so it would come back if the variable were set again.
The editor's live proof on 24 Sep showed `credential=app` in the logs. **Still
unverified:** whether `GITHUB_APP_INSTALLATION_ID` is set.

### 2c. The GitHub App `textbook-suggest-edit`

- **App ID** 4951384. **Public**, so accounts other than the owner can install it.
  Owned by `textbookproject2026-alt`. Confirm at handover.
- **Permissions (widened 24 Sep 2026 for the in-site editor):** Issues, Contents
  and Pull requests read and write, and Metadata read. No webhook. Until 24 Sep it
  had Issues and Metadata only. Each installation made before then had to accept
  the permissions request once. Per the editor's record, both installations below
  have accepted.
- **Tokens:** the function still narrows each token to what the endpoint needs.
  `/api/suggest-edit` asks for *Issues* only. `/api/propose-edit` asks for
  *Contents*, *Pull requests* and *Issues*, on the one repository. An installation
  still grants all three on every repo it covers, which is why BOOK-ONE-TO-QUARTZ
  §8 step 23 suggests a `main` ruleset on each book repo.
- **Installations:** always **only selected repositories**. On
  `textbookproject2026-alt`: installation `161872702`, covering `textbook` and
  `book-requests`. `provision` adds each request-made book to it with
  `PLATFORM_TOKEN`, and `remove` takes a sandbox book off it. On
  `dept-coordinator-test`: `platform-test-book`. The repo lists come from the
  records. The installation couldn't be read with the `gh` token on 25 Sep.
- The function looks up the installation for each repository, and refuses a
  token that covers more than that one repository.
- **A repository with no installation** gets 502
  `github: the app isn't installed on that repository`, unless `BOT_TOKEN`
  masks the failure (§2b).

### 2d. The bot account `aldogobot` and `BOT_TOKEN`

`aldogobot` (no hyphen) is an ordinary user account created 2026-06-18. It filed
reader suggestions under a fine-grained PAT before the App existed.
`platform.automation_logins` lists it so that contributor counts leave it out,
and `check-github.mjs` checks that the account exists. The token is a fallback,
and the plan is to delete it along with its code (`suggest-edit-function/README.md`).
**On 25 Sep 2026 the variable was confirmed unset in Vercel.** The code path is
still there, and the token itself hasn't been recorded as revoked. Revoke it on
`aldogobot`'s account, then delete the code.
Deleting it is a change to the function's configuration, not to any book.

### 2e. What breaks, and the standing caveats

- **If it's gone,** every book's form shows its generic failure copy. Nothing is
  queued or retried.
- **Logs:** `vercel logs <deployment-url>` is the only place to see validation
  rejections, honeypot hits, rate-limit trips and the credential path. The
  response withholds that detail deliberately.
- **Rate limit:** 5 an hour per IP, held in one serverless instance's memory,
  and shared across **all books**. It resets on a cold start and counts
  submissions that fail validation. It is a speed bump, not a control, and the
  real hardening has never been built.
- **The build requires at least one routable book** (`test/registry.test.mjs`).
  Retiring the last `preview`/`live` book fails the build, and the old
  deployment keeps serving it.

### 2f. "Sign in with GitHub": the OAuth App *Textbook sign-in* and `IDENTITY_SECRET`

Added 24 Sep 2026 for the in-site editor.

- **The OAuth App *Textbook sign-in*.** It asks for **no scopes**, so all it proves
  is who the reader is. `/api/github-auth` swaps the code for a GitHub token, reads
  the login, and **revokes the GitHub token at once**. Its client ID and secret are
  in Vercel (§2b). **Which account owns it: unconfirmed**, so confirm at handover.
  It's separate from the *Textbook CMS* OAuth App (§3), the *Textbook Author
  Console* OAuth App (§6) and the GitHub App (§2c).
- **`IDENTITY_SECRET`** signs the identity token the function gives back instead: it
  lasts 8 hours and is bound to the origin of the page that asked. A signed-in
  reader's commit is authored as `<id>+<login>@users.noreply.github.com`. An
  anonymous one is authored by the App, with the name and masked email in the PR
  body only.
- **If it's gone:** sign-in fails with a reader-facing message. Anonymous proposals,
  and *Suggest an edit*, carry on.

---

## 3. S3 — the CMS auth relay (Cloudflare Worker)

- **URL:** `https://sveltia-cms-auth.brandonproject2026.workers.dev`
  (`platform.cms_auth_relay`). It is permanent for the same reason as §2: it is
  rendered into each book's `admin/config.yml`.
- **Account:** `brandonproject2026` (confirmed).
- **What it does:** it swaps GitHub's one-time OAuth code for an access token and
  hands the token back to the browser editor. It stores nothing, and it is not an
  identity provider.
- **Scope (verified):** it requests `repo,user`, and this copy ignores any
  narrower scope the CMS asks for. A contributor who signs in on **any** book
  gives that book's editor a token that can read and write every repository the
  contributor can access, private ones included. Book maintainers should tell
  their contributors this.
- **Worker variables** (dashboard → Workers & Pages → `sveltia-cms-auth` →
  Settings → Variables and Secrets):

| Variable | What | If wrong |
|---|---|---|
| `GITHUB_CLIENT_ID` | the *Textbook CMS* OAuth App's client ID | sign-in fails for every book |
| `GITHUB_CLIENT_SECRET` | **encrypted**. The same app's secret | sign-in fails for every book |
| `ALLOWED_DOMAINS` | the exact hostnames the CMS page may run on. Today: `textbook-admin.pages.dev` | a host missing from it: sign-in pops up and closes with no error. A wildcard: anyone's page can borrow the OAuth app |

- **`ALLOWED_DOMAINS` is maintained by hand, and checked by nothing.** The
  registry README's delivery table says CI generates it. No workflow does
  (`DESIGN.md` step 5a is unbuilt), and parity prints it as "not checkable".
  Keep it equal to the set of `cms.host` values of books that are `cms.enabled`
  and not retired. Adding a book's CMS means adding a host here. Retiring a book
  means removing its host.
- **Deploy:** the Worker was created with Sveltia's *Deploy to Cloudflare* button
  from the `sveltia-cms-auth` repo. **Whether a push to that repo redeploys the
  Worker hasn't been checked. Confirm.**
- **The OAuth App *Textbook CMS*** is registered under an individual account,
  not the platform's. **Confirm which one.** Its callback URL is the Worker URL
  plus `/callback`.
- **If it's gone:** every contributor on every book stays signed out. Tokens
  already issued keep working, because they go straight to GitHub.
- **Guide:** [CMS-RELAY.md](CMS-RELAY.md).

**Per-book CMS hosts aren't the platform's.** `textbook-admin.pages.dev` is book
one's editor page: a Pages project in `brandonproject2026` that builds
`admin/` from `textbook` `main`. There is no shared CMS host yet
(`platform.portal.cms_host: null`, `DESIGN.md` step 5b). Until there is, each
book that wants the editor brings its own Pages project and asks for one
`ALLOWED_DOMAINS` entry.

---

## 4. S4 — the portal (Cloudflare Pages)

- **URL:** <https://confused4now.org>, `platform.portal.domain`. Pages project
  `textbook-portal` in `brandonproject2026`.
- **Verified 22 Sep:** `/` answers 200. `/version.txt` returns `051597c…`, which is
  registry `main`. `/chapters/x` answers **301** to
  `https://social-research-methods.confused4now.org/chapters/x`.
- **What it does:** one static page, generated at build from the registry. It
  lists `live` books first and `preview` books under *Not for readers*.
  `retired` books are never listed. It exists only as a listing, not in any
  book's reading path.
- **Deploy pipeline:** a registry merge triggers
  `textbook-registry/.github/workflows/portal.yml`, which POSTs the Pages deploy
  hook, polls `https://confused4now.org/version.txt` for 10 minutes, and fails red
  if the portal is behind. It also runs at `17 */6 * * *`. A push to
  `textbook-portal` `main` rebuilds the portal through Pages' Git integration.
  A build that fails leaves the previous page live.
- **Secrets and settings:**
  - `PORTAL_DEPLOY_HOOK`: a `textbook-registry` repo secret (the hook URL is a
    credential).
  - `PORTAL_VERSION_URL`: an optional repo **variable**, for setup only.
    **Unset (verified)**, which is correct now that the apex is bound.
  - Pages build settings: command `npm run build`, output `public`,
    `NODE_VERSION=22`.
- **The apex redirect rule** lives in the `confused4now.org` zone, not in any
  repository. Every path except `/` and `/version.txt` gets a 301 to book one's
  subdomain. **If you add a file to the portal, add it to the rule's
  exemptions**, or the portal will 301 it away.
- **If it's gone:** there's no front page, and nothing else is affected. **If
  the redirect rule is gone,** every link to book one made before 20 Sep gets
  the portal page instead of the chapter.

---

## 5. DNS: `confused4now.org`

- **The zone** is in Cloudflare. It is served by `brandonproject2026` alongside
  the portal. Confirm this, and confirm **who holds the registration and pays for
  the renewal**. This one domain now carries the portal and book one, and every
  future `<slug>.confused4now.org` book. If it lapses, all of them go down.
  `MULTI-BOOK-HOSTING.md` open question 2.
- **Records the platform depends on:**
  - the apex: the portal Pages project;
  - `social-research-methods`: a proxied CNAME to Obsidian Publish
    (`publish-main.obsidian.md`);
  - the Redirect Rule (§4).
- **Zone settings:** SSL mode **Full**, since "Flexible" makes Publish loop. Free
  Universal SSL covers one label deep only, which is why
  `platform.portal.book_parent` enforces `<slug>.confused4now.org` exactly.
- **DNS is not generated from the registry.** Every `<slug>` record is typed by
  hand, and nothing checks that the set of records matches the set of books
  (`MULTI-BOOK-HOSTING.md` §2d).
- **`bptext2026.xyz`,** the staging domain before 14 Sep, is still a
  `legacy_origins` entry for annotation backups. Whether the platform still holds
  that domain is **not recorded**.

---

## 6. S5 — the Authoring Assistant

- **What:** a macOS app, built from the private `authoring-assistant` repo and
  sent to authors as a signed, notarised `.dmg`. There's no update mechanism.
- **Multi-book since migration step 5.** The app fetches the registry at launch,
  keeps the last good copy, and ships a bundled copy. It lists the books the
  signed-in author can push to. The chosen book decides (a vault is optional,
  and only ever the chosen book's copy), and the app refuses a vault whose slug
  or `origin` remote doesn't match the registry.
- **Sign-in:** OAuth device flow against the *Textbook Author Console* OAuth App.
  Its client ID is public by design, and comes from
  `platform.console_oauth_client_id` in the registry. A value pasted into
  Settings overrides it. The scope is `public_repo`, which is why every content
  repo must be public. **Widening to `public_repo repo:invite`** lets an author
  accept an invitation to their book from inside the app, which is what
  request-made books rely on. It is on `authoring-assistant` `main` (`c90f2ed`,
  24 Sep 2026), and **needs a new signed, notarised build**, which isn't
  recorded as made by 25 Sep. Authors on the old
  scope are asked to sign in again.
- **Distribution:** the `.dmg` is meant to go out as the release asset
  `Authoring-Assistant.dmg` on the public `authoring-assistant-releases` (§1).
  Request-made books' welcome email links to it through `book-requests`'
  `APP_DOWNLOAD_URL`. On 25 Sep the repo has no releases and the variable isn't
  set.
- **Signing:** a Developer ID Application certificate on the build machine, and
  a `notarytool` keychain profile read through `NOTARY_PROFILE`. **Confirm at
  handover** which Apple account holds them.
- **DeepSeek (optional):** if the author pastes their own key, the app sends a
  chapter's text to `api.deepseek.com`. That happens only with a key present and
  the tick box ticked. Nobody has recorded who approved book text leaving the
  institution.
- **If the app is gone:** authors lose the queue view and the publish button.
  Nothing on the web changes. **If the Developer ID lapses,** existing installs
  keep working, but no new build can ship.
- **Guide:** [AUTHORING-APP-OPERATIONS.md](AUTHORING-APP-OPERATIONS.md).

---

## 7. S6 and S7 — edition extras, the builder, and the edition template

- **`quartz-edition-extras`** (`platform.edition_extras_repo`) holds the two
  Quartz plugins every department edition installs **at build time**, pinned by
  commit in each edition's `quartz.lock.json`. **Delete, rename or privatise it,
  and every edition's next build fails**, with nothing pointing at the cause.
- **`textbook-edition-template`** is book one's `editions.template_repo`. Its
  demo site, `https://textbook-edition-template.pages.dev`, is recorded as
  `editions.template_preview`. **Which Cloudflare account holds that Pages
  project: confirm at handover.**
- The template-repository flag on `textbook-edition-template` is **off**
  (verified), so GitHub no longer offers "Use this template". Editions must be
  forks, because `gen-derivatives.mjs` finds them through the forks API.
- Each department edition is a Pages project in the **coordinator's own**
  Cloudflare account. Editions are outside the platform, and aren't listed here.
- **`quartz-book`** (S7, added 23 Sep 2026 by BOOK-ONE-TO-QUARTZ §8 step 8) builds
  every platform book with one copy of Quartz, from the book's own repository and
  its registry entry. It pins the extras plugins in its own `quartz.lock.json`, so
  books take an extras change only when that pin moves. **It must stay public**:
  the plan's exit path is that anyone can build a book with it.
- **`reconcile`** (§8 step 9, 24 Sep 2026) is the workflow that builds and deploys.
  It builds each book whose registry entry has `site.host.builder: "quartz-book"`,
  on its live and drafts branches, when the marker Pages serves at
  `/.well-known/textbook.json` is behind. The `build-nudge` Worker starts it
  (below). By hand, whenever the Worker is down: `quartz-book` → Actions →
  `reconcile` → Run workflow, branch `main`, `slug` empty for every book. Only a
  run from `main` deploys. Book one is on the builder in the registry although
  Publish still serves its readers: its `obsidian-publish` host names `builder` and
  `project`, which on a Publish host means a preview on `<project>.pages.dev` only
  (BOOK-ONE-TO-QUARTZ §8 step 7, amended 24 Sep 2026). The `unrecorded_book` input
  that stood in for this during step 9 is gone.
- **The design preview gate** (§8 step 11, 24 Sep 2026). `reconcile` builds with the
  builder at the tag **`stable`**, not at `main`'s head. `stable` moves only when `ci`
  passes on a push to `main`, and every book then rebuilds. Before that, every pull
  request into `main` gets a preview of each builder book's live branch, built by
  that pull request, on the Pages branch `design-<pr>` of the book's own project
  (`noindex`, never production), and a comment with the links. When
  `quartz-edition-extras`' `main` moves, a bot pull request (`bump-extras`, started on
  the 15-minute tick) moves the pin. **Rollback:** `quartz-book` → Actions →
  `stable` → Run workflow, with the commit to go back to. That holds until the next
  merge to `main`. **If `stable` is deleted,** `reconcile` stops at its first step and
  no book rebuilds; run `stable` by hand with `main`'s head. The bot needs the repo
  setting *Allow GitHub Actions to create and approve pull requests*. `main` is
  protected (since 24 Sep 2026): pull requests only, the `build` check required,
  no approvals required, admins included. The bot opens its pull requests as the
  App `quartz-book-bot` (below), so their `ci` runs start at once and `build`
  counts. Without the App, it falls back to `GITHUB_TOKEN`, and a person must
  approve each bot pull request's held runs first. **The bot never merges:** no
  workflow merges or turns on auto-merge, and the repo's *Allow auto-merge* is off.
  A person merges every bot pull request. That rests on the workflows, not on a
  rule. With no approvals required, a token with *Contents: write* could merge a
  bot pull request once `build` passes.
- **The GitHub App `quartz-book-bot`** (added 24 Sep 2026, `quartz-book` #8). It is
  private and owned by `textbookproject2026-alt`, with no webhook. Its repository
  permissions are *Contents* and *Pull requests* read and write (Metadata read),
  and it is installed on `quartz-book` only. It is not the suggest-edit App (§2c),
  which stays issues-only. `quartz-book` holds the variable `BOT_APP_CLIENT_ID`
  (`Iv23liqLqj5WU1m0PaNa`, the Client ID) and the secret `BOT_APP_PRIVATE_KEY` (a
  private key generated on the App's page, set 24 Sep 2026 17:26 UTC). Only
  `bump-extras` reads them. The key doesn't expire. Revoke it on the App's page
  and generate a new one if it leaks. **App ID** 5063586. **If it's gone** (App deleted or uninstalled, key
  revoked), `bump-extras` fails at the token step. Unset the variable and the bot
  falls back to `GITHUB_TOKEN`.
- **Its secrets**, readable only by `reconcile`'s deploy job:
  `CLOUDFLARE_API_TOKEN`, a custom API token named **`quartz-book reconcile`** in
  `brandonproject2026`, with one permission, *Account → Cloudflare Pages → Edit*,
  on that account only. It can redeploy **every** book, which is why no book repo
  may hold it (BOOK-ONE-TO-QUARTZ §0a). **It expires on 25 Sep 2027** (the
  Cloudflare dashboard's date, in CEST): renew it a month before, and replace the secret. `CLOUDFLARE_ACCOUNT_ID` is the account's
  ID, which is not a secret, but is kept beside the token. Delete, rename or
  privatise `quartz-book`, or let the token lapse, and no book rebuilds; each keeps
  serving its last deployment.
- **`build-nudge`** (added 24 Sep 2026, BOOK-ONE-TO-QUARTZ §8 step 10) is a
  Cloudflare Worker in `brandonproject2026`, at
  `https://build-nudge.brandonproject2026.workers.dev`. Source: the `build-nudge`
  repo, deployed by hand with `wrangler` from the platform owner's Mac (its
  README). It starts `reconcile` two ways. **The nudge:** each builder book's
  `.github/workflows/nudge.yml` POSTs a GitHub OIDC token on every push. The Worker
  checks it against GitHub's public keys, and that its repository is a book on
  the builder in the registry, then dispatches `reconcile` for that book
  (`woken_by: nudge`). **The tick:** a Cron Trigger, `*/15 * * * *`, dispatches
  `reconcile` for every book (`woken_by: cron`). There is no GitHub `schedule:`
  anywhere in this path, because GitHub turns schedules off in a quiet public
  repo. The address is rendered into every book's `nudge.yml` as the token
  audience, so **it must not move**. `GET` on it reports the serving version and
  whether its token works.
- **Its one secret**, `DISPATCH_TOKEN`: a fine-grained personal access token of
  `textbookproject2026-alt` named **`build-nudge dispatch`**, on `quartz-book`
  only, with *Actions: Read and write* (and the *Metadata: Read* every token
  has). It can start, re-run and cancel `quartz-book`'s workflows, and nothing
  else. It can't read or write code. **It expires on 23 Sep 2027** (22:00 UTC): renew it a
  month before. Set it only with `npx wrangler versions secret put DISPATCH_TOKEN`
  and then deploy the version that makes (README, "Changing the token"). A secret
  set in the dashboard can attach to a version that isn't serving, which is how
  the relay (§3) was once down for an hour with correct-looking settings.
  **When it lapses, or the Worker is gone,** nothing rebuilds on its own. Books
  keep serving their last deployment, `reconcile` still works by hand, and
  `builder-alive` in this repo goes red within a day (SCHEDULED-JOBS Part 1).

---

## 8. Cloudflare Pages projects, all of them

| Project | Account | Built from | Serves | Whose |
|---|---|---|---|---|
| `textbook-portal` | `brandonproject2026` | `textbook-portal` `main` + deploy hook | `confused4now.org` | platform (S4) |
| `textbook-admin` | `brandonproject2026` | `textbook` `main`, output `admin/` | `textbook-admin.pages.dev` | book one's CMS host |
| `social-research-methods` | `brandonproject2026` | **Direct Upload** from `quartz-book`'s `reconcile` (no Git connection). Production branch `main` | `social-research-methods.pages.dev` (book one's `main`), `drafts.social-research-methods.pages.dev` (its `drafts`, `noindex`), `design-<pr>.social-research-methods.pages.dev` (design previews of `main` for `quartz-book` pull requests, `noindex`, §8 step 11). No custom domain until §8 step 16 | book one, paid by the platform (S7; created 24 Sep 2026, §8 step 9) |
| `platform-test-book-2` | `brandonproject2026` | uploaded by `quartz-book`'s `reconcile` (Direct Upload) | `platform-test-book-2.pages.dev`, and `drafts.platform-test-book-2.pages.dev` (unregistered origin), and `design-<pr>.platform-test-book-2.pages.dev` (design previews, §8 step 11) | book two, `paid_by: platform` |
| `platform-test-book` | **confirm** (the second account) | `dept-coordinator-test/platform-test-book` `main`, Git-integrated | `platform-test-book.pages.dev` | **retired**: book two's pre-builder site. Delete once nothing points at it (MULTI-BOOK-HOSTING §2e) |
| `textbook-edition-template` | **confirm** | `textbook-edition-template` | its `pages.dev` demo | book one's edition template |
| `textbook-edition-template-5cm` | **confirm** — the `-5cm` suffix means the name was taken, so this is a second account | the coordinator-test fork | a test edition | a test artefact: decide whether to delete it |

---

## 9. Services that belong to books but are held by platform people today

These aren't platform services. They're listed because a book depends on them,
and because the person holding them today is the platform owner or a platform
person, not the book's maintainer. Each should move to the book's maintainer at
handover.

| Service | For | Held today | The book's own doc |
|---|---|---|---|
| Obsidian Publish site `1443b409…` | book one's reading site | **confirm** | `textbook/docs/what-this-book-runs-on.md` |
| Hypothes.is account `AlecGordon` + `HYPOTHESIS_API_TOKEN` (repo secret on `textbook`) | book one's weekly backup and dashboard | a person | `textbook/docs/annotation-restore.md` |
| Plausible site `social-research-methods.confused4now.org` (verified: the public dashboard answers 200, and the old name `confused4now.org` is gone) | book one's analytics | **confirm** | `textbook/docs/what-this-book-runs-on.md` |
| `textbook-admin` Pages project | book one's CMS host | `brandonproject2026` | `textbook/docs/the-browser-editor.md` |

**The Plausible site name must equal `analytics.plausible.site`.** The dashboard
URL is derived from that field, never stored. A domain move is therefore two
changes that have to land together: rename the site in Plausible, and change the
registry field. Get them out of step and the book's next weekly dashboard
rebuild publishes a dead link.

---

## 10. How a registry change reaches each consumer

| Consumer | Gets the registry | Takes effect | Checked by |
|---|---|---|---|
| S2 function | bundled at build | on the deploy that `deploy.yml` triggers | `deploy.yml` (`X-Registry-Version`) |
| S4 portal | generated at build | on the deploy that `portal.yml` triggers | `portal.yml` (`/version.txt`) |
| S3 relay | **not at all** | when someone edits `ALLOWED_DOMAINS` by hand | nothing |
| S5 console | fetched at launch | the author's next launch | nothing |
| The builder (S7) | fetched from `main` at every build | the book's next `reconcile`: the Worker's 15-minute tick, at the latest | the build marker's `registry_digest` (`/.well-known/textbook.json`) |
| A book's Actions (backup, dashboard) | fetched at job start | the next scheduled run | the job fails if the registry can't be read, or the book is retired |
| A book's rendered files (`publish.js`, `admin/config.yml`, README…) | `configure.mjs` | a PR touching the config, **or** the weekly Monday `apply-config` run (book one and the template). Book one's title, maintainer, licence and `site_url` come from its own `textbook.config.json`, so a change to those also needs an edit there; parity flags the mismatch | parity (book one), nothing for a book without the weekly run (book two has none) |
| A Publish book's **live** `publish.js` | the maintainer's Publish dialog | when the maintainer next publishes | nothing. This is why platform endpoints never move |
| Parity | read per run | every run | itself |

---

## 11. Local credentials that aren't in any repository

| Item | Where | Whose |
|---|---|---|
| SSH keys `id_ed25519_textbook`, `id_ed25519_coord` | the platform owner's `~/.ssh/` | platform owner |
| `gh` logins | the platform owner's keyring | platform owner |
| GitHub App private key (`.pem`) | **not recorded** | platform owner |
| `quartz-book-bot`'s private key, `quartz-book-bot.2026-09-24.private-key.pem` (§7) | the platform owner's `~/Downloads/`. Its only other copy is the `quartz-book` secret `BOT_APP_PRIVATE_KEY`, which can't be read back | platform owner |
| Developer ID certificate, `notarytool` profile | the build Mac's keychain | platform owner |
| An author's console token, DeepSeek key | the author's login Keychain, service `Authoring Assistant` | each author |
| An author's console state and log | `~/Library/Application Support/Authoring Assistant/` | each author |

---

## 12. Open, and not fixable by writing it down

Tracked here so nobody rediscovers them the hard way. See
[DOCS-AUDIT.md](DOCS-AUDIT.md) for the full list, with reasons.

- `textbook-registry` `main` isn't branch-protected (§1).
- `ALLOWED_DOMAINS` isn't generated or checked (§3).
- DNS isn't generated or checked (§5).
- `BOT_TOKEN` is unset in Vercel (25 Sep), but the token isn't recorded as revoked
  and its code path is still in the function (§2d).
- Expiry **unconfirmed** for `PLATFORM_TOKEN`, `book-requests`' Cloudflare token and
  the *Textbook sign-in* client secret (§1, §2b).
- Owners marked **confirm at handover**: Vercel, Plausible, Obsidian Publish,
  Apple, the second Cloudflare account, the registrar, the *Textbook CMS* OAuth
  App, the *Textbook sign-in* OAuth App, the App's key file, `code_repo`.
- There's no site-health probe (`MULTI-BOOK-HOSTING.md` §5b). A Publish book that
  lapses, or a `<slug>` record taken over, goes unnoticed until someone looks.
