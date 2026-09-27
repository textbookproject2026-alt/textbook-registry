# Documentation remediation worklist

> **Moved 27 Sep 2026** from `textbook/docs/DOCS-REMEDIATION.md`, at BOOK-ONE-TO-QUARTZ
> §8 step 18, which deleted book one's `docs/`. Kept as a record, unedited below this
> note. Links to sibling files point at guides that are now in
> `textbook-template/docs/`, or gone. Item 3.2 (how the author's vault reaches GitHub)
> is still open: DOCS-AUDIT item 12.

The tracked output of the September 2026 documentation audit. Every gap the audit
found is recorded here with an ID, a category, the files it touches, and a status.
Fix sessions work from this file and tick items off; **this file is the source of
truth for what is left**, not the audit transcript.

The IDs are the audit's own (`3.1`, `2.4`, …) and never get renumbered. Category
numbering reflects the audit's three groups — 3 = maintainer-blocking, 1 =
undocumented features, 2 = stale references — and the list below is ordered by
severity, not by ID.

> **22 September 2026 — the platform split.** This worklist was written when the
> docs described one textbook. Since then the platform's own documentation has
> moved to `textbook-registry/docs/`: `docs/INFRASTRUCTURE.md` (3.1),
> `docs/scheduled-actions-health-check.md` (1.7, 2.4),
> `docs/the-authoring-app-operations.md` (1.1, 1.3, 1.4, 1.6) and the relay half of
> `OAUTH-SETUP.md`. Entries below that name those files are the record of work done
> on them here; the files themselves now live, rewritten, in the registry repo
> (see `textbook-registry/docs/DOCS-AUDIT.md`, which also lists what this audit
> found that documentation cannot fix). The open items that are this book's —
> 3.2, 3.3, 1.5, 2.6 — are unchanged.

## How to use this file

1. Read the **Decisions required** section first. One item (3.3) is still blocked on
   a human decision and everything downstream of it is unsafe to write until it is
   settled. 3.4 was decided on 4 Sep 2026 and its decision box is kept there as the
   record of what was chosen.
2. Pick the highest-severity item whose status is `TODO` and whose category is
   `FIX-DOC`.
3. Do one gap per commit, with the gap ID in the commit message
   (`docs(3.1): add the infrastructure inventory`).
4. Update this file in the same commit: flip the status, add the date, and name
   the file you created or changed.

## Category tags

| Tag | Meaning |
|---|---|
| **FIX-DOC** | Pure documentation. No decision needed, no code or config change. Safe for any fix session. |
| **FIX-CODE** | Requires a code or config change. **Riskier** — it can change running behaviour, and in one case it breaks a passing test suite. Do not action these from a documentation session. |
| **DECIDE** | Blocked on a human decision. The decision is stated in full under *Decisions required*. |
| **PARKED** | Belongs to deferred platform work, or is waiting on information nobody in a fix session has. Recorded so it is not rediscovered; left alone. |

## Status values

`TODO` · `DONE (date — file)` · `HELD` (explicitly withheld from the current
session, with the reason) · `BLOCKED` (waiting on a DECIDE item or on information)

---

## Decisions required

Nothing downstream of an *open* item here should be written until it is answered:
these affect what the correct documentation actually *says*, so writing the doc
first would mean writing it twice. **3.3 is open. 3.4 was decided on 4 Sep 2026**
and is kept below, decision first, question second, as the record.

### 3.3 — DECIDE — Who moves accepted contributor work from `drafts` to `main`, and when?

**The question.** Three sources describe the same handoff and none of them agree,
and the code has since diverged from all three:

- `docs/moderating-comments.md` ("Reviewing draft edits") says the moderator moves
  the entry to **Ready** in the CMS, and "the maintainer takes the approved entries
  out of the holding area… in batches."
- `OAUTH-SETUP.md` says "`main` is updated by exactly one route: a human opening a
  `drafts` → `main` pull request."
- `authoring-assistant/app/github.py:316` (`accept_change`) squash-merges the
  contributor's entry pull request **into `drafts`** the moment the author presses
  Accept in the console. It never touches the CMS "Ready" column.
  `authoring-assistant/app/server.py:765` then tells the author *"It reaches
  readers when you next publish."*

That last sentence is wrong as written: the accepted text is on `drafts`, and the
author's Obsidian vault tracks `main`. Nothing automates `drafts` → `main`, and no
document says who opens that pull request, on what cadence, or how `drafts` is
reset afterwards.

**What has to be decided.** Which of these is the real workflow:

- **(a)** The CMS "Ready" column is the approval gate and the console's Accept
  button should not exist, or should set Ready rather than merge; or
- **(b)** The console's Accept button is the approval gate, the "Ready" column is
  vestigial, and `docs/moderating-comments.md` and
  `docs/for-trusted-contributors.md` are wrong about the workflow; or
- **(c)** Both are legitimate entry points into `drafts`, and the missing piece is
  only the `drafts` → `main` step.

And in every case: **who opens the `drafts` → `main` pull request, how often, and
what resets `drafts` afterwards?**

**Why it can't wait.** Accepted contributor work currently lands on `drafts` and
stops there. Both the moderator and the author believe the handoff is complete.

**Blocks:** 1.4 (console guide), and corrections to `docs/moderating-comments.md`
and `docs/for-trusted-contributors.md`. Also implies a FIX-CODE change to the
console's "It reaches readers when you next publish" string whichever way it goes.

### 3.4 — DECIDED (4 Sep 2026) — fork is canonical

> **Decision, 4 September 2026.** **Forking is the canonical way to create a
> department edition**, and "Use this template" is warned against by name in both
> guides. `gen-derivatives.mjs` keeps its forks-API discovery — no FIX-CODE. The
> no-terminal promise is **scoped, not dropped**: setup and the yearly content copy
> stay terminal-free, the two machinery channels are stated as needing a terminal,
> and a coordinator may hand them to the technical contact. **Both guides survive**
> with an explicit audience split — vault = coordinator walkthrough, template repo =
> technical companion — each naming the other. Settings count is **four** in both
> (the vault guide was missing `pageTitle`); build command is
> `git fetch --unshallow || true && …` in both. Written up under 3.4 in the worklist
> below. The original question is kept here for the record.

**The question (as posed).** Two live guides gave incompatible instructions:

| | `Obsidian Vault/docs/for-course-coordinators.md` | `textbook-edition-template/docs/department-edition-setup.md` |
|---|---|---|
| How to copy the template | **Fork** | **Use this template** |
| Terminal | "You never need to type commands into a terminal. If a tutorial elsewhere tells you to, **stop and check with the maintainer first**." | Requires Node 22, `npm install`, `./sync-upstream.sh`, `npx quartz plugin update` |
| Settings to change | **three** | **four** (adds `pageTitle`) |
| Build command | `git fetch --unshallow \|\| true && …` | `git fetch --unshallow && …` |
| Config-file step markers | referred to as "Step 7" | the file's own markers read `← EDIT (guide step 3a/3b/3c/3d)` |

**Why it matters beyond tidiness.** `scripts/gen-derivatives.mjs:140` builds
`community/derivatives.md` from `GET /repos/textbookproject2026-alt/textbook-edition-template/forks`.
An edition created via **"Use this template" is not a fork** and will never appear
on the department-editions page — while
`docs/scheduled-actions-health-check.md` tells the maintainer to check that page
against the template's Forks count as ground truth, so the absence reads as a
workflow fault rather than a setup choice.

Separately, a coordinator who follows only the vault guide never sets `pageTitle`
and launches a site titled *EDITION TITLE - Department Edition*
(`textbook-edition-template/quartz.config.yaml:9`).

**What has to be decided.** Three things:

1. **Fork or template-copy?** If template-copy is kept, `gen-derivatives.mjs` needs
   a different discovery mechanism (a registry file, a topic, or a naming
   convention) — that is FIX-CODE, not a doc fix.
2. **Is the "no terminal" promise still true?** Plugin updates and
   `sync-upstream.sh` both require one. Either the promise is dropped, or those
   operations move to the maintainer.
3. **Which guide is canonical**, and does the other become a pointer to it or get
   deleted?

**Blocked (now released):** 2.6, and any correction to
`docs/for-course-coordinators.md` — both free to proceed as of the decision above.
It never blocked 3.5 — `sync-upstream.sh` works over a git remote whether the
edition is a fork or a template copy, so the update mechanics were the same either
way. What 3.4 decided is *who runs them*, not what they are.

---

## Worklist

### Maintainer-blocking

#### 3.1 — FIX-DOC — No single doc records what runs where, under which account, and who owns it

- **Status:** DONE (4 Sep 2026 — `docs/INFRASTRUCTURE.md`)
- **Repos/files:** `Obsidian Vault/` — new file `docs/INFRASTRUCTURE.md`
- **Sources to consolidate:** `admin/config.yml`, `OAUTH-SETUP.md`,
  `.obsidian/publish.json`, `publish.js`, `scripts/backup-annotations.mjs`,
  `docs/file-tree-reference.md` (then the only record of the bot account and the
  SSH push identity; deleted under 2.2 once both had landed here),
  `suggest-edit-function/README.md`,
  `authoring-assistant/BUILD.md`, `textbook-edition-template/quartz.config.yaml`
- **What a new maintainer hits:** they cannot answer "what breaks, and whose
  dashboard do I log into?" for any incident. Two docs refer to "handover" as
  though a checklist exists (`docs/moderating-comments.md`,
  `docs/for-course-coordinators.md`); none exists.
- **Constraint:** record *where* each secret lives, never a secret value.
- **Note:** account ownership for Cloudflare, Vercel and Plausible cannot be
  determined from the repositories. The doc records what is known and marks the
  rest as *confirm at handover* rather than guessing.
- **Update (20 Sep 2026):** the main Cloudflare account is confirmed on the
  platform owner's word — `brandonproject2026` holds the `sveltia-cms-auth`
  Worker, the `textbook-admin` editor host and the platform front page (the
  portal Pages project). Those two rows in `docs/INFRASTRUCTURE.md` no longer say
  *confirm at handover*. Vercel, Plausible, Obsidian Publish, Apple Developer and
  the `textbook-edition-template` project are still open.

#### 3.2 — FIX-DOC — How the author's vault reaches GitHub is undocumented

- **Status:** BLOCKED — needs the actual mechanism confirmed with the current
  maintainer before anything can be written.
- **Repos/files:** `Obsidian Vault/docs/editing-the-textbook.md`;
  new doc likely needed
- **What's wrong:** `docs/editing-the-textbook.md` promises "every version of every
  chapter is stored off your machine automatically" and that accepted contributor
  edits "show up in your Obsidian vault". No doc says how. `.obsidian/plugins/`
  does not exist (no obsidian-git); `.obsidian/core-plugins.json` has
  `"sync": true` (Obsidian Sync — a paid service mentioned nowhere). The vault is
  a local git repo with an SSH-aliased remote, so somebody pushes by hand.
- **What a new maintainer hits:** the only link between the author's Mac and the
  repository is undocumented and unowned. If Sync lapses or the manual push stops,
  the guide's promise is silently false.

#### 3.3 — DECIDE — The `drafts` → `main` handoff

See *Decisions required* above. **Status:** BLOCKED on decision.

#### 3.4 — DECIDE → FIX-DOC — Which coordinator setup path is canonical

- **Status:** DONE (4 Sep 2026 — decision taken, both guides reconciled)
- **Decision:** see the box under *Decisions required* above.
- **Repos/files changed:**
  - `textbook-edition-template/docs/department-edition-setup.md` — rewritten around
    forking; new "Who this guide is for" section; local clone + Node + `npm install`
    moved out of Step 1 into the maintenance section; build command gains `|| true`;
    `--unshallow` note explains both halves; announce-checklist and troubleshooting
    gain a department-editions-page item.
  - `Obsidian Vault/docs/for-course-coordinators.md` — terminal promise scoped;
    "Use this template" warned against in Step 1; Step 7 goes from three settings to
    **four** (adds `pageTitle`, with the placeholder's consequence spelled out); new
    "When the machinery updates (occasional)" section; new troubleshooting entry for
    a site still titled *EDITION TITLE*.
  - `Obsidian Vault/docs/updating-department-editions.md` — "Open question" section
    replaced with what the decision settled; "Who runs it" column now
    "coordinator, or you on their behalf" for the two machinery channels.

**How each of the five contradictions was resolved:**

| Contradiction | Resolution |
|---|---|
| Copy method | **Fork**, in both. Both guides warn against "Use this template" by name and say why (forks-API discovery). |
| Terminal | **Scoped.** Setup and the yearly content copy: no terminal, in both. Machinery + plugin updates: terminal, in both, and explicitly reassignable to the technical contact. |
| Settings count | **Four**, in both. The vault guide was missing `pageTitle` — the omission that ships a site titled *EDITION TITLE - Department Edition*. |
| Build command | `git fetch --unshallow \|\| true && …`, in both. The `\|\| true` is correct (`--unshallow` errors on a complete clone) and the template guide now explains it rather than only explaining `--unshallow`. |
| Config step markers | **Left as `guide step 3a`–`3d`.** They match the template guide's numbering; the vault guide now says so explicitly and maps them to its own Step 7. Rewriting the markers would put a conflicting edit on the four lines every fork has already changed, for no gain. |

- **Audience split, made explicit rather than removed:** the vault guide is the
  coordinator walkthrough (screenshots, a worked localisation example, the yearly
  routine); the template guide is the technical companion (condensed setup, then the
  terminal work). Each names the other, and each states where the numbering and the
  step order differ so the difference doesn't read as disagreement.
- **Follow-up worth doing, not actioned here (repo setting, not a doc):** the
  template repository still has GitHub's *template repository* flag set, so the
  "Use this template" button is still offered next to Fork. Turning that flag off
  (Settings → General → Template repository) would enforce the decision instead of
  documenting it. Recorded as **3.4a**.

#### 3.4a — FIX-CODE — the "Use this template" button is still offered on the template repo

- **Status:** DONE (found done 22 Sep 2026 — `is_template` is `false` on
  `textbookproject2026-alt/textbook-edition-template`; who switched it off, and
  when, is not recorded)
- **Repo:** `textbookproject2026-alt/textbook-edition-template` (GitHub repository
  setting, nothing in the tree)
- **What's wrong:** 3.4 decided forking is canonical and both guides now warn
  against "Use this template" — but GitHub still renders that button, because the
  repository's *template repository* flag is on. Documentation is the only thing
  stopping a coordinator from clicking it, and an edition created that way is
  invisible to `scripts/gen-derivatives.mjs` with no error anywhere.
- **Fix:** clear Settings → General → **Template repository** on the template repo.
  Forking is unaffected. Check first whether anything else relies on the flag (no
  automation in these repos reads it).

#### 3.5 — FIX-DOC — No doc for `sync-upstream.sh`, plugin pinning, or publishing a template update

- **Status:** DONE (4 Sep 2026 — `docs/updating-department-editions.md`; pointer
  added from `docs/troubleshooting.md`)
- **Repos/files:** `Obsidian Vault/` — new maintainer-facing doc;
  cross-references `textbook-edition-template/sync-upstream.sh`,
  `textbook-edition-template/quartz.lock.json`,
  `textbook-edition-template/docs/department-edition-setup.md`,
  `textbook-edition-template/docs/resolving-sync-conflicts.md`
- **What's absent:** `docs/troubleshooting.md` ("A department edition didn't pick
  up a fix") says "the technical contact gives them the exact update step" — and
  no doc in the vault says what that step is, that plugins are pinned in
  `quartz.lock.json`, or that `sync-upstream.sh` deliberately does *not* update
  them. There is also no doc on how the maintainer *publishes* a template update,
  which is the event coordinators are told to react to.
- **Scope note:** this doc describes the maintainer's side and points at the
  template repo's guides for the coordinator's side. It deliberately does not
  restate the fork-vs-template question — that is 3.4.
- **Found while writing it — FIX-CODE — DONE (4 Sep 2026):**
  `textbook-edition-template/quartz.lock.json` pinned both `edition-integrations`
  and `edit-on-github` at `eece8e6`, behind `quartz-edition-extras` `main`.
  Everything since was unreleased to every edition, including the whole
  Hypothes.is-across-SPA-navigation fix series and the commit removing the
  Publisher-tier group-lock references. Both pins are now bumped to `8f4e323`.
  - **Correction to the original finding:** it recorded `main` as `487b814` and the
    gap as 7 commits. `main` was in fact `8f4e323` — `487b814` plus the 3.6 README
    commit (`docs(3.6): add a repository README (#1)`), so the gap was 8 commits.
    The pins were bumped to actual `main`, not to the SHA named in the finding.
  - **Mechanism:** the pin lives only in `quartz.lock.json`
    (`plugins.<name>.commit`, lockfile `version` 1.0.0); there are no integrity
    hashes and `.quartz/plugins/` is gitignored, so the lockfile is the sole
    committed pin. Bumped with `npx quartz plugin install --latest
    edition-integrations edit-on-github` (the CLI rewrites `commit` and
    `installedAt`); `npx quartz plugin update` is the deprecated alias. Scoping to
    the two names matters — an unscoped run bumps all ~45 plugins, as every one
    currently reports an update available.
  - **Verified:** `npx quartz build -d docs -v` succeeds and the emitted HTML now
    carries the run-once guard and the `<head>`-injected `embed.js`
    (`data-edition-hypothesis`) that survives SPA navigation. `tsc --noEmit`
    passes. (`npx prettier . --check` flags `content/index.md`,
    `docs/department-edition-setup.md` and `docs/resolving-sync-conflicts.md` in
    the template — pre-existing, untouched by this change, but it does gate
    `npm run check` in `deploy-v5.yaml`.)
  - **Spawned a further FIX-CODE item — see 3.5a below.**

#### 3.5a — FIX-CODE — `plugin install` cannot detect a stale plugin cache, so a pin bump may not reach a deploy

- **Status:** PARTIAL (5 Sep 2026) — the `restore-keys` fallback is removed from
  `deploy-v5.yaml`. The two other workflows, the `gitLoader` defect underneath, and
  the Cloudflare build cache are all still open; see *What was done* below.
- **Repos/files:** `textbook-edition-template/.github/workflows/deploy-v5.yaml`
  (also `ci.yaml`, `build-preview.yaml`);
  `textbook-edition-template/quartz/plugins/loader/gitLoader.ts`
- **The defect:** for `subdir` plugin installs — which both edition plugins are —
  `installPlugin` strips `.git` after extraction, so its already-installed check
  tests only for the presence of `package.json` and never compares the checkout to
  the lockfile commit. A stale directory is therefore kept, and the CLI *reports
  the lockfile commit it did not install*.
- **Reproduced:** replacing `.quartz/plugins/edition-integrations` with `eece8e6`
  content and running `npx quartz plugin install` printed
  `✓ edition-integrations@8f4e323 already installed (subdir)` while the old code
  stayed on disk.
- **Why it bites deploys:** `deploy-v5.yaml` keys the plugin cache on
  `hashFiles('quartz.lock.json')` but carries `restore-keys: ${{ runner.os }}-plugins-`.
  A pin bump misses the exact key and then *restores the previous cache anyway*,
  which `plugin install` declines to correct — so the build ships the old plugin
  behind a green log.
- **Fix options:** drop the `restore-keys` fallback so the lockfile hash alone keys
  the cache (smallest change, keeps caching); or make the subdir branch record and
  compare the installed commit. Workaround until then: delete the plugin
  directories (or the Actions cache) before building.

**What was done (5 Sep 2026).** The first fix option, in `deploy-v5.yaml` only:
the `Cache Quartz plugins` step keeps its exact key
(`${{ runner.os }}-plugins-${{ hashFiles('quartz.lock.json') }}`) and no longer
carries `restore-keys`. A lockfile bump now misses the cache outright and the
plugins are re-fetched, so `plugin install` is never handed a stale directory it
cannot detect. A comment above the key records why the fallback must not come back.
The `Cache dependencies` (npm) step above it is untouched — `npm ci` verifies what
it installs against `package-lock.json`, so a partial `~/.npm` restore is safe.

**Still open — this did not close 3.5a:**

1. **`ci.yaml` and `build-preview.yaml` carry the identical plugin-cache block**
   (`ci.yaml:43-45`, `build-preview.yaml:35-37`) and were left alone, so the same
   stale restore is still reachable through them. Same one-line fix; not applied
   here only because this change was scoped to `deploy-v5.yaml`.
2. **The `gitLoader.ts` defect is untouched.** Dropping `restore-keys` removes the
   most likely *way* a stale checkout arrives on a runner; it does not make
   `installPlugin` able to notice one. Any other route to a populated
   `.quartz/plugins` — a warm local clone, a restored Cloudflare build cache — still
   ships the old plugin and still reports the lockfile commit it did not install.
   The durable fix is the second option above.
3. **None of these three workflows run for a department edition, or for this
   template.** All three are guarded `if: github.repository == 'jackyzha0/quartz'`
   — they are upstream's own pipelines, inherited by the fork. Editions build on
   **Cloudflare Pages**, whose build command is
   `git fetch --unshallow || true && npx quartz plugin install && npx quartz build`
   (`docs/for-course-coordinators.md`, `department-edition-setup.md` Step 4). So the
   deploy path that actually reaches readers is not covered by this change at all;
   whether Cloudflare's build cache can preserve `.quartz/plugins` across a pin bump
   is **unverified** and is the question that decides how much of 3.5a is real for
   editions. Worth answering before this item is closed.
4. **The edit is on an upstream-owned file.** `deploy-v5.yaml` came from upstream
   (`5ec3f4a`, saberzero1) and the cache block with it, so this is now a local
   divergence that `sync-upstream.sh` can conflict on. It is a small, well-commented
   hunk; `docs/resolving-sync-conflicts.md` covers the resolution. Worth reporting
   upstream — the defect is upstream's, not this template's.

#### 3.6 — FIX-DOC — `quartz-edition-extras` has no README

- **Status:** DONE (4 Sep 2026 — `quartz-edition-extras/README.md`, branch
  `docs/repo-readme`)
- **Repos/files:** `quartz-edition-extras/` — new `README.md`
- **What's absent:** the repo has no top-level README. It holds
  `plugins/edition-integrations` (Hypothes.is + Plausible injection) and
  `plugins/edit-on-github`, which **every department edition installs from this
  repo at build time** (`textbook-edition-template/quartz.config.yaml:294,314`).
  Nothing in the vault's docs mentions the repo exists.
- **What a new maintainer hits:** a live build-time dependency of every department
  site with no entry point. Delete, rename or privatise it and every edition's next
  build fails with nothing pointing at the cause.
- **Also found:** each plugin's own `README.md` is the unmodified upstream
  `quartz-community/plugin-template` boilerplate, and their `package.json` files
  still carry the template's `author`, `homepage` and `repository` values. Nothing
  depends on those, and the new repo README says so rather than editing them.

### Undocumented features

#### 1.1 — FIX-DOC — The Authoring Assistant is not documented anywhere in `docs/`

- **Status:** DONE (5 Sep 2026 — `docs/the-authoring-app.md`, new, and
  `docs/the-authoring-app-operations.md`, new)
- **Repos/files:** `Obsidian Vault/docs/the-authoring-app.md`,
  `docs/the-authoring-app-operations.md`; written against
  `authoring-assistant/app/`, `README.md`, `BUILD.md`
- **What's absent:** `docs/` contains zero occurrences of "Authoring Assistant" or
  the repo URL. `docs/word-to-markdown.md` says "the authoring app" without naming
  it, saying where it comes from, or who builds it. `docs/troubleshooting.md`
  names it once in passing. The repo also uses a different remote protocol from
  the others (HTTPS rather than the `github-textbook` SSH alias) — undocumented.
- **Depends on:** 3.1 (the inventory gives it a home).
- **What was done:** `docs/the-authoring-app.md` is the author's guide — what the
  app is, that it is a signed, notarised Mac app built and sent by the technical
  contact (no app store, no self-update), how to install and open it, the two
  habits (close the chapter in Obsidian; there is no undo), the three analyses,
  the console, and Settings. `docs/the-authoring-app-operations.md` is the
  technical contact's half. The repo URL and its **HTTPS rather than
  `github-textbook` SSH** remote are recorded in the operations doc's *The
  repository*. `docs/word-to-markdown.md` now names the app in its opening and
  points at the new guide instead of saying "the authoring app"; the app is also
  added to `docs/editing-the-textbook.md`'s *What happens around you* (now six
  items, not five), and both new docs are linked from `INFRASTRUCTURE.md`'s
  **Guides:** lines for §6, §10, §12 and §13 and from `docs/troubleshooting.md`.

#### 1.2 — FIX-DOC — The three analyses (citations, concept links, glossary generation) are undocumented

- **Status:** DONE (5 Sep 2026 — `docs/the-authoring-app.md`, *Chapters: the three
  questions* and *`glossary.md` is written by the app*;
  `docs/editing-the-textbook.md`, the `glossary.md` row)
- **Repos/files:** `Obsidian Vault/docs/the-authoring-app.md`,
  `docs/editing-the-textbook.md`;
  `authoring-assistant/app/references.py`, `app/terms.py`, `app/glossary.py`
- **What's absent:** the app's main function is documented only in
  `authoring-assistant/README.md`. `docs/editing-the-textbook.md` describes
  `glossary.md` as "the list of terms" with no hint that a tool writes it, and
  `docs/releasing-versions.md` asks the maintainer to check glossary/chapter
  agreement by hand.
- **What a new maintainer hits:** they don't know `glossary.md` is machine-appended,
  so a hand edit to it is at risk.
- **What was done:** each analysis is described from its own module — citations
  matched only against that chapter's own References section and never invented
  (`references.py`), concept-page mentions with the skip rules and `aliases`
  (`terms.py`), and the three glossary signals (`glossary.py`). `glossary.md` has
  a section of its own saying plainly that the app writes it: `## Term` blocks
  spliced into alphabetical position, existing lines copied through untouched,
  never added twice, never rewritten — so **a hand-edited definition is safe, but
  restructuring the file is not**, and why. `docs/editing-the-textbook.md`'s
  vault-layout table no longer calls it just "the list of terms".
- **Still open (not this item):** `docs/releasing-versions.md` still asks the
  maintainer to check glossary/chapter agreement by hand. That is a sensible check
  either way and was left alone; it is now checkable against a documented
  mechanism rather than a guess.

#### 1.3 — FIX-DOC — DeepSeek is mentioned nowhere in `docs/`

- **Status:** DONE (5 Sep 2026 — `docs/the-authoring-app-operations.md`,
  *DeepSeek: book text leaving the university*; `docs/the-authoring-app.md`,
  *Settings*; `INFRASTRUCTURE.md` §13 amended). **The decision this was expected
  to surface is now stated as an open question for the maintainer, not resolved.**
- **Repos/files:** `Obsidian Vault/docs/the-authoring-app-operations.md`,
  `docs/the-authoring-app.md`, `docs/INFRASTRUCTURE.md`;
  `authoring-assistant/app/llm.py`, `authoring-assistant/app/keychain.py`
- **What's absent:** `app/llm.py` sends the full text of a chapter to
  `https://api.deepseek.com/chat/completions` (model `deepseek-chat`) for extra
  glossary suggestions, keyed by a user-supplied API key in the macOS Keychain.
  Documented only in `authoring-assistant/README.md`.
- **Flag:** the doc itself is writable straight from the code, but writing it will
  surface a question for the maintainer — an undocumented third-party LLM egress
  path for book text, with no record of who approved it or who pays for the key.
  Expect this to turn into a decision.
- **What was done:** the operations doc states the egress path exactly — the full
  chapter text (truncated at 90,000 characters, and the author is told when),
  model `deepseek-chat`, up to 25 suggested terms merged into the deterministic
  ones for the author to approve individually. It records the three things that
  bound it: off unless a key is configured **and** off unless the author ticks the
  box for that chapter; the key is the author's own, in the login Keychain
  (`deepseek-key`), with no project-level account; and every failure path falls
  back to the deterministic checks. The author's guide says the same in her own
  terms and adds: it sends chapter text to a company outside the university, so
  ask before using it.
- **The question, left open on purpose.** Nothing in either repository records who
  approved book text going to a third-party LLM, or who pays for the key. That is
  written into the operations doc as the maintainer's to settle — including the
  case that matters (material that cannot leave the institution) — rather than
  resolved by a documentation session or quietly omitted. `INFRASTRUCTURE.md` §13
  now carries the same open question instead of "documented nowhere in this
  repository's docs", which is no longer true.

#### 1.4 — FIX-DOC — The author's console has no guide, and its operator setup is recorded only in a sibling repo

- **Status:** DONE (5 Sep 2026 — `docs/the-authoring-app.md`, *Waiting for you*;
  `docs/the-authoring-app-operations.md`, *The sign-in identifier* and *The
  weekly-jobs strip*). **Unblocked by the code, not by 3.3** — see the residual
  note at the end of this entry, which is still 3.3's.
- **Repos/files:** `Obsidian Vault/docs/the-authoring-app.md`,
  `docs/the-authoring-app-operations.md`; `authoring-assistant/app/console.py`,
  `app/github.py`, `app/server.py`, `authoring-assistant/BUILD.md`
- **What is already covered:** `docs/troubleshooting.md` covers device-flow sign-in
  failure modes thoroughly and accurately. That part is good and should be kept.
- **What's absent:** the **suggested-edit queue** (accept/decline, the
  auto-generated thank-you and decline replies posted to GitHub under the author's
  own name, and the one case where the app rewrites a chapter line itself); the
  **draft-review queue**; the **weekly-jobs strip** (`app/github.py:39`
  `WEEKLY_JOBS` — a second copy of the job list that must stay in sync with
  `docs/scheduled-actions-health-check.md`); and **operator setup** — creating the
  "Textbook Author Console" OAuth app with Device Flow ticked and giving the author
  its client ID, which lives only in `authoring-assistant/BUILD.md`.
