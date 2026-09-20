# Textbook registry: design

**Status:** design for review. No service code has been written and no repository has changed.
**Date:** 15 Sep 2026.
**Read against:** `Obsidian Vault` (`textbook`) at `c760b43`, `suggest-edit-function` at
`be3d7ac`, `authoring-assistant` at `f28334e`, `textbook-edition-template` at `3675313`,
`quartz-edition-extras` at `8f4e323`.
**Supersedes:** item S1 of `new-textbook-template-proposal/PLAN.md` (one Vercel project per
book, configured by env vars). The platform is now shared, so that approach no longer
applies. The PLAN's G-items still apply, but their config keys move into the registry.

---

## 0. What a service needs to know about a book

I went through every file in the five repos and listed each constant tied to this book. Each
constant falls into one of three groups:

- **A per-book fact.** It goes in the registry.
- **A per-book value derived from a fact**, such as an issues URL built from the repo. It is
  *not stored*, because the domain cutover showed what happens when the same fact is written
  down in five places.
- **A platform convention** that happens to be hardcoded but is the same for every book. It
  stays in code, and the registry doesn't carry it.

### 0a. Per-book facts (these become registry fields)

| Fact | Hardcoded today at | Read by |
|---|---|---|
| Content repo `textbookproject2026-alt/textbook` | `suggest-edit.js:29-30`; `publish.js:12`; `admin/config.yml:12`; `authoring-assistant/app/github.py:24-25`; `app/web/app.js:862`; `gen-dashboard.mjs:93` (fallback) | suggest-edit, reading site, CMS, console, Actions |
| Live branch `main` | `suggest-edit.js:31`; `publish.js:13`; `github.py:33`; `app.js:862` | suggest-edit (issue file links), reading site (edit/history links), console (publish PR base) |
| Drafts branch `drafts` | `admin/config.yml:31` (the "load-bearing line"); `github.py:32`, and the literal `base=drafts` at `github.py:254` | CMS, console |
| Site domain `confused4now.org` | `suggest-edit.js:27`; `textbook.config.json:4`; `.lycheeignore:1`; `backup-annotations.mjs:64`; `gen-dashboard.mjs:674`; `app.js:860`; `textbook-edition-template/quartz.config.yaml:229` | suggest-edit (CORS), Actions, console, edition footer, link check |
| Legacy origins `https://bptext2026.xyz` | `backup-annotations.mjs:73` (`LEGACY_SITES`) | annotation backup **only** |
| Obsidian Publish site: `siteId 1443b409…`, host `publish-01.obsidian.md` | `.obsidian/publish.json:2-3` | nothing at runtime. It is operator inventory, and it identifies which Publish site a vault uploads to |
| Plausible script `pa-eii3VlmU1ClI0VxGOsCTe.js` | `publish.js:791` | reading site |
| Plausible site name `bptext2026.xyz` (still the staging registration) | `textbook.config.json:6` (as `plausible_public_url`) | dashboard Action |
| Hypothes.is groups `ZGY29zLM`, `L9KgjVPa` | `backup-annotations.mjs:58-61` **and** `gen-dashboard.mjs:109-112`, kept in sync by a "mirror this" comment | backup and dashboard Actions |
| Edition template repo | `gen-dashboard.mjs:98`; `gen-derivatives.mjs:68`; `derivatives.yml:24` (comment); `sync-upstream.sh:64` (inside the template itself) | Actions |
| Fork owners to skip `textbookproject2026-alt` | `gen-dashboard.mjs:99`; `gen-derivatives.mjs:71` | Actions |
| Edition template preview `textbook-edition-template.pages.dev` | `docs/INFRASTRUCTURE.md` §5; coordinator guide | docs, landing page |
| CMS host `textbook-cms.pages.dev` | Worker variable `ALLOWED_DOMAINS` (in no repo); the OAuth App homepage | CMS relay |
| Title "Education Tool Project 2026" | `textbook.config.json:2` | `configure.mjs` templates, contributors and dashboard pages, landing page |
| Maintainer "Brandon" | `textbook.config.json:3` | templates, contributors page |
| Licence `CC-BY-SA-4.0` | `textbook.config.json:5`; edition footer `quartz.config.yaml:230` | templates, contributors page, edition footer |
| One-line summary | `templates/index.md:3` (prose) | landing page (new, so nothing reads it yet) |

### 0b. Derived, never stored

These all follow from 0a. Today several of them are written out in full, which is the drift
risk this design removes.

| Value | Derivation | Hardcoded today at |
|---|---|---|
| Canonical origin | `https://` + domain | `suggest-edit.js:27` |
| Issues index URL (honeypot response) | `https://github.com/{repo}/issues` | `suggest-edit.js:34` |
| File, edit and history links | `github.com/{repo}/{blob,edit,commits}/{live_branch}/…` | `suggest-edit.js:236`; `publish.js:1476,1480`; `app.js:862` |
| Hypothes.is discussion search | `hypothes.is/search?q=url:{origin}/*` | `app.js:861`; `docs/moderating-comments.md` |
| Plausible public dashboard | `https://plausible.io/{plausible.site}` | `textbook.config.json:6` |
| Edition footer "Canonical textbook" link | canonical origin | `quartz.config.yaml:229` |
| `.lycheeignore` entry | canonical origin | `.lycheeignore:1` |
| Annotation page URIs | `location.origin` at runtime | `publish.js:621-628`, which already derives it correctly |

### 0c. Platform conventions (not per-book, and not in the registry)

I checked each of these to confirm it really is the same for every book. If a book ever needs
a different value, that is a schema change, not a new field added quietly.

- **Labels** `suggested-edit` and `needs-triage`: `suggest-edit.js:36`, `gen-dashboard.mjs:103`,
  `github.py:242`, `console.py:25`.
