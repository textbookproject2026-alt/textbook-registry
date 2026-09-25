# Documentation audit: 22 September 2026

This audit read every operator-facing document in every platform repository in
full, and checked it against the code and the live services on 22 Sep 2026. It
was done because the doc set described one textbook, while the system had
become a platform: a registry, six shared services, two books, a portal, and a
governance model for removing a book.

**The split it applied.** There are two audiences now:

- **Book maintainers.** They write, convert, publish, moderate and handle
  suggestions for their own book. Their docs live in their book's repo, and a
  generalised copy lives in `textbook-template/docs/`, so every new book starts
  with them.
- **The platform owner.** They hold the registry, the accounts, the GitHub App,
  the portal, the deploy hooks, and the power to retire a book. Their docs live
  here, in `textbook-registry/docs/`, beside `design/`.

This file is the record of the audit. [README.md](README.md) is the index.

---

## Every document, by repository

"Where" means where the document belongs after the split. "Wrong" means wrong
on 22 Sep, before this audit's changes.

### `textbook` (book one; the Obsidian vault)

| Document | Audience | Where | What was wrong | Done |
|---|---|---|---|---|
| `docs/INFRASTRUCTURE.md` | platform owner | **moved →** `textbook-registry/docs/INFRASTRUCTURE.md`, rewritten | It covered one book. It called the account a "GitHub organisation" (it's a user account) and listed "five repositories" (there are ten). §3 said the apex wasn't serving the portal, while its own cutover note said it had been since 22 Sep. §7 said the Plausible site wasn't renamed (it was: the new name answers 200, the old one 404). §6 and §11 described `BOT_TOKEN` as the function's credential (the GitHub App is). §10 said the author pastes a client ID (it comes from the registry). It had no entries for the registry, portal, App, deploy hooks, parity token, second GitHub account or book two. Its cutover "five places" list was obsolete | moved |
| `docs/scheduled-actions-health-check.md` | platform owner | **moved →** `SCHEDULED-JOBS.md`, covering both repos | It didn't know `apply-config` now runs weekly and opens its own PR under an auto-merge guard (#38). It had none of the registry's four workflows. Pruning was described as "week 13", with no date | moved |
| `docs/the-authoring-app-operations.md` | platform owner | **moved →** `AUTHORING-APP-OPERATIONS.md` | It said `ALLOWED_ORIGIN` was hardcoded (gone since migration step 2), that the function files issues "as the bot account" (the App files them), and that the operator must hand each author a sign-in identifier (the registry supplies it). "The cutover is still nobody's named task": two cutovers have since been done. It described one book only | moved |
| `OAUTH-SETUP.md` | both | **split**: the relay half → `CMS-RELAY.md`; the editor-page half → `textbook/docs/the-browser-editor.md` | It presented `ALLOWED_DOMAINS` as one value, not a list shared by every book. It said nothing about the relay's `repo,user` scope. It treated the relay as this book's | split |
| `docs/README.md` | book | stays, rewritten | It routed platform readers into book docs, and put "the technical contact" in charge of platform services | rewritten |
| `docs/editing-the-textbook.md` | maintainer | stays, corrected | It said `textbook.config.json` sets the book's web address (the registry does). It said the front page rewrites only on a config or template edit (a registry change now reaches it through the weekly render). It linked to moved docs | fixed |
| `docs/changing-settings.md` | maintainer | stays, rewritten | It said changing `site_url` changes the book's address. The address, title, maintainer and licence are registry facts that the portal, function and console read. An edit here alone changes the README, and parity turns red | rewritten |
| `docs/moderating-comments.md` | maintainer | stays, corrected | It said the badge excludes "the two leftover private test groups", and that the "Biology edition" group is still backed up. Both groups were removed from the registry on 17 Sep and are no longer backed up. It didn't say who files the suggestion issues | fixed |
| `docs/troubleshooting.md` | maintainer | stays, corrected | Its console section told the author to get a sign-in identifier from the technical contact. Its pointers led to moved docs. It didn't separate what the book's technical contact can fix from what only the platform owner can | fixed |
| `docs/the-authoring-app.md` | maintainer | stays, corrected | It called the app "written for this book and this book only", which stopped being true at migration step 5. The identifier "given by the technical contact" now comes from the registry. It had no section on choosing a book, or on a vault being refused | fixed |
| `docs/word-to-markdown.md` | maintainer | stays | Current | — |
| `docs/for-trusted-contributors.md` | contributors | stays, corrected | It didn't tell contributors that signing in grants the editor `repo,user`, meaning access to every repository they can reach | fixed |
| `docs/how-to-comment.md` | students | stays | Current | — |
| `docs/annotation-restore.md` | maintainer | stays | Current. It already reads the registry's groups and legacy origins | — |
| `docs/releasing-versions.md` | maintainer | stays | Current. Its "Ready" column step inherits open item 3.3 | — |
| `docs/how-versioning-works.md` | maintainer, coordinators | stays | Current | — |
| `docs/for-course-coordinators.md` | coordinators | stays, corrected | It told coordinators to email the maintainer so a private group gets backed up. It's now a registry change the platform owner makes. The `[MAINTAINER EMAIL]` placeholder is still unfilled (2.6) | fixed |
| `docs/updating-department-editions.md` | book one's technical contact | stays, corrected | "Still live" said `deploy-v5.yaml` keeps `restore-keys`. It was removed on 5 Sep (3.5a PARTIAL) | fixed |
| `docs/DOCS-REMEDIATION.md` | book one's record | stays, annotated | 3.4a said the template flag was still on (it's off). 1.6's `ALLOWED_ORIGIN` FIX-CODE was overtaken by migration step 2. Several entries describe docs that have now moved | annotated |
| `README.md`, `CONTRIBUTING.md`, `index.md` | readers | generated | Current | — |
| `community/*.md` | readers | generated | Current | — |
| new: `docs/what-this-book-runs-on.md` | maintainer | new | The book-level half of the old inventory: what is this book's, and what is the platform's | new |
| new: `docs/the-browser-editor.md` | maintainer | new | The book-level half of `OAUTH-SETUP.md` | new |