- **What was done.** The author's guide covers the **suggested-edit queue**
  (accept/decline; the fixed thank-you and decline replies, stated plainly as
  posted publicly **under her own name**; that "accept" does not mean the app
  rewrites the chapter; and the single case where it does — an exact quoted
  replacement whose old wording appears in the chapter exactly once, one line
  changed, refused when it appears twice or not at all); the **draft-review
  queue**; **Going live**, including that the drafts area is shared so what
  publishes is all of it, that the app never publishes on its own, and the
  `clean`/`conflict`/`blocked`/`unknown` states in the author's words; and the
  **weekly-jobs strip**. Sign-in is cross-referenced to
  `docs/troubleshooting.md` rather than duplicated, as that entry is good.
- **Operator setup** is now in `docs/the-authoring-app-operations.md`: what the
  "identifier" the author is asked for actually is, how to create the *Textbook
  Author Console* OAuth app, that **Enable Device Flow must be ticked** and what
  it fails with if not, that no client secret should be generated, why the CMS's
  app is not reused, the `public_repo` scope, and how the ID reaches the author.
  `BUILD.md` remains the full procedure and is pointed at, not copied.
- **`WEEKLY_JOBS` is recorded as a duplicate.** The operations doc reproduces the
  four-row list from `app/github.py` beside the fact that
  `docs/scheduled-actions-health-check.md` holds the same list with no mechanical
  link, and says what has to happen when a weekly workflow is added, renamed or
  retired — both places, and a new build of the app for the author's half.