- **The issue title and body format** (`Suggested edit: <path>`, `**File:**`,
  `### Suggested edit`, `**Submitted by:**`). Written at `suggest-edit.js:239-266` and parsed at
  `console.py:52-78`. It is a cross-service contract and is covered by the migration's golden
  tests (§5).
- **Annotation tag vocabulary** `copy-edit`, `discussion`: `publish.js:198`.
- **Weekly job filenames**: `github.py:48-53`, and the workflow files themselves.
- **Branch names** for `backups` and `chore/*-update`: in the workflow `env:` blocks.
- **Vault layout** `chapters/`, `chapters/Definitions/`, `assets/`, `glossary.md`:
  `convert.py:293,299-301`, `admin/config.yml:53-54,75,118`.
- **Console OAuth scope** `public_repo` (`github.py:42`). This one makes **"every registered
  content repo is public" a platform invariant**, and registry CI enforces it (§2d).
- **Rate limits, field caps and timeouts** in `suggest-edit.js`.
- **Sveltia version pin** (`admin/index.html:19`).
- **Static-host patterns for edition sites**: `gen-derivatives.mjs:76`.

### 0d. Shared infrastructure (once per platform, not per book)

These are also hardcoded, and they belong in the registry's `platform` block because
`configure.mjs` has to render them into each book:

- Suggest-edit endpoint `https://suggest-edit-function.vercel.app/api/suggest-edit` (`publish.js:44`)
- CMS auth relay `https://sveltia-cms-auth.brandonproject2026.workers.dev` (`admin/config.yml:40`)
- Edition extras repo `textbookproject2026-alt/quartz-edition-extras` (`quartz.config.yaml:293,315`)
- Console OAuth client ID `Ov23lixHRSXxMpKK8lVP`. Today it lives only in each Mac's
  `state.json`, pasted by hand (`server.py:504-505`). `INFRASTRUCTURE.md` §10 calls the paste
  step "the single most likely thing to strand a new author". A device-flow client ID is not
  a secret, so the registry can ship it and remove that step.
- Identities that file issues or commit for the platform: `aldogo-bot` (`gen-contributors.mjs:61`)

**Not in the registry at all:** department editions. They are forks under coordinators'
own accounts and outside the project's control (`INFRASTRUCTURE.md` §5). `gen-derivatives`
discovers them, and it should stay that way. `quartz-edition-extras` has no book constants.
Its plugins take `repo`, `branch` and `plausibleScriptSrc` as options, so it serves many books
unchanged.

---

## 1. Data shape

### 1a. Format decisions

- **JSON**, with a JSON Schema beside it. Every consumer can parse it with no dependency:
  the zero-dependency Node function, the stdlib-only Python app, `node` in Actions, and
  Workers. YAML would add a parser dependency to two of them.
- **`books` is an array, not an object keyed by slug.** `JSON.parse` and Python's `json` both
  accept duplicate keys silently and keep the last one, so a copy-pasted entry would
  *silently replace* a book. With an array, a duplicate is detectable: CI rejects it, and
  every consumer checks again when it loads the registry and refuses to start.
- **`schema_version`** is an integer. A consumer refuses a major version it doesn't know.
- **Store facts, derive URLs** (§0b).
- **No secrets, and nothing that isn't already public.** Every value below is already visible
  in a public repo or in page source. Credentials are referenced only through the platform
  convention (§4), never by value.

### 1b. The registry, with this book as the first entry

```json
{
  "schema_version": 1,

  "platform": {
    "suggest_edit_endpoint": "https://suggest-edit-function.vercel.app/api/suggest-edit",
    "cms_auth_relay": "https://sveltia-cms-auth.brandonproject2026.workers.dev",
    "edition_extras_repo": "textbookproject2026-alt/quartz-edition-extras",
    "console_oauth_client_id": "Ov23lixHRSXxMpKK8lVP",
    "automation_logins": ["aldogo-bot"]
  },

  "books": [
    {
      "slug": "critical-realism",
      "status": "live",

      "title": "Education Tool Project 2026",
      "summary": "An open-access textbook on ontology and social research methods.",
      "licence": "CC-BY-SA-4.0",
      "maintainer": {
        "name": "Brandon",
        "github": null
      },

      "content": {
        "repo": "textbookproject2026-alt/textbook",
        "live_branch": "main",
        "drafts_branch": "drafts"
      },

      "site": {
        "domain": "confused4now.org",
        "host": {
          "kind": "obsidian-publish",
          "site_id": "1443b409a84e491249da35fdd4b91de6",
          "publish_host": "publish-01.obsidian.md"
        },
        "legacy_origins": ["https://bptext2026.xyz"]
      },

      "analytics": {
        "plausible": {
          "script_src": "https://plausible.io/js/pa-eii3VlmU1ClI0VxGOsCTe.js",
          "site": "bptext2026.xyz",
          "dashboard_public": true
        }
      },

      "annotations": {
        "hypothesis_groups": [
          { "id": "ZGY29zLM", "label": "test-group" },
          { "id": "L9KgjVPa", "label": "Biology edition" }
        ]
      },

      "suggest_edit": {
        "enabled": true
      },

      "cms": {
        "enabled": true,
        "host": "textbook-cms.pages.dev"
      },

      "editions": {
        "template_repo": "textbookproject2026-alt/textbook-edition-template",
        "template_preview": "https://textbook-edition-template.pages.dev",
        "skip_fork_owners": ["textbookproject2026-alt"]
      }
    }
  ]
}
```

Two values are marked as gaps rather than guessed:

- **`maintainer.github` is `null`.** No repo records the maintainer's GitHub login. Nothing
  depends on it yet, but it is the natural CODEOWNER for the book's registry entry, so fill
  it in before §2d's review rule is switched on.
- **`plausible.site` is the staging name.** It is correct today (the Plausible site was never
  re-registered, per `INFRASTRUCTURE.md` "The domain cutover"), but it is a known leftover.

