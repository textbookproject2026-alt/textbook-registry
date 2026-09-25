# Book one to Quartz: plan

**Status:** plan. D12, D15 and D16 were settled for phase 1 on 25 Sep 2026, to be reviewed
when phase 1 finishes, and D19 was added (see *Decisions*). §0a designs the build trigger that D2 left open. §8 is the order of work, as
PR-sized steps. No code, repository, registry entry or DNS record has changed.
**Date:** 22 Sep 2026. Decisions recorded the same day. Amended the same day: the 15-minute
poll in §0a runs from a Cron Trigger on the `build-nudge` Worker, not a GitHub schedule.
**Read against:** `textbook` at `d3a7031`, `textbook-registry` at `82c6086`,
`quartz-edition-extras` at `36297df`, `textbook-edition-template` at `c54ba10`,
`platform-test-book` at `b6b2cbc`, `authoring-assistant` at `20bb552`, `textbook-template`
at `4df8fcf`. Live probes of the book, Publish and Hypothes.is on 22 Sep, around 18:30 UTC.
**Built, not just read:** book one's `main` was built with the edition template's Quartz
v5.0.0 in a scratch folder, with the graph turned on. The build succeeded (48 Markdown files,
exit 0). Section 2 reports what the output contains. These were static checks of the
generated HTML, not checks in a browser.

**Decisions this plan takes as given:** every book is built the same way (Quartz on
Cloudflare Pages), with no visual hierarchy between books. Book one is converted in place.
Everything in the repo that isn't the book leaves it. There is one shared set of design
values, which the platform owner can edit. The graph is on in every book. Authors never need
Obsidian.

---

## Summary

1. **Parity.** Quartz already provides hover previews, search, callouts, wikilinks and the
   graph, and the graph only needs switching on. The Quartz sites have Edit on GitHub, the
   Hypothes.is config and a Plausible pageview. Nothing Quartz-based has View revision
   history, the reader modal, the annotation badge, the tag helper, any of the six
   Plausible events, the annotation highlight colour or the print styles. Port these into
   `quartz-edition-extras`. Every Quartz site already installs that repo, so every book and
   every edition gets the features through one pin. About half of `publish.js` is handling
   for Publish's SPA navigation. Quartz runs with `enableSPA: false`, so that half isn't
   ported.
2. **Content.** Everything that matters renders. One thing breaks: **all 32 citation links
   in Chapter 3 are dead**. Quartz keeps a same-page link as `href="#^ref-…"` but writes the
   target's anchor as `id="ref-…"`. The same links on another page are rewritten correctly
   (I tested this). A platform transform fixes it without changing the book. Department
   editions run the same Quartz, so their citations are already dead today. Page titles fall
   back to filenames (`chapter-03`, `index`), and the chapter's H1 appears again below the
   title. Wikilinks and callouts work. Images under `assets/chapter-NN/` work: I tested the
   three forms the converter writes.
3. **URLs and annotations.** The domain doesn't change. Chapter, glossary, community and
   home URLs don't change either. The **six Definitions pages move** from
   `/chapters/Definitions/Critical+Realism` to `/chapters/definitions/critical-realism`, and
   those need redirects. The live annotation count at the book's address is **0** (8 remain
   on `bptext2026.xyz`, as before). The cutover costs the margin nothing today. Even later,
   only annotations on the Definitions pages would be stranded.
4. **Design values.** Keep one file, `design.yaml`, inside the `edition-integrations`
   plugin. You edit it in GitHub's web editor as a pull request, and the pull request gets
   preview links for every book. Books pick up a change when the shared build's pin moves,
   and then every book rebuilds. Editions pick it up when their coordinator updates the
   plugin, which is today's mechanism. The graph's colours follow the design values. Whether
   the graph is on, and how it behaves, is set in the shared Quartz config.
5. **Clean-up.** The book is `index.md`, `chapters/`, `assets/`, `glossary.md` and
   `community/`, plus the repo's own `README`, `LICENSE`, `CONTRIBUTING` and
   `textbook.config.json`. Everything else goes somewhere named in §5 or is deleted. The
   **Publish files are deleted last**, after the subscription is cancelled, because rollback
   needs them.
6. **Author's path.** The `drafts` branch becomes the author's folder. The authoring app
   commits Word conversions, link tidying and accepted suggestions to `drafts` through
   GitHub's API, as the author, using the sign-in the console already has. "Going live"
   stays exactly as it is. **This is the critical path, not Quartz.** Today the only way the
   author reaches readers is Obsidian's Publish dialog. After the cutover, the only way is
   GitHub.
7. **Governance.** The hosting design's central premise no longer holds. The platform will
   be able to take any book offline at every address it serves, including own-domain books.
   It still can't take down a repository. §7 lists the edits to `MULTI-BOOK-HOSTING.md`.
   The main ones are a stronger policy, removal carried out only by a registry pull request,
   and an exit commitment.
8. **Order.** Nothing live changes until one DNS edit on the book's hostname. Rollback is
   editing that record back to `publish-main.obsidian.md`. Publish's own custom-domain
   setting is never touched, and the subscription runs until the probation period ends. The
   registry change is a record, not a switch: nothing reads `site.host` except the validator
   and parity. The only outage is the minutes Pages takes to activate the hostname. Rehearse
   that on a spare hostname first.

---

## Is this the wrong move?

I think it is the right move, on two conditions. Here is what gave me pause.

1. **Every book's reading site ends up in one Cloudflare account held by one person.** That
   is `brandonproject2026`, whose owner INFRASTRUCTURE.md records only as "confirmed on their
   word". The same account already holds the zone and the portal. Until now, book one's site
   ran on a separate Obsidian account, which kept it alive if the platform stumbled. After
   this move, a lapse, lockout or handover mistake on that account takes down every book at
   once. **Condition:** a second administrator on the account, and INFRASTRUCTURE.md stating
   who pays, before the cutover. That is D16, pending with the client, and §8 step 16 is
   gated on it. **Settled for phase 1 (25 Sep, D16):** the platform owner stays the sole
   administrator and pays for everything, so the single point of failure is accepted for
   now and step 16 is not blocked.
2. **The move removes the author's only publishing path before its replacement exists.** The
   authoring app writes to a local folder, and only Obsidian publishes that folder
   (`docs/word-to-markdown.md:390`: "Nothing to sync or commit"). If the cutover happens
   before the app can commit to `drafts`, every Word chapter needs the technical contact to
   push it. **Condition:** the §6 app change ships before the cutover. Decided (D8): it does
   (§8 steps 1-2).
3. **The platform gains the power to take books down** (§7). That is the correct price of
   hosting, but it needs a policy before a second maintainer-owned book joins.
4. **Every click becomes a full page load.** Publish is an SPA, and Quartz has to run with SPA
   off for Hypothes.is to survive (`textbook-edition-template/quartz.config.yaml:12-20`,
   four rounds of debugging). Hover previews still work. Navigation is slower. The editions
   already accepted this trade.
5. **Build volume.** Every push to `main` builds, every browser-editor save on `drafts`
   builds a preview, and every design release rebuilds every book. D2 (Direct Upload) moves
   the builds out of Pages and into the builder's GitHub Actions, so they don't count
   against the Pages per-account build limit (unverified: confirm that Direct Upload
   deployments are outside it). Only `textbook-admin` still builds in Pages. §0a coalesces
   a burst of saves into at most two builds per branch.

Nothing here argues for staying on Publish. Publish is the reason the platform can't update a
book (MULTI-BOOK-HOSTING §5a), and the reason the live site already differs from the
repository (see *Facts found*, below).

---

## 0. The shape: a shared builder, not Quartz in the book repo

Two of the decisions together rule out the usual Quartz layout. A Quartz site is normally a
checkout of Quartz, about 1,500 files, with the content inside it. Book two is built that
way. "Everything that isn't the book leaves" excludes that for book one, and "every book
built the same way" means one copy of Quartz, not N. `textbook-template/README.md:68` already
declined to vendor Quartz for the same reason.