- **Residual, and still 3.3's:** the console's Accept button versus the CMS's
  "Ready" column. The code answered the mechanical half of 3.3 in the meantime —
  accepting opens or refreshes the single `drafts` → `main` pull request, and
  **Going live** merges it on the author's press — and the new docs describe that
  as it is. What is still undecided is whether the "Ready" column is the approval
  gate, and therefore whether `docs/moderating-comments.md` and
  `docs/for-trusted-contributors.md` are describing a workflow that no longer
  exists. Neither new doc asserts an answer.

#### 1.5 — FIX-DOC — No backup story for the vault or the repo, only for annotations

- **Status:** BLOCKED on 3.2 (can't describe vault backup without knowing the sync
  mechanism)
- **Repos/files:** `Obsidian Vault/docs/annotation-restore.md` (good, keep),
  `docs/editing-the-textbook.md`
- **What's absent:** `docs/annotation-restore.md` is thorough on Hypothes.is.
  Nothing covers backing up the **vault itself**, the Obsidian Publish site, or the
  repository. `docs/editing-the-textbook.md` lists `backups/` as a vault folder to
  "ignore entirely" — the real backups are on the `backups` orphan branch, where
  that folder on `main` holds only `.gitkeep`.

#### 1.6 — FIX-DOC — No operator doc for `suggest-edit-function`

