# Portal cutover: `confused4now.org` becomes the platform portal

**Status: done, 20 September 2026 — the book is on the new address.** Steps 5a–5e of §6b
ran and the move is live: the Publish custom domain is
`social-research-methods.confused4now.org` (`siteInfo` verified — `uid 1443b409…`,
`status "active"`), registry `847483c` is merged and deployed (the function reports it in
`X-Registry-Version`), the new origin is accepted and `https://confused4now.org` gets
**403 `origin not allowed`**. §1e, §4b and §4c all landed.

**Update, 22 September 2026 (checked live).** Four of the items below have closed
since: the portal is built and bound to the apex (`/version.txt` serves registry
`main`), the Plausible site is renamed (`plausible.io/social-research-methods.confused4now.org`
answers, the old name 404s), the apex 301 rule is live (`/chapters/x` → the
subdomain), and the registry has its `platform.portal` block (#11). Still open:
step 10, the coordinator fork (still on `bptext2026.xyz`). What is deployed now is
recorded in `docs/INFRASTRUCTURE.md`; the list below is the state on 20 September.

**What had *not* been done on 20 September**, so nobody reads this as finished:

- **Step 6 — the apex is not bound to anything.** The portal was never built (§6a steps 2
  and 3 were skipped: there is no `portal.yml` and no Pages project), so
  `confused4now.org` returns Publish's empty 404 rather than a portal. §6b step 6 warned
  this would be "hours or days" instead of minutes; that is where it stands.
- **Step 8 — the Plausible site has not been renamed.** The registry already carries
  `analytics.plausible.site: social-research-methods.confused4now.org`, so
  `gen-dashboard.mjs` now builds a link to a site that does not exist. The next Sunday
  rebuild publishes it. This is the one with a deadline.
- **§7b.1's redirect rule** — no 301 from `confused4now.org/<path>` to the subdomain.
  Links made between 14 and 20 September are dead, and edition-fork footers point at the
  apex.
- **Step 10 — the coordinator has not been emailed.**
  `coordinator-test/textbook-edition-template:229` still reads `https://bptext2026.xyz`.
- **The registry has no `platform.portal` block** (§1a). It was not part of `847483c`.
- **Steps 12 and 13 are done:** `INFRASTRUCTURE.md` has its second dated cutover entry and
  `MULTI-BOOK-HOSTING.md` §1b has the Option B decision note.
- **Step 14** falls due on the next Monday.

Everything below is the plan as written before the move. It has not been rewritten into
the past tense; where a check has since overtaken it, this header is what holds.

**Date:** 20 September 2026.
**Decision being planned:** `confused4now.org` becomes the platform portal. Book one moves
from that apex to `social-research-methods.confused4now.org`, matching the
`<slug>.<parent>` rule. Book two (`platform-test-book`) stays on
`platform-test-book.pages.dev`.

This is the **second** domain move for book one. The first (`bptext2026.xyz` →
`confused4now.org`, 14 Sep 2026) had no written plan, and this document exists because of
what that cost. Every claim below was checked against the repositories and the live
services on 20 Sep 2026, not recalled. Where a check contradicts an earlier design
document, the check wins and the contradiction is called out.

---

## 0. What the checks changed about this plan

Five findings from reading the repos and probing the live services materially change the
shape of the cutover. They are here at the top because three of them are blocking and two
of them make the move cheaper than `MULTI-BOOK-HOSTING.md` §1b assumed.

### 0a. There are zero annotations to strand (this is the big one)

`MULTI-BOOK-HOSTING.md` §1b rejected this exact decision (it is "Option B") largely on the
grounds that book one's annotations would be **"stranded again"**. Checked live against
`api.hypothes.is` on 20 Sep 2026:

| Wildcard scope | Public annotations |
|---|---|
| `https://confused4now.org/*` | **0** |
| `http://confused4now.org/*` | **0** |
| `https://bptext2026.xyz/*` | **8** |

All eight annotations were made in August 2026, before the 14 Sep move, and are already
anchored to `bptext2026.xyz`. The registry records no private groups
(`annotations.hypothesis_groups: []`, `registry.json:51`), so the public layer is the whole
picture.

**Nobody has annotated the book since it moved to `confused4now.org`.** The headline cost of
this decision is currently zero. See §3 for what this means in full, including the fact
that it will not stay zero.

### 0b. The registry validator forbids the obvious registry shape (blocking)

`scripts/validate.mjs:195-196`:

```js
for (const n of named)
  if (n.host === portal.domain) errors.push(`platform.portal.domain ${portal.domain} is also ${n.role} of ${n.slug}; the portal's address is never a book's`);
```

`named` (`validate.mjs:181-185`) is every book's `site.domain`, every `site.aliases` entry
**and every `site.legacy_origins` host**. So once `platform.portal.domain` is
`confused4now.org`, book one may **not** list `https://confused4now.org` in
`legacy_origins`. There is a test pinning this: `tests/validate.test.mjs:268-269`.

The instinctive move — "record the old address as a legacy origin, as we did last time" —
fails CI. §0a is what rescues it: there is nothing on that origin to back up, so there is
no reason to add it. See §3c.

### 0c. The suggest-edit function's own tests will block its deploy (blocking)

`test/assertions.test.mjs` hardcodes the literal origin in two assertions:

- `:43` — `assert.equal(r.headers['access-control-allow-origin'], 'https://confused4now.org')`
- `:272` — `call({ origin: 'https://confused4now.org', … })`

The harness already does this correctly — `harness.mjs:71-72` derives `DEFAULT_ORIGIN` from
the bundled registry — but these two lines do not use it.

The Vercel build runs `bundle-registry.mjs` (fetch registry at a SHA) and then `npm test`,
and **deploys only if the tests pass**. So the moment the registry names the new subdomain,
the function's build fails, the deploy hook produces nothing, and
`.github/workflows/deploy.yml` polls `X-Registry-Version` for ten minutes and then goes red
with the old deployment still live.

**The function repo must be fixed and pushed before the registry PR merges.** This is a
hard ordering dependency and it is in §6.

### 0d. The Publish site has no fallback address (affects rollback)

Probed live, `https://confused4now.org/`:

```json
window.siteInfo={"uid":"1443b409a84e491249da35fdd4b91de6","host":"publish-01.obsidian.md",
"status":"active","slug":null,"redirect":1,"customurl":"confused4now.org"}
```

`"slug":null`. There is no `publish.obsidian.md/<slug>` address for this site. The custom
URL is the **only** way to reach book one. During the swap there is no second address to
send anyone to, and rollback has to go back through the same custom-domain setting. See
§6d.

`uid` matches `site.host.site_id` in the registry and `host` matches `publish_host`, so the
registry's inventory of the Publish site is correct.

### 0e. Move #1 left stale references that are still live today

The user's memory of the first cutover ("stale references for days afterwards") is
understated. Two are still wrong, six days later:

1. **The one department-edition fork is a whole domain behind.**
   `dept-coordinator-test/textbook-edition-template/quartz.config.yaml:229`, fetched live:
   ```yaml
   Canonical textbook: https://bptext2026.xyz # ← swap to production domain at cutover
   ```
   Its own to-do comment was never actioned. That footer has been pointing at a 404 since
   14 Sep. See §4.

2. **The published project-health page has the wrong domain in its link text.**
   `Obsidian Vault/community/dashboard.md:11` reads "the readership dashboard for
   **bptext2026.xyz**" while linking to `plausible.io/confused4now.org`. Both halves are
   generated from the registry (`gen-dashboard.mjs:501`, `:752`), so this is a committed
   page that predates the registry change and has not been regenerated — the weekly job
   only opens a pull request when a number moves.

Both self-heal or get fixed by this cutover, but they are the evidence for why §1 is an
inventory taken from the repositories rather than from anyone's memory.

---

## 1. Every place the domain appears

Found by `grep -rI "confused4now"` across all nine working copies, excluding
`node_modules` and `.git`: **91 lines in 29 files.** Full per-file counts are in §1f.

The organising point: **most of these do not need a human to change them.** The registry
work done in September means the services read the domain at build time or run time. The
hand-edited set is smaller than it was for move #1.

### 1a. The registry — the only place the change is actually made

| Field | Now | After | Deploy? |
|---|---|---|---|
| `books[0].site.domain` (`registry.json:33`) | `confused4now.org` | `social-research-methods.confused4now.org` | Yes — automatic |
| `books[0].analytics.plausible.site` (`registry.json:45`) | `confused4now.org` | the renamed Plausible site (§1d) | Yes — automatic |
| `books[0].site.legacy_origins` (`registry.json:39`) | `["https://bptext2026.xyz"]` | **unchanged** — see §0b, §3c | — |
| `platform.portal` | absent | `{ "domain": "confused4now.org", "cms_host": null, "book_parent": "confused4now.org" }` | Yes — portal build (§5) |

**Who:** platform owner, one pull request to `textbook-registry`.
**Deploy:** `.github/workflows/deploy.yml` fires on a successful `validate` of a push to
`main`, calls the Vercel hook, and polls `X-Registry-Version` until production serves the
merge SHA, failing red after ten minutes.

The schema already supports all of this — `registry.schema.json:45-53` defines
`platform.portal`, and `tests/validate.test.mjs:189` accepts a portal with null `cms_host`
and `book_parent`. Nothing new has to be built in the registry to hold the decision. Note
`book_parent: "confused4now.org"` switches on the certificate rule at `validate.mjs:200-204`:
every book hostname under that parent must be exactly one label deep. `social-research-methods.confused4now.org` is one label. Good.

### 1b. Follows the registry with no edit and no deploy

These four consume the registry and need **nothing done to them**. This is the payoff from
the registry work and it is the main difference from move #1.

| Consumer | How it resolves the domain | When it picks up the change |
|---|---|---|
| **suggest-edit function** | Registry bundled at build time (`scripts/bundle-registry.mjs:50`); origin matched exactly against `https://` + `site.domain` | On the deploy triggered by the registry merge — **subject to §0c** |
| **`scripts/backup-annotations.mjs`** | `loadBook()` from `scripts/lib/registry.mjs`; reads `site.domain` and `site.legacy_origins` at the start of every run (`:433`, `:498-499`) | Next weekly run |
| **`scripts/gen-dashboard.mjs`** | Same `loadBook()`; `book.domain` and `analytics.plausible` (`:719-752`) | Next Sunday rebuild — and this is what finally fixes §0e.2 |
| **Authoring-assistant console** | `app/registry.py`; `test_all.py:1744-1755` and `ui_flow.js:546` **assert that no book's domain is written into the app at all** | Immediately, at its next registry fetch |

The two test files in that last row (`test_all.py:1749`, `ui_flow.js:546`) contain the
string `confused4now` only as a **negative** assertion — "this must not appear". They must
**not** be edited. Changing them would remove a guard.

`Obsidian Vault/scripts/lib/registry.mjs:31-32` pins the registry at
`raw.githubusercontent.com/textbookproject2026-alt/textbook-registry/main/registry.json`, so
these consumers follow `main` with no deploy of their own.

### 1c. `publish.js` — nothing changes, and it must not be re-uploaded

This deserves its own entry because the instinct is to assume the reading site needs
rebuilding. It does not.

`grep -c confused4now "Obsidian Vault/publish.js"` → **0**. The file holds no domain,
confirming `MULTI-BOOK-HOSTING.md` §1a. Specifically:

- `SUGGEST_EDIT_ENDPOINT` (`:45`) is the Vercel URL, not a book domain.
- The Hypothes.is `uri=` is built from `location.origin` at run time (`:576` and around
  `:617-629`), so it follows the browser to the new address automatically.
- The Plausible script is the **per-site hashed filename**
  `pa-eii3VlmU1ClI0VxGOsCTe.js` (`:792`). The comment at `:779` is explicit: "Site identity
  lives in the hashed filename — no data-domain". Renaming the Plausible site (§1d) does
  **not** change this string.
- `REPO`/`BRANCH` (`:12-13`) are repo facts, untouched by a domain move.
- The only `confused4now` in the vault's `scripts/` is a comment in
  `backup-annotations.mjs:35` documenting the Hypothes.is wildcard API. Cosmetic.

**So: no re-publish of `publish.js` is required for the domain move.** That matters,
because Publish only serves what goes through the author's publish dialog
(`INFRASTRUCTURE.md` §2), which makes any `publish.js` change a manual, easily-forgotten
step. This cutover avoids it entirely.

### 1d. External service settings (no repository, no deploy, easy to forget)

| Where | What changes | Who |
|---|---|---|
| **Obsidian Publish → Site options → Custom domain** | `confused4now.org` → `social-research-methods.confused4now.org` | Author (the Publish account holder). §2 |
| **Cloudflare DNS, zone `confused4now.org`** | Add the `social-research-methods` CNAME; repoint the apex at the portal | Platform owner. §2 |
| **Plausible** | Rename the site a second time, to the new hostname | Whoever holds the Plausible account |
| **GitHub OAuth App** (`Ov23lixHRSXxMpKK8lVP`, per `registry.json:9`) | Homepage URL, recorded at `authoring-assistant/BUILD.md:285-286` as `https://confused4now.org` | Platform owner. Cosmetic — the console uses the device flow and `BUILD.md:286` notes the callback "is required by the form; device flow never uses it" |
| **CMS auth relay `ALLOWED_DOMAINS`** | **No change.** It lists `textbook-admin.pages.dev`, the host the CMS *page* runs on, not a reading domain (`MULTI-BOOK-HOSTING.md` §3) | — |

The Plausible rename is the one with a consequence: `plausible.io/confused4now.org`
stops being the public dashboard URL, and the registry's
`analytics.plausible.site` must be updated to match or `gen-dashboard.mjs` publishes a dead
link. Do the rename and the registry edit together.

**Do not rename the Plausible site to `confused4now.org`-the-portal later.** If the portal
ever gets its own analytics it needs a separate Plausible site; reusing this one would
merge book one's readership history into the portal's.

### 1e. Hand-edited, in book one's content repo

One commit. No deploy — but note that `.lycheeignore` and `textbook.config.json` feed
Actions, and `index.md`/`README.md` are reader-facing.

| File:line | What it is | Note |
|---|---|---|
| `textbook.config.json:5` | `"site_url": "https://confused4now.org"` | Read by `gen-derivatives.mjs:216` (to exclude the canonical site from the editions list) and `gen-contributors.mjs:362`. **If this is missed, `gen-derivatives.mjs` stops recognising book one's own address and could list the book as one of its own editions.** The highest-consequence line in this table |
| `.lycheeignore:1` | `https://confused4now.org` | Link-check (`link-check.yml`) goes red on every run if stale — `PLAN.md:127` (G4) already flags this |
| `index.md:51` | Reader-facing footer, "Published at …" | |
| `README.md:3` | "The canonical edition is published at …" | |
| `docs/moderating-comments.md:32,38,39,41` | Three bookmarked Hypothes.is search URLs plus the legacy-domain note | Needs a **third** paragraph now (§3d) |
| `docs/INFRASTRUCTURE.md:25,84,202,213,401` | §2 address, §7 `ALLOWED_ORIGIN` note, §8 Plausible dashboard, the "domain cutover" section | `:401` currently says "**Done 14 Sep 2026**". It needs a second entry, not an overwrite |
| `docs/annotation-restore.md:22,45` | The `public` scope definition and "what is not backed up" | §3c |
| `docs/releasing-versions.md:139,165,262` | Three "the live textbook is at …" references | |
| `docs/for-trusted-contributors.md:43,232` | Two address references | `:43` contrasts the CMS host with the book address — keep the contrast |
| `docs/editing-the-textbook.md:222` | "Open **https://confused4now.org**" in the post-publish check | |
| `docs/troubleshooting.md:173` | "`confused4now.org` only" | |
| `community/dashboard.md:11` | **Do not hand-edit.** Generated; regenerates from the registry on the next Sunday run and fixes §0e.2 | |

`docs/INFRASTRUCTURE.md:202` says `ALLOWED_ORIGIN` "is hardcoded to
`https://confused4now.org`". That is now **wrong regardless of this cutover** — the function
resolves origins from the bundled registry (`suggest-edit-function/README.md:105-112`).
Correct it while you are in the file.

### 1f. Other repositories

| Repo | Files | What to do |
|---|---|---|
| `suggest-edit-function` | `test/assertions.test.mjs:43,272` | **Blocking, §0c.** Import `DEFAULT_ORIGIN` from the harness and use it. Must ship before the registry merge |
| | `README.md` (8 lines) | Documentation and `curl` examples. Update after, not blocking |
| | `registry/bundled.mjs:34,47` | **Generated.** Never hand-edit; rewritten by `bundle-registry.mjs` on every build |
| `textbook-registry` | `README.md:290-291` | The Plausible note. Update with §1d |
| | `tests/validate.test.mjs` (6 lines) | Fixtures and negative cases, including `:265` which asserts the portal domain may not be a book domain. **Leave the rule alone.** `:104` and `:107` use the string as a fixture; they keep passing either way |
| `textbook-edition-template` | `quartz.config.yaml:229` | §4 |
| `platform-test-book` | `quartz.config.yaml:230`, `content/index.md:10` | §4c. These point *at* book one, so they follow book one to the subdomain |
| `authoring-assistant` | `BUILD.md:285-286` | §1d |
| | `tests/test_all.py:1749`, `tests/ui_flow.js:546` | **Leave alone** — negative assertions (§1b) |
| `platform-registry-design` | `DESIGN.md` (10), `MULTI-BOOK-HOSTING.md` (21), `INTERIM-BOOK.md` (3) | Design history. Do not rewrite; add a note recording that Option B was chosen (§7) |
| `new-textbook-template-proposal` | `PLAN.md` (4) | A proposal, not shipped. `configure.mjs` does **not** exist in the live vault — everything in §1e is hand-edited today |

**Per-file counts (all 29 files):** `MULTI-BOOK-HOSTING.md` 21 · `DESIGN.md` 10 ·
`suggest-edit-function/README.md` 8 · `validate.test.mjs` 6 · `INFRASTRUCTURE.md` 5 ·
`PLAN.md` 4 · `moderating-comments.md` 4 · `INTERIM-BOOK.md` 3 · `releasing-versions.md` 3 ·
`registry.json` 2 · `textbook-registry/README.md` 2 · `assertions.test.mjs` 2 ·
`bundled.mjs` 2 · `BUILD.md` 2 · `for-trusted-contributors.md` 2 · `annotation-restore.md` 2 ·
and one each in `textbook-edition-template/quartz.config.yaml`,
`platform-test-book/quartz.config.yaml`, `platform-test-book/content/index.md`,
`ui_flow.js`, `test_all.py`, `textbook.config.json`, `backup-annotations.mjs`, `index.md`,
`troubleshooting.md`, `editing-the-textbook.md`, `community/dashboard.md`,
`Obsidian Vault/README.md`, `.lycheeignore`.

---

## 2. The Obsidian Publish side

### 2a. It is a move, not an addition

`window.siteInfo` carries a single `"customurl"` (§0d). A Publish site has **one** custom
URL. Entering the new hostname **replaces** the old one; there is no period where both
work.

When the apex is released, Publish serves **404 with an empty body** on it. This is not a
guess: `https://bptext2026.xyz/` returns exactly that today, and
`MULTI-BOOK-HOSTING.md:441` records the same observation from 18 Sep.

### 2b. What goes dark, and for how long

| Address | State | Duration |
|---|---|---|
| `confused4now.org` (as the book) | **Permanently gone.** It becomes the portal | forever |
| `confused4now.org` (as anything) | 404 from Publish, until the portal answers | **Zero if the portal is built first** (§6). Otherwise: until it is |
| `social-research-methods.confused4now.org` | Unreachable → live | **Minutes.** DNS TTL plus Publish's certificate issuance for the new hostname |
| The book, at *some* address | Dark | The gap between releasing the apex and the new hostname serving |

**The honest number for the last row is "a few minutes, but unbounded on the downside."**
Certificate issuance for a new custom domain is Obsidian's and Cloudflare's to do, not
yours, and nothing here can make it faster or predict it. There is no fallback address
(§0d). This is the single riskiest minute of the cutover and §6d is the rollback.

Do it at a low-traffic hour. Plausible can tell you which.

### 2c. What you do, in order

**In Cloudflare DNS, zone `confused4now.org` (before touching Publish):**

1. Add `CNAME social-research-methods → publish-main.obsidian.md`, **proxied** (orange
   cloud). This is Obsidian's documented Cloudflare setup, recorded at
   `MULTI-BOOK-HOSTING.md:152`. Note the CNAME target is `publish-main.obsidian.md`, which
   is *not* the same as the `publish-01.obsidian.md` serving host in
   `.obsidian/publish.json` — do not substitute one for the other.
2. Verify: `dig +short social-research-methods.confused4now.org` returns Cloudflare
   addresses. It will 404 until step 4 — that is expected, and it is a brief
   dangling-CNAME window (`MULTI-BOOK-HOSTING.md` §2e). Keep it short; do not add this
   record weeks ahead.
3. Leave the apex alone for now. It currently has proxied A records
   (`188.114.96.0`, `188.114.97.0`; nameservers `cartman`/`ines.ns.cloudflare.com`).
   `www` does not resolve and should stay that way.

**In Obsidian Publish → Site options → Custom domain:**

4. Change the custom domain from `confused4now.org` to
   `social-research-methods.confused4now.org`. Save.
5. Wait for it to serve. Confirm with:
   `curl -s https://social-research-methods.confused4now.org/ | grep -o 'window.siteInfo={[^}]*}'`
   and check `uid` is `1443b409a84e491249da35fdd4b91de6`, `status` is `active`, and
   `customurl` is the new hostname. This is exactly the probe in
   `MULTI-BOOK-HOSTING.md` §5b, run by hand.

**Back in Cloudflare:**

6. Replace the apex A records with the portal's Pages binding (§5). Until you do, the apex
   404s from Publish.

### 2d. Check before you start

**Whether a Publish slug can be set.** `"slug":null` (§0d) means no
`publish.obsidian.md/<slug>` fallback. If Publish allows setting a site slug, set one
**before** the cutover. It costs nothing, and it gives you a working URL to hand people —
and to verify the site from — during any window where the custom domain is in flight. If it
cannot be set after site creation, note that and accept the risk; the rollback in §6d is
then the only lever.

---

## 3. Annotations

### 3a. How many there are now

**Zero on `confused4now.org`. Eight on `bptext2026.xyz`.** Checked live on 20 Sep 2026
(§0a). The eight are public, in `__world__`, all created 2026-08-20, all anchored to
`https://bptext2026.xyz/chapters/…`. There are no private groups.

### 3b. What this move costs the margin

**Nothing, today.** The mechanism is real — `publish.js` builds the Hypothes.is `uri=` from
`location.origin`, Hypothes.is never moves an anchor, and there is no bulk move
(`INFRASTRUCTURE.md` §8: re-creating from a backup is "a one-annotation-at-a-time job") —
but it has nothing to act on. No reader has annotated the book at its current address.

Two things follow, and the second matters more than the first:

1. `MULTI-BOOK-HOSTING.md` §1b's central objection to this decision does not apply on
   20 Sep 2026. The `<link rel="canonical">` mitigation it flags as untested
   (`:115-119`) does not need to be tested, because there is nothing to preserve.
2. **This is a window, not a property.** The moment a reader annotates the book at
   `confused4now.org`, the cost becomes real and permanent. If this move is happening at
   all, it should happen **soon**, and it should be the last one. Re-check the count
   immediately before step 5 of §6 — a non-zero number is a decision point, not a
   formality.

### 3c. What the registry should record

**`legacy_origins` stays exactly as it is: `["https://bptext2026.xyz"]`.**

Three reasons, in order of force:

1. **CI forbids the alternative.** §0b: `validate.mjs:195-196` rejects a
   `platform.portal.domain` that is also a legacy origin. Adding
   `https://confused4now.org` fails `validate` and the pull request never merges.
2. **There is nothing to capture.** `legacy_origins` exists so the backup does not lose
   annotations left on an old address (`backup-annotations.mjs:66-72`). A scope over an
   origin with zero annotations backs up an empty list.
3. **CORS is unaffected either way.** `legacy_origins` are **never** accepted origins —
   `suggest-edit-function/README.md:109`: "A book's `legacy_origins` are never accepted."
   So this choice has no bearing on suggestions.

**Will the backup script still capture the eight?** Yes. `backup-annotations.mjs:498-499`
builds one `public-legacy:<host>` scope per entry in `site.legacy_origins`, and
`https://bptext2026.xyz` stays in that list. The eight annotations are captured exactly as
they are today, under `public-legacy:bptext2026.xyz`. Nothing about them changes.

**What does change** is the `public` scope: after the move it covers
`https://social-research-methods.confused4now.org/*` and returns zero rows, because the
`confused4now.org` annotations it used to cover do not exist. The script follows
`site.domain` from the registry (`:433`), so this needs no edit.

**If the count is not zero when you re-check**, then you have a real decision, and the
options are: (a) accept the loss and record it; or (b) do not do this move. You cannot add
the apex to `legacy_origins` without changing the validator rule at `validate.mjs:195-196`,
and that rule exists to keep hostname ownership unambiguous. Weakening it to rescue a
handful of annotations would be the wrong trade.

### 3d. Documentation that has to say three domains now

`docs/moderating-comments.md` currently has two bookmarked searches and one paragraph
(`:41`) explaining that pre-14-September comments live on `bptext2026.xyz`. After this move
there are **three** addresses in the book's history and two of them are dead. Rewrite
`:32-41` so the searches use the new hostname and one short paragraph covers both former
addresses — and says plainly that the `confused4now.org` era produced no annotations, so
there is nothing to look for there.

`docs/annotation-restore.md:22` (the `public` scope) and `:45` (the "not backed up" list)
need the same treatment.

---

## 4. The department-edition forks

### 4a. How many there are, and what state they are in

**One.** `GET /repos/textbookproject2026-alt/textbook-edition-template/forks` returns
exactly one: `dept-coordinator-test/textbook-edition-template`. This matches
`community/derivatives.md` ("So far there is one") and the
`skip_fork_owners: ["textbookproject2026-alt"]` in `registry.json:67`.

Its live state, fetched from `raw.githubusercontent.com` on 20 Sep 2026:

```yaml
pageTitle: "Biology Edition — Ontology for Social Research"   # :9
baseUrl: textbook-edition-template-5cm.pages.dev              # :27
Canonical textbook: https://bptext2026.xyz  # ← swap to production domain at cutover  # :229
```

Its site returns **200**. Its canonical footer link has pointed at a dead domain since
14 Sep (§0e.1). The `-5cm` suffix is the coordinator-test Pages project recorded in
`INFRASTRUCTURE.md:165-169`.

### 4b. What to change upstream

`textbook-edition-template/quartz.config.yaml:229`:

```yaml
Canonical textbook: https://confused4now.org
→  Canonical textbook: https://social-research-methods.confused4now.org
```

`quartz.config.default.yaml` does **not** carry this link (its footer is upstream Quartz's
GitHub/Discord pair at `:197-202`), so there is exactly one upstream line to change.

`DESIGN.md` §3h is the longer-term answer: each book gets its own edition template repo,
rendered once from its registry entry, so this line is generated rather than typed. That is
not built. Until it is, this is a manual edit — and it is the second time it has needed
one.

### 4c. And the two lines in book two

`platform-test-book` points *at* book one and so follows it:

- `quartz.config.yaml:230` — `Not a textbook (platform test): https://confused4now.org`
- `content/index.md:10` — "The real textbook is at [confused4now.org](https://confused4now.org)."

Both should become `social-research-methods.confused4now.org`. Left alone they would point
readers of the test book at the portal, which is not wrong exactly, but it is not what the
labels say.

### 4d. Does the change reach the existing fork?

**Yes, on sync — and more cleanly than "the platform cannot update them" suggests.** The
platform genuinely cannot push to a coordinator's fork. But `sync-upstream.sh` merges
upstream into the fork, and whether line 229 survives depends on whether the coordinator
ever touched it:

- The four lines coordinators are told to edit are at `:9`, `:27`, `:298` and `:320`
  (`quartz.config.yaml:4`: "you only ever edit the four lines marked '← EDIT'"). Line 229
  is not one of them, and it is far from all four.
- The fork's `:229` still holds the **unmodified ancestor value**. The coordinator did not
  change it; upstream moved on without them.
- So an upstream change to `:229` is a one-sided hunk and `git merge` applies it cleanly.
  No conflict, no `--ours`, no decision for the coordinator.

The `SPECIAL CASE — quartz.config.yaml` guidance at `sync-upstream.sh:296-302` ("keep YOUR
version of any line you deliberately changed") only fires on an actual conflict, and there
will not be one here.

**The caveat:** this only holds while the coordinator has not touched line 229. Nothing
enforces that. Treat the sync as the likely path and the email as the guarantee.

### 4e. What to tell the coordinator

The coordinator is `dept-coordinator-test` — the same GitHub account that maintains book
two (`registry.json:79`). Send this after the new address is live and verified (§6, step 7),
not before, so the link in the mail works.

> Your edition's footer link, "Canonical textbook", points at `bptext2026.xyz`, which
> stopped working on 14 September. Sorry — that one is on me; I moved the book and didn't
> tell you.
>
> The book has now moved again, and this is the last time: it is at
> **https://social-research-methods.confused4now.org**. `confused4now.org` itself is now
> the platform's front page, listing every book.
>
> Two ways to fix your footer. Either is fine:
>
> **In the browser, one line (2 minutes).** Open `quartz.config.yaml` in your fork on
> github.com, click the pencil, find line 229 — `Canonical textbook:` — and change the
> address to `https://social-research-methods.confused4now.org`. Commit. Your site
> rebuilds in 2–3 minutes.
>
> **Or run `sync-upstream.sh`.** It picks this up along with anything else that has changed
> upstream. You should not see a conflict on this line — you never edited it. If the script
> does ask you about `quartz.config.yaml`, take the template's version of the "Canonical
> textbook" line and keep yours for everything else.
>
> Nothing else in your edition is affected. Your site address, your title, your
> Edit-on-GitHub setting and your analytics line are all untouched.

This keeps the promise in `docs/for-course-coordinators.md:7` that setup and routine work
need no terminal: the browser route is one line.

**Also update `docs/updating-department-editions.md`** to say that a canonical-domain
change is a thing the maintainer must email about. Move #1 did not, which is why the fork
has been broken for six days.

---

## 5. The portal itself

### 5a. What to run it on

**A static Cloudflare Pages project at the apex**, in the Cloudflare account that holds the
`confused4now.org` zone. This is `MULTI-BOOK-HOSTING.md` §2c's recommendation and nothing
found here argues against it.

- The zone is already on Cloudflare (`cartman`/`ines.ns.cloudflare.com`), so the apex
  binding is a Pages custom domain, not a new DNS provider.
- Cloudflare Pages is already in use and understood — book two runs on it, and
  `INTERIM-BOOK.md:72` has the exact project-creation recipe.
- No server, no runtime lookup, no credential in the reading path.

**Explicitly rejected:** a Worker proxying books through Publish's `serve?url=` endpoint.
`MULTI-BOOK-HOSTING.md:182-188` puts it well: it is "the only design here that turns one
service outage into every book being offline." A listing page must never be in the reading
path.

Suggested shape: a new repo `textbook-portal`, a build script that fetches
`registry.json`, and one HTML page out. No framework. The whole thing is a table.

**Open item from `MULTI-BOOK-HOSTING.md` §2d:** `INFRASTRUCTURE.md` marks every Cloudflare
account "confirm at handover" and records a second, unexplained account. Settle which
account owns the portal project **before** creating it. Putting the platform's front page
in an account nobody can identify repeats an existing problem at a more visible address.

### 5b. How it rebuilds when the registry changes

Reuse the existing pattern exactly. `textbook-registry/.github/workflows/deploy.yml` already
does this for the function: fire a deploy hook, then poll a version marker until production
serves the merge SHA, and go red after ten minutes.

Add a sibling workflow, `portal.yml`, in `textbook-registry`:

| Step | Detail |
|---|---|
| Trigger | `workflow_run` on `validate` completing successfully on a push to `main` — same guard as `deploy.yml:36-39`, so pull requests never deploy |
| Action | `POST` a **Cloudflare Pages deploy hook** (a new repository secret, `PORTAL_DEPLOY_HOOK`) |
| Verify | Poll `https://confused4now.org/version.txt` — a file the portal build writes containing the registry SHA it built from — until it matches the merge SHA or is a descendant of it |
| Timeout | Ten minutes, then fail red on the merge commit |
| Staleness alarm | `schedule`, offset from `deploy.yml`'s `41 */6 * * *` so the two don't collide |

`/version.txt` is the portal's `X-Registry-Version`. It is the piece that makes the
existing polling logic transplant almost unchanged, and it is worth the five lines in the
build script — `deploy.yml`'s whole value is that it *proves* the change landed rather than
assuming the hook worked.

The portal build fetches the registry from `raw.githubusercontent.com/.../main/registry.json`
— the same URL `Obsidian Vault/scripts/lib/registry.mjs:31-32` uses. One source of truth,
one URL.

### 5c. What it lists

Per the user's decision: each book with **title, summary, link and status**. All four come
straight from the registry — `title`, `summary`, `site.domain`, `status`. Add
`maintainer.name` and the edition-template preview link, which `DESIGN.md:437-438` also
asks for and which cost nothing.

**This diverges from `DESIGN.md` §3g, deliberately.** §3g says the page "lists `status:
live` books with a domain". Book two is `preview`, so §3g would hide it — but the decision
is to show book two as "a preview book and a demonstration", and showing status is the
point. So:

- List `live` and `preview` books that have a `site.domain`.
- Label the status plainly. A `preview` book should read as a preview: *"Preview — a
  demonstration, not for readers"*, which is close to book two's own registry `summary`.
- **Never list `retired`.** That is what retirement means (`MULTI-BOOK-HOSTING.md` §7), and
  it is the platform's only real lever over a removed book.
- Record this divergence in `DESIGN.md` §3g rather than leaving the two documents
  disagreeing.

**One hard build rule**, from `MULTI-BOOK-HOSTING.md:677`: *the build must never fail
because one book's entry is odd.* Skip that book, warn, and build the rest. A failed
portal build must leave the previous site up. One malformed entry taking down the
platform's front page is a worse failure than one book missing from a list.

### 5d. What it does not do yet

`MULTI-BOOK-HOSTING.md` §2c also has the portal serving the **parked page** for dark books
and showing **probe-observed health**. Neither the probe nor `health.json` exists. Keep v1
to the registry alone. `site.dark` is in the schema (`registry.schema.json:211-212`) and
validated (`validate.mjs:145-146`) but is not set on any book, so there is nothing to show.

Do not let the portal wait on the probe. A listing page that exists is worth more than a
health dashboard that doesn't.

---

## 6. Order of operations

Prepared work first, then one short window, then cleanup. **Steps 1–4 break nothing and can
be done on separate days.** The book is only ever exposed in step 5.

### 6a. Preparation — nothing breaks

| # | Step | Who | Breaks |
|---|---|---|---|
| 1 | **Fix `assertions.test.mjs:43,272`** to use `DEFAULT_ORIGIN` from the harness. Push to `suggest-edit-function` `main`. Confirm the Vercel build is green. **§0c — if this is skipped, step 5's registry merge fails.** | Platform owner | Nothing |
| 2 | **Build and deploy the portal** to its `*.pages.dev` address. Check it lists both books correctly against today's registry. Do **not** bind the apex yet | Platform owner | Nothing |
| 3 | **Add `portal.yml`** and the `PORTAL_DEPLOY_HOOK` secret to `textbook-registry`. Trigger it by hand (`workflow_dispatch`) and watch it go green | Platform owner | Nothing |
| 4 | **Open the registry pull request** (§1a) but do **not** merge. Let `validate` run on it — this is where a mistake in the `platform.portal` block surfaces, harmlessly | Platform owner | Nothing |
| 4a | **Prepare** the book-one commit (§1e), the upstream template edit (§4b), book two's two lines (§4c) and the coordinator email (§4e). Do not push them | Platform owner | Nothing |
| 4b | **Set a Publish slug** if Publish allows it (§2d) | Author | Nothing |

### 6b. The window — the book is exposed

Low-traffic hour. Budget 30–45 minutes. Have §6d open in another tab.

| # | Step | Breaks | For how long |
|---|---|---|---|
| 5 | **Re-check the annotation count** on `confused4now.org` (§3b). Non-zero → stop and re-decide | — | — |
| 5a | **Add `CNAME social-research-methods → publish-main.obsidian.md`, proxied** | Nothing. The name 404s until step 5b | Minutes (brief dangling CNAME, §2e) |
| 5b | **Change the Publish custom domain** to `social-research-methods.confused4now.org` | **The book is offline at every address.** The apex releases immediately and 404s; the new hostname is not serving yet | **Minutes, and not under your control** (§2b). The riskiest step |
| 5c | **Merge the registry pull request** — do this *while* 5b propagates, so the function is ready when the site returns | Suggest-edit is refused on **both** old and new origins until the deploy lands. The function's registry is exact-match and cannot hold two domains for one book | ~5–10 min, inside 5b's window |
| 5d | **Verify** `siteInfo` on the new hostname: `uid == 1443b409…`, `status == "active"`, `customurl ==` the new hostname | — | — |
| 5e | **Verify** the `deploy` and `portal` workflows went green on the merge commit. Confirm the function: `curl -si -X OPTIONS "$ENDPOINT" -H 'Origin: https://social-research-methods.confused4now.org'` → 204 with a matching `access-control-allow-origin` | — | — |
| 6 | **Bind the apex to the portal**: replace the A records with the Pages custom domain for `confused4now.org` | The apex 404s between 5b and here | **Minutes** if the portal is already built (step 2). Hours or days if it isn't — which is why step 2 comes first |

**If steps 5b and 6 are done together, the apex is never a bare 404 for long, and the book
is dark only for the minutes in 5b.** That is the best this decision allows; §2a means
there is no overlap to engineer away.

### 6c. Cleanup — nothing breaks

| # | Step | Who |
|---|---|---|
| 7 | Commit the book-one edits (§1e). Watch `link-check` go green | Platform owner |
| 8 | Rename the Plausible site; update `analytics.plausible.site` in a second, small registry pull request (§1d) | Platform owner |
| 9 | Push the upstream template edit (§4b) and book two's two lines (§4c) | Platform owner |
| 10 | **Email the coordinator** (§4e). Not before step 7 | Platform owner |
| 11 | Update `suggest-edit-function/README.md`, `textbook-registry/README.md:290-291`, `BUILD.md:285-286`, the OAuth App homepage URL | Platform owner |
| 12 | Add a second dated entry to `INFRASTRUCTURE.md`'s "domain cutover" section. **Do not overwrite the 14 Sep one** — the history is the point | Platform owner |
| 13 | Record the Option B decision in `MULTI-BOOK-HOSTING.md` §1b (§7 below) | Platform owner |
| 14 | On the following Monday, confirm `community/dashboard.md` regenerated with the right domain in both the link text and the URL (§0e.2). **This is the check move #1 didn't do** | Platform owner |

### 6d. Rollback

**Trigger:** the new hostname is not serving 20 minutes after step 5b, or `siteInfo` comes
back with the wrong `uid` (a foreign site — the takeover signature in
`MULTI-BOOK-HOSTING.md` §5b), or the certificate does not issue.

**To get book one back online quickly:**

1. **In Publish → Site options → Custom domain, set it back to `confused4now.org`.** This
   is the only lever that matters and it is the first thing to do. Everything else waits.
2. **If step 6 already ran**, remove the Pages custom domain binding for the apex and
   restore the proxied A records. Publish cannot bind a hostname that Pages is serving.
   *This is why step 6 comes after 5d's verification, not before.*
3. **If step 5c already merged**, revert the registry pull request on `main`. `deploy.yml`
   fires on the revert and restores the function within ten minutes. Suggest-edit is
   refused on the apex in the meantime; **the book itself reads fine without it.**
4. Leave the `social-research-methods` CNAME in place. It is harmless once Publish is not
   bound to it, and you will want it on the retry.
5. The portal stays on its `*.pages.dev` address. No rush.

**Expected recovery: minutes**, dominated by the same certificate step that failed going
the other way. `confused4now.org` is a hostname the Publish site held until moments ago,
which is the best position to re-bind from.

**Steps 1–4 need no rollback** — none of them touch anything live.

**The irreversible moment is not step 5b.** It is the first annotation made at the new
address. Before that, a return to the apex costs nothing. After it, going back strands the
margin, which is the trap that caught move #1 running the other way.

---

## 7. What makes me think this is the wrong move

Asked for plainly, so answered plainly. **The plan above is complete and executable, and I
would do it as written.** These are the things that should be true before you run it.

### 7a. The existing design recommended against this, and that should be recorded

`MULTI-BOOK-HOSTING.md` §1b evaluated four options 48 hours ago and recommended **A**
(book one keeps the apex; register a neutral portal domain). This decision is **B**, which
that table scores worse on five of nine rows.

I think **B is now defensible, and the reason is §0a**: the objection that carried most of
the weight — annotations "stranded again" — turns out to cost nothing, because nobody has
annotated the book since 14 September. That was not knowable when §1b was written; it took
a live API call. Two of B's other costs also look smaller on inspection: the edition-fork
footer reaches the one existing fork cleanly on sync (§4d), and `publish.js` needs no
change at all (§1c).

But `MULTI-BOOK-HOSTING.md` should not be left recommending A while the platform does B.
Add a dated note to §1b recording the decision, the annotation count that justified it, and
who made it. A design document that silently disagrees with the deployed system is how the
next person gets misled.

### 7b. The costs that are real and permanent

These are genuine and do not go away:

1. **A second dead address, forever.** `bptext2026.xyz` 404s. After this,
   `confused4now.org/chapters/…` also 404s — every external link, citation, search result
   and bookmark made between 14 and 20 September breaks. The apex serving a portal makes
   this *worse* than a plain 404, because a reader following a chapter link lands on a
   page that exists and looks fine but is not their chapter.
   **Mitigation worth doing:** a Cloudflare redirect rule on the apex — 301
   `confused4now.org/<path>` → `social-research-methods.confused4now.org/<path>` for any
   path that is not `/`. That is `MULTI-BOOK-HOSTING.md:99`'s condition for B's fork
   footers holding up, and it costs one rule. **It brings readers back; it does not bring
   annotations back** (Hypothes.is anchors to the URL actually displayed). With zero
   annotations at stake, that limitation does not bite here.
2. **The platform's zone is one book's former domain.** `MULTI-BOOK-HOSTING.md:105`: "The
   platform's zone *is* book one's former domain." Every future book's address depends on
   the renewal and account security of a domain bought for one textbook. Option A avoided
   this for about US$10–15 a year. That is the cheapest insurance in this document and it
   is now being declined.
3. **The name.** `confused4now.org` reads as one book's joke, not as a platform. Every
   future maintainer's book gets an address under it. Worth a moment's thought before the
   first external book is onboarded, because after that it cannot change.

### 7c. The two things I would want settled first

**The "Erasmus address".** `INFRASTRUCTURE.md:409-410` says production "moves to an Erasmus
address at launch, late-stage", and `MULTI-BOOK-HOSTING.md:885-888` flags it as an open
question. If an institutional domain is still coming for book one, **this is move #2 of
three**, and the third one will happen after the margin has real annotations in it. §3b's
window closes. `MULTI-BOOK-HOSTING.md:139-141` is right that a forced future move should be
combined with any other, so it happens once. **Answer this before step 5b.** If an Erasmus
address is coming, the correct plan is to wait and do one move, not two.

**Which Cloudflare account.** §5a. Settle it before creating the portal project, not at
handover.

### 7d. What I checked that did *not* worry me

Recorded so the next reader does not re-open them:

- **The services follow the registry.** Function, backup, dashboard and console all resolve
  the domain from `registry.json` (§1b). Move #1's "five different places"
  (`INFRASTRUCTURE.md:411-421`) is down to one, plus the hand-edited documentation in §1e.
  The registry work paid for itself.
- **`publish.js` needs no republish** (§1c). No manual publish-dialog step in the critical
  path.
- **The registry schema already holds the decision.** `platform.portal`, `site.aliases` and
  `site.dark` all exist and are tested (§1a). No schema work.
- **The CMS relay is untouched.** `ALLOWED_DOMAINS` names the CMS host, not a reading
  domain (§1d).
- **The one coordinator gets the fix cleanly on sync** (§4d), and is the same account that
  maintains book two — so there is one human to email, and you already have their attention.

---

## Appendix: verification log

Everything asserted above, and how it was checked on 20 September 2026.

| Claim | Method |
|---|---|
| 91 references, 29 files | `grep -rIn "confused4now"` across all working copies, excluding `node_modules` and `.git` |
| 0 annotations on `confused4now.org`; 8 on `bptext2026.xyz` | `api.hypothes.is/api/search?wildcard_uri=…&limit=1`, both schemes, unauthenticated |
| Portal domain may not be a legacy origin | `textbook-registry/scripts/validate.mjs:181-196`; test at `tests/validate.test.mjs:268-269` |
| Function tests hardcode the origin | `suggest-edit-function/test/assertions.test.mjs:43,272` vs `test/harness.mjs:71-72` |
| Tests gate the deploy | `bundle-registry.mjs:50`; `textbook-registry/README.md:49-57` |
| `publish.js` holds no domain | `grep -c confused4now "Obsidian Vault/publish.js"` → 0 |
| Plausible identity is in the hashed filename | `Obsidian Vault/publish.js:779,792` |
| `siteInfo`, `slug: null`, `customurl` | `curl https://confused4now.org/`, parsed |
| Zone on Cloudflare; `www` does not resolve | `dig +short confused4now.org A / NS`; `dig +short www.confused4now.org` |
| Released Publish hostname → 404 | `curl -o /dev/null -w "%{http_code}" https://bptext2026.xyz/` → 404 |
| Exactly one edition fork | `api.github.com/repos/textbookproject2026-alt/textbook-edition-template/forks` |
| The fork's canonical link is `bptext2026.xyz` | `raw.githubusercontent.com/dept-coordinator-test/textbook-edition-template/main/quartz.config.yaml:229` |
| The fork's site is live | `curl -o /dev/null -w "%{http_code}" https://textbook-edition-template-5cm.pages.dev/` → 200 |
| Book two is live | `curl -o /dev/null -w "%{http_code}" https://platform-test-book.pages.dev/` → 200 |
| Coordinators edit only four lines, none near `:229` | `textbook-edition-template/quartz.config.yaml:4,9,27,298,320` |
| `sync-upstream.sh` preserves the coordinator's config only on conflict | `sync-upstream.sh:252-255,296-302` |
| Consumers read the registry | `Obsidian Vault/scripts/lib/registry.mjs:31-32,101-126`; `backup-annotations.mjs:433,498-499`; `gen-dashboard.mjs:719-752`; `authoring-assistant/app/registry.py` |
| Console asserts no hardcoded domain | `authoring-assistant/tests/test_all.py:1744-1755`; `tests/ui_flow.js:546` |
| `legacy_origins` are never accepted origins | `suggest-edit-function/README.md:105-112` |
| Deploy-hook-and-poll pattern | `textbook-registry/.github/workflows/deploy.yml` |
| `configure.mjs` does not exist in the live vault | `ls "Obsidian Vault/scripts/"` — four scripts and `lib/`, no `configure.mjs` |