**Decided (D1): a new platform repo, `quartz-book`, holding a Quartz v5 checkout, the one
shared `quartz.config.yaml`, a build script and the build workflow.** Pages doesn't build
anything (D2, Direct Upload). The builder's own GitHub Actions check out a book at a given
commit, run the script, and upload the output to that book's Pages project with `wrangler
pages deploy --branch <branch> --commit-hash <sha>`. §0a covers what starts a build.

The script, `build-book.sh <book checkout>`:

- reads `textbook.config.json` for the slug, and fetches `registry.json` from the registry's
  `main`. It takes `baseUrl`, the page title, the repo, the live branch, the suggest-edit
  endpoint and the Plausible script from the registry. **This replaces `configure.mjs` and
  `templates/publish.js` for the site.** A registry change reaches a book at its next build,
  so a stale render can no longer happen. It refuses to build a `retired` book.
- runs `npx quartz build -d <book checkout>` against an **allowlist**: `index.md`, `chapters/`,
  `assets/`, `glossary.md`, `community/` (D3: `community/` is published). It generates
  `ignorePatterns` for everything else. An
  allowlist is necessary, not tidiness: my build published `configure.mjs`, `publish.js`,
  `textbook.config.json`, `create-path-test-pages.sh` and `LICENSE` as public files. Quartz
  copies every non-Markdown file it finds. `admin/` must never be published.
- adds the platform's reader page **`/how-to-comment`** to every book (D5). The build fails if
  the book has its own file at that path, rather than silently choosing one.
- writes `/_redirects` (§3, D14), and for any branch other than the live branch a `/_headers`
  file with `X-Robots-Tag: noindex` on every path (D13). Every page also gets `<link
  rel="canonical">` on `site.domain`, so the production `pages.dev` alias doesn't compete in
  search.
- writes a build marker, `/.well-known/textbook.json`, containing the slug, the branch, the
  **book commit**, a digest of the book's registry entry and the builder commit. The probe
  in §7, the release check in §4, the trigger in §0a and the console's "See the drafts"
  (§6b) all read it.

**Build from the repo root, not from `chapters/`.** `textbook-template/SETUP.md` B6.2 tells
Quartz books to use `-d chapters`. For book one that would move every chapter URL
(`/chapters/chapter-03` becomes `/chapter-03`) and would leave out `index.md` and
`glossary.md`. The template's statement that "page URLs … are unaffected" holds only for a
book whose pages all sit inside `chapters/`. Correct the template in the same pass.

**Edit on GitHub has to use `relativePath`.** The plugin builds its link from
`fileData.filePath` (`plugins/edit-on-github/src/components/EditOnGitHub.tsx:23`), and that
value is relative to Quartz's working directory. My build produced
`/edit/main/book/chapters/…`. `fileData.relativePath` is relative to the `-d` directory
(`quartz/processors/parse.ts:104`), which is the repo root here. So the link comes out right,
and it would also be right for a book two built this way.

Book two (`platform-test-book`) vendors Quartz and injects its form after the build.
**Decided (D17): it moves onto the builder** and stays, as the demonstration book. There is
then one layout. Two consequences, both in §8 step 21. Its Pages project is Git-integrated,
and a project can't be switched to Direct Upload, so it gets a new project in
`brandonproject2026`. And `pages.dev` names are global, so the new project can't reuse
`platform-test-book` while the old one exists. Its `site.domain` therefore changes.

---

## 0a. What starts a build (the open part of D2)

### The constraint

Book repos live in other people's GitHub accounts. **Nothing in a book repo may hold a
platform credential**: no Cloudflare token, and no token that can write to `quartz-book`. A
maintainer can read their own repo's secrets into a workflow, and a leaked Cloudflare token
with Pages edit rights can redeploy **every** book. The build therefore runs on the platform
side, and the question is only how the platform learns that a branch moved. Two branches
per book matter: `content.live_branch` (production) and `content.drafts_branch` (the
drafts preview, D13).

### The options

| | A. Builder polls | B. Suggest-edit App gets push webhooks | C. Signed nudge from the book (GitHub OIDC) | D. A second App for builds | E. Platform writers nudge |
|---|---|---|---|---|---|
| How | A scheduled workflow in `quartz-book` runs `git ls-remote` on each book's two branches, and compares each with that branch's build marker | Turn on the App's webhook and subscribe to `push`. A receiver checks the signature and dispatches the builder | A thin workflow in the book, `on: push`, asks GitHub for an OIDC token (`permissions: id-token: write`) and POSTs it to a platform receiver. The receiver checks the token against GitHub's public keys and dispatches the builder | As B, but a new App with `Contents: read` and a push webhook, and nothing else | The authoring app and the CMS call the receiver after they write |
| Latency | Poll interval plus cron lag. GitHub runs cron best-effort: 5 minutes at the very least, often 10-30 minutes late at busy times, occasionally skipped. Then the build (1-2 minutes, unmeasured) | Seconds, then the build | Actions queue for the book's job (seconds to a minute), then the build | As B | Seconds, but only for the app and CMS |
| Credential in the book repo | **none** | **none** | **none**. The OIDC token is minted per job by GitHub, lives for minutes, and can't be copied into a secret in advance | none | none |
| Credential on the platform side | Cloudflare token in `quartz-book`. Public books are read anonymously | Cloudflare token in `quartz-book`, webhook secret and a dispatch token in the receiver | Cloudflare token in `quartz-book`, dispatch token in the receiver. There is no shared secret to verify: GitHub's signing keys are public | as B | as C, plus a way to authenticate the app and CMS |
| What it widens | nothing | **The App.** `push` needs `Contents: read`. Raising an App's permissions asks every installation owner to approve, and until they do, their installation keeps the old permissions and sends no pushes. The App's key could then mint content-read tokens for every installed repo, not issues-only ones (DESIGN §4d, T3). It breaks DESIGN §4e's "no webhook, outbound only", and the receiver becomes inbound traffic on whatever holds the App key | **Nothing granted.** One workflow file per book (a D6 thin caller) | A **new grant from every maintainer**: the objection that ruled out Cloudflare's own App in D2, though read-only and platform-owned | nothing |
| Blind spots | none: it compares state, not events | missed deliveries. GitHub doesn't redeliver failed deliveries on its own (manual redelivery goes back 3 days) | pushes made with a workflow's `GITHUB_TOKEN` don't trigger workflows, so a bot-merged community pull request isn't nudged. A maintainer can delete the workflow or turn off Actions | missed deliveries, as B | the browser editor's saves, git pushes, merges on github.com |
| If it fails | builds are late, never wrong. In a public repo, **scheduled workflows are disabled after 60 days with no repository activity**, and the builder repo will go quiet. The recommendation keeps A but moves its clock off GitHub | pushes are missed until the next one | builds wait for the next nudge | as B | as C |

**Also considered.** Pages deploy hooks only exist for Git-integrated projects, so D2 rules
them out. Conditional API requests (`ETag`, where a 304 doesn't count against the rate
limit) do the same job as `ls-remote` in A, with more code. GitHub's commit Atom feeds add
nothing over `ls-remote`. Putting the receiver in the existing suggest-edit function would
save a deployable, but it would add a builder credential to the one service that faces
readers.

### Recommendation: one reconciler, woken two ways (A + C)

Make the build **level-triggered**. A run of the builder's `reconcile` workflow asks, for
each registered book on the builder and each of its two branches: is the served build
marker's `(book commit, registry-entry digest, builder commit)` equal to what it would build
now? If not, it builds and uploads. It never trusts the event that woke it. A run with
nothing to do finishes in seconds.

Two things wake it:

1. **The nudge (C), for speed.** Each book gets `.github/workflows/nudge.yml`, about 15 lines,
   `on: push`, with `id-token: write` and nothing else. It POSTs its OIDC token to a small
   Cloudflare Worker, `build-nudge`, in `brandonproject2026`. The Worker checks the
   signature, the issuer, the audience (the Worker's own URL), expiry, `event_name: push`
   and that the ref is a branch. It checks that `repository` belongs to a registered book,
   using the registry it fetched at most five minutes ago. That check is a spam filter, not
   a security boundary: the nudge only names a book, and `reconcile` reads that book's repo
   and branches from the registry itself. It then calls
   `workflow_dispatch` on `reconcile` with `slug` and `woken_by: nudge` as inputs, and coalesces repeat nudges
   for the same book within 30 seconds. The Worker's only secret is a **fine-grained token
   on `quartz-book` alone, `Actions: write`**. `workflow_dispatch` needs that permission,
   whereas `repository_dispatch` would need `Contents: write`. A forged or replayed nudge
   costs one no-op reconcile. Pull-request workflows from forks don't receive
   `id-token: write`, so a stranger's pull request can't nudge.
2. **The poll (A), for correctness.** Every 15 minutes, `reconcile` also runs over every
   book. It catches whatever the nudge misses: bot merges, a deleted workflow, disabled
   Actions. It also catches registry and builder changes: a registry merge that changes a
   book's entry, or a new builder commit, changes the digest, so the book rebuilds without a
   separate "redeploy everything" path (§4b).

   **The 15 minutes come from a Cron Trigger on `build-nudge`, not a GitHub `schedule:`.**
   GitHub disables scheduled workflows in a public repository after 60 days with no
   repository activity. `quartz-book` will be quiet once it is stable, so a GitHub-scheduled
   safety net would switch itself off without a sound, and would do so exactly when nobody
   is looking. The Worker's `scheduled` handler (`*/15 * * * *`) calls `workflow_dispatch`
   on `reconcile` with no `slug` (every book) and `woken_by: cron`, with the same token as
   the nudge. `workflow_dispatch` is not subject to the 60-day rule. The cron path doesn't
   depend on the Worker's registry fetch, because `reconcile` reads the registry itself.
   `reconcile` has **no `schedule:` trigger at all**: a second, GitHub-side schedule
   would switch itself off in the same way, and meanwhile would look like cover.

   The cost is that the nudge and the poll now share one Worker and one token, so the
   Worker is the single point that starts builds. The failure table below covers what
   happens when it is down, and the check that notices.

**Why not B.** It needs every maintainer to approve a wider App before it works for their
book. It raises the ceiling of the key that files reader suggestions. It still needs A,
because deliveries get lost. It is the upgrade path if C proves unreliable, and nothing in
C gets in its way.

**Details that matter:**

- **The job split.** The build job has **no secrets**. It checks out the book at the
  resolved commit, runs `build-book.sh`, and uploads the output as an artifact. A separate
  deploy job, with the Cloudflare token (Pages edit, one account), downloads the artifact
  and runs `wrangler`. Book content is maintainer-controlled input to Quartz and its plugins,
  so it never runs in the same job as the token.
- **Concurrency.** Use a `concurrency` group per book and branch, without cancellation.
  GitHub keeps at most one run pending per group, and because the pending run re-reads the
  branch head when it starts, a burst of editor saves produces at most two builds.
- **Books must be public.** `ls-remote` and the checkout are anonymous. The reader controls
  already assume this (Edit on GitHub, History). Parity enforces it (§8 step 7). A
  private book would need `Contents: read` from some App, which is option B's cost.
- **How a run says what woke it.** `reconcile` takes a `woken_by` input (`nudge`, `cron`,
  or empty for a run by hand) and puts it in `run-name`, so the Actions API's run list
  shows it without opening a log.
- **Keeping the tick alive.** A Worker that stops dispatching makes no red run. It makes
  no run at all. So the check has to live outside `quartz-book` and outside the Worker: a
  daily `builder-alive` workflow in `textbook-registry` asks the Actions API (anonymously,
  since `quartz-book` is public) for the latest `reconcile` run named `cron`, and goes red
  if it started more than an hour ago. It sits beside the registry's other scheduled
  jobs, and the "scheduled workflows disabled" check in `docs/SCHEDULED-JOBS.md` already
  covers those. The Worker token's expiry date is in INFRASTRUCTURE, and the health check
  gains a row for renewing it a month early.
- **Telling people about a failed build.** The last deployment keeps serving, and the
  `reconcile` run goes red in `quartz-book`, which only the platform owner watches. The
  author learns it through the console: after "Send to drafts" it polls the drafts marker,
  and says "the preview is still at your previous version" if the marker hasn't reached
  the new commit in 10 minutes. The probe (§7) reports `stale-build` for the live branch.
  No new permission is needed, because the marker is public.
- **Latency, expected.** Nudge path: under a minute to start, plus the build. Poll path: up
  to 15 minutes plus the Actions queue, then the build. A Cron Trigger isn't subject to
  GitHub's scheduler, whose runs can start 10-30 minutes late. Measure both paths in §8
  step 10, and record them in `docs/SCHEDULED-JOBS.md`.

### What breaks if each part fails

| Part down | Effect | Detected by |
|---|---|---|
| **`build-nudge` Worker** (deleted, a bad deploy, the Cloudflare account suspended or unpaid), or **its token** (expired or revoked) | **Nothing rebuilds automatically.** Neither the nudges nor the 15-minute tick reach `reconcile`. Every book keeps serving its last deployment, and pushes, registry merges and builder changes wait. **`reconcile` can still be run by hand:** `quartz-book` → Actions → `reconcile` → Run workflow, with `slug` empty for every book. That run is as correct as any other, because it compares state rather than trusting an event. Run it again after each change until the Worker is back | Silence, not a red run. `builder-alive` in the registry goes red within a day, because no `cron` run has started in the last hour. Sooner, if someone is working: the author's console shows the stale-preview notice 10 minutes after "Send to drafts", and the probe reports `stale-build` once a live branch moves |
| **The Cron Trigger only** (removed from the Worker's config) | bot merges and registry or builder changes wait for the next nudge | `builder-alive`, as above: nudged runs don't count |
| **A book's nudge only** (`nudge.yml` deleted, Actions turned off in the book) | that book's builds fall back to the 15-minute tick | `reconcile`'s run names; the health check flags "no nudged run in 7 days" for a book that had pushes |
| Cloudflare token | nothing deploys. **Every book keeps serving its last deployment** | red `reconcile` runs; the probe reports `stale-build` |
| A book's build (bad content) | that book and branch stay at the previous deployment; other books are unaffected | red run; the console's stale-preview notice; the probe |
| `quartz-book` itself (a bad builder commit) | caught by the preview gate in §4b before `stable` moves; if not caught, move `stable` back and every book rebuilds | the preview links on the pin pull request |

---

## 1. Parity

### 1a. What a reader of book one gets, against what the Quartz sites have now

"Editions" means `textbook-edition-template` with its two extras plugins. "Book two" is
`platform-test-book`: it removed `edition-integrations`, so it has no Hypothes.is and no
Plausible, and it isn't a parity reference.

| Feature | Book one today | Editions | Book two | Needs porting? |
|---|---|---|---|---|
| Hover previews | Publish page preview (+ `publish.css` popover fix) | `enablePopovers: true` | same | No. Native |
| Graph | Publish right rail | **off** (`quartz.config.yaml:158-159`) | off | No. Switch it on in the shared config (§4) |
| Search | Publish | Quartz search | same | No |
| Callouts | Publish (+ `publish.css` tint fix) | Quartz OFM | same | No. All three render (§2) |
| Wikilinks, aliases | Publish | Quartz, `shortest` resolution | same | No. See §2 on ambiguity |
| Outline, nav tree | Publish | TOC, explorer, plus backlinks and breadcrumbs | same | No |
| **Edit on GitHub** | `publish.js:1477` | `edit-on-github` plugin | same plugin | Fix only: `relativePath` (§0) and per-segment encoding |
| **View revision history** | `publish.js:1481` | none | none | **Yes** |
| **Suggest an edit** | `publish.js:805-1450`: accessible modal, honeypot, focus trap, the `userMessage` contract | none | minimal form injected after the build (`scripts/add-suggest-edit.mjs`) | **Yes**. Port book one's modal and retire book two's form |
| **Annotation badge** | `publish.js:552-776` | none | none | **Yes** |
| **Tag helper** | `publish.js:181-550` | none | none | **Yes** |
| **Six Plausible events** | `track()` (`publish.js:139`) and six calls | pageviews only | no Plausible | **Yes** |
| Pageview | manual, deduplicated on SPA navigation (`publish.js:783-802`) | stock autocapture | none | No. Stock is correct with SPA off |
| **Hypothes.is config** | `openSidebar: false`, `showHighlights: 'always'` (`publish.js:155-179`) | identical (`edition-integrations`) | none | No. Already ported |
| Annotation highlight colour | `publish.css` §6 | none | none | **Yes** (design values) |
| Print styles | `publish.css` §9 | none | none | **Yes** |
| Lead paragraph, h4 small caps, link weight | `publish.css` §3-4 | partly (`themeCss`, no uppercase h4, no lead) | partly | **Yes** (design values) |
| SPA re-injection, pageview dedupe | `publish.js:1452-1581` | not needed | not needed | **No. Don't port** |

The six events, which must keep their exact names so Plausible's history continues:
`annotation_tag_copied {tag}` (`:375`), `annotation_sidebar_opened` (`:448`),
`annotation_badge_clicked` (`:712`), `suggest_edit_opened` (`:1426`),
`suggest_edit_submitted {outcome}` (`:1393`, `:1401`) and `edit_on_github_clicked` (`:1478`).

One thing I can't check from the repo: **Publish's site options** (stacked pages, theme
toggle, which panes are shown) are stored by Publish, not in `.obsidian/publish.json`.
**Decided (D18):** record them off *Site options* before cancelling the subscription (§8
step 15), and note anything readers would miss.

### 1b. Where each piece should live, so that every Quartz book gets it

| Piece | Home | How a book gets it | How an edition gets it |
|---|---|---|---|
| Design values, highlight colour, print styles, `--tb-*` tokens | `quartz-edition-extras/plugins/edition-integrations` (§4) | the builder's pin | its own pin |
| Hypothes.is config and loader | same (already there) | same | same |
| Plausible script, `track()`, **hostname guard** (count only on `site.domain`, so `*.pages.dev` previews don't pollute the stats) | same | options from the registry | options in its config |
| Tag helper | same, as an inline script. It is page-independent already | same | same |
| Block-reference fix and title fix (§2) | same, as two HTML transforms. It is already a transformer | same | same |
| Controls row: Edit, **History**, **Suggest**, **badge** | `quartz-edition-extras/plugins/edit-on-github`. Keep the name, because every lock file pins it by name | options from the registry | options in its config. `suggestEndpoint: ""` hides the button: an edition's origin isn't registered, so the function would answer 403 |
| The four events tied to controls | inside the controls, calling `window.plausible` through the same no-op-if-missing guard | | |

Port from `publish.js`, not from book two. The modal's accessibility work (the four honeypot
guards, the focus trap and the counter without a live region) is the part most easily lost.
Without SPA navigation the port gets smaller. The badge doesn't need its in-flight dedupe or
its re-injection verify loop. Its query URI becomes `location.origin + location.pathname`,
canonicalised because Pages 308-redirects `/x.html` to `/x`.

Afterwards, delete `platform-test-book/suggest-edit/`, `scripts/add-suggest-edit.mjs`, and the
template's `suggest-edit/` and `templates/suggest-edit/`.

---

## 2. Content: what the build shows

Built from `d3a7031` with the edition template's Quartz, `-d` pointing at the repository root.
It was then rebuilt with the non-book folders removed, plus a synthetic Word-converted chapter
to test images.

| # | Item | Result | Fix |
|---|---|---|---|
| 1 | **Same-page citations** `[Bhaskar, 1979](#^ref-bhaskar-1979)` | **Broken, 32 links in `chapters/chapter-03.md`.** Output is `href="#%5Eref-bhaskar-1979"`. The reference paragraph gets `id="ref-bhaskar-1979"`, because Quartz strips the `^`. The click goes nowhere | A transform in `edition-integrations`: rewrite fragment-only `#^id` hrefs to `#id`. No content change. The app keeps writing Obsidian block references (`references.py:340,367`), and `.markdownlint-cli2.yaml`'s MD051 note stays true |
| 1b | Cross-page citations `[x](chapter-03.md#^ref-…)`, `[[chapter-03#^ref-…\|x]]` | **Work.** Quartz rewrites them to `#ref-…` | none |
| 1c | Editions | They copy `chapters/`, so **their Chapter 3 citations are dead today** | The same transform fixes them when they update the plugin |
| 2 | Page titles | The `<title>`, explorer, search and graph labels read `chapter-03`, `index`, `glossary`. The chapter's own `# Chapter 3: …` H1 then appears below the `article-title` H1 | Recommended: a platform transform that uses the first H1 as the title and removes it from the body, when there is no frontmatter `title`. The alternative is adding frontmatter to every file, which is author work, and the Word converter would have to write it. Decision D4 |
| 3 | Callouts (`abstract`, `tip`, `info`) | Render as `blockquote.callout` | Drop `publish.css`'s tint workaround |
| 4 | Definitions wikilinks (about 40 in Chapter 3 and `index.md`) | All resolve, including aliased forms like `[[Unobservables\|unobservable]]` | none. Their **URLs** change (§3) |
| 5 | Ambiguous wikilinks | `community/contributors.md:13`'s `[[chapter-03\|Chapter 3]]` resolved to a dead `../chapter-03` while `Frankenstein/chapter-03.md` existed. Once `Frankenstein/` is removed, it resolves correctly (tested) | Delete `Frankenstein/` (§5). Have `gen-contributors.mjs` write full-path wikilinks, so that two files sharing a name never break a link silently |
| 6 | `glossary.md` | Renders at `/glossary` with one anchor per H2 (`#actual-domain` and so on) | none. Note that nothing in the book links to it. `index.md` doesn't mention it |
| 7 | Images under `assets/chapter-NN/` | No chapter has images yet (`assets/` holds `.gitkeep`). I tested the three forms the converter produces: `![](../assets/chapter-05/image1.png)`, pandoc's raw `<img … style="width:3in">`, and a filename with a space. **All resolve.** Quartz lowercases and hyphenates asset names (`Figure 2.png` becomes `figure-2.png`) and rewrites links to match. Obsidian embeds (`![[Vault.png]]`) also resolve | none |
| 8 | Non-book files | Quartz publishes everything it finds (§0) | the builder's allowlist |
| 9 | Hypothes.is, graph, popovers | `embed.js` is present, the graph container is present, and popover hints are present | Check in a browser on the preview host (§8 step 15). I didn't |

---

## 3. URLs and annotations

### 3a. The two schemes

Publish mirrors the file path, preserves case, and writes spaces as `+`
(`publish.js:48-73`). Quartz slugifies: lowercase, spaces to `-`, and `&` to `-and-`. Pages
serves both forms without `.html`. The domain doesn't change.

### 3b. Every current URL

Publish's page index (`/cache/1443b409…`, 58 entries, fetched live) against the Quartz output:

| Publish URL | Quartz URL | Change |
|---|---|---|
| `/`, `/index` | `/` | `/index` probably redirects on Pages. Verify |
| `/chapters/chapter-01`, `/chapters/chapter-03` | same | none |
| `/chapters/Definitions/Critical+Realism` | `/chapters/definitions/critical-realism` | **changes** |
| `/chapters/Definitions/Emergence`, `…/Monism`, `…/Retroduction`, `…/Unobservables` | `/chapters/definitions/emergence` and so on | **changes (case)** |
| `/chapters/Definitions/The+Three+Domains` | `/chapters/definitions/the-three-domains` | **changes** |
| `/glossary` | same | none |
| `/community/contributors`, `/dashboard`, `/derivatives` | same | none |
| (none) | `/chapters/`, `/chapters/definitions/`, `/tags/` | new folder and tag pages |
| `/docs/*` (19 pages) | gone | leaves the book (§5). Redirect only the two reader-facing ones |
| `/Frankenstein/*` (5), `/path-test/*` (9), `/QA`, `/README`, `/CONTRIBUTING`, `/templates/*` (3), `/images/*` (4), `/publish.css`, `/publish.js` | gone | 404. Test and machinery files |

### 3c. Redirects

**Needed:** the six Definitions pages. Every chapter links to them, and they are the pages
most likely to be bookmarked. Cover both the `+` and `%20` spellings. Also redirect
`/docs/how-to-comment` to `/how-to-comment` (the builder's page, D5), and
`/docs/for-course-coordinators` to its new home in the edition template's docs on GitHub,
because `index.md:39,47` and the derivatives page link them. Update those links in the book
too, so the redirects are only for outside links.

**Mechanism (decided, D14):** a Pages `_redirects` file, generated by the builder. For each
page, compute its Publish-style URL, and emit a 301 when that differs from the Quartz slug.
This is harmless for books that were never on Publish. **Unverified:** whether Pages matches `+`
and `%20` in a source path literally, and case-sensitively. Test it on the `pages.dev` host
before the cutover. If it doesn't, fall back to a zone Redirect Rule, like the apex 301.

**Also affected:** `backup-annotations.mjs:285-300` holds a per-URI fallback that mirrors
Publish's scheme. The primary `wildcard_uri` route is unaffected, but the fallback must switch
to Quartz slugs.

### 3d. Annotations, checked live on 22 Sep

| `wildcard_uri` | Public annotations |
|---|---|
| `https://social-research-methods.confused4now.org/*` | **0** |
| `http://social-research-methods.confused4now.org/*` | **0** |
| `https://confused4now.org/*` | 0 |
| `https://bptext2026.xyz/*` | 8 (six on `/chapters/chapter-03`, one on `/`, one on `/main`, June to August) |

**The cutover costs nothing today, and it stays cheap unlike the portal move.** The hostname
doesn't change, so an annotation made on `/chapters/chapter-03` before the cutover still has
the same URI afterwards. Hypothes.is re-anchors it by quoted text on the new markup. That is
expected but untested, so annotate a test page on Publish and check it after the cutover.
**Only the Definitions pages can strand annotations**, because their URL changes and a 301
doesn't carry annotations. Before the DNS step, check `wildcard_uri` on
`…/chapters/Definitions/*`. A non-zero count is a decision point, as it was for the portal.

`legacy_origins` stays `["https://bptext2026.xyz"]`.

---

## 4. Design values

### 4a. The single source

**`quartz-edition-extras/plugins/edition-integrations/design.yaml`**, one short file:
- the palette, light and dark, seeded from `publish.css`'s tokens (`#7C6CF0` and the rest);
- the fonts;
- the type scale;
- the reading measure and rhythm;
- the annotation highlight, plain and focused;
- the size of the controls row;
- the print settings.

The plugin reads the file **when a book builds** (from beside its `dist/`, via
`import.meta.url`), not when the plugin is compiled. Editing it therefore needs no `npm run
build`, which avoids the extras README's trap: "a source change without a rebuilt `dist/` has
no effect". **Unverified:** that Quartz's plugin install keeps a non-`dist` file in the
subdirectory. If it doesn't, have a workflow rebuild `dist/` on any change to `design.yaml`.

> **Settled, 23 Sep 2026 (§8 step 6, quartz-edition-extras #6).** It keeps it. Quartz
> clones the repo and copies the whole subdirectory (`cloneWithSubdirAsync`, `fs.cpSync`),
> and both `plugin resolve` and `plugin update` from the branch left `design.yaml` beside
> `dist/`. No rebuild workflow was added.

It emits CSS custom properties that override the ones Quartz generates from the config
(`--light`, `--lightgray`, `--gray`, `--darkgray`, `--dark`, `--secondary`, `--tertiary`,
`--highlight`, `--textHighlight`, and the three font variables). It also emits the `--tb-*`
tokens that the ported controls already use, with `publish.js`'s fallbacks intact. The theme
block in each Quartz config becomes inert. Mark it "overridden by design.yaml" rather than
keeping two sources.

**The graph.** Quartz's graph reads its colours from those same variables when it renders,
so its appearance follows `design.yaml` with no extra work. Whether the graph is shown, where
it sits and how it behaves (depth, forces, local or global) are options of the graph plugin.
A plugin can't set another plugin's options, so those live in the builder's shared
`quartz.config.yaml`: `enabled: true`, right rail, at the top. The edition template carries a
copy, with the graph on as well (decided, D11). Add a parity check that the two graph
blocks match. Don't seed the forces from the
vault's `.obsidian/graph.json`: those settings are for the Obsidian app, not Publish.

The right rail is shared with the Hypothes.is sidebar, which covers it when open. That was
the reason the visual direction turned the graph off. It is acceptable, but expect the
question.

### 4b. How an existing book or edition receives a change

- **Books.** The builder pins the extras plugins in its `quartz.lock.json`. When the extras
  `main` moves, a bot pull request bumps the pin. Its CI builds **every book on the
  builder** and uploads each to a preview branch (`design-<pr>`), then comments the preview
  links. Merging it moves the `stable` tag. The builder commit is part of every book's
  build key (§0a), so the next `reconcile` rebuilds every book. Each book's build marker
  confirms it. **Every book changes at once, and that
  is the point.** Rollback is moving `stable` back and redeploying.
- **Editions.** No change: a coordinator runs `npx quartz plugin update edition-integrations`,
  or picks up the template's pin through `sync-upstream.sh`. Editions lag by design. There is
  one edition, and it is a test fork.

### 4c. How you edit it

Open `design.yaml` on github.com and use the pencil. Change a value and choose "Propose
changes". CI posts preview links for each book (plus a fixture page, `QA.md`, moved from book
one). Merge when it looks right, and the §4b bot does the rest. You never need a terminal.

Two values wait for the client (D12, pending): `publish.css`'s "AA-strict" accent
(`#6A57E0` for link text, because `#7C6CF0` measures about 4.0:1), and whether dark mode
stays off. Until D12 is settled, `design.yaml` is seeded with what readers see today:
`#7C6CF0`, dark mode off. Settling it is then a one-line edit by the route above.
**Settled for phase 1 (25 Sep, D12):** the link colour stays `#7C6CF0`, so nothing is edited.

---

## 5. Clean-up

Tracked files at `d3a7031` (93), plus what is on disk and untracked.

### Stays: the book

| Path | Notes |
|---|---|
| `index.md` | **Becomes author-owned.** Today `apply-config` regenerates it from `templates/index.md` and wipes direct edits (`word-to-markdown.md:380`). That ends when `templates/` goes |
| `chapters/**`, `assets/`, `glossary.md` | The authoring app finds the book by these three (`convert.py:298-301`) |
| `community/*.md` | Reader pages, published (D3), regenerated weekly by the platform's reusable workflows (D6) |
| `textbook.config.json` | The slug. Read by the builder and by the app. Trim it to `slug` (the other four keys duplicate the registry, and parity already flags drift) |
| `README.md`, `CONTRIBUTING.md`, `LICENSE`, `.gitignore`, `.editorconfig` | Repository metadata, not published. README and CONTRIBUTING stop being rendered and become plain files |
| `admin/index.html`, `admin/config.yml` | **Stays until a shared CMS host exists (D7).** The `textbook-admin` Pages project builds from this repo's `admin/` (INFRASTRUCTURE.md:383), so moving it moves the CMS host (`DESIGN.md` step 5b). It is never published with the book. Once `configure.mjs` goes, `config.yml` is kept by hand, and a parity check compares it with the registry. When the shared host exists, it renders the config from the registry and `admin/` leaves |

### Leaves

| Path | Destination |
|---|---|
| `publish.js`, `publish.css`, `.obsidian/` (6 files, including `snippets/publish.css`) | **Deleted last, after Publish is cancelled** (§8 step 20). A rollback republishes from a vault that needs them. The history and `v0.1` keep them |
| `templates/` (6 files), `configure.mjs`, `.github/workflows/apply-config.yml` | Deleted. The builder reads the registry at build time instead (§0) |
| `scripts/` (backup, three generators, `lib/registry.mjs`) | To `quartz-book` as **reusable workflows** (decided, D6). They are already registry-driven. The book keeps thin caller workflows, because GitHub runs workflows only from the repo itself, and the backup and community pull requests need this repo's `GITHUB_TOKEN` |
| `.github/workflows/backup-annotations`, `contributors`, `dashboard`, `derivatives`, `weekly-snapshot`, `lint`, `link-check` | Become about 10-line callers of the reusable workflows |
| `.github/workflows/stats.yml` | Deleted. It is a placeholder that echoes "TODO … (Week 5)" |
| `.lycheeignore`, `.markdownlint-cli2.yaml` | Move with the lint and link-check workflows |
| `tests/test-path-mapping.js` | Deleted. It tests `publish.js`'s URL mapping |
| `path-test/` (9), `create-path-test-pages.sh` | Deleted. They are fixtures for Publish's URL scheme |
| `Frankenstein/` (5) | Deleted. It is placeholder text, and it breaks wikilinks (§2 #5) |
| `QA.md` | To the builder repo as the design-preview fixture |
| `docs/` maintainer guides (15) | Deleted here. `textbook-template/docs/` is the generalised copy (docs split, 22 Sep), and it is the one place to rewrite them for Quartz. They all describe the Publish dialog. Move the book-specific facts in `what-this-book-runs-on.md` into README's "This book" section |
| `docs/how-to-comment.md` | Reader-facing, and the same for every book. Becomes the page the builder adds to every book at `/how-to-comment` (D5) |
| `docs/for-course-coordinators.md` | To the edition template's docs, next to `department-edition-setup.md` |
| `docs/DOCS-REMEDIATION.md` | To `textbook-registry/docs/`, as history, or deleted |
| `docs/Chapter_03.docx` | The author's manuscript. Remove it from the tree; the history keeps it. The app imports from the author's desk, not from the repo |
| `images/` (4 Obsidian screenshots) | Deleted with the docs they illustrate |
| Untracked: `2.md` (a pasted terminal session), `Chapter 5000/` (empty), `backups/` (empty local folder; the `backups` **branch** is unaffected), `.claude/`, `.DS_Store` | Delete locally. They aren't in git |

Keep the `main`, `drafts` and `backups` branches, and every tag. The 20 stale remote
branches (`v2`, `cms/chapters/*` and others) are worth a separate sweep.

---

## 6. The author's path, without Obsidian

### 6a. Today

Word goes into the app, which writes to the local vault. The vault is published through
Obsidian's Publish dialog. GitHub is updated separately by the technical contact, and nothing
in the author's workflow touches it (`word-to-markdown.md:390`). The live site shows the
consequence: Publish serves four pages that were deleted from the repo, and lacks three that
were added.

The app writes to disk in three places:
- Word import (`convert.py`, pictures to `assets/<chapter>/`);
- link and glossary tidying (`session.py`);
- **accepting a reader's suggestion** (`console.py:212-270` rewrites the local file).

"Going live" already works on GitHub: it merges the `drafts` → `main` pull request
(`github.py:486`). The console then tells the author to "Take the latest into Obsidian"
(`console.py:364`).

### 6b. After: `drafts` is the author's folder

1. **Write in Word.**
2. **Bring it in.** The app converts it locally (pandoc stays on the Mac) and shows the
   result. **"Send to drafts"** makes **one commit on `drafts`** containing the chapter and
   its `assets/chapter-NN/` pictures, through the Git Data API (blobs, tree, commit, then a
   non-force ref update), as the signed-in author. The console's device-flow token already
   has the scope (`github.py:38`). If `drafts` moved in the meantime, the ref update fails:
   re-read and offer again. This is the same guarantee as the app's existing "changed on
   disk" check.
3. **Tidy citations, concept links and the glossary.** The app reads the chapter from `drafts`
   (`file_at_ref`, `github.py:309`), applies the edits, and commits.
4. **Accept a reader's suggestion.** `plan_change` and `apply_change` run against the chapter
   on `drafts` instead of the local file. The result is a commit, and the issue closes.
5. **Small edits:** the browser editor. It writes to `drafts` only once an edit
   is marked Ready and published. Until then each edit sits on its own
   `cms/<collection>/<name>` branch. So a browser edit clashes with the app only
   when one is **published** while the author is mid-import or mid-edit, and
   then the non-force ref update in steps 2-4 refuses, and the app re-reads and
   offers again. *(Corrected 22 Sep: this said the browser editor writes to
   `drafts` directly. Live testing of §8 step 1 showed otherwise.)*
6. **Contributors' changes:** accepting squash-merges them into `drafts` (exists).
7. **Preview (new):** the builder deploys `drafts` to `drafts.<project>.pages.dev` (§0a),
   public but `noindex` (D13). The console gets a "See the drafts" link, and says so when the
   preview hasn't caught up with the author's last commit.
8. **Going live:** unchanged. Replace the Obsidian wording in `PUBLISHED_STEPS` (`:364`) and
   in the conflict advice (`:440`).

**The local folder stops being the source.** The console already has a book picker, so the
"open vault decides the book" rule (`registry.py` `identify`) becomes "the chosen book
decides". "Download a copy" stays, for anyone who wants the files (decided, D9).

**Rejected:**
- GitHub Desktop: that is git.
- The Obsidian Git plugin: that is Obsidian.
- A folder-watching sync that commits silently: conflicts would become invisible, which is
  exactly what the app's guarantees exist to prevent.

**Decided (D8): this ships before the cutover** (§8 steps 1-2). The interim state, where only
the technical contact can get a Word chapter to readers, never happens.

---

## 7. Governance: what changes in `MULTI-BOOK-HOSTING.md`

The document's model was that each maintainer owns and pays for their own Publish site, so
the platform "stops serving and stops listing" but **cannot** take a book down (§7c). Hosting
every book on the platform's Pages inverts that. **The platform can take any book offline at
every address it serves. It still cannot take down the repository, the author's copy or a
department edition.**

| Section | Change |
|---|---|
| Header, "The model under review" | A dated note: superseded by platform-hosted Quartz on Pages (this document). Publish books are legacy |
| Summary 2, 5 and 7 | Rewrite them to match the rows below |
| §2a (per book, Publish) | Mark as legacy |
| §2b (per book, static) | Becomes the procedure. The platform creates the Pages project in its account and binds `<slug>.confused4now.org`. There is **no maintainer binding step**, and no grant to Cloudflare: the builder uploads with Direct Upload (D2). What the book repo carries instead is one `nudge.yml` workflow with no secrets (§0a) |
| §2e (takeover) | Publish's dangling-CNAME risk goes away for Pages books. The new equivalent: **never delete a book's Pages project while a record points at its `pages.dev` name**, because a deleted project name can be claimed by someone else. Park the hostname first |
| §5a ("can't publish") | The premise reverses. Platform changes reach every book at its next build, and stale renders stop being possible. "Platform endpoints are permanent" still holds for installed authoring apps and for editions |
| §5b (probe) | Replace the `window.siteInfo` checks with the build marker (§0): slug, registry SHA, builder ref. The states become `serving`, `stale-build`, `unbound`, `foreign` and `unreachable`. `inactive` is gone |
| §5d, `site.dark` | `subscription-lapsed` no longer applies to platform-paid books. Keep the field for own-domain books whose DNS the maintainer holds. A failed build keeps the last deployment live, so builds don't make books dark |
| §5e (responsibilities) | The maintainer no longer pays or binds. The **platform owner answers for every book's uptime**. Record that the account is a single point of failure (*Is this the wrong move?*, 1) |
| §7 requirement | Restate it: the author controls the content and the repo, and the platform controls serving |
| §7b | Add a row, **Pages project**: retiring makes the builder refuse, but **the last deployment keeps serving**. Removal therefore needs an explicit un-serve step, as below |
| §7c | Rewrite: the platform can un-serve, and can't touch content. The **exit path** is that the builder is public, so an author can build the same site anywhere |
| §7d | The own-domain asymmetry disappears. An own domain bound to a platform Pages project can be un-served by removing the custom domain. The lever is the Pages project plus DNS, not DNS alone |
| §7e | Unchanged: `dark` and `removal` stay separate |
| §7g (process) | The power is broader, so the checks get stronger. (i) **Removal only via the registry pull request, and automation carries it out**: registry CI removes the custom domain and deploys a tombstone. Nobody un-serves by hand. (ii) **Exit commitment:** on voluntary departure, a 301 from the old address to the author's new home for 12 months. (iii) The hosting policy also states what the platform owes: best-effort uptime, notice before platform-wide changes, and that design values are shared (a maintainer can't restyle their book). Maintainers accept this at onboarding. (iv) The preview-every-book gate in §4b is also a governance control, since one merge restyles everyone |
| Open questions | Question 7 (whose Publish subscription) closes when Publish is cancelled. New questions: the Cloudflare account's second administrator, and the Pages build budget |
| §8 Order of work | Insert this conversion. Probe step 6 uses the build marker |

---

## 8. Order of work

Each step is one pull request unless it says otherwise, and each can be merged and left
alone before the next starts. **Steps 1-15 change nothing a reader sees.** The book's live
address is first touched at step 16. The critical path comes first: "Send to drafts", the
citation fix, the parity port and the builder.

Where a step creates infrastructure (a repo, a Worker, a token, a Pages project), record it
in `docs/INFRASTRUCTURE.md` in the same PR if the step is in this repo, or in a same-day
registry PR if it isn't.

### Phase 1: the critical path

**1. "Send to drafts" for a Word import.**
- **Repo:** `authoring-assistant`.
- **Does:** after conversion, "Send to drafts" makes one commit on `content.drafts_branch`
  with the chapter and its `assets/chapter-NN/` pictures, through the Git Data API (blobs,
  tree, commit, non-force ref update), as the signed-in author (§6b step 2). If the ref
  update is refused because `drafts` moved, the app re-reads and offers again.
- **Proves it:** on book two, a Word file with a picture produces exactly one commit on
  `drafts`, authored by the signed-in account, with the image at the path the chapter links.
  Moving `drafts` from another client between conversion and sending gets a refusal and a
  fresh offer, and overwrites nothing. Tests cover building the tree, including a picture
  that was removed since the last import.
- **Must not break:** writing to the local folder. **Publish is still what readers see until
  step 16**, and Publish uploads from that folder, so the old route stays alongside the new
  one until then. "Going live" is unchanged.

**2. The rest of the author's path on `drafts`.**
- **Repo:** `authoring-assistant`.
- **Does:** tidying citations, concept links and the glossary reads the chapter from `drafts`
  and commits there. Accepting a reader's suggestion runs `plan_change` and `apply_change`
  against `drafts` and closes the issue with a link to the commit. The chosen book decides
  which book is open, not the open vault. "Download a copy" (D9). The Obsidian wording in
  `PUBLISHED_STEPS` and the conflict advice is replaced, with the old text kept behind the
  book's host kind until step 17.
- **Proves it:** on book two, an accepted suggestion becomes one commit on `drafts` and a
  closed issue. A tidy on a chapter that exists only on `drafts` works with no folder open.
  "Download a copy" writes the book's files.
- **Must not break:** the picker's push-permission filter. Launching offline with the cached
  registry. Book one's current route, which is still Publish.

**3. The citation fix and the title transform.**
- **Repo:** `quartz-edition-extras` (`edition-integrations`).
- **Does:** two HTML transforms (§2 #1 and #2). Fragment-only `#^id` hrefs become `#id`. When
  a page has no frontmatter `title`, its first H1 becomes the title and leaves the body (D4).
- **Proves it:** a build of book one with the branch installed has no `href="#%5E` anywhere,
  and each of Chapter 3's 32 citation hrefs matches an `id` on the same page (a script
  checks this, not a person). Cross-page citations are unchanged. `<title>`, the explorer
  and search read "Chapter 3: …", with one H1 in the article. A page with frontmatter
  `title`, and a page with no H1, keep today's behaviour.
- **Must not break:** anything pinned. The template and book two don't change until they
  move their pin.

**4. Plausible events, the tag helper and the annotation badge.**
- **Repo:** `quartz-edition-extras`.
- **Does:** `track()` with the no-op-if-missing guard and the **hostname guard** (count only
  on `site.domain`). The tag helper as an inline script, with `annotation_tag_copied` and
  `annotation_sidebar_opened`. The badge with `annotation_badge_clicked`, querying
  `location.origin + location.pathname` canonicalised (§1b). Ported from `publish.js`, less
  the SPA handling.
- **Proves it:** on a local build with the guard pointed at the test host, a spy on
  `window.plausible` sees the three names exactly as §1a lists them. With the guard at the
  real domain, a `localhost` or `pages.dev` host sends nothing, not even a pageview. The
  badge's count for a test page equals the Hypothes.is API's count for the same URI.
- **Must not break:** the stock pageview on the real domain. The Hypothes.is config, which is
  already ported.

**5. The controls row: History, the suggest modal, and the Edit fix.**
- **Repo:** `quartz-edition-extras` (`edit-on-github`, name kept).
- **Does:** adds History and Suggest beside Edit. Suggest is book one's modal ported from
  `publish.js:805-1450`: the four honeypot guards, the focus trap, the counter without a live
  region, and the `userMessage` contract. `suggest_edit_opened`,
  `suggest_edit_submitted {outcome}` and `edit_on_github_clicked`. Edit uses `relativePath`,
  encoded per segment. `suggestEndpoint: ""` (the default) hides Suggest.
- **Proves it:** keyboard only, the modal opens, keeps focus, and returns focus on Escape. A
  honeypot POST from book two's origin gets the honeypot answer and files nothing (the
  proof INTERIM-BOOK already uses). A build with `-d` at the repo root gives
  `/edit/main/chapters/chapter-03.md`. The three event names appear exactly.
- **Must not break:** editions that already show Edit. They see no Suggest, because they
  don't set an endpoint.

**6. `design.yaml`.**
- **Repo:** `quartz-edition-extras`.
- **Does:** §4a. One file of design values read at build time, emitting Quartz's variables
  and the `--tb-*` tokens, plus the annotation highlight, print styles, the lead paragraph
  and h4 small caps. Seeded with what readers see today; D12 is pending, so the accent stays
  `#7C6CF0` and dark mode stays off. Settles the open question in §4a: if `npx quartz plugin
  install` drops `design.yaml`, the same PR adds the workflow that rebuilds `dist/`.
- **Proves it:** installing from the branch leaves `design.yaml` beside `dist/`. Changing one
  colour in it changes the built CSS with no `npm run build`. Print preview of Chapter 3
  matches `publish.css` §9. The graph's colours follow the palette.
- **Must not break:** the theme blocks in existing configs, which are marked inert, not
  removed.

**7. The registry learns which books the builder builds.**
- **Repo:** `textbook-registry`.
- **Does:** an optional `site.host.builder` (`"quartz-book"`) on `static` hosts. Absent means
  the builder leaves the book alone, which is today's state for book two. Parity checks
  that every builder book's `content.repo` is public (§0a).
- **Proves it:** `npm test` passes with a fixture book using the field and one without.
  `deploy.yml` redeploys the function and it serves the merge commit.
- **Must not break:** the function, the console and the portal, which all read the registry.
  The field is additive.

> **Done, 23 Sep 2026 (textbook-registry, `registry/site-host-builder`).** The public-repo
> check is in `check-github.mjs` (the `validate` workflow's `github-facts` job), not in
> `parity/`. `github-facts` already failed any non-public content repo, and parity is
> temporary: it is deleted once every check is retired. For a builder book the job also
> runs `git ls-remote` with no credentials on both branches, which is how the builder reads
> them. No committed book has the field until step 17.

> **Amended, 24 Sep 2026 (textbook-registry, `registry/builder-on-publish-host`).** The
> gap step 9 found is closed in the schema, not in the Worker. An `obsidian-publish` host
> may now carry `builder` too, and when it does it must also carry `project`, the
> Cloudflare Pages project the builder deploys to. On a Publish host, `builder` means
> **build a preview**: the builder builds the book and deploys it to
> `<project>.pages.dev`, and readers are still served by Publish at `site.domain`, which
> stays the book's only address. Book one's entry names `builder: "quartz-book"` and
> `project: "social-research-methods"` from this PR, so steps 10-16 rebuild it with no
> extra input. Nothing that treats `site.domain` as the address changes: the
> suggest-edit function matches origins on `site.domain` alone, the portal links
> `site.domain`, and the console decides "published from the folder" by `site.host.kind`,
> which stays `obsidian-publish` until step 17. Each was run against the old and new
> `registry.json` and gave the same answer. The validator now also refuses two books
> on one provider project, and counts a Publish book's preview project as a Cloudflare
> Pages one when checking the portal's.

**8. The builder.**
- **Repo:** `quartz-book` (new, D1).
- **Does:** Quartz v5 checkout, the shared `quartz.config.yaml` (graph on, SPA off), the
  extras pinned at steps 3-6, and `build-book.sh` as §0 describes: registry-driven options,
  the allowlist, the `/how-to-comment` page, `_redirects`, `_headers` for non-live branches,
  canonical links, the build marker, and refusing a `retired` book. `QA.md` arrives as the
  design fixture. CI builds book one from its current `main`.
- **Proves it:** CI asserts that the output holds only allowlisted and generated paths, so
  that `configure.mjs`, `LICENSE`, `admin/` or anything else fails the build. `_redirects`
  lists the six Definitions pages in both the `+` and `%20` spellings, and the two `docs/`
  pages. A retired fixture refuses. `community/contributors.md`'s Chapter 3 link resolves
  with `Frankenstein/` still in the tree but outside the allowlist (this settles whether
  ignoring a folder equals deleting it).
- **Must not break:** nothing is deployed yet.

> **Done, 23 Sep 2026 (`quartz-book`, `builder/step-8`).** Quartz is upstream
> `jackyzha0/quartz` at `9cf87ff`, the same commit the edition template runs. The extras
> are pinned at `ba88e98` (steps 3-6). Quartz reads its config only from its working
> directory, so each build runs in a scratch directory with the book's rendered config.
> Settled: **ignoring a folder does equal deleting it.** Contributors' `[[chapter-03]]`
> resolves to `chapters/chapter-03` with `Frankenstein/` in the tree. Choices the steps
> above left open:
> - Edit and History links name the **branch being built**, so the drafts preview's links
>   open `drafts`. On the live branch this is the live branch, as §0 says.
> - The marker's `registry_digest` covers the book's entry **and**
>   `platform.suggest_edit_endpoint`, the one platform value a build reads. Otherwise
>   moving the endpoint would not rebuild any book.
> - `_redirects` has one line for a one-word page, where the `+` and `%20` spellings are
>   the same path. It also has `/index → /`, by the same rule.
>
> Found, for later steps:
> - **Book one's `drafts` is 31 commits behind `main`**, and its `textbook.config.json`
>   has no `slug`, so the builder refuses it. Bring `drafts` up to date with `main` before
>   step 9 builds the drafts preview.
> - `community/contributors.md` links `[[for-trusted-contributors]]`, a `docs/` page that
>   is outside the allowlist. It is dead on the Quartz build, like the
>   `[[for-course-coordinators]]` links in the same page, `index.md` and
>   `derivatives.md`. `gen-contributors.mjs` writes both (step 14), and step 18 fixes
>   `index.md`.
> - `/docs/for-course-coordinators` redirects to the edition template's
>   `docs/for-course-coordinators.md`, which doesn't exist until step 22.
> - Step 9's `reconcile` builds "the books on the builder". No committed book has
>   `site.host.builder` until step 17, so step 9 has to build book one another way, for
>   example by slug.
> - `sitemap.xml` and `index.xml` carry the build time as `lastmod`, so two builds of one
>   commit differ there. Step 18's diff of two builds should leave those two files out.
> - If Pages matched `_redirects` without regard to case, the case-only rules
>   (`/chapters/Definitions/Emergence`) would redirect to themselves. Step 15's redirect
>   check covers this.

**9. The `reconcile` workflow, and book one's Pages project.**
- **Repo:** `quartz-book`, plus one Cloudflare action by hand.
- **Does:** the `reconcile` workflow (§0a): per book and branch, compare the served marker
  with the would-be build, build in a job with no secrets, deploy in a separate job with the
  token. `concurrency` per book and branch. `workflow_dispatch` only, with optional `slug`
  and `woken_by` inputs and `woken_by` in `run-name`. **No `schedule:` trigger**: the
  15-minute tick comes from the Worker in step 10. Until then, `reconcile` runs only by
  hand, which is enough, since nothing live depends on it before step 16. By hand: create **`social-research-methods` as a Direct Upload project** in
  `brandonproject2026`, production branch `main`. Add `CLOUDFLARE_API_TOKEN` (Pages edit,
  that account only) and the account ID as `quartz-book` secrets.
- **Proves it:** `social-research-methods.pages.dev/.well-known/textbook.json` shows `main`'s
  head, and `drafts.social-research-methods.pages.dev` shows `drafts`' head with
  `X-Robots-Tag: noindex`. A second run with nothing changed deploys nothing. Editing book
  one's registry entry rebuilds book one only. A deliberately broken fixture commit leaves
  the previous deployment serving and the run red.
- **Must not break:** book one's live address, because no custom domain is bound yet. The
  suggest-edit form answers 403 on `pages.dev`, which is correct: that origin isn't
  registered.

> **Built and proved, 24 Sep 2026 (`quartz-book`, `builder/step-9-reconcile`).** The
> live proofs, all run by hand with `unrecorded_book`:
> - **First run:** both branches built and deployed. `main` served book commit
>   `c76f9a7`, `drafts` served `1b80418`, and the `drafts` preview answered
>   `X-Robots-Tag: noindex`.
> - **Second run, nothing changed:** the plan job ran alone; nothing was rebuilt.
> - **Broken build** (`proof/step-9-broken-build`, `8f1350a`): the run went red, both
>   deploy jobs were skipped, and the site kept serving builder `7aa4e7f`. After the
>   revert, both branches rebuilt.
> - **Registry change** (PR #19, book one's `suggest_edit.counted_from`, which no code
>   reads): `registry_digest` went from `sha256:dc001e26…` to `sha256:4a30e168…` and
>   book one rebuilt. After the revert (PR #20) it returned to `sha256:dc001e26…`.
>
> A blank secret surfaced only as a wrangler error deep in the deploy log, which cost
> time during the proof. With `quartz-book` PR #3, the deploy job checks both secrets
> first and names any that is missing. `reconcile.yml` compares and fans out;
> `reconcile-book.yml` holds the build job (no secrets) and the deploy job (the token)
> for one book and branch, and the `concurrency` group sits on the job that calls it,
> so it covers both. Choices the step left open:
> - **Book one before step 17: a temporary `unrecorded_book` input.** `reconcile`
>   builds only entries with `site.host.builder`, and book one can't have it until step
>   17. The input names one book to build in addition, with its Pages project named
>   after its slug. It is a workflow input, not a list committed in `quartz-book`, so
>   the registry stays the only record of which books the builder owns, and each use
>   is visible in the run name and as a warning. Once book one's entry names the
>   builder, the input is refused, and step 17 deletes it.
> - The pair's own job checks the marker again before building, because a run that
>   waited in the concurrency group may find the work done. It builds with the
>   registry it decided on.
> - **Only a run from `main` deploys.** A run from another branch builds and stops,
>   which is how a broken builder commit can be tried without touching a book.
> - After deploying, the job checks that Pages serves the new marker, and that a
>   preview answers `X-Robots-Tag: noindex`. A marker that doesn't name exactly this
>   builder and book commit fails the build, since it would never compare as current.
> - The Quartz plugin cache is restore-only in `reconcile`; `ci.yml` saves it. Nothing
>   written after book content is read is kept for a later build.
> - The token expires on 25 Sep 2027 (INFRASTRUCTURE §7).
>
> **Open, for step 10 (decide before it starts).** The input covers step 9's runs by
> hand, but not the automatic ones. Steps 10, 12, 15 and 16 all expect book one to
> rebuild on its own (a nudge from its `drafts`, the `cron` tick, the console's "See
> the drafts", the cutover's marker for `main`'s head), and each of those comes before
> step 17. Either the Worker passes `unrecorded_book` until step 17, which puts a slug
> in the Worker, or the registry records `builder` (and the project) on book one
> before its host kind changes, which amends step 7's schema. The second keeps the
> registry the one source the builder trusts, and is the recommendation.
>
> **Decided, 24 Sep 2026: the registry records it.** Step 7's schema is amended (see the
> note there), book one's entry names the builder and its project, and `quartz-book`
> removes `unrecorded_book` (PR `reconcile/drop-unrecorded-book`). A `reconcile` run with
> no input now plans book one from the registry. Steps 10, 12, 15 and 16 need no
> workaround, and step 17 shrinks to switching the host kind.

**10. The Worker: the nudge and the 15-minute tick.**
- **Repos:** `build-nudge` (new, a Cloudflare Worker in `brandonproject2026`), then
  `textbook`, then `textbook-registry`.
- **Does:** the Worker in §0a, with one secret: a fine-grained token on `quartz-book` alone,
  `Actions: write`, with an expiry date recorded in INFRASTRUCTURE. Its `fetch` handler
  takes nudges. Its `scheduled` handler, on a Cron Trigger `*/15 * * * *` in the Worker's
  config, dispatches `reconcile` for every book with `woken_by: cron`. A second PR adds
  `.github/workflows/nudge.yml` to book one. A third adds the daily `builder-alive`
  workflow to the registry (§0a). The Worker passes only `slug` and `woken_by`: book
  one is on the builder in the registry (step 7, amended 24 Sep), so no slug or project
  is written into the Worker.
- **Proves it:** a push to book one's `drafts` starts `reconcile` within a minute, named
  `nudge`. With no push, a run named `cron` starts every 15 minutes. A token minted in an
  unregistered repo gets 403 and dispatches nothing. A replayed token is coalesced.
  `builder-alive` is green. With the Cron Trigger removed from a test deploy of the
  Worker for over an hour, a run of `builder-alive` goes red, and it goes green again once
  the trigger is back. With the Worker's token revoked, a run by hand from the Actions tab still
  builds and deploys. Measure the nudge and poll latencies, and put them in
  `docs/SCHEDULED-JOBS.md`.
- **Must not break:** book one's other workflows. `nudge.yml` asks for `id-token: write` and
  nothing else, and holds no secret.

> **Built, 24 Sep 2026** (`build-nudge` PR #1, `textbook` PR #43, textbook-registry
> PR #23). **Proven live the same day** (below). Choices the step left open:
> - **Which repositories pass the filter:** the books `reconcile` builds, which are
>   those with `site.host.builder` that aren't retired. Any other repository gets
>   403. `nudge.yml` runs on every branch and names none: the Worker takes the live
>   and drafts branches from the registry, and answers a push to any other branch
>   with 200 and no dispatch. Tags don't run it.
> - **Coalescing joins a run only while it hasn't started.** Once `reconcile`'s plan
>   job starts, it may already have read the branch heads, so it can't stand in for
>   a later push. For 10 seconds after a dispatch, the Worker's memory is enough.
>   From 10 to 30 seconds, it coalesces only while GitHub lists a
>   `reconcile: nudge, <slug>` run as queued. The Worker keeps no storage: the Cache
>   API does nothing on `workers.dev`, and KV would be one more resource with
>   eventually consistent reads.
> - **`GET /` reports the serving version's ID, whether its token works, and the
>   token's expiry** (GitHub sends it as a header). This is how to tell that a
>   secret reached the serving version, the failure that took the relay down.
>   `builder-alive` reads it too, and warns 30 days before the expiry. It also warns
>   when the latest finished `cron` run failed. Only the missing `cron` runs make it
>   red.
> - **Deployed by hand with `wrangler`**, from the platform owner's Mac. Deploying
>   from Actions would put a Worker-edit Cloudflare credential in GitHub, and the
>   Worker changes rarely.
> - **A refused nudge makes a red `nudge` run in the book.** The book still rebuilds
>   on the tick. A red run is the only sign a maintainer would see.
> - **`nudge.yml` has to be on `drafts` as well as `main`,** because a push runs the
>   workflow file of the pushed commit. Bringing `drafts` up to date with `main`
>   after the PR merges is also the proof's push.
> - The proof that removes the Cron Trigger for an hour removes it from the real
>   Worker. `builder-alive` watches that Worker, so a separate test Worker couldn't
>   turn it red.
> - The token expires on **23 Sep 2027**, 22:00 UTC. That's the date GitHub set,
>   a day before the one entered. The Worker's status page reports it as
>   `token_expires`, read from GitHub's own header. INFRASTRUCTURE now lists every
>   credential that expires.
>
> **Live proof, 24 Sep 2026:**
> - **A push starts `reconcile` within a minute, named `nudge`.** Merging `textbook`
>   PR #43 pushed to `main` at 12:35:56, and `reconcile: nudge,
>   social-research-methods` started at 12:36:05. Bringing `drafts` up to date with
>   `main` pushed at 12:45:52, and its run started at 12:46:01. That run deployed
>   `e7145120` to the drafts preview and confirmed the new marker at 12:47:22.
> - **With no push, a `cron` run starts every 15 minutes:** 12:30:03, 12:45:02,
>   13:00:03, each 2-3 s after the Cron time.
> - **A token from an unregistered repository gets 403 and dispatches nothing.** A
>   throwaway branch of `build-nudge` asked GitHub for a token with the Worker's
>   audience and POSTed it (`build-nudge` Actions run 36000492313). Answer: 403,
>   "textbookproject2026-alt/build-nudge is not the repository of a book on the
>   builder in the registry". No `reconcile` run started.
> - **A replayed nudge is coalesced, if it isn't simultaneous.** `nudge.yml` masks
>   its token, so the replay was a re-run of book one's `nudge` jobs, which
>   presents the same push again. Two re-runs 3 s apart: the first dispatched, and
>   the second was answered "Coalesced: this book's nudged run hasn't started
>   yet." Two re-runs **in the same second both dispatched**
>   (`reconcile` 36002308094 and 36002308525). Neither could see the other: the
>   in-memory check is per isolate and only set after the dispatch, and neither
>   run was listed yet. That's accepted: the cost is one duplicate run that finds
>   nothing to do (they took 17 and 18 s), which is what the design already allows for a
>   forged or replayed nudge.
> - **`builder-alive` is green** (registry Actions run 36000435373): it found the
>   12:30 `cron` run, and the Worker reported its token works, with no warnings.
> - **Running `reconcile` by hand doesn't need the Worker or its token,** so
>   revoking the token wasn't run as a proof. Every one of the day's ten by-hand
>   runs (10:20 to 11:45) was started from the Actions tab by
>   `textbookproject2026-alt`, before the Worker's first deployment at 12:22:45,
>   when `DISPATCH_TOKEN` didn't exist yet. The successful ones built and
>   deployed both branches (for example 35988143260, 35989353978, 35994878472).
> - **With the Cron Trigger removed for over an hour, `builder-alive` goes red.** The
>   trigger was removed with `wrangler triggers deploy`, which makes no Worker
>   version, so version `5af4ed7b` kept serving with `DISPATCH_TOKEN`. The last
>   `cron` run was 13:15:04 (`reconcile` 36004368098). `builder-alive` went red at
>   14:31 and again at 14:33 (registry Actions runs 36013458023, 36013618329). Each
>   found no `cron` run in the hour before, and each reported the token works. So it's the missing tick that turns it red, not the token.
> - **With the trigger restored, `builder-alive` is green again.** The trigger in
>   `wrangler.jsonc` was deployed again with `npx wrangler triggers deploy`, and the
>   next `cron` run started at 14:45:42 (`reconcile` 36015135401). That first tick came
>   42 s after the Cron time, not 2-3 s. `builder-alive` went green at 14:51 (registry
>   Actions run 36015866318): it found that run, and version `5af4ed7b` reported its
>   token works, expiring 23 Sep 2027, 22:00 UTC.
>
> The latencies are in `docs/SCHEDULED-JOBS.md`.

**11. The design preview gate.**
- **Repo:** `quartz-book`.
- **Does:** §4b. A bot PR bumps the extras pin, CI deploys every builder book to a
  `design-<pr>` preview branch and comments the links, and merging moves `stable`.
- **Proves it:** a no-op bump gets a comment with a working preview link per book. After
  merging, each book's marker shows the new builder commit within one `reconcile`.
- **Must not break:** production for any book before the merge.

> **Built, 24 Sep 2026 (`quartz-book` PR #5). Proved live the same day, with a person
> approving the bot's held runs. The App path (`quartz-book` #8) is still to prove.**
> Where §4b left a
> detail open, this is how it was settled:
>
> - **`stable` moves when `ci` passes on the push to `main`,** not at the moment of
>   merging (`stable.yml`). It then starts `reconcile` (`woken_by: stable`, so the run
>   is named `reconcile: stable, every book`). A `reconcile` run from `main` builds
>   with the commit `stable` names. The commit is resolved once per run, and the
>   marker's `builder_commit` is that commit. On its own, `stable` only moves forward.
>   A rollback (run `stable` by hand with an older commit) holds until the next merge
>   to `main` passes CI.
> - **The bot is started by `reconcile`'s cron tick,** which runs on the Worker's
>   clock, not by a GitHub `schedule:` (§0a). There is one pull request per extras
>   commit, ever, and closing it unmerged declines that commit. All the extras plugins
>   move together.
> - **The preview runs on every pull request into `main`,** not only the bot's,
>   because any builder change reaches every book (§0a, the failure table). It builds
>   each book's live branch as a `noindex` preview (`build-book.sh --preview`) and
>   deploys it only to `design-<pr>`.
> - **Not in this step:** §4c's previews on a `design.yaml` pull request in
>   `quartz-edition-extras`, with `QA.md`. This gate previews an extras change after
>   it merges, on the bot's pull request. No step in §8 names the extras-side preview.
>
> **After the merge, 24 Sep 2026 (times UTC).**
>
> - **PR #5's own merge never moved `stable`.** `e217293` merged at 15:36 and `ci`
>   passed, but `stable.yml`'s tag push got a GitHub 500 (`remote rejected … Internal
>   Server Error`, request `400A:32DE10:16ECCA:1E1F10:6AB543D1`). The tag stayed
>   where it was, and nothing reported it. A failed `stable` run is the only sign.
> - **Two commits then went straight to `main`, and `stable` carried them to every
>   book without a design preview.** Another session pushed `83ad987` ("pin
>   edit-on-github to the in-site editor", 16:04) and `7d066e1` ("Graph: bump
>   textbook-graph…", 16:13). `ci` passed on each push, `stable` moved to each, and
>   `reconcile: stable, every book` rebuilt every book at 16:06 and at 16:14–16:16.
>   All four sites (both books, `main` and `drafts`) now serve builder `7d066e1`.
>   `83ad987` moved `edit-on-github` from `ba88e98` to `78ad69f` (the in-site
>   editor). `7d066e1` moved `textbook-graph` from `a8c3531` to `5a0982b` and changed
>   the graph settings in `quartz.config.yaml`.
> - **`quartz-book`'s `main` is now protected:** it requires a pull request (no
>   approvals needed) and the `build` check from GitHub Actions, and admins are
>   included. Nothing in steps 8–11 pushes to `main`. `stable.yml` pushes only
>   the tag, and the bot pushes only `bot/extras-*` branches.
> - **The bot did open its pull requests.** Both were started by `reconcile`'s cron
>   tick within 15 s: #6 (extras `a8c3531`, 15:46) and #7 (extras `5a0982b`, 16:16).
>   The "first bump is `381b110`, a no-op" expected at the merge was overtaken, because
>   extras moved first. #6 is stale: it would put `edit-on-github` back from `78ad69f`
>   to `a8c3531` and conflicts with `main`. #7 is a no-op in files, because the direct
>   commits had already moved the pins that mattered. No plugin directory changes
>   between its from and to commits, but it is a real pin move and a real builder
>   commit.
> - **A pull request the bot opens now starts its `pull_request` workflows, held for
>   approval** (`action_required`). The comment in `bump-extras.yml` says they don't
>   start at all. The `build` check from the bot's dispatched `ci` run passes but
>   doesn't count on the pull request, so #7 shows `BLOCKED` under the new protection.
>   Approving the held runs is part of the live proof.
> - **The bot doesn't close the bot pull requests it supersedes.** An older one merged
>   after a newer one would move the pins backwards.
>
> **The live proof, 24 Sep 2026 (UTC).**
>
> - **#7's held `pull_request` runs were approved by hand at 17:04.** `build` then
>   counted on it, and a person merged it at 17:06 (`df122e1`). The bot didn't merge
>   it: no workflow merges, and the repo has auto-merge off.
> - **`ci` passed on the push, and `stable` moved to `df122e1` at 17:08** (run
>   `36032190936`). Nothing went wrong with the tag this time.
> - **One `reconcile` rebuilt every site.** Run `36032210513`, `reconcile: stable,
>   every book` (17:08–17:10), built and deployed all four (`social-research-methods`
>   and `platform-test-book`, `main` and `drafts`), then fired the portal's deploy
>   hook. All four now serve builder `df122e1`.
> - **#6 was closed by hand at 17:22,** as superseded by #7.
> - **What's left:** a bot pull request with no approval step. `quartz-book` #8 opens
>   bot pull requests as the GitHub App `quartz-book-bot` (INFRASTRUCTURE §7), whose
>   `pull_request` runs aren't held. Its proof is the first bot pull request after #8
>   merges.

**12. "See the drafts" in the console.**
- **Repo:** `authoring-assistant`.
- **Does:** the link to the drafts preview, and the stale-preview notice from §0a, both
  from the public marker. The preview's address is
  `drafts.<site.host.project>.pages.dev`, read from the registry, which names book one's
  project while it is still on Publish (step 7, amended 24 Sep). "Going live" keeps its
  Publish wording while the host kind is `obsidian-publish`.
- **Proves it:** after a "Send to drafts" to book one, the console shows "building", then the
  link once the marker reaches the commit. With `reconcile` disabled, the notice appears
  after 10 minutes.
- **Must not break:** "Going live".

> **Built, 24 Sep 2026 (`authoring-assistant` PR #8). Live proof passed.** Where the
> step left something open, this is how it was settled:
> - **The address uses the drafts branch's alias, not a literal `drafts.`**, named as
>   `quartz-book`'s `branchAlias` names it, on `site.host.project`. It is offered only
>   when the entry has both `builder` and `project`. That holds for book one now, and
>   for book two.
> - **"How long" comes from the drafts head's committer time**, not from when the
>   console saw the head. Nothing is stored, so restarting the app doesn't reset the
>   10 minutes. A commit made through the API, the app's or the CMS's, is timed when
>   it's made. A `git push` of an older commit can raise the notice early. A head
>   with no readable time never raises it.
> - **A marker counts only if it names this book and its drafts branch.** Otherwise
>   the preview is treated as not built.
> - **Where it shows:** a "The drafts preview" block in the console, and a line on the
>   screen after "Send to drafts". The page asks again every 20 s while the preview is
>   building, every 60 s while it is stale or unknown, and stops when the screen
>   changes. When it is stale, the link is still offered, labelled as the earlier
>   version, or not offered if nothing was ever built.
> - "Going live" is unchanged. Its wording still follows `site.host.kind`.
>
> **The live proof (reported 25 Sep 2026).** Every step of *Proves it* passed: after
> a "Send to drafts" to book one, the console showed "building", then "See the
> drafts" once the marker reached the commit. With `reconcile` disabled, the notice
> "The preview is still at your previous version" appeared after 10 minutes.
> "Going live" was not broken.
>
> - **The notice appeared only after the app was reopened.** On the first try the
>   app stopped during the ten-minute wait, while its tab was in the background.
>   The page checked in every 5 s, and the app gave up after 60 s without a
>   check-in. A browser runs a hidden tab's timers late (Chrome: about once a
>   minute after five minutes hidden), so the check-ins arrived right at the limit.
>   The app's log didn't say why it stopped, so this cause is inferred, not
>   observed. Nothing about the notice itself was wrong: after the reopen it showed
>   at once, because the 10 minutes are counted from the drafts head's commit time.
> - **Fixed in `authoring-assistant` PR #8 (`3ad51aa`).** Each check-in says whether
>   the tab is hidden. A hidden tab is waited for 15 minutes, not 60 s. A check-in
>   that fails while the tab is showing brings up "The tool has stopped" with the
>   reason. The log now records when and why the app stopped. **Not yet proved
>   live:** rerunning the ten-minute wait with the tab in the background.

**13. Parity learns host kinds.**
- **Repo:** `textbook-registry`.
- **Does:** the four `reading-site.*` checks read the registry and the
  builder's config instead of `publish.js`. The two `publish.*` checks run only for
  `obsidian-publish` (`parity/checks.mjs:207-246`). New checks: the builder's and the edition
  template's graph blocks match (D11), and book one's hand-kept `admin/config.yml` agrees
  with the registry (D7).
- **Proves it:** parity is green on `main` today, and on a branch where book one's host is
  already `static`.
- **Must not break:** the daily parity run. **This must merge before step 17**, or parity goes
  red every day.

> **Built, 25 Sep 2026 (textbook-registry, `parity/host-kinds-step-13`).** Where the
> step left something open, this is how it was settled:
> - **The builder is a parity source,** `quartz-book` at the `stable` tag (the commit
>   `reconcile` builds every book with), named in `parity/sources.json`.
> - **The builder holds no copy of the values,** so `reading-site.*` read
>   `builder/lib.mjs`: `renderConfig` must pass the plugin option on from `opts`, and
>   the `bookOptions` line that reads it from the registry is evaluated for book one.
>   A hardcoded value, a read of the wrong field or an expression parity doesn't know
>   fails. `reading-site.live-branch` reads the branch `reconcileTargets` deploys to
>   production. The suggest-edit endpoint is expected only when `suggest_edit.enabled`.
>   They apply to any book with `builder: "quartz-book"`, so book one is checked on
>   both host kinds.
> - **Checks now carry `when`.** One that doesn't apply to the host is printed `n/a`
>   with the reason, never as a pass. The old `reading-site.*` checks on `publish.js`
>   are kept, renamed `publish.js.*`, and like `publish.site-id` and `publish.host`
>   apply only while the host is `obsidian-publish`: until step 16, Publish is what
>   readers get.
> - **D11:** `graph.edition-template-matches-builder` compares the graph's plugin entry
>   in the two `quartz.config.yaml` files line for line, ignoring comments and blank
>   lines. It is **known drift** until step 22: the template still ships upstream's
>   graph, switched off. Step 22 removes the drift entry.
> - **D7:** `cms.config.repo`, `cms.config.drafts-branch` and `cms.config.auth-relay`
>   read the `admin/config.yml` the CMS host serves (today `configure.mjs`'s output).
>   Only when `cms.enabled`.
> - **Proved locally, 25 Sep:** against GitHub, `main`'s registry gives 33 ok, 1 known
>   drift, 25 retired, 0 n/a, 0 failed. The same registry with book one's host as
>   step 17 writes it gives 27 ok, 1 drift, 25 retired, 6 n/a, 0 failed. `--local ..`
>   agrees. `npm test` covers the evaluator, a hardcoded builder value, the graph
>   block and which checks apply to which host.
> - **Left for step 18:** it deletes `templates/` and trims `textbook.config.json`, so
>   in that PR the step-4 retirements of `cms.repo`, `cms.drafts-branch` and
>   `cms.auth-relay` (which require the token lines in `templates/admin/config.yml`),
>   `landing.summary` (`templates/index.md`) and `config.title`, `config.maintainer`,
>   `config.site-url` and `config.licence` must be retired or re-pointed, or parity
>   goes red. The `cms.config.*` checks above then carry D7 alone.

**14. Book automation as thin callers.**
- **Repos:** `quartz-book` (the reusable workflows), then `textbook` (the callers).
- **Does:** D6. The backup, contributors, dashboard, derivatives, weekly snapshot, lint and
  link-check workflows become reusable workflows, with `scripts/`, `.lycheeignore` and
  `.markdownlint-cli2.yaml` moved alongside. The backup's per-URI fallback switches to
  Quartz slugs (§3c). `gen-contributors.mjs` writes full-path wikilinks (§2 #5). Book one's
  workflows become callers of about 10 lines, and `stats.yml` goes.
- **Proves it:** each caller, run by hand on the same commit as the old workflow, produces the
  same pull request, tag or file (the annotation backup's JSON diffs empty).
- **Must not break:** Sunday's snapshot and backup. This step is off the critical path. If it
  lands after step 16, D10's "full cycle of weekly jobs" counts from when it lands.

> **Built, 25 Sep 2026 (quartz-book `automation/step-14`, textbook-registry
> `parity/automation-step-14`, textbook `ci/thin-callers`).** Where the step left
> something open, this is how it was settled:
> - **Five reusable workflows**, `quartz-book/.github/workflows/book-*.yml`: backup,
>   weekly snapshot, lint, link check, and one community-page workflow with
>   `page: contributors | dashboard | derivatives`. The scripts and both config files
>   are in `automation/`. Book one's callers keep their file names and schedules, so
>   the console's weekly-jobs strip still finds them. `stats.yml` is gone.
> - **Callers name `@stable`,** the same commit `reconcile` builds with. Each
>   workflow fetches `automation/` at its `platform_ref` input (`stable` by default).
>   The weekly jobs work on `branch` (`main`), whichever ref started them.
> - **The secret is passed by name,** not with `secrets: inherit`, which stops at
>   the organisation boundary, and books live in their maintainers' accounts.
> - **Generalised, not copied:** `gen-derivatives` takes the edition template and
>   the owners to skip from the registry (a book with `editions: null` gets no page).
>   `gen-contributors` takes the bot logins, title, maintainer and licence from the
>   registry. `.lycheeignore` holds `__SITE_DOMAIN__`, filled from the registry, so
>   `templates/.lycheeignore` goes. That retires five more parity checks.
> - **§2 #5:** `gen-contributors` writes `[[chapters/chapter-03\|Chapter 3]]`. The
>   two dead wikilinks noted under step 8 (`for-trusted-contributors`,
>   `for-course-coordinators`) are now GitHub links: the book's own
>   `docs/for-trusted-contributors.md`, and the edition template's
>   `docs/department-edition-setup.md`. The same applies in `gen-derivatives`.
>   `index.md`'s own links are still step 18's.
> - **§3c:** the backup's per-URI fallback asks for each page at its Quartz URL
>   and, where different, its Publish URL. Annotations made on Publish stay on
>   Publish-style paths on the same domain. `test/automation.test.mjs` holds the
>   slug copy to Quartz's `slugifyFilePath`.
> - **Parity** reads the moved scripts in the builder at `stable`. A retirement's
>   registry read may now be in another source (`consumes.source`), so
>   `config.plausible-public-url` stays on the book and finds its read in the builder.
>   Proved locally against `stable` = `a57c2e0`: 28 ok, 1 drift, 30 retired, 0 failed,
>   with book one's scripts present or deleted. With the host as step 17 writes it:
>   22 ok, 6 n/a, 0 failed.
> - **Proved locally on `textbook@1fa00d0`:** old against new, `contributors` differs
>   only in the full-path links and the two guide links, and `derivatives` only in
>   the walkthrough link. The lint rules are byte-identical (0 errors). lychee gives
>   46 OK and 0 errors with both ignore lists. The snapshot script is the old one
>   with `main` taken from an input. The backup and the dashboard need
>   `HYPOTHESIS_API_TOKEN`; they are proved by hand after the merge.
> - **Merge order:** quartz-book, then (after `stable` moves) textbook-registry,
>   then textbook. Parity reads `automation/` at `stable`, and the callers call
>   `@stable`.
> - **Still open:** `textbook-template` gets the same callers (step 23's note).

**15. The proof run.**
- **Repo:** `textbook-registry` (this document gains a *Proof run* section recording results).
  No code.
- **Does:** everything that must be seen or recorded before anything live moves, on the
  builds `reconcile` made by itself from the registry (no run by hand, no extra input).
  In a browser on `pages.dev`: every §1a row, print, mobile, the Hypothes.is sidebar and badge,
  the tag helper, and Plausible recording nothing. Every redirect in both spellings: if
  Pages doesn't match `+` and `%20` literally, add a zone Redirect Rule here instead. A
  link check of the built output. **Rehearse the custom-domain binding** on
  `quartz-trial.confused4now.org`: time the activation and note what Pages does to the DNS
  record, then remove it. Annotate a test page on Publish, for the re-anchoring check after
  step 16. Count annotations on `…/chapters/Definitions/*` (a non-zero count is a decision
  point). **Record Publish's Site options** (D18).
- **Proves it:** the section exists, and every row says pass or names its fix.
- **Must not break:** the live site. Everything here is read-only against it.

> **Run, 25 Sep 2026.** The results are in *Proof run* below. The automated rows pass,
> apart from two dead links: F1 is in the book, and F2 is a page step 22 adds. Both are
> fixed before step 16. There are no annotations on the Definitions pages, and Pages
> matches `+` and `%20` literally, so no zone Redirect Rule is needed. The rows marked
> **by hand** are still open: the browser checks, the domain rehearsal, the test
> annotation and D18.

### Phase 2: the live address

**16. Cutover.** Not a PR: one DNS edit, plus the Pages custom domain.
- **Gate:** steps 1-15 done. The author's Mac runs the app build from step 12. **D16 is
  settled** (25 Sep, for phase 1): the platform owner is the sole administrator on
  `brandonproject2026` and pays for everything, so no second administrator is needed first.
- **Does:** in Pages, add `social-research-methods.confused4now.org` to the project, and
  change the CNAME from `publish-main.obsidian.md` to `social-research-methods.pages.dev`.
  **Don't touch Publish's custom-domain setting.**
- **Proves it:** the live hostname serves the marker for `main`'s head, built by
  `reconcile` on its own, since book one has been on the builder in the registry since
  step 7's amendment. A Plausible pageview
  arrives from the live domain. A honeypot POST from the live origin gets the honeypot
  answer. Every redirect answers 301. The step 15 test annotation re-anchors. The CMS, the
  console and the portal work as before.
- **Must not break:** annotations on unchanged URLs, which keep their URI. The outage is the
  activation time measured in step 15.
- **Rollback:** see below.

> **Added 25 Sep 2026, from the in-site editor workstream (24 Sep).** The editor ("Edit
> this page") already works on book one's Quartz build at
> `social-research-methods.pages.dev`. The live address gets it at this step, and the
> suggest-edit function needs no change for it: it already accepts
> `https://social-research-methods.confused4now.org`. Add to **Proves it:** once the
> domain points at the Pages project,
>
> ```sh
> curl -s -H "Origin: https://social-research-methods.confused4now.org" \
>   "https://suggest-edit-function.vercel.app/api/propose-edit?path=index.md"
> ```
>
> returns JSON with `"branch":"drafts"`. Run it again after step 17 merges. **Watch:**
> Hypothes.is annotations keyed to Publish-style URLs. The builder already emits 301s
> from them (D14), and the step 15 test annotation is the check that they re-anchor.

**17. Record the host.**
- **Repo:** `textbook-registry`.
- **Does:** switches book one's host kind. `builder` and `project` are already there
  (step 7, amended 24 Sep), so the change is `kind` to `static`, `provider:
  "cloudflare-pages"` and `paid_by: "platform"` in, and `site_id` and `publish_host`
  out: `{"kind":"static","provider":"cloudflare-pages","project":"social-research-methods",
  "paid_by":"platform","builder":"quartz-book"}`. There is no builder input left to
  delete; `unrecorded_book` went on 24 Sep.
- **Proves it:** validation and parity are green, and the function serves the merge commit.
  Book one's `registry_digest` changes, so `reconcile` rebuilds both branches once, and
  the live marker then names the new digest.
- **Must not break:** the builder, which reads only `builder` and `project`. The console,
  which reads `site.host.kind`: from here it stops treating book one as published from
  the folder, which is what step 2 kept the old wording behind the kind for. No other
  consumer reads `site.host` beyond validation and parity.

> **Confirmed 25 Sep 2026, from the in-site editor workstream (24 Sep).** The editor's
> handover gives the same `site.host` as **Does:** above, to be set only after the domain
> points at the `social-research-methods` Pages project (step 16). The function accepts
> a builder book from `https://<site.domain>` and from its own Pages deployments
> (`<project>.pages.dev`, `<label>.<project>.pages.dev`), so this change doesn't alter
> which origins it accepts. After the merge, repeat step 16's `propose-edit` check: it
> must still return `"branch":"drafts"`.

**17a. One Plausible site for the platform (D19).** Added 25 Sep 2026, numbered 17a so that
the later steps keep their numbers.
- **Repos:** `textbook-registry`, `quartz-edition-extras` (`edition-integrations`),
  `quartz-book`, `textbook-portal`.
- **Does:** one Plausible site that covers the portal and every book's address. The
  registry names it once for the platform, not per book (`analytics.plausible` today). The
  builder passes it to every book, and the portal uses the same site. The hostname guard
  counts on the portal's domain and on every registered `site.domain`, and never on a
  preview (`*.pages.dev`, drafts, design previews). **Settled in this step:** whether the
  site is a new one or an existing one renamed, and what happens to each book's Plausible
  history. §1a kept the six event names so that history would continue.
- **Proves it:** a pageview from book one's live address and one from the portal both
  arrive in the one site, and each is recorded under its own address. Nothing arrives from
  `social-research-methods.pages.dev`, its drafts or a design preview.
- **Must not break:** the six event names from §1a, and the editor's three events.
  Parity's Plausible checks change in the same PR as the registry field.

**18. Clean up book one, apart from the Publish files.**
- **Repo:** `textbook`.
- **Does:** the rest of §5: `templates/`, `configure.mjs`, `apply-config.yml`, the maintainer
  docs, `Frankenstein/`, `path-test/`, `create-path-test-pages.sh`, `images/`, `QA.md`,
  `docs/Chapter_03.docx`. `textbook.config.json` trimmed to `slug`. `index.md`'s links point
  at `/how-to-comment` and at the edition template's coordinators' page. README gains "This
  book". Early in probation, so that probation tests the repo as it will stay.
- **Proves it:** the builder's output for the new commit is unchanged apart from those links
  (diff the two builds). Link check clean.
- **Must not break:** the CMS (`admin/` stays, D7). The app finding the book by `chapters/`,
  `assets/` and `glossary.md`. `publish.js`, `publish.css` and `.obsidian/`, which rollback
  still needs.

**19. End of probation.**
- **Repo:** `textbook-registry` (this document records the evidence).
- **Does:** after **at least four weeks** (D10), record that each condition for "proven" holds:
  a full cycle of the weekly jobs green; **one real chapter from Word to readers** through
  "Send to drafts" and "Going live"; link check clean on the live site; every redirect
  tested on the live hostname. Until then, don't upload to Publish.
- **Proves it:** each condition cites a run, a commit or a URL.
- **Must not break:** rollback stays available throughout.

**20. Cancel Publish.**
- **Repos:** Obsidian account (by hand), then `textbook`, then `textbook-registry`.
- **Does:** cancel the subscription and clear Publish's custom domain. Delete `publish.js`,
  `publish.css`, `.obsidian/` and `tests/test-path-mapping.js`. INFRASTRUCTURE drops Publish,
  and MULTI-BOOK-HOSTING open question 7 closes.
- **Proves it:** the live marker is unchanged, and parity is green without the `publish.*`
  checks.
- **Must not break:** anything live. From here, rollback means Pages' "roll back to this
  deployment" for a bad build, and "resubscribe and republish" for the platform.

### Phase 3: everything else built the same way

**21. Book two onto the builder (D17).**
- **Repos:** `platform-test-book`, `textbook-registry`, plus Cloudflare by hand.
- **Does:** a new Direct Upload project in `brandonproject2026` under a new name (§0). Book
  two drops its vendored Quartz and `scripts/add-suggest-edit.mjs`, and gains `nudge.yml`. A
  registry PR moves its `site.domain` to the new `pages.dev` name and adds `builder`. The
  old project is deleted only after nothing points at it (MULTI-BOOK-HOSTING §2e).
- **Proves it:** the new host serves the marker. A honeypot POST from the new origin gets the
  honeypot answer after the function redeploys. INTERIM-BOOK's T1 and T2 pass again.
- **Must not break:** book one. Each book's `reconcile` is independent.

> **Done, 24 Sep 2026 (`platform-test-book`, textbook-registry #25).** Book two now has
> the builder layout (`index.md`, `chapters/`). Its vendored Quartz and suggest-edit form
> are gone, and it has `nudge.yml` and a CC-BY-SA `LICENSE`. It is served from the new
> Direct Upload project `platform-test-book-2` in `brandonproject2026`, at
> `platform-test-book-2.pages.dev`. The registry entry names `builder: quartz-book`, and
> the old origin is in `legacy_origins`. The old Git-integrated `platform-test-book`
> project, in the second Cloudflare account, is retired but **not yet deleted**: delete
> it once nothing points at it (INFRASTRUCTURE §8). The in-site editor was proved on
> this origin on 24 Sep. **Gotcha:** the registry commit first landed on a local feature
> branch, not `main`, so `reconcile` didn't know the book. Check which branch is checked
> out before committing to the registry.

**22. The edition template.**
- **Repo:** `textbook-edition-template`.
- **Does:** bump the extras pin to steps 3-6 (this also fixes the editions' dead citations),
  turn the graph on (D11) with the same block as the builder, and add
  `for-course-coordinators.md` beside `department-edition-setup.md` (D5). Correct the extras
  README's stale pin note.
- **Proves it:** the template's preview has working Chapter 3 citations. Parity's graph check
  is green.
- **Must not break:** the test edition's `sync-upstream.sh`. This step can happen at any
  time after step 6, and doing it early fixes the editions sooner.

**23. The new-book template.**
- **Repo:** `textbook-template`.
- **Does:** drop Path A (Publish). Path B is the builder: a new book is a registry entry, a
  Pages project, `nudge.yml` and the thin callers. Correct SETUP.md B6.2 (`-d chapters`),
  rewrite the maintainer docs for Quartz, and delete `templates/suggest-edit/` and
  `suggest-edit/`.
- **Proves it:** link check green. A dry-run book from the template builds through the builder
  on a spare Pages project.
- **Must not break:** the template's own weekly jobs, which skip in the template repo.

> **Delivered as a patch, then merged, 24 Sep 2026 (textbook-template #6, `605cdec`). Not
> yet proved.** The workstream record calls it a delivered patch,
> `textbook-template-step-23.patch` (in `textbook_project/`), against `e5ab0b3`. On 25 Sep
> that patch, applied to `e5ab0b3`, gave exactly the tree of `605cdec`, which #6 merged at
> 14:46 UTC. **Proves it** hasn't been run: no link check and no dry-run book are
> recorded. The change drops Path A (Publish) and the vendored-Quartz Path B. SETUP.md
> step 6 becomes the builder path: a Direct Upload Pages project that the platform owner
> creates before the merge, the builder layout, the first `reconcile`, the custom domain
> and the drafts preview. `new-book.mjs` stops asking for a host kind. Every entry is
> `static` / `cloudflare-pages` / `paid_by: platform` / `builder: quartz-book`, with the
> Pages project name asked for. It writes `index.md` once from `scripts/seed-index.md`,
> and `index.md` is no longer a configure.mjs-managed file. It deletes `suggest-edit/`,
> `templates/suggest-edit/`, `scripts/add-suggest-edit.mjs` and
> `docs/how-to-comment.md`, adds `nudge.yml` (skipped in the template repo), and
> rewrites `docs/` for the builder. The editor's per-book requirements went in on top
> (`a475a21`). **Still open:** the thin-caller weekly workflows. Step 14 built them
> (quartz-book `book-*.yml`), but the template doesn't call them yet, so a new book
> gets no contributors/dashboard/derivatives/backup. There's also one note in
> `word-to-markdown.md` about whether the app commits a converted chapter to `drafts`
> itself.
>
> **Added 25 Sep 2026, from the in-site editor workstream (24 Sep).** These are two
> per-book setup items for SETUP.md's go-live step. Neither is in SETUP.md yet. Book one
> and book two need them done by hand:
>
> - **Plausible goals** for the editor's three custom events, `page_editor_opened`,
>   `page_edit_submitted` and `github_signin`, with the custom properties `mode` and
>   `outcome`, on each book's Plausible site.
> - **Optional: a `main` ruleset on each book repo** that stops the suggest-edit App
>   updating `main` (bypass: maintainers and GitHub Actions). Since 24 Sep the App has
>   *Contents* and *Pull requests* write on every book repo, not just *Issues*
>   (INFRASTRUCTURE §2c). Its proposals go to `drafts`, and a ruleset makes sure nothing
>   else can.

**24. The platform's records.**
- **Repo:** `textbook-registry`.
- **Does:** the §7 amendments to `MULTI-BOOK-HOSTING.md` that don't depend on D15. The policy
  text, the exit commitment and the removal reviewers wait for the client, and the sections
  say so. `SCHEDULED-JOBS.md` gains rows for the Worker's Cron Trigger, `reconcile`
  (including how to run it by hand when the Worker is down), `builder-alive` and the
  Worker token's renewal. `BOOK-LIFECYCLE.md` the new
  onboarding, and whatever INFRASTRUCTURE still lacks.
- **Proves it:** `npm test` and the parity doc checks are green.
- **Must not break:** the design history: dated notes, not rewrites. The removal automation in
  §7g (i) is built once D15 is settled, and **before** a second maintainer-owned book joins.

### Rollback from step 16 until step 20

**The one setting:** point the CNAME back at `publish-main.obsidian.md`, proxied. It takes
effect in seconds at Cloudflare's edge, because Publish's custom domain never changed. Then
revert step 17 for the record. The reverted host is a Publish host that still names the
builder and its project, so the builder carries on deploying previews to `pages.dev`. **Content drift:** Publish serves what was last uploaded, so
anything merged to `main` since the cutover is missing until the technical contact
republishes from an up-to-date vault. That is why the Publish files stay until step 20.

---

## Proof run (§8 step 15)

Run on 25 Sep 2026, read-only against both sites. **Publish** is the live address,
`social-research-methods.confused4now.org`. **Quartz** is `social-research-methods.pages.dev`,
which is the `main` build, and `drafts.social-research-methods.pages.dev`. Expected values
were written from this document, not from the builder's code, so a builder bug isn't copied
into the check. A row either passes, names its fix, or waits on a check by hand (**by hand**).

### The builds under test

| Row | Result |
|---|---|
| `main` marker | `book_commit` `71ee756` = `main`'s head. `builder_commit` `74e86d6` = `stable` |
| `drafts` marker | `6c3fc88` = `drafts`' head, the same builder. `X-Robots-Tag: noindex` on drafts, none on `main` |
| Who built them | `reconcile` by itself: run 36135257204 (`stable, every book`, started by `github-actions[bot]` when `stable` moved), then run 36136281615 (`nudge`) for `main`. No run by hand, no extra input. **Pass** |

### Pages and content

| Row | Result |
|---|---|
| Inventory | Publish serves 59 files. 13 are book pages under the allowlist, and they are exactly `main`'s 13. Each is in Quartz's sitemap at its §3b URL. Quartz adds `/how-to-comment`, `/chapters/`, `/chapters/definitions/`, `/community/`, `/tags/`. The other 46 leave (§5). **Pass** |
| Publish's upload against `main` | 10 of 13 are byte-identical. The 3 `community/` pages differ only because Publish has an older upload of the weekly pages: contributors 88 against 95 commits, dashboard 1 against 3 open pull requests, and step 14's derivatives link. Quartz has the newer ones. **Pass** |
| `publish.js`, `publish.css` | Publish serves `main`'s copies, so §1a's line references describe what readers get today. **Pass** |
| Each Quartz page against its source (13) | `<title>` is the first H1 and there is one H1 (D4). Every H2 to H6. Every prose paragraph. No `#%5E` href, and every same-page link has its target id (the 32 citations in Chapter 3). Callouts count. Paragraph numbers except on `/`. Edit and History name `main/<path>`, encoded per segment. Suggest button. Canonical names the live URL. Hypothes.is `openSidebar: false`, `showHighlights: 'always'`. Plausible guarded to `hostname === "social-research-methods.confused4now.org"`. **Pass** on 12. `/` fails: see F1 |
| Shipped features | Graph, popovers, search (18 index entries, every book page), print CSS, tag helper, badge, and all six event names from §1a. `propose-edit` answers the `pages.dev` origin with `"branch":"drafts"`. **Pass** |

### Redirects on `pages.dev`

Every Publish URL, in both spellings where they differ (58 requests, no redirects followed):

| Row | Result |
|---|---|
| Definitions pages | All six answer 301 to the Quartz URL, then 200, in the `+` and `%20` spellings. Pages matches `+` and `%20` literally and case-sensitively: the lowercase targets answer 200 and don't loop. **No zone Redirect Rule needed. Pass** |
| `/index` | 301 to `/`. **Pass** |
| Unchanged URLs | Chapters 1 and 3, `/glossary`, the three `community/` pages: 200. **Pass** |
| `/docs/how-to-comment` | 301 to `/how-to-comment`, then 200. **Pass** |
| `/docs/for-course-coordinators` | 301 to the edition template's `docs/for-course-coordinators.md`, which **404s**. See F2 |
| Pages that leave | 404, including the stray `/2` (F3). `/templates/index` answers Pages' own 308 to `/templates/`, then 404. **Pass** |

### Link check of the built output

lychee 0.24.2 over the 18 sitemap pages on `pages.dev`, fragments included: 907 links, 171
unique, 905 OK, **2 errors**, and both are F1 and F2 again.

### Annotations (§3d)

| `wildcard_uri` | Public annotations |
|---|---|
| `https://social-research-methods.confused4now.org/chapters/Definitions/*` | **0**. No decision needed |
| `http://…/chapters/Definitions/*` | 0 |
| `https://social-research-methods.confused4now.org/*` | 0 |
| `https://bptext2026.xyz/*` | 8, unchanged since 22 Sep |

### By hand

| Row | Result |
|---|---|
| §1a rows, side by side in a browser | **by hand** |
| Print | **by hand** |
| Mobile | **by hand** |
| Hypothes.is sidebar and badge, tag helper | **by hand** |
| Plausible records nothing from `pages.dev` | **by hand**. The guard is in every page (above) |
| Custom-domain rehearsal on `quartz-trial.confused4now.org`: activation time, what Pages does to the DNS record, removed afterwards | **by hand** |
| Test annotation on Publish, for step 16's re-anchoring check | **by hand** |
| Publish's Site options (D18) | **by hand** |

### Fixes

- **F1. The front page links a page Quartz doesn't have.** `index.md:47`'s
  `[[for-course-coordinators|Setting up a department edition]]` resolves on Publish to
  `docs/for-course-coordinators`, and on Quartz to a dead `/for-course-coordinators`. Fix:
  bring step 18's `index.md` link forward, **before step 16**. Point it at the edition
  template's `docs/department-edition-setup.md`, as step 14 did for `derivatives.md`. The
  link text already names that page.
- **F2. The coordinators' page doesn't exist yet.** The `/docs/for-course-coordinators`
  redirect and `/how-to-comment`'s closing line both point at
  `textbook-edition-template/docs/for-course-coordinators.md`, which step 22 adds. Fix: do
  that part of step 22 **before step 16**. Step 22 may run any time after step 6. No
  builder change is needed.
- **F3. A stray page on Publish.** `2.md`, a pasted terminal transcript, is published at
  `/2`. It holds no tokens, and it isn't in the repo, so it leaves at the cutover. Fix:
  unpublish it from Publish now.

---

## Decisions

Recorded on 22 Sep 2026. **D12, D15 and D16 were settled on 25 Sep 2026 for phase 1, and are
to be reviewed when phase 1 finishes.** D19 was added the same day. Nothing now blocks the
cutover (§8 step 16).

| # | Topic | Status | Decision |
|---|---|---|---|
| D1 | Builder | **decided** | A new `quartz-book` repo (§0) |
| D2 | Pages builds | **decided** | Direct Upload from the builder. No Cloudflare App on maintainers' repos. The trigger is §0a: a level-triggered `reconcile`, woken by an OIDC-signed nudge from each book and by a 15-minute Cron Trigger on the same Worker (not a GitHub schedule, which switches itself off after 60 quiet days). The same trigger builds the drafts previews |
| D3 | What is published | **decided** | `community/` is published. The allowlist is `index.md`, `chapters/`, `assets/`, `glossary.md`, `community/` |
| D4 | Page titles | **decided** | From the first heading, by a platform transform (§2 #2) |
| D5 | Reader help | **decided** | The builder adds "how to comment" to every book, at `/how-to-comment`. `for-course-coordinators.md` moves to the edition template |
| D6 | Book automation | **decided** | Thin callers of platform reusable workflows, which live in `quartz-book` (§8 step 14) |
| D7 | `admin/` | **decided** | Stays until a shared CMS host exists, with `config.yml` hand-kept and parity-checked until then. Then it is rendered from the registry |
| D8 | Timing | **decided** | "Send to drafts" ships before the cutover (§8 steps 1-2) |
| D9 | Local folder | **decided** | Keep "Download a copy" |
| D10 | Probation | **decided** | Four weeks. "Proven" means: a full cycle of the weekly jobs green; one real chapter from Word to readers via "Send to drafts" and "Going live"; link check clean; every redirect tested (§8 step 19) |
| D11 | Editions and the graph | **decided** | The graph is on in the edition template too, with the same block as the builder (§8 step 22) |
| D12 | Design | **decided for phase 1** (25 Sep; review when phase 1 finishes) | The link colour stays as it is (`#7C6CF0`). The AA-strict accent (`#6A57E0`) is not adopted. Dark mode wasn't part of this decision and stays as today, off |
| D13 | Drafts previews | **decided** | Public but `noindex` (§0) |
| D14 | Redirects | **decided** | Generated by the builder for every book (§3c) |
| D15 | Hosting policy | **decided for phase 1** (25 Sep; review when phase 1 finishes) | The policy will be written later: its text, the exit commitment (a 12-month 301?), and who other than the platform owner reviews a removal. It is still needed before a second maintainer-owned book joins, as are the removal automation in §7g (i) and the sections step 24 leaves waiting |
| D16 | Cloudflare | **decided for phase 1** (25 Sep; review when phase 1 finishes) | The platform owner is the sole administrator on `brandonproject2026` and pays for everything. No second administrator. Step 16 is no longer blocked |
| D17 | Book two | **decided** | Moves onto the builder, and is kept for demonstration (§8 step 21) |
| D18 | Publish site options | **decided** | Record them before cancelling (§8 step 15) |
| D19 | Analytics and annotations | **decided for phase 1** (25 Sep; review when phase 1 finishes) | Global across the platform. Plausible moves to one site covering the portal and every book's address, excluding previews, as its own step after step 17 (§8 step 17a). Annotations are the one public Hypothes.is layer for every book |

---

## Facts found while reading that differ from earlier records

- **Publish and the repository have drifted.** Publish serves `docs/INFRASTRUCTURE.md`,
  `docs/scheduled-actions-health-check.md`, `docs/the-authoring-app-operations.md` and
  `OAUTH-SETUP.md`, all of which have since been deleted from the repo. `OAUTH-SETUP.md` is
  served even though `.obsidian/publish.json` excludes it. Publish lacks
  `the-browser-editor.md`, `weekly-snapshots.md` and `what-this-book-runs-on.md`. It also
  publishes `path-test/`, `Frankenstein/`, `templates/` and `QA.md` to readers.
- **Department editions have dead citations today** (§2 #1c).
- **`textbook-template/SETUP.md` B6.2** (`-d chapters`) moves chapter URLs and leaves out
  `index.md` and `glossary.md` for a book laid out like book one.
- **`edit-on-github` uses `filePath`**, which is correct only when Quartz runs from the repo
  root.
- **The extras README's "Known discrepancy"** names pin `eece8e6`. The template now pins
  `edition-integrations` at `8f4e323`, which is one commit behind `main` (`36297df`). The
  note is stale.
- **Book two has no Hypothes.is and no Plausible.** It removed `edition-integrations`. It
  proves routing, not reader parity.