- **Status:** DONE (5 Sep 2026 — `docs/the-authoring-app-operations.md`, *The
  suggest-edit function*; `docs/troubleshooting.md` given the pointer it lacked).
  The two non-doc items below are unchanged and still open.
- **Repos/files:** `Obsidian Vault/docs/the-authoring-app-operations.md`,
  `docs/troubleshooting.md`; `suggest-edit-function/README.md`, `TESTING.md`,
  `api/suggest-edit.js`
- **What's absent:** nothing in `docs/` acknowledges Vercel exists.
  `docs/troubleshooting.md` correctly triages the two user-visible error messages
  and then says "the technical contact's, either way" with no pointer to where to
  look — logs are only visible via `vercel logs <deployment-url>`.
- **What was done:** the operations doc names Vercel, says the function and the
  console's suggestion queue are two ends of one pipeline, and covers the four
  things an operator needs: that `vercel logs <deployment-url>` is the **only**
  place validation rejections, honeypot hits and rate-limit trips are visible and
  that nothing is queued or retried; the per-instance rate limit and what it is
  really worth; `ALLOWED_ORIGIN` and the cutover; and `BOT_TOKEN` rotation
  (both Vercel environments, no code change, verify with a real submission).
  `docs/troubleshooting.md`'s *The suggest-edit form shows an error* now ends with
  a **For the technical contact** line pointing at the logs and at
  `INFRASTRUCTURE.md` §6, instead of stopping at "the technical contact's, either
  way".