Not documentation: `QA.md`, `path-test/`, `Frankenstein/` (test content),
`glossary.md` (book content). `1.md` and `Untitled.md` are untracked files in the
vault's root. `1.md` is a paste of a terminal session. Neither is committed, and
both should be deleted.

### `textbook-registry`

| Document | Audience | What was wrong | Done |
|---|---|---|---|
| `README.md` | platform owner | "Four things read the registry" (the portal is a fifth). The delivery table says CI generates `ALLOWED_DOMAINS` (nothing does). "Delivery to services" had no portal section, though `portal.yml` sends readers there for `PORTAL_DEPLOY_HOOK`. "Who approves changes" read as if protection were on (it's off) | fixed |
| `design/PORTAL-CUTOVER.md` | history | The status header's "not done" list was mostly done by 22 Sep (apex bound, Plausible renamed, 301 rule, portal block); only the coordinator email (step 10) is still open | header updated |
| `design/DESIGN.md`, `MULTI-BOOK-HOSTING.md`, `INTERIM-BOOK.md` | history | Dated design records. Left as written, per README | — |
| `parity/checks.mjs` | code | Four checks read `OAUTH-SETUP.md` and `docs/INFRASTRUCTURE.md` in the vault. The move would have turned parity red | retired, verified |

### `textbook-template`

| Document | Audience | What was wrong | Done |
|---|---|---|---|
| `README.md` | new maintainer | "`docs/` left out: book one's guides describe the platform as it was before the registry" | fixed; `docs/` added |
| `SETUP.md` | maintainer + platform owner | Step 5 said the apex isn't bound to the portal (it has been since 22 Sep). Item 9 said "book one has no such job" (it has, since #38). Line 122 failed lint (MD029), so the repo's `lint` was red | fixed |
| new: `docs/` | maintainer | Generalised copies of the book-one guides | new |

### Other repositories

| Repo | Document | Audience | State |
|---|---|---|---|
| `textbook-portal` | `README.md` | platform owner | Current |
| `suggest-edit-function` | `README.md`, `TESTING.md` | platform owner | Current. `TESTING.md` is a dated record |
| `authoring-assistant` | `README.md`, `BUILD.md` | author, developer | Current, and already multi-book |
| `quartz-edition-extras` | `README.md` | platform owner | Pointed at `docs/INFRASTRUCTURE.md` in the textbook repo. Repointed here (README only, so no plugin pin moves) |
| `platform-test-book` | `README.md` | platform owner | Current |
| `textbook-edition-template` | `docs/*.md` | coordinators of book one | Current. Plugin READMEs are upstream boilerplate |
| `dept-coordinator-test/textbook-edition-template` | fork | a coordinator | Still names `bptext2026.xyz`. It's the coordinator's to fix |
| (no repo) `new-textbook-template-proposal/` | — | — | Obsolete (the Day 41 proposal). Not in any repo. Delete it, or mark it |
| (no repo) `d28-report.md`, `sveltia-findings.md` | — | — | Loose notes in the project folder. History |

---

## Wrong in ways documentation can't fix

These need a code, configuration or ownership change. Each is written into the
relevant doc as it is today, not as it ought to be.

1. **`textbook-registry` `main` has no branch protection.** CODEOWNERS and the
   README's review rule aren't enforced. Anyone with write access can push
   `registry.json` to `main`, and `deploy.yml` ships it to the function. The
   design counts registry review as one of the two credential gates.
2. **Fixed 22 Sep (textbook-template #3; a dispatched run shows `skipped`).**
   **The template repo's own weekly `apply-config` fails every Monday.** Its
   `textbook.config.json` has an empty slug by design, and `configure.mjs` refuses
   it. The first failure is due on 28 Sep. The workflow needs to skip the
   template repository (a `github.repository` guard).
3. **The console's Weekly jobs strip breaks for every book but book one.**
   `WEEKLY_JOBS` is four hardcoded filenames, queried on the open book. A 404
   becomes a standing "Weekly jobs:" error that also hides "Nothing is waiting".
   This affects book two and every book made from the template, which ships none
   of those four workflows.
4. **§7 removal can't be carried out as designed.** The `removal` record isn't in
   the schema, and unknown keys are rejected, so the designed PR fails
   `validate`. No hosting policy exists, so removal has no defined grounds beyond
   law and direct harm. BOOK-LIFECYCLE.md gives the manual stand-in.
5. **`site.dark` is accepted but read by nothing.** No probe, no `health.json`, no
   parked page, no "Currently unavailable" section, and the function doesn't
   refuse a dark book's origin. Parking is by hand, onto a portal whose response
   for a parked hostname hasn't been tested.
6. **`ALLOWED_DOMAINS` and DNS are maintained by hand and checked by nothing.**
7. **Resolved 25 Sep (the platform owner checked Vercel: it isn't set).** The
   token isn't recorded as revoked, and the fallback code remains
   (INFRASTRUCTURE §2d). **`BOT_TOKEN` may still be set on Vercel.** It couldn't be checked (no CLI
   access). If it is set, a book whose repo lacks the App still gets suggestions,
   filed by `aldogobot`, and the missing installation stays hidden.
8. **Book one duplicates registry facts in `textbook.config.json`** (title,
   maintainer, `site_url`, licence). Parity catches drift, but a settings change
   is two edits in two repos. The template has already moved to slug-only.
9. **The vault's scripts fail a retired book with no way forward.** They don't
   mention `TEXTBOOK_REGISTRY` (§7b gap 2).
10. **Unrecorded ownership:** Vercel, Plausible, Obsidian Publish (book one's
    `paid_by`), Apple Developer, the registrar for `confused4now.org`, the second
    Cloudflare account, the *Textbook CMS* OAuth App's account, the App's `.pem`,
    and the private `code_repo`.
11. **The suggest-edit rate limit is per IP and shared by every book.** Testing
    one book spends another book's readers' budget on the same IP.
12. **Open decisions that documentation mustn't pre-empt:** 3.3 (the CMS "Ready"
    column versus the console's Accept), 3.2 (how a Publish author's vault reaches
    GitHub), and DeepSeek approval, which is now platform-wide.
13. **`docs/` is excluded from lint and link-check in the vault.** Cross-links
    between the guides, including the new ones into this repo, are checked by
    nobody.

**Added 25 Sep 2026**, from the book-requests workstream of 24 Sep:

14. **Books use two chapter-naming conventions.** Book one, the template's guides
    (`docs/word-to-markdown.md`, `docs/editing-the-textbook.md`) and
    BOOK-ONE-TO-QUARTZ §8 step 1 name a chapter `chapters/chapter-NN.md`, with its
    pictures in `assets/chapter-NN/`. Nothing enforces this: the app suggests the Word
    file's name, and the guide asks the author to rename it. Books made from a request
    keep the Word file's name, for example `chapters/Chapter 3 – X.md` with
    `assets/Chapter 3 – X/`, so that importing again from the app replaces the chapter
    rather than duplicating it. This comes from book-requests' delivered follow-up
    `2ff0f51`, which isn't on `main` on 25 Sep. The builder builds page addresses from
    file names, and chapter-to-chapter links are written from them, so the two
    conventions give two URL styles and two ways to write links. The template's guides
    describe only the first. Pick one convention, or document both.
15. **The request workflow depends on an Authoring Assistant build that doesn't
    exist yet.** For a request-made book, the author works only in the app
    (decided 24 Sep), and first accepts the invitation to their book from inside it.
    That needs the scope `public_repo repo:invite` and the invitations screen, which
    are on `authoring-assistant` `main` (`c90f2ed`) and need a new signed,
    notarised build, which isn't recorded as made by 25 Sep. The welcome email's download link (`APP_DOWNLOAD_URL`) points at a
    release on `authoring-assistant-releases`, which has none, and the variable
    isn't set (INFRASTRUCTURE §1, §6). The follow-up `2ff0f51` also pins the
    converter to the app build's pandoc (`PANDOC_VERSION`), which is unset too. Until a build ships and
    both variables are set, an approved request produces a book whose author can't
    follow the emailed instructions. The app's Word import to `drafts` still needs a
    local vault ("Download a copy" first).
