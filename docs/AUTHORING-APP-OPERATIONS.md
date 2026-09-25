# The Authoring Assistant: operations

**Audience: the platform owner.** This is what you have to build, create and hold
for the author's app to work for **every** book: building and signing it, the
console's OAuth App, how it learns about books, and the DeepSeek egress path.

The author's own guide is in each book's `docs/the-authoring-app.md`. The full
build procedure is `authoring-assistant/BUILD.md`, which is the reference; this
file is the operator's route through it, and doesn't repeat it.

This replaces `textbook/docs/the-authoring-app-operations.md`. That was written
when the app served one book, took its sign-in identifier from a person, and
sat in front of a function authenticated by a bot token. None of those three is
true now.

---

## The repository

`textbookproject2026-alt/authoring-assistant` is **private**, and cloned over
HTTPS rather than the `github-textbook` SSH alias. Because it's private, the
registry's parity job needs `PARITY_READ_TOKEN` to read it.

Run the tests before shipping anything: `python3 -m tests.test_all` and
`node tests/ui_flow.js` (see the end of `BUILD.md`).

---

## One app, every book

Since migration step 5 the app has no book of its own.

- **The list of books** comes from the registry. It is fetched once per launch
  from `main`, the last good copy is kept in Application Support, and a copy is
  bundled at build (`app/registry.bundled.json`, fetched by `build.sh`, never
  committed). If the band under the title says "List of textbooks as of …", the
  fetch failed and the app is on its cached copy.
- **Which book:** the author picks one of the books their GitHub account can
  push to, and **the chosen book decides** (BOOK-ONE-TO-QUARTZ §8 step 2).
  A vault is optional, and can only be the chosen book's copy: its
  `textbook.config.json` slug and its `origin` remote must both match the
  registry entry, or the vault is refused and nothing is written. Choosing
  another book closes it.
- **A new book needs nothing from you here.** It appears to its maintainer at
  their next launch after the registry merge.
- **A retired book** disappears at the next launch. A vault for it is refused.
- **An unknown `status` value anywhere in the registry** makes the app reject
  the whole registry. That's one reason `status` never gets a fourth value.

**A new build is needed only for app changes, not for registry changes.** The
bundled registry is only the offline fallback.

---

## Building, signing and notarising

The author gets a signed, notarised `.dmg`, and nothing else. There's no update
mechanism, so a new version means sending every author a new disk image.

**The procedure is `authoring-assistant/BUILD.md`**: the build machine's
requirements, the one-time `notarytool` setup, `./packaging/build.sh` and its
options, and the release checklist. What you need to hold:

- Xcode command-line tools on the build machine;
- a **Developer ID Application** certificate (Apple account: **confirm at
  handover**);
- an App Store Connect key or app-specific password, stored as a `notarytool`
  keychain profile and read through `NOTARY_PROFILE`.

The app is about 255 MB because it bundles Python and pandoc. `--no-pandoc`
saves 190 MB, but then each author has to install pandoc before their first Word
conversion.

**If the Developer ID lapses,** existing installs keep working. No new build can
ship without Gatekeeper refusing it.

---

## Sign-in: the *Textbook Author Console* OAuth App

The console signs each author in **as themselves**, by OAuth **device flow**:
no client secret, no callback in use, no relay.

- **The client ID ships in the registry** as `platform.console_oauth_client_id`.
  It's public by design, and the app reads it at launch, so authors normally have
  nothing to paste. A value pasted in Settings ("Signing in to see what is
  waiting") overrides it. That is a stand-in for a Mac that has never been able
  to fetch the registry, not the normal path.
- **"Enable Device Flow" must be ticked** on the OAuth App, or every author's
  sign-in fails with `incorrect_client_credentials`, shown to them as "The
  sign-in identifier in Settings is not recognised."
- **Scope: `public_repo repo:invite`** (since `authoring-assistant` `c90f2ed`,
  24 Sep 2026). `public_repo` is enough to reply to and close suggestions, merge
  draft changes into `drafts` and open the publish PR, and it gives no access to
  private repositories. **This is why every content repo must be public**, and
  the registry's CI enforces it. `repo:invite` only lets the author see and accept
  an invitation to a repository, so an author of a request-made book can accept
  the invitation to their book inside the app. It grants no access to any
  repository's contents. Builds from before `c90f2ed` ask for `public_repo`
  alone. An author who signed in with one of those is asked to sign in again, and
  the new scope reaches authors only with a new signed, notarised build
  (DOCS-AUDIT item 15). Don't widen the scope further.
- **It's one app for every book.** Revoking it signs out every author on every
  book. Each author can revoke their own grant at
  <https://github.com/settings/applications>.
- **Never reuse *Textbook CMS* for this**, and vice versa (CMS-RELAY.md).

If the OAuth App is ever recreated, change `console_oauth_client_id` by registry
PR. Each author's app picks it up at its next launch. Authors who are offline
keep the old ID until they next fetch, so leave the old app in place for a while.

---

## What authors see from the platform

- **Suggestions from readers** are issues labelled `suggested-edit` on the
  book's repo, filed by the suggest-edit function **as the GitHub App**
  (`textbook-suggest-edit[bot]`). The console's accept and decline replies are
  posted as the **author**, not the App. INFRASTRUCTURE.md §2 covers the
  function.
- **Draft changes** are PRs into the book's `drafts_branch`. **Going live** opens
  and merges a single `drafts → live_branch` PR on the author's press.
- **The Weekly jobs strip** is hardcoded to book one's four workflow filenames
  (`WEEKLY_JOBS` in `app/github.py`) and queried on the open book. **For any book
  without those four files, it shows a standing "Weekly jobs:" error, and that
  error hides the "Nothing is waiting" note.** That is a defect in the app (see
  DOCS-AUDIT.md). Until it's fixed, tell the authors of such books to ignore it.
  Book one: changing, adding or retiring one of those workflows means changing
  `WEEKLY_JOBS` too, and shipping a new build.

---

## DeepSeek: book text leaving the institution

`app/llm.py` posts **the full text of the chapter being worked on** (truncated
at 90,000 characters, and the author is told) to
`https://api.deepseek.com/chat/completions` (model `deepseek-chat`), and asks for
up to 25 glossary terms. The author approves each term individually.

- It is **off unless the author has pasted their own key, and off unless they
  tick the box** for that chapter. There is no platform DeepSeek account.
- The key is kept in the author's login Keychain (`Authoring Assistant` /
  `deepseek-key`).
- Every failure path falls back to the deterministic checks.

**Nobody has recorded who approved book text going to a third-party LLM, or who
pays for the key.** Now that the app serves any book, that is the platform's
question, not one maintainer's. A book may hold material that can't leave its
institution. Decide whether the option should exist at all, per book or
platform-wide, and write the decision down here.

---

## When an author reports a problem

The author-visible failure modes, word for word, are in each book's
`docs/troubleshooting.md`, *The author's console won't sign in*. Ask for:

- the exact message, and the name after **Signed in as**;
- `~/Library/Application Support/Authoring Assistant/log.txt`. The app has no
  window, so everything it prints goes there.