- **Carries two non-doc items, recorded here so they are not lost:**
  - **PARKED** — the rate limit is per-serverless-instance and resets on cold
    start; `suggest-edit-function/README.md` calls it "a speed bump, not a control"
    and defers real hardening (shared KV/Redis counter plus edge limits) to
    "Day 28". No record exists of whether Day 28 happened.
  - **FIX-CODE — overtaken (migration step 2, `suggest-edit-function` `f97d018`):**
    the function now resolves the origin from the registry and `ALLOWED_ORIGIN` no
    longer exists; the cutover has since been done twice. Kept as written:
    `ALLOWED_ORIGIN` is hardcoded to `https://bptext2026.xyz` in
    `api/suggest-edit.js` and must change at the production-domain cutover, as must
    the Plausible site registration and `publish.js`'s baked-in script. The cutover
    is now described in `docs/INFRASTRUCTURE.md` (*The domain cutover*), which
    lists all five places that change, and is referenced in
    `suggest-edit-function/README.md` — but it is still nobody's named task.

#### 1.7 — FIX-DOC — `scheduled-actions-health-check.md` omits four of the eight workflows

- **Status:** DONE (4 Sep 2026 — `docs/scheduled-actions-health-check.md`, new
  section *The other four workflows*)
- **Repos/files:** `Obsidian Vault/docs/scheduled-actions-health-check.md`;
  `.github/workflows/link-check.yml`, `lint.yml`, `apply-config.yml`, `stats.yml`