`cms.host` records **today's** host. Under the shared CMS (§3c) it becomes `null` and the book
is served at a path on the shared host. The entry records reality at each migration step,
not the end state.

### 1c. Field rules

| Field | Rule | Why |
|---|---|---|
| `slug` | `^[a-z0-9]+(-[a-z0-9]+)*$`, 3–40 chars. **Immutable**: CI compares against the base branch and rejects any change to an existing slug. **Never reused**: a book is retired, never deleted | It is the stable identifier. Reusing one would hand a new book the old book's issues, backups and URLs |
| `status` | `preview` \| `live` \| `retired` | See below |
| `site.domain` | Lower-case ASCII host (IDNs stored as punycode), no scheme, port, path or trailing dot. `null` allowed only when `status` is `preview` | It is the lookup key, so it has exactly one spelling |
| `site.domain` uniqueness | Unique across all books **and** absent from every book's `legacy_origins` | Lookups must be unambiguous |
| `site.legacy_origins` | Full `https://` origins. Used **only** by the annotation backup. **Never** accepted as a request origin by any service | Old domains no longer serve the book (`suggest-edit.js:25-26`), so a request "from" one is not a reader |
| `content.repo` | `owner/name`. Unique across books. Must exist and be **public** (checked by CI) | The console's `public_repo` scope (§0c) |
| `content.*_branch` | Must exist on the repo (CI) and must differ from each other | `drafts == live` would remove the review step `admin/config.yml:14-29` exists to protect |
| `cms.host` | Exact hostname, no wildcards, and not a bare platform suffix (`pages.dev`, `workers.dev`) | It becomes a credential-issuing allowlist (§4f) |
| unknown keys | Rejected | So that a misspelt key like `live_brnach` fails CI instead of silently falling back to a default |

**Status semantics.** A book with no domain yet exists as `preview`. It has a slug, so its
Actions, console and CMS work, but no request can resolve to it by domain. `preview` with a
domain resolves everywhere, so a new book can be tested end to end, but it isn't listed on the
landing page. `live` means resolved and listed. `retired` resolves **nowhere**, and its slug
and domain stay reserved.

### 1d. What happens to `textbook.config.json`

It shrinks to `{ "slug": "critical-realism" }`. Title, maintainer, licence, site URL and
Plausible URL move into the registry, and `configure.mjs` reads them from there. The cost is
that retitling a book becomes a registry pull request instead of a book-repo commit.

I recommend accepting that cost, for a security reason (§4e): **anyone with Write on a book
repo can edit `textbook.config.json`**. That includes every trusted CMS contributor
(`OAUTH-SETUP.md` step 6). The facts that route credentials (`content.repo`, `domain`,
`drafts_branch`, `cms.host`) must not be editable from there. Splitting "cosmetic" fields
into the book repo and keeping "routing" fields central would work too, but it recreates two
sources of truth for one book. It isn't worth that for fields that change about once a year.

---

## 2. Where it lives and how services read it

### 2a. The options against the constraints

