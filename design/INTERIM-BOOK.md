# The interim second book: hand steps and test plan

**Date:** 19 Sep 2026. **Implements:** `MULTI-BOOK-HOSTING.md` §6.
**Checked against:** `textbook-registry` `d74eeae`, `suggest-edit-function` `9b7922f`
(production serves registry `d74eeae`), `authoring-assistant` `befb6a8`, and
`Obsidian Vault` `c1b6f03`.

| | |
|---|---|
| Slug | `platform-test-book` |
| Repo | `dept-coordinator-test/platform-test-book`, public. Local checkout: `textbook_project/platform-test-book`, with `origin` set to `git@github-coord:…` and branches `main` and `drafts` |
| Site | `https://platform-test-book.pages.dev`, Cloudflare Pages project `platform-test-book` |
| Registry entry | `interim-book-registry-entry.json`, next to this file |

In this document, `URL=https://suggest-edit-function.vercel.app/api/suggest-edit`,
`B1=https://confused4now.org` and `B2=https://platform-test-book.pages.dev`.

---

## What I verified locally before writing this

| Consumer | Check | Result |
|---|---|---|
| Registry `validate.mjs` | The candidate `registry.json` (book one plus this entry), with `--base` set to the current registry | valid, and no slug removed |
| Registry `validate.mjs` | The same entry with `status: live` | **rejected**: a `pages.dev` domain is allowed only for a `static` book in `preview`. This is intended |
| Registry `check-github.mjs` | The candidate | one FAIL: the repo can't be read (404), because it doesn't exist yet. Warns that the domain doesn't answer yet |
| Function | Candidate bundled into `registry/bundled.mjs`, then `npm test` (the same gate Vercel's build runs) | 64 out of 64 pass |
| Function resolver | `B2`, `B1`, `https://drafts.platform-test-book.pages.dev`, an upper-case variant, and `http://` | B2 goes to the coordinator repo and B1 to `textbook`. The other three are unregistered |
| Console `registry.parse` and `identify` | The candidate, the local book-two checkout, book one's vault, and a book-two copy whose slug is `social-research-methods` | ok, ok, and `remote_mismatch` |
| Console `plan_change` | `"recieve" should be "receive"` on `content/chapter-1.md` | can apply (line 13) |
| Parity `--local ..` | The current registry against the candidate | Identical output for both: 30 ok, 0 drift, 21 retired, 0 failed |
| Book one's vault `loadBook` | The candidate with `GITHUB_REPOSITORY=textbookproject2026-alt/textbook` | resolves `social-research-methods` |
| Book-two site | `npm run build:site`, then headless Chrome with `fetch` stubbed | The form mounts on 4 pages, sends `path: "content/chapter-1.md"`, shows the issue link on 201 and "(HTTP 502)" on failure |

---

## Before you start: things that would invalidate the test

1. **`BOT_TOKEN` may still be set on the Vercel project.** If it is, every App failure
   falls back to the PAT, and a classic PAT can open issues on *any* public repo. The
   "App not installed" test would then return **201** instead of 502. The
   cross-account test would also pass without the App ever being used. Check it in
   Vercel → Settings → Environment Variables. Removing it is a production change, so
   the decision is yours. First confirm that book one's recent submissions log
   `credential=app` (issue #30 on 15 Sep was filed by `textbook-suggest-edit[bot]`). If
   you keep it, test T2a can't be run, and T2b has to be judged from the log line
   alone.
2. **"Not installed" is a 502 by design.** You asked that it fail "with the clear
   message rather than a 502". The function returns **502**
   `{"error":"github: the app isn't installed on that repository"}`
   (`api/suggest-edit.js:117-125`, README table). The clear message is the `error`
   field and the log line, not the status code. It also sends no `userMessage`, so the
   reader sees the form's generic copy. T2a checks what the code actually does. If you
   want a different status or a reader-facing message, the function has to change
   first.
3. **The rate limit is per IP, not per book.** It allows 5 an hour per warm instance,
   and it counts every POST that gets past the honeypot, **including ones rejected by
   validation**. Honeypot probes are free. The plan below makes 4 real POSTs. If you
   hit 429, wait an hour, or switch networks.
4. **Don't file test suggestions on book one.** Its `counted_from` is `2026-09-16`, so
   anything filed now counts as reader activity. Every book-one check below uses a
   preflight or the honeypot, and neither files an issue.

---

## Hand steps, in order

| # | Step | Depends on | Why the order |
|---|---|---|---|
| 1 | **Create the repo** `dept-coordinator-test/platform-test-book` while signed in as the coordinator. Make it **public** and **empty**: no README, licence or .gitignore | – | CI and the console both require it to be public. An initialised repo would reject the push |
| 2 | **Push:** `cd platform-test-book && git push -u origin main drafts` | 1 | Both branches must exist before the registry PR, or `check-github` fails |
| 3 | **Create the Pages project.** Go to Cloudflare → Workers & Pages → Create → **Pages** → Connect to Git. Authorise the **dept-coordinator-test** GitHub account and grant only this repo. Name the project `platform-test-book`. Production branch `main`, preset None, build command `git fetch --unshallow \|\| true && npm run build:site`, output `public`, env `NODE_VERSION=22`. Then Save and deploy | 2 | Pages builds from the pushed repo |
| 3a | **Check the hostname Cloudflare assigned.** If it isn't exactly `platform-test-book.pages.dev` (the name was NXDOMAIN on 19 Sep, but that isn't a guarantee), use the real one in `quartz.config.yaml` `baseUrl`, the README, and the entry's `site.domain` and `site.host.project`. Commit and push | 3 | The function matches `https://<site.domain>` exactly. A wrong domain means every suggestion gets 403 |
| 3b | **Check the site:** open `B2/chapter-1`. It should have "Edit on GitHub ↗" and **Suggest an edit** under the title. Don't submit yet: it would get 403, since the origin isn't registered | 3 | |
| 3c | **Decide about `paid_by`.** The entry says `platform`, which assumes the Pages project is in a platform Cloudflare account. If you create it in an account of the coordinator's, change it to `maintainer` | 3 | This is a recorded fact. Nothing checks it |
| 4 | **Run T0** (baselines) | 3 | You need a "before" to compare with |
| 5 | **Open the registry PR.** Paste `interim-book-registry-entry.json` as the second element of `books`. CI runs validate, github-facts and parity | 2 (hard), 3 (domain final) | `check-github` fails while the repo is missing. It only warns while the site is down |
| 6 | **Merge.** Watch the `deploy` workflow on the merge commit go green. It triggers the Vercel hook and waits for `X-Registry-Version` to show the merge SHA | 5 | The function bundles the registry at build time, so book two resolves only after this |
| 7 | **Run T2a** (App not installed) | 6, and **before** 8 | This is the only window in which the negative test can run |
| 8 | **Install the GitHub App from the coordinator account.** Go to https://github.com/apps/textbook-suggest-edit → Install → `dept-coordinator-test` → **Only select repositories** → `platform-test-book`. It should ask for Issues: read & write and Metadata: read, nothing else. Never choose "All repositories": the account also holds an edition-template fork | 1, 7 | The App is public (checked 19 Sep), so another account can install it |
| 9 | **Run T1, T2b, T3, T4 and T5** | 8 | |
| 10 | **Afterwards:** open a registry PR setting `status: retired` (never delete the entry). Optionally uninstall the App and delete the Pages project. Then run T5 once more | – | Keeps the slug reserved (`MULTI-BOOK-HOSTING.md` §6c) |

**Not needed in the design's order:** §6c says to install the App after the merge "so
the 'installed but unregistered' alarm doesn't fire". That alarm doesn't exist:
`check-github.mjs` doesn't look at App installations at all. Step 7 is the reason the
order still matters.

---

## Test plan

### T0: Baselines (step 4, before the registry change)

```bash
curl -si -X OPTIONS "$URL" -H "Origin: $B1" | grep -iE '^HTTP|access-control-allow-origin|x-registry-version'
#  -> 204, ACAO https://confused4now.org, x-registry-version d74eeae… (or later)
curl -s -X POST "$URL" -H "Origin: $B1" -H 'Content-Type: application/json' -d '{"website":"probe"}'
#  -> 201 {"issueUrl":"https://github.com/textbookproject2026-alt/textbook/issues"}   (honeypot: nothing filed)
curl -si -X OPTIONS "$URL" -H "Origin: $B2" | head -1
#  -> 403: the function doesn't know book two yet
gh api 'repos/textbookproject2026-alt/textbook/issues?state=all&per_page=1' --jq '.[0].number'
#  -> 34 on 19 Sep. Write the number down
```

Also record the latest `parity` run's summary line.

### T1: Multi-tenant routing (after 8)

| | Do | Expect | Proves |
|---|---|---|---|
| a | `curl -si -X OPTIONS "$URL" -H "Origin: $B2"` | 204, `access-control-allow-origin: https://platform-test-book.pages.dev`, `vary: Origin` | The second origin is registered, and CORS echoes that book's own origin |
| b | The same preflight with `https://PLATFORM-test-book.pages.dev`, `http://platform-test-book.pages.dev`, `https://drafts.platform-test-book.pages.dev` and `https://www.platform-test-book.pages.dev` | 403 each time, with no ACAO header | Matching is exact, never by parent. The drafts preview on Pages (which Cloudflare builds for the `drafts` branch) is a real, unregistered origin |
| c | `curl -s -X POST "$URL" -H "Origin: $B2" -H 'Content-Type: application/json' -d '{"website":"probe"}'` | 201 `{"issueUrl":"https://github.com/dept-coordinator-test/platform-test-book/issues"}` | The origin resolves to book two's repo, **not** book one's. Nothing is filed and no rate budget is used |
| d | In a browser, open `B2/chapter-1` → Suggest an edit. Enter the suggestion `"recieve" should be "receive"` and send it | "Thank you…" with a link to an issue in `dept-coordinator-test/platform-test-book`. The title is `Suggested edit: content/chapter-1.md`. The **File:** link goes to `…/platform-test-book/blob/main/content/chapter-1.md`. The labels `suggested-edit` and `needs-triage` exist (created on first use). The author is `textbook-suggest-edit[bot]` | A real browser submission from book two files on book two |
| e | Repeat T0's `gh api … textbook/issues` | The same number as in T0 | **Nothing** reached book one's repo |

### T2: Per-repo App installation across accounts

| | Do | Expect | Proves |
|---|---|---|---|
| a | **Step 7, before the App is installed:** submit a real suggestion from `B2/chapter-2` | The form shows the generic failure "(HTTP 502)". In DevTools → Network, the response is `{"error":"github: the app isn't installed on that repository"}`. `vercel logs` shows `credential: app token unavailable for dept-coordinator-test/platform-test-book — the app isn't installed on dept-coordinator-test/platform-test-book; no fallback book=platform-test-book`. No issue is filed | A repo with no installation fails with the specific not-installed error, not `github: credential unavailable`. **If you get 201 and `credential=bot_token` instead, `BOT_TOKEN` is still set and the test is void** |
| b | After step 8, immediately re-send that suggestion (the lookup that answered "not installed" isn't cached) | 201, and an issue in book two's repo filed by `textbook-suggest-edit[bot]`. The log shows `credential=app (minted installation token for dept-coordinator-test/platform-test-book, installation <N2>) book=platform-test-book` | `GET /repos/{owner}/{repo}/installation` finds an installation under a **different account**. The exchange granted exactly that one repo, or the function would have refused with `token exchange granted …, not …` |
| c | Compare `<N2>` with book one's installation ID. Find it at github.com/settings/installations while signed in as `textbookproject2026-alt`: the ID is the number in the Configure link. Or take it from an older `credential=app … textbook` log line | They differ | Each repo gets its own installation. The single `GITHUB_APP_INSTALLATION_ID` model is really gone |
| d | Optional, within the hour: one more suggestion from B2 | `(cached installation token …)` | The cache is keyed per repo |

### T3: The console

Restart the app after step 6. It fetches the registry once per launch, and
raw.githubusercontent can lag by up to about 5 minutes.

| | Do | Expect | Proves |
|---|---|---|---|
| a | Sign in as **dept-coordinator-test** (authorise the console's OAuth App the first time) and open the book picker | Only `Platform test book`, marked "not yet public", with 1 book hidden (book one), unless the coordinator has push on `textbook` | The picker filters by the signed-in account's push permission per repo |
| b | Add `textbookproject2026-alt` as a **Write** collaborator on book two and accept the invite. Sign in as it and press "Check again" | **Both** books are listed | The picker lists N=2 when access allows |
| c | Remove that collaborator and check again (still signed in as `textbookproject2026-alt`) | Only book one, with 1 hidden | Losing push hides the book; it isn't offered and then refused |
| d | Open `platform-test-book` (the local checkout) as the vault, then try to choose book one | The book is fixed to Platform test book. Choosing book one is refused: "The vault you have open, “platform-test-book”, decides which book…" | The open vault decides the book |
| e | `cp -R platform-test-book /tmp/ptb-mismatch`, set its `textbook.config.json` slug to `social-research-methods`, and open it as the vault | "This vault is a copy of dept-coordinator-test/platform-test-book, but “Education Tool Project 2026” is kept in textbookproject2026-alt/textbook. Nothing will be written into it until the two agree." | A vault/book mismatch is refused. (A slug that isn't registered, for example `nope`, gives "isn't a registered textbook") |
| f | Back in the real checkout, as the coordinator, open the suggestions list | Only the issues from T1d and T2b. None of book one's | `from_book` and the per-book issue query |
| g | Apply T1d's suggestion, then publish | `content/chapter-1.md` line 13 now reads "receive" on `drafts`, and a drafts → main pull request opens on **book two's** repo. After you merge it, Pages rebuilds and `B2/chapter-1` shows "receive" | The console's write path, end to end, on a second repo under a second owner |

### T4: Parity with two books

| Do | Expect | Proves |
|---|---|---|
| Check the `parity` run on the registry PR and on the merge commit | Green. The summary line is identical to T0's (locally: 30 ok, 0 drift, 21 retired, 0 failed) | `parity.mjs` is pinned to `SLUG = 'social-research-methods'` and reads only that book's repos, so book two is invisible to it. Checked locally: the output is byte-identical with and without the entry |

`parity.mjs` says "Parity is retired before a second book is added (DESIGN §5 step 8)".
This test adds the second book while parity is still running. That's harmless, as
shown above, but the comment is now out of date.

### T5: Book one is unaffected

Run after step 6, again after step 8, and once more after step 10.

| Do | Expect | Proves |
|---|---|---|
| Repeat T0's preflight and the honeypot probe for B1 | Identical to T0 apart from `x-registry-version` | Book one still resolves to `textbook`, with its own CORS origin |
| `curl -si -X OPTIONS "$URL" -H 'Origin: https://bptext2026.xyz' \| head -1` | 403 | Legacy origins still aren't accepted |
| T0's `gh api … textbook/issues` | Unchanged for the whole test | No suggestion leaked to book one |
| Registry CI (`validate`, `github-facts`, `deploy`) on every commit | Green | The shared pipeline handles N=2 |
| The next scheduled runs of book one's Actions (dashboard, contributors, backup-annotations) | Green | They pick the book by slug plus `GITHUB_REPOSITORY`. Checked locally: `loadBook` still resolves book one against the candidate registry |
| The console, signed in as `textbookproject2026-alt`, with the `Obsidian Vault` open | State ok. The suggestions list is as before | The console is unaffected for book one |
| Load a chapter on `confused4now.org` and open the form (**don't send**) | Works as before | `publish.js` wasn't touched: its endpoint is baked in |

---

## Notes on the book-two repo

- **The form is a second client, not a copy of `publish.js`.** `suggest-edit/suggest-edit.js`
  reads each page's source path from the edit-on-github link, which is Quartz's own
  `fileData.filePath`. `scripts/add-suggest-edit.mjs` then links the script into every
  built page. Its endpoint is a constant marked `registry: platform.suggest_edit_endpoint`.
  Nothing in the build reads it from the registry, which is a simplification made for a
  test book.
- **Removed from the template:** edition-integrations (Hypothes.is, Plausible), the docs,
  `sync-upstream.sh`, Quartz's own workflows, and the Dockerfile. It's a book with no
  upstream, and the registry entry has `analytics.plausible: null`.
- **No book-repo Actions** (backup, dashboard). §6a lists these as testable, but they
  aren't needed for the services test. Add them to the repo if you want that covered too.