- **What's wrong:** the doc opens "Four workflows run on a weekly schedule, all
  Sundays." There are eight workflows. Missing entirely:
  - `link-check.yml` — push, pull request, **and weekly on Mondays at 06:00 UTC**
    (`cron: "0 6 * * 1"`), so "all Sundays" is wrong and a Monday failure has no
    diagnostic entry;
  - `lint.yml` — push and pull request (markdownlint);
  - `apply-config.yml` — regenerates `index.md`, `README.md` and `CONTRIBUTING.md`
    inside a pull request. Both `docs/editing-the-textbook.md` and
    `docs/changing-settings.md` depend on this working and tell the author to
    escalate when it hasn't run, and there is no diagnostic entry for it anywhere;
  - `stats.yml` — still present as a `workflow_dispatch`-only stub.
- **Done together with 2.4** — same file, one commit.
- **Found while writing it: `docs/` is excluded from BOTH CI checks.**
  `link-check.yml` runs lychee with `--exclude-path docs`, and
  `.markdownlint-cli2.yaml` lists `docs/**` under `ignores`. So neither a broken
  link between the guides nor malformed markdown in them is ever caught. Recorded
  in the health-check doc. Relevant to every doc fix in this worklist:
  cross-references and table syntax have to be checked by hand. Running
  `markdownlint-cli2` over `docs/` with the repo's rules found one real defect
  (fixed under 2.5) and otherwise only MD060 table-style nits from a newer
  markdownlint than CI pins, which fire on the whole existing doc set and are
  house style, not errors.

### Stale references

#### 2.1 — FIX-DOC — `word-to-markdown.md` Parts 2 and 3 describe an app that doesn't exist

- **Status:** DONE (5 Sep 2026 — `docs/word-to-markdown.md`, Parts 2–5 rewritten
  against the code; Part 1 kept). The hold was lifted by the maintainer.
- **Repos/files:** `Obsidian Vault/docs/word-to-markdown.md`;
  verified against `authoring-assistant/app/convert.py`,
  `app/server.py:378-470`, `app/web/index.html`, `app/web/app.js:520-700`
- **What's wrong:**
  - Step 3 says the app "puts the images alongside it in `assets`".
    `app/convert.py:286,415` writes them to `<chapter-stem>-media/` **next to the
    chapter**. Nothing ever writes to `assets/`.
  - Step 4 says the `chapter-NN` name "is not optional". `app/convert.py:380-398`
    validates only the `.md` extension, path separators, illegal characters and
    collision. The name is prefilled from the `.docx` filename; nothing enforces
    the convention.
  - Part 3 documents a five-row report table (**Headings / Pictures / Tables /
    Footnotes / Leftovers**, "Leftovers… should be empty"). `app/convert.py:486`
    produces a list of narrative notes at three levels (`ok`/`look`/`warn`) plus a
    counts dict. There is no "Leftovers" field, and Part 4's fixes are keyed to it.
  - **Internal contradiction:** Part 5 step 2 says "Open `index.md` … and add a
    line". `docs/editing-the-textbook.md` and `docs/changing-settings.md` both say
    `index.md` is generated and any direct edit is wiped — edit
    `templates/index.md`.
- **What was done:** Part 1 (the Word writing habits) was kept, minus one clause
  that pointed at the non-existent "leftover" report field. Part 2 now describes
  the real screens — the front-screen *A Word document* button, the one-off pandoc
  install screen, the three-part setup screen, *Convert and show me*, the tick-box
  confirmation and the *Save this chapter* button — and states the naming rules the
  code actually enforces (`.md` extension added if absent, plain name not a path,
  no `/ \ : * ? " < > |`, no collision) separately from the `chapter-NN`
  convention, which is now given as a convention with its three reasons. Part 3 is
  rewritten as what `report()` returns: a summary line of counts plus notes at
  `ok`/`look`/`warn`, with no "Leftovers" field, and a checklist keyed to
  warn-level notes. Part 4's entries are now headed with the app's verbatim note
  headlines. Part 5 step 2 now says `templates/index.md` and explains why, citing
  `editing-the-textbook.md` and `changing-settings.md`.
- **The image-destination divergence — now closed (5 Sep 2026).** It was left open
  here as a **FIX-CODE/DECIDE** matter, deliberately not resolved by prose: at the
  time the doc documented the code (`<chapter-stem>-media/` next to the chapter)
  and carried a note that `docs/editing-the-textbook.md` stated the vault
  convention as `assets/chapter-NN/` and the converter did not follow it. The
  decision went to the documented convention, and the code was changed to match:
  `app/convert.py` now writes extracted media to `assets/<chapter-name>/` at the
  vault root, finding the vault by looking upwards for `chapters` + `assets` +
  `glossary.md` and refusing a folder it cannot trace to one. That agrees with
  `docs/editing-the-textbook.md` and with the CMS's `media_folder: assets`
  (`admin/config.yml`), so the three-way disagreement is gone.
  `docs/word-to-markdown.md` was updated to match: the *Where things live* bullet
  and the note beside it, the folder-choice requirement in step 3, the `assets/`
  clash in step 4's naming rules and its enforced-rules list, the Part 3 picture
  checklist item, and the Part 5 publish list (which now matches
  `editing-the-textbook.md:206`).

#### 2.2 — FIX-DOC — `file-tree-reference.md` is a build-plan artefact presented as a reference

- **Status:** DONE (5 Sep 2026 — the file was **deleted**, not repaired).
- **Repos/files:** `Obsidian Vault/docs/file-tree-reference.md` (removed);
  `docs/INFRASTRUCTURE.md` §11 amended
- **What was wrong (partial list), kept as the record of why it went:**
  `chapters/main.md`, `page-a.md`, `page-b.md` (none exist);
  `chapters/Definitions/` absent from the tree entirely — the one doc the folder
  move never reached; `community/forks.md` (the file is
  `derivatives.md`); `stats.yml` shown as the generator of all three community
  pages; backups shown on `main` rather than the `backups` branch; `docs/` lists two
  files that don't exist and omits eight that do; workflows list omits
  `contributors.yml`, `derivatives.yml`, `dashboard.yml`, `apply-config.yml`;
  `admin/`, `scripts/`, `templates/`, `configure.mjs`, `textbook.config.json`,
  `images/` and `OAUTH-SETUP.md` all missing; `quartz.config.ts` / `quartz.layout.ts`
  (the template uses `quartz.config.yaml`); `suggest-edit-function/lib/*.js` (none
  exist — it is a single zero-dependency handler) and a Resend email confirmation
  that was never built.
- **Contradicts a settled decision:** "Each fork gets its own Plausible site and
  **its own Hypothes.is group ID** … the one-group-per-edition rule expressed in
  config." Per-cohort isolation was not adopted; five other docs say so correctly,
  and this doc's own header says so before the body contradicts it.