| | Vercel function (cold starts, no FS) | Cloudflare Worker (upstream fork) | Desktop app (signed, notarised) | GitHub Actions (in each book repo) | Main weakness |
|---|---|---|---|---|---|
| **JSON in a public repo, fetched at runtime** | A fetch on every cold start adds latency and a new failure mode. Suggestions are lost if the fetch fails, because it must fail closed | Needs code in a third-party Worker | Works | Works | A merged registry change takes effect instantly on the service that holds the GitHub credential, with no deploy gate and no atomic rollback |
| **A small API** | Same runtime dependency as above, plus a service to host and secure | Same | Works | Works | One more production service for a list that changes a few times a year |
| **Env config per service** | Works | Works (it's how `ALLOWED_DOMAINS` is set today) | Doesn't fit: the author can't set env vars in a `.app` | Per-repo variables | N copies of the same facts. That is the five-places problem from the domain cutover, made worse |
| **Registry repo as the source, delivered per consumer** (recommended) | Bundled at build | Env var generated from the registry at deploy | Fetched at launch, last good copy cached, snapshot bundled | Fetched at job start | Consumers can lag the registry if a deploy hook fails. Mitigated in §2c |

### 2b. Recommendation

**The single source is a new public repo, `textbookproject2026-alt/textbook-registry`, holding
`registry.json` and `registry.schema.json`.** Each consumer gets the registry by the route
that matches **what a tampered entry could do through it**:

| Consumer | How it reads the registry | When a change takes effect | Reasoning |
|---|---|---|---|
| **suggest-edit function** (Vercel) | Fetched **by commit SHA** at build time and bundled into the deployment. The handler imports it. No runtime fetch | On redeploy, triggered by the registry's CI calling a Vercel deploy hook | It holds the GitHub credential, so a registry change should pass through a build that validates it and runs the tests. Bundling removes cold-start cost and the failure mode. Vercel instant rollback restores code and registry **together** |
| **CMS auth relay** (Cloudflare Worker) | Registry CI generates `ALLOWED_DOMAINS` from the `cms.host` values and pushes it with `wrangler secret put` | On that push | The Worker is upstream `sveltia-cms-auth`, and it stays unmodified. That allowlist decides which sites can receive contributors' GitHub tokens (§4f), so it only changes through CI |
| **Shared CMS host** (Cloudflare Pages) | Build step generates `/<slug>/index.html` and `/<slug>/config.yml` | On a Pages build hook | Static files, no runtime lookup (§3c) |
| **Landing page** | Build step | On a build hook | Static |
| **Author's console** (desktop) | At launch, fetches `registry.json` from the registry repo's `main`. Falls back to the last good copy cached in Application Support, then to a snapshot bundled at release time. Shows "list of textbooks as of *date*" whenever it isn't using a fresh copy | At the next launch | A notarised release per new book isn't reasonable. The console acts only with the **author's own** token, and the vault cross-check (§3d) stops it acting on the wrong repo even if an entry is wrong |
| **Actions in book repos** | `curl` of `registry.json` from `main` at job start. Fails the job if unreachable | At the next run | `GITHUB_TOKEN` can only touch the book's own repo, so the worst a bad entry can do is produce a wrong generated page, which goes through the usual PR. Pinning would mean N repos to bump for every change |
| **Reading site** (`publish.js` on Obsidian Publish) | `configure.mjs` fetches the registry, renders `publish.js` and `admin/config.yml` from `templates/`, and the author uploads through the Publish dialog | When the author next publishes | Publish serves only what the dialog uploads (`publish.js:7-8`), so the values are baked in. The reading site never needs a runtime lookup (§3a) |

The rule behind this split: **consumers that hold or issue credentials read a pinned,
CI-validated copy at deploy. Consumers that act only with the caller's own authority read
the latest copy at runtime.**

### 2c. Staleness

Because of the build-time delivery, a failed deploy hook leaves a consumer running an older
registry. Two measures cover this:

- Every build-time consumer records the registry SHA it was built with. The function puts it
  in its logs and in an `X-Registry-Version` response header. The Worker gets a
  `REGISTRY_VERSION` variable.
- After dispatching deploys, registry CI polls each consumer and fails the run (a visible red
  check on the registry PR's merge commit) if it isn't serving the new SHA within ten minutes.

### 2d. Registry integrity (because the registry now routes credentials)

- `main` is protected: a pull request is required, with **one approving review from a platform
  owner (CODEOWNERS)**, and no admin bypass.
- CI on every PR checks:
  - the schema
  - uniqueness (slugs, domains, repos, CMS hosts)
  - slug immutability and no deletions
  - repo exists, is public, and has both branches
  - the suggest-edit GitHub App is installed on the repo, **and on no repo outside the
    registry** (§4)
  - a warning, not a failure, if the domain doesn't currently serve the book (a new domain
    may not be live yet)
- Publishing is done only by CI on `main`: deploy hooks, `wrangler secret put`, build hooks.
  No person runs these by hand.

---

## 3. Resolving a request to a book, per service

**The general rule:** every service resolves to exactly one book or refuses. No service has a
default book, a "first book" fallback, or a code path that runs before resolution with a
book-specific constant. Once the registry lands, a CI check in each service repo fails if
`textbookproject2026-alt/textbook` or `confused4now.org` appears anywhere outside tests and
fixtures.

**Domain matching** is exact: the whole normalised host equals `site.domain`. No suffix, prefix
or wildcard match, and no `www.` folding (`www.confused4now.org` doesn't resolve today and
isn't registered). So `confused4now.org.evil.example`, `evilconfused4now.org` and
`http://confused4now.org` all fail. Only `preview` and `live` books are candidates.

### 3a. Suggest-edit function: resolved by the `Origin` header

The front-end contract (`publish.js:17-42`, `suggest-edit.js:7-15`) **doesn't change**. The
browser already sends `Origin`, which is enough to identify the book, so no book field is
added to the body. That keeps `publish.js` unchanged apart from the endpoint URL, which is
also unchanged at first (§5).

Order in the handler, with the new step marked:

1. `OPTIONS` preflight. **New:** resolve `Origin`. If it resolves, return 204 with
   `Access-Control-Allow-Origin: <that origin>` (echoed from the registry value, not the raw
   header) and `Vary: Origin` (already set, and now essential for caches). If not, return
   **403 with no CORS headers**, so the browser blocks the real request.
2. **Resolution** (it replaces today's Origin check at `suggest-edit.js:423`):

   | Situation | Response | Log line |
   |---|---|---|
   | `Origin` resolves to a book with `suggest_edit.enabled` | continue with that book | `book=critical-realism` on every subsequent line |
   | `Origin` present, not registered (or a legacy origin, or a retired book) | **403** `{ "error": "origin not allowed" }`. The text is unchanged and the origin is still not echoed (test at `assertions.test.mjs:263`) | `origin rejected: <origin> (unregistered)` |
   | `Origin` registered, but `suggest_edit.enabled: false` | **403** `{ "error": "origin not allowed" }` | `origin rejected: <origin> (suggest_edit disabled for <slug>)` |
   | **`Origin` missing** | **403** `{ "error": "origin required" }` | `origin missing` |

   **The last row changes today's behaviour.** Today a request with no `Origin` (curl) is let
   through (`suggest-edit.js:420-423`, README "CORS"). With several books there is nothing to
   resolve it against, and picking one is the default this design forbids. In practice a
   non-browser client can still set `Origin` to any registered domain. That was already true
   and gives no reach beyond the registered books, so this isn't a new security control. It
   just refuses to guess. Smoke tests in the README and `TESTING.md` need an `Origin` header.
3. Method guard, Content-Type gate, body parse: unchanged.
4. **Honeypot.** Unchanged, except `issueUrl` is now the resolved book's issues index. This is
   why resolution has to come before the honeypot.
5. Rate limit: unchanged during migration (keyed on IP only). See §4d for why the shared model
   needs a per-book ceiling on top.
6. Validation: unchanged.
7. Credential: mint a token for `book.content.repo` (§4). If minting fails, including because
   the App isn't installed on that repo, return **502** `{ "error": "github: credential unavailable" }`
   and file nothing. A misconfigured book fails loudly instead of landing somewhere else.
8. File the issue using only values from the resolved `book` object. There are no module-level
   `REPO_*` constants. **Post-condition:** the `repository_url` in GitHub's response must equal
   `https://api.github.com/repos/{book.content.repo}`. If it doesn't, log at error level and
   still return 201, because the issue exists and the reader did nothing wrong. This check
   costs one comparison and catches a routing bug on its first occurrence.

### 3b. CMS auth relay: resolved by the upstream Worker's own allowlist

The relay has no per-book logic, and it stays that way. It swaps an OAuth code for the
contributor's own token and checks the requesting site against `ALLOWED_DOMAINS`.
**Resolution is membership:** a host in the list is accepted, and anything else is refused
by the upstream Worker's existing check. That is the popup that closes and leaves the user
signed out (`OAUTH-SETUP.md` Troubleshooting). The list is generated from the registry
(§2b), so an unregistered or retired book's CMS can't obtain tokens.

### 3c. Shared CMS host: resolved by URL path

The CMS page isn't served from the book's domain (Publish can't serve it,
`OAUTH-SETUP.md` step 4), so resolution uses the slug, not the domain.

- `https://<cms-host>/<slug>/` serves Sveltia, with `config.yml` generated at build. The
  `backend` block (`repo`, `branch: drafts_branch`, `base_url: platform.cms_auth_relay`) is
  generated from the registry. The `collections` block is read from the book repo
  (`admin/collections.yml`), because collections describe content.
- **Side benefit:** `branch: drafts`, the load-bearing line at `admin/config.yml:14-31`, leaves
  the book repo. A contributor with Write can no longer point the CMS at `main` with a PR.
  Branch protection on `main` stays the real guard, and this adds a second one.
- **Unknown slug:** no files exist at that path, so Pages serves a static `404.html` saying
  "No textbook called `<slug>` is registered here", with a link to the landing page.
- **Root `/`:** lists the registered books and links to each. It **never** serves a
  `config.yml`, because a root config is a default book by another name.
- `preview` books are built but not listed. `retired` books aren't built.

### 3d. Author's console: explicit choice, checked against the vault

The console has no incoming request. The risk is the author acting on book A's queue while
the vault that will be edited belongs to book B, or while the token acts on the wrong repo.
Resolution:

1. **Vault chosen.** Read `<vault>/textbook.config.json` and look up `slug`.
2. **Cross-check the git remote.** Parse `<vault>/.git/config` for `origin` and compare the
   `owner/name` path, case-insensitively, against `content.repo`. Ignore the host part, because
   the maintainer's remotes use the `github-textbook` SSH alias (`INFRASTRUCTURE.md` §1).
   Stdlib only.
3. Show the resolved book's title and repo in the console header at all times.

| Situation | Behaviour |
|---|---|
| No vault chosen yet | The author picks a book from the registry list. Suggestions and drafts load read-only, and **Accept with change is disabled** until a vault that matches is chosen |
| Vault has no `textbook.config.json` or no `slug` | "This vault isn't linked to a registered textbook." Console disabled. Conversion and glossary tools still work, because they need no book |
| `slug` not in the registry (or retired) | "*<slug>* isn't a registered textbook." Console disabled. It never falls back to another book |
| Vault's `origin` remote doesn't match `content.repo` | Refused, showing both values: "This vault is a copy of *X*, but *<title>* is kept in *Y*." |
| Registry unreachable, cached or bundled copy has the slug | Works, with "list of textbooks as of *date*" |
| Registry unreachable, slug in no copy | Treated as unknown slug. Refused |

### 3e. GitHub Actions in a book repo: resolved by `GITHUB_REPOSITORY`

- Look up the book whose `content.repo` equals `$GITHUB_REPOSITORY`, case-insensitively.
- **Also** require that `textbook.config.json`'s `slug` names the same book. Two independent
  keys that must agree catch a copied config file in a new book's repo, which is exactly how
  the new-book template would go wrong.
- Local runs (no `GITHUB_REPOSITORY`) use the slug alone. Today's fallback constant at
  `gen-dashboard.mjs:93` goes away.
- **Failure:** `::error::` naming the repository and exit non-zero before anything is written,
  matching the existing rule "never write a page from a failed fetch" (`gen-dashboard.mjs:57`).
  A fork of a book running a workflow by hand gets `forker/textbook`, which is unregistered,
  so the job fails. Today it would quietly report on this book's margin.

### 3f. Reading site and `configure.mjs`: resolved by slug at render time

`configure.mjs` reads `slug`, fetches the registry, and renders the templates. For an unknown
slug, a retired book, or a `live` book with a null domain, it exits non-zero **having written
nothing**. Today it writes each file as it goes (`configure.mjs:28-37`), so this means
rendering everything to memory first. At runtime `publish.js` has everything baked in, and it
still takes annotation URIs from `location.origin`, which is already correct.

### 3g. Landing page: no lookup

It lists `status: live` books with a domain, showing title, summary, maintainer name, a link to
the site, and a link to the edition template preview. A book that fails the listing rules
simply doesn't appear. With no incoming key to resolve, there's nothing to refuse.

> **Built 20 September 2026, and it lists more than this says.** The portal
> (`textbook-portal`, a static Cloudflare Pages project at the apex) lists `preview` books
> too, in their own *Not for readers* section, badged *"Preview — a demonstration, not for
> readers"*. §3g as written would hide book two, and showing status honestly is the point
> of the page; `PORTAL-CUTOVER.md` §5c is where that was decided. `retired` books are
> still never listed — that part is load-bearing (`MULTI-BOOK-HOSTING.md` §7).
>
> "A book that fails the listing rules simply doesn't appear" is implemented as a hard
> rule with a test behind it: one odd entry is skipped and warned about, never a failed
> build, because a malformed entry must not take down the platform's front page.

### 3h. Edition template and extras: no lookup

Editions are forks and never read the registry. Each book gets its own edition template
repo, rendered once from its registry entry when created (the footer link at
`quartz.config.yaml:229` and `UPSTREAM_URL` at `sync-upstream.sh:64`). `quartz-edition-extras`
needs no change.

---

## 4. Security: one function, many repos

### 4a. What exists today

- `BOT_TOKEN` is a Vercel env var read at `suggest-edit.js:285`. **Its type is unconfirmed.** The
  docs say it is a fine-grained PAT with Issues RW and Metadata R on `textbook`
  (`README.md:137-140`, `INFRASTRUCTURE.md` §6, §11). `PLAN.md` §2d.3 records a brief that
  said a classic `public_repo` PAT. Which one is live decides today's blast radius, so
  **check it before anything else**.
- Pushing to `suggest-edit-function` `main` deploys production (`README.md:170`). So **push
  access to that repo is already equivalent to holding the token**: anyone who can push can
  deploy code that reads `process.env.BOT_TOKEN`.
- The bot account `aldogo-bot` is a human-style account whose existence nothing can confirm
  (`INFRASTRUCTURE.md` §11).

### 4b. What changes when one function serves many books

| # | Threat | Present today? | What sharing adds |
|---|---|---|---|
| T1 | **Misrouting bug**: book A's suggestion filed on book B, with a reader's name and masked email in the wrong place | No (one repo) | New |
| T2 | **Registry tampering**: a bad merge points a domain at a repo it shouldn't reach | No registry | New, and the registry is now security-relevant |
| T3 | **Credential theft**: function compromise, Vercel account compromise, or a malicious deploy | Yes, reach is one repo | Reach grows to every book |
| T4 | **Shared fate**: one book's spam burns the GitHub quota, or gets the filing identity flagged or suspended, for every book | Only one book affected | New cross-book denial of service |
| T5 | **CMS origin allowlist**: a listed site can obtain contributors' GitHub tokens | Yes, one host | Grows with each book |

### 4c. The options

- **A. One wide PAT** on the bot account: classic `public_repo`, or fine-grained over all
  books' repos.
- **B. Per-book PATs** (`BOT_TOKEN__CRITICAL_REALISM`, …) as env vars in the one function,
  chosen by the resolved book.
- **C. A GitHub App** (for example *Textbook Suggestions*) with permissions **Issues: read
  and write, Metadata: read** and nothing else. It is installed on each book's repo, selecting
  repositories and never "All repositories". The function holds one App private key. On each
  request it mints an installation token **downscoped to the single resolved repository and
  to `issues: write`**. That token expires within an hour, and the function caches it per
  warm instance.
- **D. Per-book deployments**: N Vercel projects, each with its own token. This is the old
  PLAN S1 approach.

### 4d. Blast radius by option

| Threat | A. One wide PAT | B. Per-book PATs, one function | C. GitHub App, per-request downscoped tokens | D. Per-book deployments |
|---|---|---|---|---|
| **T1 misrouting** | Files on the wrong repo | **Still files on the wrong repo.** The token is chosen by the same wrong lookup, so the book, repo and token stay a consistent wrong set | Files on the wrong repo if that repo has the App installed. The §3a post-condition catches it on first occurrence. The table test in §5 prevents it | Not possible |
| **T2 tampering** (registry alone) | Classic `public_repo`: **any public repo on GitHub**, because any account can open issues on a public repo. One bad merge makes the platform spam strangers under the bot's name, the bot gets flagged, and every book's form dies. Fine-grained: all books' repos | Only repos that have a token | **Only repos where an org owner installed the App.** Installation is a second gate, held by different people in a different place (GitHub org settings). The registry alone reaches nothing new | n/a |
| **T3 theft** | Classic: write to **every public repo the bot can reach**, contents included, until someone notices and revokes. Fine-grained: issues on all books | **All books' tokens.** They sit in the same `process.env`, so anything that can read one can read all. Per-book tokens do not reduce this | Private key: can mint **issues-only** tokens for **installed repos only**, until the key is revoked (instant, from App settings). A token stolen from memory: **one repo, issues only, under an hour**. No contents, no settings, no other repos. The ceiling is the App's configured permissions, which code can't raise | One book per stolen deployment |
| **T4 shared fate** | One identity and one quota. Suspension takes down all books | Tokens usually belong to the same bot account, so same as A | One quota per installation. **All books in one org share an installation, so they share a quota.** No human account can be suspended. App-authored issues are clearly `…[bot]` | Isolated per book if each has its own account, otherwise same as A |
| **Rotation work** | 1 secret | **N secrets**, each expiring on its own schedule | 1 private key | N secrets and N projects |
| **Fits "shared infrastructure"** | Yes | Yes | Yes | **No** |

### 4e. Recommendation: C, the GitHub App

**Per-book tokens (B) look like isolation but mostly aren't.** They don't help against theft
(T3), because one process holds all of them. They don't help against a routing bug (T1),
because the token is looked up with the same key as the repo. They cost N separately expiring
secrets, and every new book is another one someone has to remember. Their only real benefit,
capping what registry tampering can reach (T2), is something the App gives better, through a
gate that is independent of the registry.

**A single wide classic PAT (A) is the worst choice**, specifically because of T2. An
issue-filing credential on a bot account doesn't need a target repo's permission to file
there, so the registry would become the only thing standing between the function and every
public repo on GitHub.

**The App gets both halves of "one token versus many" right:**

- **One credential to manage.** One key, one place to rotate it.
- **Per-book reach in each use.** Every token the function actually holds works on one repo,
  for issues only, for under an hour.
- **Reach decided outside the registry.** Installation is controlled by org owners. Permissions
  are fixed in App settings, and raising them requires every installation to re-approve.
- **No human account to lose**, and a clearly labelled bot identity.

**Its blast radius, stated plainly:** if the private key leaks, an attacker can open, edit,
close, comment on, and label issues in every repo the App is installed on, until the key is
revoked. They can't read or write code, open pull requests, change settings, or touch any
other repo. Revoking the key is immediate, and any token already minted dies within the hour.
That is still the worst case, and it covers every book at once. Books that need hard
isolation from the others take option D for themselves: their own App or their own
deployment. A different institution, or a private repo, would be a reason to do that. Design
for that later if it comes up; don't pay for it now.

**Hardening that comes with this choice** (none of it is service code):

1. **Push to `suggest-edit-function` `main` is equivalent to holding the key**, as it already
   is for today's token. Protect `main` with required review and no bypass.
2. Store the private key as a Vercel **sensitive** env var in `production` only. Preview
   deployments get a **separate test App** installed only on a scratch repo, so a preview
   branch can never file on a real book.
3. Registry CI (§2d) compares the App's installations with the registry **both ways**. A repo
   in the registry without the App fails, and **the App installed on a repo not in the
   registry fails**. The second check is the drift alarm for T2 and T3.
4. The App has **no webhook** and subscribes to no events. It is outbound only.
5. **Rate limiting (T4).** The in-memory limiter (`suggest-edit.js:62-73`) was already
   recorded as a speed bump, with the real fix deferred ("Day 28"). Sharing raises the stakes:
   books in one org share one installation's quota and GitHub's secondary limits on content
   creation, so one book under a spam run can stop suggestions for all of them. **Before the
   second book goes live**, add a shared store (Vercel KV or Upstash) with the per-IP limit and
   a **per-book ceiling** on issues per hour. Beyond the ceiling, that book gets 429 and the
   others are unaffected.

### 4f. The other credential paths

- **CMS relay (T5).** Tokens go to contributors, and each token's reach is the contributor's
  own GitHub permissions, so sharing the relay gives no book any new repo access. **But
  `ALLOWED_DOMAINS` is effectively a list of sites allowed to receive contributors' tokens.**
  With one OAuth App for every book, a contributor who authorised it once won't see a consent
  screen again, so a listed host can get their token without them being asked again. That's
  acceptable for registered platform books and exactly why the list is generated only from
  reviewed `cms.host` values, with wildcards and bare platform suffixes rejected (§1c). Also
  check which scope the deployed Worker requests (I expect `repo`, but the repos don't record
  it), because that scope is what a token taken this way can do.
- **Author's console.** It uses the author's own `public_repo` token, whose reach is unchanged
  by multiple books. The vault and remote cross-check (§3d) stops it acting on the wrong book.
  Shipping the client ID in the registry exposes nothing, because a device-flow client ID is
  public by design.
- **Actions.** `GITHUB_TOKEN` is scoped to its own repo. `HYPOTHESIS_API_TOKEN` stays a
  per-book repo secret, so each book can use a different Hypothes.is account.

---

## 5. Migration order

**The rule for every step:** it can be reverted on its own, today's behaviour is checked
against a baseline captured before it, and **the only intended behaviour changes are listed
and land as separate deploys**, so any surprise can be traced to a single change.

### Step 0: capture baselines (changes nothing)

| What | How |
|---|---|
| suggest-edit behaviour | `npm test` green. Extend the harness (`test/harness.mjs` already stubs `fetch`) to **record every outbound GitHub request** (method, URL, JSON body) for the confused4now.org happy path, the honeypot, and each rejection. Save as golden files |
| Issue format contract | Run a golden issue body through `authoring-assistant`'s `console.parse_suggestion`. Save the parsed output |
| Vault outputs | `node configure.mjs`, then record the checksums of `README.md`, `CONTRIBUTING.md`, `index.md`. Record the checksums of `publish.js`, `admin/config.yml`, `.lycheeignore`. `node scripts/gen-{contributors,derivatives,dashboard}.mjs --stdout`, saving outputs. `node tests/test-path-mapping.js` green |
| Console | `tests/test_all.py` green. With the HTTP layer stubbed, record the request URLs for a console load |
| Live site | Save the `publish.js` the live site is actually serving (the uploaded copy, not the repo copy; they have diverged before, `publish.js:7-8`) |
| Credential facts | **Confirm `BOT_TOKEN`'s type and scopes** (§4a) and the scope the CMS Worker requests (§4f) |

### Step 1: create `textbook-registry` (new repo, nothing consumes it)

The registry holds this book's entry (§1b), the schema, and CI. **Verification is a parity
check**: a temporary CI job that checks out the five repos and asserts that each registry value
equals the constant currently in code, at the `file:line` locations in §0a. It runs on every
later step and **must stay green through every step of the migration**. Delete it once no
repo carries the constants any more.

### Step 2: `suggest-edit-function`, resolution only (same credential, same endpoint)

This goes first among existing repos. Book mixups do the most harm here, the credential lives
here, the code is one file with no dependencies, and it has the strongest tests.

- Bundle the registry at build. Resolve by `Origin` (§3a). Remove the `REPO_*` and
  `ALLOWED_ORIGIN` constants. **Keep `BOT_TOKEN`.**
- **No intended behaviour change in this deploy.** A request with no `Origin` is still allowed
  in this step and resolves to the one registered book, **behind a temporary flag that CI
  refuses to merge if the registry has more than one book.** That is the only place a default
  exists, and it is designed to be impossible to leave in place.
- **Verify:**
  - All existing assertions pass unmodified.
  - Recorded GitHub requests are **byte-identical** to the Step 0 golden files.
  - New table test: for every registry book, Origin maps to the expected repo.
  - Look-alike and legacy origins (`https://bptext2026.xyz`, `http://confused4now.org`,
    `https://confused4now.org.evil.example`) get 403.
  - Preview deploy: `OPTIONS` and a honeypot POST (files nothing), then read the log line with
    `book=critical-realism`.
  - After the production deploy: one honeypot POST, and confirm `X-Registry-Version`.
- **Revert:** Vercel instant rollback.

### Step 2b: refuse requests with no `Origin` (the first intended behaviour change, deployed alone)

Remove the flag. **Verify:** the no-`Origin` assertion now expects 403 `origin required`, and
everything else is unchanged against the golden files. Update the README and `TESTING.md`
smoke tests. Check a week of `vercel logs` before deploying: if any real traffic arrives with
no `Origin`, investigate it first.

### Step 2c: move the credential to the GitHub App (second intended change, deployed alone)

- Create the App (Issues RW, Metadata R, no webhook). Install it **only** on
  `textbookproject2026-alt/textbook`. Create a separate test App on a scratch repo for previews.
  Add the key to Vercel. The function mints downscoped tokens.
- Keep `BOT_TOKEN` in Vercel, unused, for one week as a rollback path. After that, **revoke it
  on GitHub** (don't just delete the env var).
- **Verify:**
  - Golden request URLs and bodies are unchanged. Only the `Authorization` header differs.
  - **One real issue filed** (the same allowance `TESTING.md` used): labels present, author
    `<app>[bot]`, and the console parses it identically to the Step 0 parsed output. Then
    close it.
  - Check the §3a post-condition fires on a deliberately mismatched stub.
- **Expected side effect, needs your decision:** `gen-dashboard.mjs:167,413` filters authors
  that end in `[bot]` out of the "open issues" count. `aldogo-bot` has no such suffix, so
  **reader suggestions are counted as open issues today and won't be after this step.** The
  separate "suggestions" section is unaffected (`gen-dashboard.mjs:418-425`). Either accept the
  new count or add the App's login to the dashboard's filter exceptions. Run
  `gen-dashboard.mjs --stdout` and diff against the Step 0 output so the change is seen, not
  discovered later.
- Update `gen-contributors.mjs`'s `EXTRA_BOTS` via `platform.automation_logins`. The App's
  `[bot]` suffix is already matched.

### Step 3: `textbook` (vault repo)

- `textbook.config.json` becomes `{ "slug": … }`. `configure.mjs` renders from the registry,
  including `templates/publish.js`, `templates/admin/config.yml` and `templates/.lycheeignore`
  (PLAN G1–G4, with values now from the registry). The scripts resolve per §3e, and
  `ANNOTATION_GROUPS` is defined once.
- **Verify:**
  - After `node configure.mjs`, `git diff --exit-code` shows every generated file is
    **byte-identical**, including `publish.js` and `admin/config.yml`.
  - Because the rendered `publish.js` is identical, **no Publish upload is needed and the live
    site is untouched by this step.** If it isn't identical, the step isn't done.
  - `gen-* --check` pass, and `--stdout` matches the Step 0 outputs, except the dated dashboard
    change already accepted in 2c.
  - Run each weekly workflow with `workflow_dispatch` against the branch, in `--check` mode,
    and confirm they resolve the book.
  - Negative test: run the scripts with `GITHUB_REPOSITORY=someone/else` and confirm they
    fail before writing.
- **Revert:** `git revert`.

### Step 4: `authoring-assistant`

- Registry loading and the vault cross-check (§3d). Client ID from the registry, keeping any
  existing `state.json` value as an override.
- **Verify:**
  - `tests/test_all.py` green.
  - Stubbed request URLs identical to Step 0.
  - With the real vault, the console shows the same queue count and publish state as the
    current release.
  - Negative cases: a vault with an unknown slug, a vault whose remote is a different repo,
    and no network with no cache, each refused as §3d describes.
  - Then build a signed release. The previous release remains the rollback.

### Step 5: CMS

- **5a.** Generate `ALLOWED_DOMAINS` from the registry. **The value is identical**
  (`textbook-cms.pages.dev`). **Verify:** the Worker variable doesn't change, and run the
  `OAUTH-SETUP.md` "Checking it works" procedure, including the PR targeting `drafts`.
- **5b.** Stand up the shared CMS host with `/critical-realism/` **alongside** the existing
  `textbook-cms` project. **Verify:** the same procedure at the new path, plus an unknown slug
  getting the 404 page and the root never serving a config. Move contributors over, update the
  registry's `cms.host`, and retire the old project once contributors have moved.

### Step 6: edition template and extras

`quartz-edition-extras` has no changes. Verify with the service-repo constant check from §3.
The edition template needs nothing for this book. The per-book rendering in §3h is needed only
for book two.

### Step 7: landing page (new)

Nothing depends on it, so it can be built and verified on its own.

### Step 8: the gate before a second book

A second book is added as `preview` only when all of these hold:

- Steps 2c, 3 and 4 are complete.
- The shared rate-limit store with a per-book ceiling is live (§4e.5).
- The parity check from Step 1 has been retired, meaning no repo still carries this book's
  constants.
- Install the App on book two's repo **after** its registry entry merges, so the "installed
  but unregistered" alarm never fires.
- **Isolation test on preview:** book two's origin files on book two's repo, confused4now.org
  still files on `textbook`, and book two's origin **before** the App is installed gets 502
  and files nothing.

---

## Open questions (the repos can't answer these)

1. **Which token is `BOT_TOKEN`**, classic or fine-grained, and with what scopes? It decides
   today's blast radius (§4a).
2. **Does `aldogo-bot` exist, and who holds it?** (`INFRASTRUCTURE.md` §11). Under this design it
   is retired after Step 2c.
3. **The maintainer's GitHub login**, for `maintainer.github` and CODEOWNERS on the registry.
4. **Who is a "platform owner"** with approval rights on the registry, and who is an org owner
   able to install the App? For the second gate in §4e to mean anything, those should not be
   exactly the same single person, though with a two-person project they may have to be.
5. **What scope the deployed `sveltia-cms-auth` Worker requests** (§4f).
6. **The dashboard count change in Step 2c:** should reader suggestions count as open issues or
   not?
7. **Plausible re-registration:** `plausible.site` is still `bptext2026.xyz`. This isn't
   blocking, but it's the last staging leftover in the entry.