- **Decision — delete rather than repair (maintainer, 5 Sep 2026).** Three
  reasons, in order of weight:
  1. It is *titled* like the canonical architecture reference, so a new maintainer
     reads it first and is misled by it. That is worse than the document not
     existing at all.
  2. Its infrastructure half is now covered properly by `docs/INFRASTRUCTURE.md`
     (3.1), organised by service and failure mode rather than by directory listing.
  3. A repository-layout document drifts again the moment anything moves. The ~20
     defects above accumulated within weeks; repairing it buys a document that is
     wrong again by the next folder move.
- **Checked for unique content before deleting.** Both items the audit flagged had
  already been migrated under 3.1 and needed no further move:
  - `aldogo-bot` — `docs/INFRASTRUCTURE.md` §11, and independently in
    `scripts/gen-contributors.mjs` (`EXTRA_BOTS`). §11's own claim that the name
    "survives in one place only" was itself stale and has been corrected.
  - SSH push identity `github-textbook` → `~/.ssh/id_ed25519_textbook` —
    `docs/INFRASTRUCTURE.md` §1 and its *Local credentials* table, with the
    remote-URL consequence spelled out.

  Also checked and found **not** unique: the `__GROUP_ID__` Publisher-tier seam
  (documented at length in `publish.js:157-168` itself); the domain cutover
  (`INFRASTRUCTURE.md`, *The domain cutover*); the repo coordinates, staging domain
  and Publish `siteId` (`INFRASTRUCTURE.md` §1–2); the `.gitignore` treatment of
  `.obsidian/workspace.json` (the `.gitignore` itself). Nothing surfaced that
  argued for keeping the file. The one orphan is the plan vocabulary "Scenario B",
  left as a bare term in a comment at
  `textbook-edition-template/quartz.config.yaml:3` — but the deleted doc named it
  without defining it either, so no definition was lost.
- **References fixed:** `docs/INFRASTRUCTURE.md` §11; in this file, the 3.1 sources
  list, the 1.6 cutover note, and two *Verified current* rows. **No reference
  existed in any other repository** (checked across `authoring-assistant`,
  `quartz-edition-extras`, `suggest-edit-function`, `textbook-edition-template`,
  `textbook-convert`, `coordinator-test`). `.obsidian/workspace.json` still lists
  the path in Obsidian's recent-files array; that file is git-ignored and Obsidian
  rewrites it, so it was left alone.

#### 2.3 — FIX-CODE — De-personalisation is incomplete: the app still says "Alec", and a test asserts on it

- **Status:** DONE (5 Sep 2026 — the app's strings, the test that guards them and
  the guide that quotes them, changed together in one pass)
- **Repos/files:** `authoring-assistant/app/github.py:121,152,220`,
  `app/convert.py:1051,1076`, `app/web/index.html:368,553`, `app/web/app.js:1088`,
  `app/server.py:768`, `README.md:236,322,355`, `BUILD.md:254,283,298,358`,
  `tests/test_all.py:1170-1176`; `Obsidian Vault/OAUTH-SETUP.md:3`,
  `admin/config.yml:27`; `Obsidian Vault/docs/troubleshooting.md:288-330`;
  `Obsidian Vault/docs/annotation-restore.md:102` (left as-is — see below)
- **Why it is FIX-CODE:** user-facing strings in the app still say "ask Alec".
  `tests/test_all.py` **asserts on those exact strings** — the test was added to
  keep them in sync with `docs/troubleshooting.md`, so de-personalising the app
  fails the suite until the test is updated in the same change.
  `docs/troubleshooting.md` quotes the strings verbatim, so it says "the technical
  contact" in prose and "ask Alec" in its quotes.
- **Also:** `BUILD.md` assumes the author's gender ("as himself", "his authorised-apps
  list"). `admin/config.yml` names "Brandon" in a comment.
- **Not a defect:** `README.md`, `CONTRIBUTING.md` and `index.md` saying "Brandon"
  is correct — that is the `__MAINTAINER__` token rendered from
  `textbook.config.json`, and `docs/changing-settings.md` documents how to change
  it.
- **What was done.** All three had to move in the same commit, and did:
  1. **The app's strings.** "ask Alec" → "ask the technical contact" across
     `app/github.py` (three error messages), `app/convert.py` (two conversion
     warnings), `app/web/index.html` (the one-off-setup card and the Settings
     note) and `app/web/app.js` (the failed-weekly-job line). Two more the
     original audit had not listed turned up in the same sweep and were included:
     `README.md` (three places, the author's own guide) and the `app/server.py`
     comment that mirrors `BUILD.md`'s publishing rationale.
  2. **The test.** `tests/test_all.py` — the two `QUOTED_BY_THE_GUIDE` entries for
     `app/github.py` now quote the new wording. The check flattens the source but
     leaves the quote characters that join adjacent string literals, so a quoted
     string may not span that seam; both messages now wrap mid-sentence and are
     listed as the two pieces the source wraps them into, with a comment saying
     why. The guard passes: **190 passed, 0 failed**.
  3. **The guide.** `docs/troubleshooting.md` — the three quotes in *The author's
     console won't sign in* now match the app word for word again, so its prose
     ("belong to the technical contact") and its quotes finally agree.
- **Gendered pronouns.** `BUILD.md` "as himself" → "as themselves"; "his
  authorised-apps list" → "their list of authorised apps"; "writing there behind
  his back would leave his own copy" reworked to "behind the author's back would
  leave that copy", and the same sentence in the `app/server.py` comment it
  mirrors. `README.md` "until he has" → "until they have". `app/web/index.html`
  "a short piece of text he will give you" → "they will give you".
- **Deliberate exception — `docs/annotation-restore.md:102`.** The line
  `"account": "acct:AlecGordon@hypothes.is"` sits inside a sample backup JSON. It
  is **data, not prose**: it shows the shape of a real Hypothes.is record so the
  reader can recognise one, and a restore is checked against it. Changing it
  would make the sample wrong. Left as-is, deliberately. The same account is
  recorded, correctly and for the same reason, at `docs/INFRASTRUCTURE.md:231`.

#### 2.4 — FIX-DOC — `scheduled-actions-health-check.md` predates auto-merge

- **Status:** DONE (4 Sep 2026 — `docs/scheduled-actions-health-check.md`, new
  section *Auto-merge, and when it silently doesn't*)
- **Repos/files:** `Obsidian Vault/docs/scheduled-actions-health-check.md`;
  `.github/workflows/contributors.yml:191`, `derivatives.yml:200`,
  `dashboard.yml:228`
- **What's stale:** the doc never mentions that three workflows open a pull request
  and arm GitHub auto-merge (`gh pr merge --auto --squash`), nor the guard that
  makes it safe (author must be `github-actions[bot]`, exactly one changed file,
  and that file must be the page the workflow generates), nor that **"Allow
  auto-merge" must be switched on in repository settings** or the step logs a
  warning and silently leaves the pull request open.
- **Correction to the audit brief:** it is **three** workflows that auto-merge, not
  four. `backup-annotations.yml` pushes directly to the unprotected `backups`
  branch and opens no pull request — the doc already describes that correctly, but
  anyone looking for a fourth auto-merging pull request will not find one.
- **What a new maintainer hits:** weekly chore pull requests pile up unmerged with
  a green run and no failure signal.
- **Done together with 1.7** — same file, one commit.

#### 2.5 — FIX-DOC — `editing-the-textbook.md` vault-organisation table is incomplete

- **Status:** DONE (4 Sep 2026 — `docs/editing-the-textbook.md`)
- **What was done:** added rows for `images/` and `textbook.config.json`; corrected
  `templates/` to say it also holds `README.md` and `CONTRIBUTING.md`; added
  `configure.mjs` and `OAUTH-SETUP.md` to the machinery row. The `assets/` row was
  left as written — it describes the intended convention, and the fact that it is
  currently empty is a state, not a doc error. Whether the authoring app should
  write there instead of `<chapter>-media/` is part of 2.1 and was not touched.
  Also inserted the missing blank line before `![[File_index.png]]`, which sat
  directly against the last table row and parsed as a malformed extra row.
- **Repos/files:** `Obsidian Vault/docs/editing-the-textbook.md`
- **What's wrong:** `images/` has no row, although it holds the four screenshots the
  guide itself embeds (`Vault.png`, `File_index.png`, `Publish-dialog.png`,
  `Dummy-site.png`). `assets/` is described as "Every image in the book, in one
  subfolder per chapter" but is currently empty but for `.gitkeep`.
  `templates/` is described as "The source of the front page" but also holds
  `README.md` and `CONTRIBUTING.md`. `configure.mjs`, `textbook.config.json` and
  `OAUTH-SETUP.md` sit at the top level with no row.

#### 2.6 — PARKED — Unfilled placeholders across the guides

- **Status:** PARKED — recorded, deliberately left as placeholders. These are real
  pending items, not stale text, and each needs something a fix session cannot
  supply.
- **Repos/files:** `Obsidian Vault/docs/for-course-coordinators.md:299` and the
  `[SCREENSHOT: …]` markers, counted 4 Sep 2026:
  `docs/for-course-coordinators.md` (11), `docs/for-trusted-contributors.md` (6),
  `docs/moderating-comments.md` (5), `docs/editing-the-textbook.md` (1),
  `docs/releasing-versions.md` (1) — 24 in total.
- **What's pending:**
  - `**[MAINTAINER EMAIL — fill in at handover]**` is the only contact route in the
    coordinators' guide, and "Before you start" step 5 requires the coordinator to
    email the maintainer for their Plausible line before they can finish setup.
    Needs the real address at handover.
  - The `[SCREENSHOT: …]` markers are unshot images, not broken text. Only
    `docs/editing-the-textbook.md` currently has real images (four, in `images/`).
    Several of the remaining 24 need access nobody in a doc session has — the
    Cloudflare dashboard mid-setup, the CMS signed in as a contributor, a live
    annotation sidebar with comments in it.
- **Reviewed 4 Sep 2026** and deliberately left as placeholders. A placeholder that
  reads as a placeholder is better than prose pretending the image is there.

---

## Verified current — do not re-audit

Recorded so fix sessions don't spend time re-checking these. All confirmed against
the code on 4 September 2026.

- **The `drafts` branch.** `admin/config.yml` is `branch: drafts` with
  `publish_mode: editorial_workflow`. `docs/for-trusted-contributors.md` and
  `docs/moderating-comments.md` describe the two-gate model correctly. (The
  *onward* handoff is 3.3; the CMS side is right.)
- **`chapters/Definitions/`.** Correct in `docs/editing-the-textbook.md`,
  `docs/for-course-coordinators.md`, `docs/releasing-versions.md`, and in the CMS's
  two-collection config. Was stale only in `docs/file-tree-reference.md`, deleted
  under 2.2.
- **Publisher tier / no per-cohort groups.** Correctly and consistently stated in
  `docs/moderating-comments.md`, `docs/releasing-versions.md`,
  `docs/for-course-coordinators.md`, `docs/how-to-comment.md`,
  `docs/annotation-restore.md`, and
  `textbook-edition-template/docs/department-edition-setup.md`. Was stale only in
  `docs/file-tree-reference.md`, deleted under 2.2.
- **The two CMS collections.** `docs/for-trusted-contributors.md` correctly
  describes "Chapters" and "Concept pages" as two lists, matching the current
  `admin/config.yml`.
- **`OAUTH-SETUP.md`.** Accurate against `admin/config.yml` and `admin/index.html`,
  including the pinned `@sveltia/cms@0.193.1`.
- **`docs/annotation-restore.md`.** Matches `.github/workflows/backup-annotations.yml`
  and `scripts/backup-annotations.mjs`, including `KEEP=12`, the orphan-branch
  rationale, and the honesty about the untested pruning path.
- **`docs/troubleshooting.md`, device-flow section.** Matches
  `authoring-assistant/app/github.py` and `app/web/index.html` string for string.
  (Its quotes now say "the technical contact", matching the app — 2.3.)

---

## Progress

| ID | Category | Status |
|---|---|---|
| 3.1 | FIX-DOC | DONE — `docs/INFRASTRUCTURE.md` |
| 3.2 | FIX-DOC | BLOCKED — needs mechanism confirmed |
| 3.3 | DECIDE | BLOCKED — decision |
| 3.4 | DECIDE → FIX-DOC | DONE — fork is canonical; both setup guides reconciled (spawned 3.4a) |
| 3.4a | FIX-CODE | DONE — the template-repository flag is off (found 22 Sep 2026) |
| 3.5 | FIX-DOC | DONE — `docs/updating-department-editions.md`; spawned FIX-CODE (pin bump) DONE — pins at `8f4e323` |
| 3.5a | FIX-CODE | PARTIAL — `restore-keys` dropped from `deploy-v5.yaml`; `ci.yaml`/`build-preview.yaml`, the `gitLoader` defect and the Cloudflare build cache still open |
| 3.6 | FIX-DOC | DONE — `quartz-edition-extras/README.md` |
| 1.1 | FIX-DOC | DONE — `docs/the-authoring-app.md` + `docs/the-authoring-app-operations.md` |
| 1.2 | FIX-DOC | DONE — `docs/the-authoring-app.md`; `editing-the-textbook.md`'s `glossary.md` row fixed |
| 1.3 | FIX-DOC | DONE — documented; **who approved the LLM egress and who pays is now an open question for the maintainer** |
| 1.4 | FIX-DOC | DONE — console + operator setup written; the "Ready" column contradiction stays with 3.3 |
| 1.5 | FIX-DOC | BLOCKED on 3.2 |
| 1.6 | FIX-DOC | DONE — `docs/the-authoring-app-operations.md`; the PARKED rate limit and FIX-CODE `ALLOWED_ORIGIN` are unchanged |
| 1.7 | FIX-DOC | DONE — `docs/scheduled-actions-health-check.md` |
| 2.1 | FIX-DOC | DONE — `docs/word-to-markdown.md`; the image destination was decided and the code now writes `assets/<chapter>/` |
| 2.2 | FIX-DOC | DONE — deleted, not repaired; unique content already in `INFRASTRUCTURE.md` |
| 2.3 | FIX-CODE | DONE — app strings, the test guarding them and `troubleshooting.md`'s quotes moved together |
| 2.4 | FIX-DOC | DONE — `docs/scheduled-actions-health-check.md` |
| 2.5 | FIX-DOC | DONE — `docs/editing-the-textbook.md` |
| 2.6 | PARKED | Recorded; left as placeholders |
