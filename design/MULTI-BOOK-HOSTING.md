# Multi-book hosting: design

**Status:** design for review. No code, registry entry, DNS record or repository has changed.
**Date:** 18 Sep 2026.
**Builds on:** `DESIGN.md` in this folder (the registry design, 15 Sep).
**Read against:** `textbook-registry` at `4b4d5e0`, `suggest-edit-function` at `af31a99`,
`Obsidian Vault` (`textbook`) at `9ad443b`, `authoring-assistant` (working copy of 18 Sep),
the deployed `textbookproject2026-alt/sveltia-cms-auth` `src/index.js`, and live probes of
`confused4now.org`, `bptext2026.xyz`, the relay and the function on 18 Sep 2026.

**The model under review.** One portal domain. Each textbook is on its own subdomain
(`<slug>.portal.org`). Each book is its own Obsidian Publish site, owned and paid for by
that book's maintainer through their own Publish account. The shared services (registry,
suggest-edit function, CMS relay, author's console) serve every book.

`portal.org` is a placeholder throughout. No portal domain has been chosen yet.

---

## Summary of the answers

1. **Domain.** I recommend keeping book one on `confused4now.org` permanently, as a
   book with its own domain, and registering a new neutral domain for the portal.
   `social-research-methods.portal.org` can be a 301 redirect to it. Moving book one
   onto a portal subdomain would be the second Publish domain cutover in a month. It
   would strand the margin a second time, because Hypothes.is annotations stay on the
   URL they were made on. It would also break the "Canonical textbook" link baked into
   every department-edition fork. Nothing in the shared services needs the move (see 3).
2. **DNS.** Each book needs one proxied `CNAME <slug> → publish-main.obsidian.md` in the
   portal's Cloudflare zone, and the maintainer enters that hostname in their Publish
   site settings. The platform owns the DNS record, and the maintainer owns the binding.
   The portal itself is a static Cloudflare Pages site at the apex, built from the
   registry.
3. **Neither simplification holds as stated.** `ALLOWED_DOMAINS` lists the host where
   the **CMS page** runs (`textbook-admin.pages.dev`), not the reading domains. Publish
   can't serve the CMS, so moving books under the portal leaves that list unchanged. A
   `*.portal.org` wildcard would also be dangerous, because it would trust every
   subdomain, including a lapsed book's dangling one. The suggest-edit function does an
   **exact** map lookup on `https://<domain>` and never matches by parent domain. It
   already handles N books with no change. What does have to change is listed in §3c.
4. **Registry.** Keep the `status` enum as it is. Adding `dark` to it would stop the
   function and the console from loading **any** book. Instead, add who pays for the
   site (`site.host.paid_by`), a declared `site.dark` record, a second host kind for
   static sites, and a `platform.portal` block. The site's observed state goes in a
   separate health file written by a probe, not in `registry.json`.
5. **Dark books.** A daily probe reads the `window.siteInfo` object that every Publish
   page embeds (`"status":"active"`, `"uid":"<site_id>"`, `"customurl":…`) and compares
   it with the registry. The portal shows what the probe observes without waiting for
   anyone. A human then decides whether to declare the book dark, which **parks the
   subdomain on a portal page** so the dangling CNAME can't be taken over. The probe
   files the alert, the platform owner is responsible for acting on it, and the
   maintainer is the only person who can fix it.
6. **Interim Quartz book.** It exercises the parts that depend on N>1: routing, isolation,
   the removal of the originless flag, and the multi-book registry and console. It says
   nothing about Publish, subdomains, multiple Publish accounts or dark detection. It
   can't be registered until the schema accepts a non-Publish host kind and step 2b has
   shipped.
7. **Removing a book.** The registry can't delete an entry: CI refuses to remove a slug.
   Removal is `status: retired` plus a new `removal` record, and no consumer needs new
   code for it. Every shared service then stops serving the book without affecting the
   others. The platform stops serving and stops listing, but it can't take content down.
   Its one real lever is the `<slug>.portal.org` record, which it parks. An own-domain
   book such as book one can only be de-listed, and that is acceptable. Removal is kept
   separate from `site.dark`. It needs a published hosting policy first, notice and 14
   days by default, and a public, neutral registry PR (§7).

---

## 1. The domain scheme

### 1a. Facts that decide it

- **Annotations are anchored to the page URL.** `publish.js:617-629` builds the
  Hypothes.is `uri=` from `location.origin`. An annotation made on
  `https://bptext2026.xyz/...` stays on that URL. The 14 Sep cutover left every staging
  annotation behind. They are still unmigrated and are backed up as their own scope
  (`public-legacy:bptext2026.xyz`, `docs/annotation-restore.md`). Hypothes.is has no bulk
  move, and "re-creating from [a backup] is a one-annotation-at-a-time job"
  (`INFRASTRUCTURE.md` §8).
- **A Publish site has one custom URL.** `window.siteInfo` on the live site carries a
  single `"customurl"`. Moving the site means changing that value, and the old hostname
  then returns **404 with an empty body**. That is what `bptext2026.xyz` returns today.
  *(20 Sep: the value is now `social-research-methods.confused4now.org`, and
  `confused4now.org` is the empty 404 — it will stay one until the portal is bound to
  the apex.)*
- **Every department-edition fork has the canonical URL baked in.**
  `textbook-edition-template/quartz.config.yaml:229` reads `Canonical textbook: …`.
  Forks belong to coordinators and are outside the platform's control
  (`INFRASTRUCTURE.md` §5), so a move can't update them. *(20 Sep: upstream now reads
  `https://social-research-methods.confused4now.org`. The one existing fork,
  `coordinator-test/textbook-edition-template`, still reads `https://bptext2026.xyz` —
  two moves behind, and only its owner can fix it. This is the cost, demonstrated.)*
- **`publish.js` itself holds no domain** (0 occurrences of `confused4now`). A move needs
  no change to the rendered script, only to the registry and to external things.
- **`confused4now.org` is a Cloudflare zone** (`cartman`/`ines.ns.cloudflare.com`,
  proxied, apex only, `www` doesn't resolve). *(20 Sep: it is now the **platform** zone,
  and `social-research-methods` is a second proxied name in it. `www` still doesn't
  resolve.)*

### 1b. Options

> **Decision, 20 September 2026: the platform did B, not A.** Recorded here because a
> design document that silently disagrees with the deployed system is how the next person
> gets misled. The table and the recommendation below are left as they were written on
> 18 September; read them as the case that was argued, not as what the platform runs.
>
> **What was decided.** `confused4now.org` becomes the platform portal. Book one moved to
> `social-research-methods.confused4now.org` the same day. Made by the platform owner
> (`textbookproject2026-alt`); planned in `PORTAL-CUTOVER.md`; carried out in registry
> commit `847483c`, live in production. The apex now answers the suggest-edit function
> with 403 `origin not allowed`. The move itself went as planned; the portal it was made
> for **does not exist yet**, so the apex is a bare 404 rather than a landing page —
> `PORTAL-CUTOVER.md`'s status header lists that and the rest of what is outstanding.
>
> **Why, in one fact.** The row that carried most of the weight against B —
> *Existing annotations: **stranded again*** — turned out to cost nothing. Checked live
> against `api.hypothes.is` on the day of the move:
>
> | Wildcard scope | Public annotations |
> |---|---|
> | `https://confused4now.org/*` | **0** |
> | `http://confused4now.org/*` | **0** |
> | `https://bptext2026.xyz/*` | **8** |
>
> Nobody annotated the book in the six days it lived on the apex. The eight are
> staging-era, already anchored to `bptext2026.xyz`, and are untouched by this move —
> they stay in `site.legacy_origins` and keep their own backup scope. The registry
> records no private groups, so the public layer is the whole picture. That count was
> not knowable when this section was written; it took a live API call. It is also
> **not stable** — the same check run after the first annotation lands at the new
> address gives a different answer, which is why this move had to happen now or not at
> all.
>
> **The cost that was accepted, deliberately.** The *Zone ownership* row below is the
> real one: **the platform's zone is one book's former domain.** Every future book's
> address depends on the renewal and the account security of a domain bought for one
> textbook, and the platform's name reads as that book's joke. Option A avoided this for
> about **US$10–15 a year**, the cheapest insurance in this document, and that insurance
> was **declined** with the cost understood rather than overlooked. Also accepted: a
> second dead address (`confused4now.org/<path>` links made between 14 and 20 September
> break, and once the portal serves the apex they break *silently*, landing a reader on
> a page that exists and is not their chapter), and a second Plausible rename.
>
> **Two mitigations that are not done yet**, and the decision is worse without them: the
> apex redirect rule (301 `confused4now.org/<path>` → the subdomain for any path that is
> not `/`), which is this section's own condition for B's edition-fork footers holding
> up; and the Plausible rename, without which the generated dashboard link 404s.
> `PORTAL-CUTOVER.md` §6c and §7b carry both.
>
> **The open question this does not settle** is the "Erasmus address" (*Open questions*,
> question 1). If an institutional domain is still coming, this was move #2 of three,
> and the third lands after the margin has real annotations in it. Nothing below changes
> that advice: combine any forced future move with every other one, so it happens once.

| | A. New portal domain; book one stays on `confused4now.org` (recommended) | B. `confused4now.org` becomes the portal; book one moves to `<slug>.confused4now.org` | C. New portal domain; book one moves to `<slug>.portal.org` | D. Book one keeps the apex; other books go under `*.confused4now.org` |
|---|---|---|---|---|
| Second Publish cutover | **No** | **Yes** | **Yes** | No |
| Existing annotations | Untouched | **Stranded again**, adding a second legacy scope next to `bptext2026.xyz` | Stranded again | Untouched |
| Edition-fork footers | Keep working | Keep working only if the apex portal redirects every book path (`/chapters/...`) to the subdomain, permanently | Break unless `confused4now.org` is kept, redirecting, for as long as any fork exists | Keep working |
| Plausible | Unchanged | Site renamed a second time. Stats history continues, but the public dashboard URL changes | Same as B | Unchanged |
| Registry and services | New fields only | `legacy_origins` grows; function, backup and dashboard follow the registry | Same as B | New fields only |
| Search, citations, shared links | Unchanged | Rely on redirects | Rely on redirects forever | Unchanged |
| Money | One new domain, about US$10–15 a year. Cloudflare free plan | None | One new domain, and `confused4now.org` has to be renewed indefinitely for the redirect | None |
| Uniform naming | No. One book has its own domain, and the portal shows that honestly | Yes | Yes | Other maintainers' books sit under book one's domain name |
| Zone ownership | The platform holds the portal zone. `confused4now.org` stays with whoever holds it now | The platform's zone *is* book one's former domain | Platform zone | Every book depends on the zone of one book's domain |

**What a second cutover would cost in practice (B or C):** a second
`public-legacy:<host>` scope in the backups, forever. Every margin note made since
14 Sep would disappear from the live pages. Plausible would need another rename.
`bptext2026.xyz` and `confused4now.org` would both have to be kept as legacy origins.
A permanent redirect would be needed for every edition fork's footer. The redirect
brings readers back but **not** their annotations, because Hypothes.is matches the URL
of the page actually displayed.

One mitigation is untested and shouldn't be relied on. Hypothes.is can treat two URLs as
the same document when the page declares `<link rel="canonical">`. `publish.js` injects
`embed.js` itself (`publish.js:149-178`), so it could add that link first. Whether that
survives Publish's SPA navigation has never been tried here. If B or C is chosen anyway,
test this on a scratch Publish site **before** the cutover, not after.

**Why D isn't recommended:** it avoids the cutover, but it makes the platform's address
space a subdomain of one maintainer's book. It also ties every book to the renewal and
account security of that one domain.

### 1c. Recommendation: A, with a courtesy redirect

> **Superseded, 20 September 2026 — B was chosen and carried out.** See the decision note
> at the top of §1b for why and at what cost. This subsection is kept as the argument that
> was made. Two of its points still stand and are now work items rather than
> recommendations: a redirect from the old address to the new one (here a Cloudflare rule
> on the apex, not on a portal domain), and the last bullet — if an Erasmus address is
> still coming, combine it with every other forced move so it happens once.

- Register one neutral domain for the portal. The portal is at the apex, and new books
  are at `<slug>.portal.org`.
- Book one keeps `site.domain: "confused4now.org"`. Add
  `social-research-methods.portal.org` as a Cloudflare **redirect rule** (301 to
  `https://confused4now.org/$path`). It is **not** a second Publish binding: the URL
  readers end up on, and so the URL annotations anchor to, is still
  `confused4now.org`. The redirect hostname is never a registry `domain` and never an
  accepted origin.
- The registry already stores the full hostname per book rather than deriving it from
  the slug (`DESIGN.md` §0b). So "subdomain of the portal" is a convention for new
  books, not a rule the code relies on. Keep it that way. The interim Quartz book (§6)
  and any future institution-hosted book need the same freedom.
- **If book one must move later** (see open question 1 about the "Erasmus address"),
  combine that move with any other forced domain change so it happens once. Plan the
  annotations first, as `INFRASTRUCTURE.md` "The domain cutover" already says.

---

## 2. DNS and hosting

### 2a. Per book (Publish)

| Step | Who | What |
|---|---|---|
| 1 | Platform owner | Registry PR adding the book as `preview`, with `site.domain: "<slug>.portal.org"` and `site.host.site_id` (from the maintainer's `.obsidian/publish.json`) |
| 2 | Platform owner | In the portal zone: `CNAME <slug> → publish-main.obsidian.md`, **proxied** (Obsidian's documented Cloudflare setup, `obsidian.md/help/publish/domains`) |
| 3 | Maintainer | Publish → Site options → Custom domain: `<slug>.portal.org` |
| 4 | Probe | Confirms `siteInfo.uid == site_id`, `status == "active"`, `customurl == <slug>.portal.org` (§5b). Only then does the platform owner change `status` to `live` |
| 5 | Registry CI | Redeploys the function and rebuilds the portal. Also regenerates DNS, if DNS is managed from the registry (§2d) |

- **TLS.** Cloudflare's free Universal SSL covers the apex and **one** level of subdomain.
  `<slug>.portal.org` is covered; `a.b.portal.org` is not. The slug rule
  (`^[a-z0-9]+(-[a-z0-9]+)*$`) never produces a dot, so this holds as long as book
  hostnames are `<slug>.portal.org` exactly.
- **SSL mode must be "Full".** Obsidian warns that "Flexible" causes a redirect loop. It
  is a zone-wide setting, and it suits Pages-hosted books too.
- **The order of steps 2 and 3 doesn't matter.** Until both are done, the hostname
  returns Publish's 404, and the probe reports "unbound".
- **Nothing per book in any Worker, and no new secret.** A book costs one DNS record and
  one registry entry.

### 2b. Per book (static host, for example Quartz on Pages)

This is either `CNAME <slug> → <project>.pages.dev` together with the Pages project's
own custom-domain setting, or no portal DNS at all if the book stays on `*.pages.dev`
(the interim test, §6).

### 2c. The portal itself

**A static Cloudflare Pages project at the apex**, built from `registry.json` plus the
health file (§5c), in the Cloudflare account that holds the zone. It is the "landing
page" from `DESIGN.md` §3g and step 7, now with a domain. There is no server, no runtime
lookup and no credential. A registry merge or a health-file change triggers a Pages
build hook. The same project serves the **parked page** for dark books (§5d).

Considered and not recommended: a Worker on `*.portal.org/*` that proxies every book
through Publish's `https://publish.obsidian.md/serve?url=<host>/<path>` endpoint. That
endpoint is live (it returned 200 for `confused4now.org` on 18 Sep), and the proxy
could check `siteInfo.uid` on every response. The cost is that the portal would sit in
the reading path of every book: a Worker fault would take down all books at once. It is
the only design here that turns one service outage into every book being offline.
Parking (§5d) closes the same takeover gap without that.

### 2d. Who holds the zone, and DNS as code

The portal zone is platform infrastructure and should be in the platform's Cloudflare
account. Today `INFRASTRUCTURE.md` marks every Cloudflare account "confirm at handover",
and it records a second, unexplained Cloudflare account. Resolve that before buying the
domain.

With a few books, DNS records can be made by hand. Once there are more, have registry
CI generate the `<slug>` CNAMEs (and parked records) from `registry.json`, the same way
`DESIGN.md` §2b already plans for `ALLOWED_DOMAINS`. That way no subdomain exists that
the registry doesn't know about. The token needs *Zone.DNS: Edit* on the portal zone
only.

### 2e. Subdomain takeover: the risk this model introduces

When a maintainer stops paying or removes the custom domain, `<slug>.portal.org` still
points at `publish-main.obsidian.md`, and Publish answers 404, as `bptext2026.xyz`
does today. **Obsidian's domain documentation doesn't mention verifying domain
ownership.** If there is no verification, any other Publish subscriber could enter
`<slug>.portal.org` as their custom domain and serve their own pages under the portal's
name. That page would also be a registered origin for the suggest-edit function.

This is **unverified**. Testing it needs a second Publish account. Ask Obsidian support
or test it before the second book goes live. Until then, assume the takeover works, and
design so it doesn't matter:

- A dangling record is **parked** (repointed to the portal) once a book is declared
  dark (§5d).
- The probe checks `siteInfo.uid` against the registry's `site_id` every day. A live
  hostname answering with a **different** uid is the takeover signature, and it is
  treated as an incident, not as "dark" (§5b).
- No service trusts a hostname because of its parent domain (§3).

---

## 3. What this simplifies: checked against the code

### 3a. CMS relay `ALLOWED_DOMAINS`: not simplified by this model, and it shouldn't be a wildcard

**What the code does.** The deployed Worker (`sveltia-cms-auth` `src/index.js`) turns
each comma-separated entry into `^<escaped>$`, with `*` replaced by `.+`
(`getDomainPatterns`). It tests that pattern against:

- the `site_id` query parameter in `handleAuth`. Sveltia sets that parameter to the
  hostname of the page running the CMS.
- the `origin` of the `postMessage` from the opener, before handing over the token
  (`outputHTML`).

So a wildcard is technically supported. `*.portal.org` would become `^.+\.portal\.org$`,
which matches subdomains **at any depth**.

**Why the premise doesn't hold.** Both checks are against the **CMS page's** host, and
the CMS page never runs on a book's reading domain. Publish can't serve it
(`OAUTH-SETUP.md` step 4). It runs on Cloudflare Pages: today on
`textbook-admin.pages.dev`, which is also today's `ALLOWED_DOMAINS` value
(`INFRASTRUCTURE.md` §3). Checked live on 18 Sep: `site_id=evil.example` gets
`UNSUPPORTED_DOMAIN`, and `site_id=textbook-admin.pages.dev` gets a 302 to GitHub.
Putting books on portal subdomains leaves this list unchanged.

**What the portal does make possible** is the shared CMS host from `DESIGN.md` §3c on a
portal hostname, for example `edit.portal.org/<slug>/`. The allowlist then becomes
**one exact host**, which is simpler than a wildcard and safer.

**Why a wildcard would be dangerous here:**

- The relay's token scope is `repo,user` (registry `platform.cms_auth_relay_scope`,
  hardcoded in the fork). A host that passes the allowlist receives a contributor's
  token for **every repository they can reach, private ones included**.
- Contributors have authorised the one OAuth App once, so GitHub shows no consent screen
  again (`DESIGN.md` §4f).
- `*.portal.org` would trust every current and future subdomain, including a lapsed
  book's dangling CNAME, which may be claimable (§2e).
- The registry can't express a wildcard in any case. The `hostname` pattern in
  `registry.schema.json` has no `*`, and `validate.mjs` rejects bare shared suffixes for
  `cms.host`. Allowing one would take a deliberate schema change. Don't make it.

**What changes:** only a follow-on to `DESIGN.md` step 5b. When the shared CMS host moves
to `edit.portal.org`, register that exact host and retire `textbook-admin.pages.dev`.
There is no change to the Worker.

### 3b. Suggest-edit origin check: already N-book, and it shouldn't match by parent

**What the code does.** `lib/registry.mjs:94-127` `createResolver` builds a `Map` from
`https://<site.domain>` to book, for every book that is not retired and has a domain.
`resolve(origin)` is `byOrigin.get(origin)`, an **exact** string match: "no suffix,
prefix or wildcard match, no case folding, no www. folding". The handler resolves before
anything else and answers 403 with no CORS headers to anything unregistered
(`api/suggest-edit.js:507-535`). CORS echoes the registry-derived origin, never the raw
header.

**So it doesn't resolve subdomains of a known parent, and it doesn't need to.** A
second, third or fiftieth book is just another key in the map. Matching by parent would
be *more* code and *less* safety. It would still need a host-to-book lookup to choose a
repo, and it would accept unregistered or taken-over subdomains as far as CORS.

**Deriving `site.domain` from the slug** (`<slug>.<portal>`) is the only way the portal
could remove anything here. That doesn't work, because book one (`confused4now.org`) and
the interim book (`*.pages.dev`) are exceptions. Keep `site.domain` explicit.

**What does change in the function before N>1:**

| Change | Why | Where |
|---|---|---|
| Remove `ALLOW_ORIGINLESS_SOLE_BOOK` (step 2b) | `test/registry.test.mjs:50-54` fails the build if the flag is still `true` when the registry has more than one book, so the second book can't deploy until this is done | `api/suggest-edit.js:40` |
| Refuse origins of books with `site.dark` set | A parked or possibly taken-over hostname should not file issues (§5d) | `createResolver`: skip them, like retired books |
| **An installation per owner, if book repos live under different GitHub accounts** | `lib/github-app.mjs` reads **one** `GITHUB_APP_INSTALLATION_ID` (line 86). The token exchange refuses a grant that isn't exactly the requested repo (lines 160-164). A book whose repo is owned by its maintainer's own account would get **502 on every suggestion**. The fix is to look up the installation per repo (`GET /repos/{owner}/{repo}/installation` with the App JWT, cached), and keep the downscoping | `lib/github-app.mjs` |
| Redeploy on every registry merge | Production is serving registry `23f1d8b` (`X-Registry-Version`, checked 18 Sep), five commits behind `main`. The deploy hook and staleness alarm from `DESIGN.md` §2c aren't running. With N>1, a new book simply won't resolve until someone redeploys | Registry CI |
| Per-book rate ceiling in a shared store | Already the gate in `DESIGN.md` §4e.5 and step 8 | `suggest-edit.js:62-73` |

The first four are small. The installation change is the one this model adds. The
brief's "each book owned by a different maintainer" makes a different GitHub owner per
book likely, even though it is about Publish accounts rather than GitHub. See open
question 3.

---

## 4. Registry changes

### 4a. Keep `status` as it is (`preview | live | retired`), and don't add `dark` to it

Every consumer rejects an unknown status, and they reject it **for the whole registry**,
not just for the one book:

- the function: `lib/registry.mjs:18,46`. `validateRegistry` throws at module load, so
  the function **won't start**, and suggestions stop for every book.
- the console: `authoring-assistant/app/registry.py`, `if status not in STATUSES: raise`.
  Released builds that are already installed would refuse the fetched list and fall back
  to their cache.
- the schema enum in `registry.schema.json:103`.

`status` also means something different. It is the platform's **lifecycle decision**
(listed or not, resolvable or not), made by PR. "Dark" is a **fact about someone else's
subscription**, and it can change on any day without the platform doing anything. Keep
the two apart:

| Concept | Where | Who writes it | Changes |
|---|---|---|---|
| Lifecycle: `preview`, `live`, `retired` | `books[].status` (unchanged) | Platform owner, by PR | Rarely |
| Declared dark: the platform has acknowledged the site is gone and parked the hostname | `books[].site.dark` (new, additive) | Platform owner, by PR | When a book goes dark or comes back |
| Observed health: what the probe saw today | `health.json` on a `health` branch of the registry repo (§5c). **Not in `registry.json`** | The probe (CI) | Daily |

`site.dark` is a new key inside `site`. The function (`lib/registry.mjs`), the console
and `configure.mjs` read only the fields they need and ignore extra keys, so older
deployments and releases keep working. Only the schema, which has
`additionalProperties: false`, needs a change, and that change is additive. It stays at
`schema_version: 1`, and consumers that need to honour the new key (§3b table) are
updated when the key is first used.

### 4b. New and changed fields

```jsonc
"platform": {
  // … existing keys …
  "portal": {
    "domain": "portal.org",            // apex; the portal site
    "cms_host": "edit.portal.org",     // exact; becomes the one ALLOWED_DOMAINS entry (§3a)
    "book_parent": "portal.org"        // new books get <slug>.<book_parent>; a convention, not a rule
  }
},

"books": [{
  "site": {
    "domain": "confused4now.org",
    "aliases": ["social-research-methods.portal.org"],   // redirect-only hostnames (§1c)
    "host": {
      "kind": "obsidian-publish",
      "site_id": "1443b409a84e491249da35fdd4b91de6",
      "publish_host": "publish-01.obsidian.md",
      "paid_by": "maintainer"                            // "maintainer" | "platform"
    },
    "legacy_origins": ["https://bptext2026.xyz"],
    "dark": null                                         // or the object in §5d
  }
}]
```

| Field | Rule | Why |
|---|---|---|
| `platform.portal.domain` | Hostname, apex of a zone the platform holds | The portal's own address. It must never also be a book's `site.domain` |
| `platform.portal.cms_host` | Exact hostname. It replaces per-book `cms.host` once `DESIGN.md` step 5b has moved books to the shared host | It is the single CMS allowlist entry |
| `platform.portal.book_parent` | Hostname | CI **warns** when a new book's domain isn't `<slug>.<book_parent>`. It is a warning because book one and the interim book are legitimate exceptions |
| `site.aliases` | Hostnames. Unique across all books' `domain`, `aliases` and legacy hosts. Never an accepted origin | Redirect-only names such as the courtesy alias. Recorded so DNS-as-code can create them and uniqueness can be enforced |
| `site.host.paid_by` | `maintainer` \| `platform` | **Who has to keep paying for the site to stay up.** This is what "which Publish account holds the book" means operationally. See below for why the account itself isn't named |
| `site.host.kind` | Adds `static` (see §6c) | So a non-Publish book can be registered at all. Today the schema's `oneOf` has only `obsidian-publish` |
| `site.dark` | `null` or the object in §5d | Declared dark state |
| `maintainer.github` | Now **required non-null** for books with `paid_by: maintainer` | The probe's alert has to reach someone who can act (§5e) |

> **Recorded 22 September 2026, with one field this section did not have.** The
> block went into `registry.json` two days after the portal went up:
> `domain: confused4now.org`, `book_parent: confused4now.org`, `cms_host: null`.
>
> `cms_host` is `null` because `DESIGN.md` step 5b has not happened — there is no
> shared CMS host yet, and book one's `cms.host` is still its own
> `textbook-admin.pages.dev`. §3a is what fills this in, not this change.
>
> **`host` is new here.** The block above records the portal's *address* but not
> where the page is served from, which left the Cloudflare Pages project
> (`textbook-portal`) written down nowhere. It is the same fact `site.host` records
> for a book, so it has the same shape: `{ kind: "static", provider, project }`,
> `$ref`-ing the provider and project definitions the book host now shares with it.
> `kind` is `const: "static"` — the portal is generated from `registry.json` at build
> time, so no Publish site can serve it — and there is no `paid_by`, because a portal
> paid for by anyone but the platform is not a portal. `validate.mjs` refuses a
> project that is also a book's on the same provider: one Pages project serves one
> site, so the second binding would have taken the first's hostname.
>
> The account behind the project (`brandonproject2026`) is **not** recorded, for the
> reason this section already gives for Publish accounts: it is identified by an
> email address, and nothing in this file may be non-public.
>
> **The convention is still only a convention.** §4c's depth rule is enforced, and
> now covers `cms_host` as well as book domains and aliases; a legacy origin stays
> exempt, because the platform may no longer hold it. The `<slug>.<book_parent>`
> *warning* was not built: `validate.mjs` has no warning channel, only errors, and
> the one entry that would trip it is book two's `platform-test-book.pages.dev` —
> a `preview` static book this section already calls a legitimate exception. Where
> the convention actually bites is `textbook-template/scripts/new-book.mjs`, which
> reads `book_parent` and offers `<slug>.<book_parent>` as the default hostname.

**Which Publish account holds a book.** An Obsidian account is identified by an email
address, and `registry.json` is public, with a rule of no values that aren't already
public (`DESIGN.md` §1a). So **don't record the account.** Record the things that are
public and checkable:

- `site_id`. It is public: every page embeds it in `siteInfo.uid`. It is the actual
  binding between the hostname and the site, and the probe verifies it daily.
- `paid_by`, which says whose subscription it is.

If the platform needs the account's contact details, keep them in the private operator
notes. `INFRASTRUCTURE.md` already has a "confirm at handover" list for accounts.

### 4c. Validation to add (in `validate.mjs`)

- `platform.portal.domain` isn't any book's `domain`, alias or legacy host.
- Hostnames under `book_parent` are exactly one label deep (`<label>.<book_parent>`),
  which keeps them within Universal SSL (§2a).
- `dark` is non-null only for `status: live` books. A preview book that never came up
  stays `preview`. A retired book doesn't need it.
- `static` host kind: `site.domain` may be on a shared suffix (`pages.dev` and the
  others), but only for `status: preview`. A live book shouldn't be on a hostname that
  can't be parked.

---

## 5. Books the platform can't publish

### 5a. What "can't publish" actually costs

Content reaches a Publish site only through that site's Publish dialog
(`INFRASTRUCTURE.md` §2). Each maintainer publishes from their own vault. So:

1. **The portal lists books it can't update.** Titles and summaries come from the
   registry, but the pages behind them are whatever the maintainer last uploaded.
2. **Platform changes reach a book only when its maintainer republishes.** The rendered
   `publish.js` has the suggest-edit endpoint and the Plausible script baked in
   (`DESIGN.md` §3f). The registry README already notes that "Nothing checks for a stale
   render after a registry-only change". With N maintainers there will always be
   stale renders.
3. **A book can go dark while staying in the registry,** and nothing in the platform
   stops that.

Consequence 2 needs a **rule**, not detection alone: **platform endpoints are permanent.**
`suggest_edit_endpoint` and `cms_auth_relay` may gain new versions but must never move or
stop answering the old ones, because the platform can't make every book republish. A
change that needs every book to republish is, in practice, a change that some books
will never get.

A partial way out exists, but I don't recommend it as the default. Publish collaborators
"only need an Obsidian account" and can "publish changes to published pages", but can't
change site options. A maintainer *could* add a platform account as a collaborator, so
the platform could re-upload `publish.js` alone. It still couldn't keep a lapsed site
alive: "Only the site owner needs an active subscription". It would also be a second
publisher on someone else's site, working from the repo rather than from the vault the
maintainer actually publishes. Offer it to maintainers as an opt-in, record it as
`site.host.platform_collaborator: true`, and use it only for `publish.js`.

### 5b. Detection: the probe

This is a scheduled workflow in `textbook-registry`, daily, next to `parity`. It uses no
credentials. For each `preview` or `live` book with a domain:

| Check | How | Verified 18 Sep |
|---|---|---|
| Hostname answers | `GET https://<domain>/` | `confused4now.org` 200. `bptext2026.xyz` (unbound) **404, empty body** |
| It is the registered site | Parse `window.siteInfo={…}` from the HTML. Require `uid == site.host.site_id` and `customurl == domain` | `{"uid":"1443b409…","status":"active","slug":null,"redirect":1,"customurl":"confused4now.org"}` |
| The site is active | `siteInfo.status == "active"` | `"active"`. **What a lapsed site reports is unknown**: it could be another status value, a 404, or a redirect. Record whatever the first lapse shows |
| Content is still there | `GET https://<publish_host>/cache/<site_id>` returns the page index as JSON (58 entries for book one) | 200 JSON. Also gives a cheap "pages published" count for the portal |
| The render is current (warning only) | `GET https://<publish_host>/access/<site_id>/publish.js`. Compare the endpoint string and a registry-SHA marker with the current registry | 200, 73 KB. **Needs a small change:** `configure.mjs` should write `// registry: <sha>` into the rendered file so staleness can be measured |

Each book gets one observed state per run:

| Observed | Meaning | Signal |
|---|---|---|
| `serving` | All good | 200, uid matches, active |
| `stale-render` | Serving, but `publish.js` predates a registry change that matters | Endpoint mismatch or old SHA marker |
| `unbound` | The hostname isn't attached to any Publish site | 404 from Publish |
| `inactive` | The registered site answers but isn't active | uid matches, `status != "active"` |
| `foreign` | **A different site answers for this hostname** | uid ≠ `site_id`. This is the takeover signature (§2e) |
| `unreachable` | DNS or network failure | No response |

`foreign` is never treated as "dark". It triggers an immediate alert, and the platform
owner parks the hostname the same day.

### 5c. Where observations live

The probe writes `health.json` to a `health` branch of `textbook-registry`, the same
pattern as the book repos' `backups` branch, and for the same reason: CI can't push to
the protected `main`. Each book gets:

```json
{ "slug": "…", "observed": "serving", "since": "2026-09-18", "last_serving": "2026-09-18",
  "consecutive_failures": 0, "detail": "uid ok, active, 58 pages", "render_sha": "…" }
```

Observed health is **not** routed through `registry.json`. It changes without a human
decision, it would need a CI push to `main` or a daily PR, and nothing that holds a
credential should change behaviour because a probe had a bad night. The portal build
reads both files. The function and the console read only `registry.json`.

### 5d. Presentation, and what "declared dark" does

**Automatic (from the health file, no human involved):**

- The book stays listed. After **2 consecutive** failed daily runs (to allow for one
  network hiccup) its card shows *"This book's site isn't responding. Last seen
  <date>."* The card links to the book's source in its public GitHub repo. Every content
  repo is public (a platform invariant, `DESIGN.md` §0c), so readers always have the
  text somewhere.
- `stale-render` is shown only on an operator view, never to readers.

**Declared (a registry PR from the platform owner) after the grace period in §5e:**

```json
"dark": {
  "since": "2026-10-02",
  "reason": "subscription-lapsed",   // subscription-lapsed | domain-removed | maintainer-request | unknown
  "notified": "2026-09-20"           // when the maintainer was told (§5e)
}
```

Declaring dark:

- **Parks the hostname.** The CNAME is repointed to the portal's Pages project, which
  serves `/<slug>/unavailable`: title, maintainer, "not currently published", a link to
  the repo and to any department editions (`gen-derivatives` already finds them). This
  replaces the dangling record, so there is nothing left to take over, and readers who
  follow old links get an explanation instead of a blank 404.
- Moves the card to a **"Currently unavailable"** section of the portal.
- Makes the function refuse that origin (§3b). Only a parked page or a foreign site
  could be sending from that origin anyway.
- **Leaves everything else running.** The repo, CMS, console, annotation backup and
  dashboard all still work, because they depend on GitHub and Hypothes.is, not on
  Publish. The Hypothes.is annotations still exist and will reattach when the same
  hostname is served again.

**Coming back** is the reverse PR: set `dark: null`, point the CNAME back at
`publish-main.obsidian.md`, and have the maintainer re-enter the custom domain if Publish
dropped it. The probe confirms before the PR merges. Annotations reattach because the
hostname didn't change. **This is the main reason never to reuse a dark book's
hostname for anything else.**

**Retiring** follows the existing rule. If the maintainer says the book is finished, or
it has been dark for a policy period (I suggest 12 months), set `status: retired`. The
slug and hostname stay reserved. The parked page stays up, saying *retired* instead of
*unavailable*.

### 5e. Who notices, and who is responsible

| Role | Responsibility |
|---|---|
| **The probe** | Notices. On the first `unbound`, `inactive`, `unreachable` or `foreign` result, and when the automatic badge appears, it opens or updates **one GitHub issue per book** in `textbook-registry`, labelled `site-health`. The issue mentions `@<maintainer.github>` and CODEOWNERS. It closes the issue itself when the book is `serving` again. It never edits `registry.json` |
| **The platform owner** (CODEOWNERS on the registry) | Owns every `site-health` issue. Within a week, confirms with the maintainer. After **14 days** with no fix, opens the "declare dark" PR and parks the hostname. For `foreign`, parks the same day |
| **The maintainer** | Keeps paying, and keeps the custom domain bound. The only person who can fix a lapse. They commit to this when their book is added; see the onboarding checklist below |
| **Registry CI** | Refuses to make a book `live` until the probe has seen it `serving` once. Refuses `paid_by: maintainer` with `maintainer.github: null` |

The weak point is the same one `README.md` already records for the registry: today the
platform owner, the App installer and book one's maintainer may all be the same person.
A probe issue that mentions only yourself is an easy one to miss. At minimum, make sure
the alerts reach someone besides book one's maintainer.

**Onboarding checklist for a new maintainer** (a short page in the registry repo): you
pay for Publish; the platform owns the hostname; if you stop paying, your book is marked
unavailable after 14 days and your hostname is held for you; tell the platform before
you change the custom domain; your annotations only survive if you keep this hostname.

---

## 6. The interim test: a Quartz book on a free Pages subdomain

### 6a. What it would prove

- **Routing with N>1 in the function.** A second origin resolves to a second repo, and
  the first book still files on `textbook`. This is the isolation test from
  `DESIGN.md` step 8. The §3a.8 post-condition never fires.
- **Step 2b is real.** The build can't register a second book until the originless flag
  is gone (`test/registry.test.mjs:50-54`), so the test forces that change.
- **The GitHub App covers two repos**, including the per-owner installation lookup if
  the test repo is under a different account (§3b). That is worth doing on purpose:
  put the test repo under a different owner.
- **Registry CI with two entries**: uniqueness, slug immutability, the both-ways check
  of App installations, and the redeploy that isn't running today.
- **Console book picker and vault cross-check with a real choice**
  (`app.js:986` already renders `preview` as "not yet public").
- **Book-repo Actions** (backup, dashboard) resolving by `GITHUB_REPOSITORY` in a second
  repo.
- **The shared CMS host at `/<slug>/`** with two configs, if `DESIGN.md` step 5b is done
  by then.
- **Per-book rate ceiling**, if it is built by then.

### 6b. What it would not prove

- **Anything about Publish.** It doesn't test multiple Publish accounts, custom-domain
  binding, the `siteInfo` probe, lapse behaviour or the takeover question. The dark
  design (§5) stays untested.
- **Anything about the portal domain.** A `*.pages.dev` hostname isn't in the portal zone
  and can't be parked, redirected or covered by DNS-as-code.
- **`publish.js` on a second site.** Quartz doesn't run `publish.js`. The front-end would
  be the edition template's plugins from `quartz-edition-extras` (which take `repo`,
  `branch`, `plausibleScriptSrc`) plus a suggest-edit form. The function's contract
  would be tested from a different client, not from a second copy of the real one.
- **Maintainer independence.** If the platform owner runs the test book, nothing tests
  "a maintainer the platform can't reach".
- **Annotation behaviour across books.** Hypothes.is works on any URL, so there is
  nothing platform-specific to prove.

It is a good test of the **shared services at N=2** and no test at all of the **hosting
model**. The first real Publish book on the portal still needs the §5b probe checked
against a real second account, including one deliberate unbind to record what an
unbound or lapsed site actually returns.

### 6c. Minimum registry entry

The schema doesn't accept this book today. Two changes are needed first:

1. **`site.host.kind: "static"`** as a second `oneOf` branch:
   `{ "kind": "static", "provider": "cloudflare-pages", "project": "<pages project>" }`.
   It has no `site_id`, and the probe checks only that the hostname answers.
2. **`editions` nullable.** `check-github.mjs:84` requires `editions.template_repo` to
   exist, and a test book shouldn't need an edition template repo. Allow `"editions": null`.
   The vault's `gen-derivatives` and `gen-dashboard` read `editions.*`, so they need to
   treat null as "no editions". I haven't checked what they do today; they probably
   fail on it.

After that:

```json
{
  "slug": "platform-test-book",
  "status": "preview",
  "title": "Platform test book",
  "summary": "A throwaway book used to test the shared services with two books. Not for readers.",
  "licence": "CC-BY-SA-4.0",
  "maintainer": { "name": "Platform test", "github": "<owner of the test repo>" },
  "content": { "repo": "<other-owner>/platform-test-book", "live_branch": "main", "drafts_branch": "drafts" },
  "site": {
    "domain": "platform-test-book.pages.dev",
    "aliases": [],
    "host": { "kind": "static", "provider": "cloudflare-pages", "project": "platform-test-book", "paid_by": "platform" },
    "legacy_origins": [],
    "dark": null
  },
  "analytics": { "plausible": null },
  "annotations": { "hypothesis_groups": [] },
  "suggest_edit": { "enabled": true, "counted_from": null },
  "cms": { "enabled": false, "host": null },
  "editions": null
}
```

- **`status: preview`, not `live`.** It resolves in the function and appears in the
  console, but is never listed on the portal (`DESIGN.md` §1c). The `static`-on-a-shared-
  suffix rule in §4c keeps it from ever becoming `live` by accident.
- **The repo must be public** (CI) and must have both branches (CI). The App must be
  installed on it **after** the entry merges, so the "installed but unregistered" alarm
  doesn't fire.
- **`cms.enabled: false`** until the shared CMS host exists. The CMS isn't what N>1 tests.
- **Retire it afterwards** with `status: retired`. Don't delete it. The slug stays reserved.

---

## 7. Governance: removing a book

**Read against** newer commits than the rest of this document: `textbook-registry` at
`d74eeae` (which has the schema from §4, including `site.dark`) and
`suggest-edit-function` at `9b7922f` (which has the per-repository installation lookup
from §3b and no originless flag). The console and vault are at the commits named at the
top.

**The requirement.** The author controls publishing: they own the Publish subscription,
the vault and the content repo. The platform must still be able to remove a book that
breaks its policy. This section defines that power before it is needed, and keeps it
as narrow as possible. **The platform stops serving the book and stops listing it. It
doesn't take the content down.**

### 7a. "Deleting the registry entry" isn't possible, and shouldn't be

The brief assumes removal means deleting the book's entry. Registry CI refuses that:
`validate.mjs:215` fails any change that drops a slug present on `main`, on the PR base
or in the previous commit ("slugs are permanent (set status: retired instead)"). That
rule is correct, and removal should work within it. The entry that stays behind is the
tombstone (§7f).

**Removal is therefore `status: retired`, plus a record that says why (§7d).**
`retired` is already the one value every consumer treats as "resolves nowhere"
(`DESIGN.md` §1c). No consumer needs new code to honour it. A new status such as
`removed` would be the §4a mistake again: the function and the console reject an
unknown status for the **whole registry**, so it would stop every book.

### 7b. What the platform can do by itself: stop serving and stop listing

Here is what retiring does in each shared service, checked against the code. The
question for each: does it behave sensibly when a book disappears mid-flight, without
affecting other books?

| Service | What a retired book gets | When it takes effect | Mid-flight, and other books |
|---|---|---|---|
| **Suggest-edit function** | `createResolver` skips retired books (`lib/registry.mjs:97`), so the book's origin is `unregistered`, the same as a stranger's. The handler answers **403 with no CORS headers** before doing anything else (`api/suggest-edit.js:510-532`). The browser can't read the response, so the book's `publish.js` shows its fixed copy: "Something went wrong… use 'Edit on GitHub' above" (`publish.js:1403-1410`). That link goes to the author's repo and still works | The registry is baked in at build time. `deploy.yml` redeploys on merge and fails red if production isn't serving the new SHA within 10 minutes (`X-Registry-Version`) | Sensible. A request that is already running on the old deployment files one last issue on the author's own repo, which is harmless. Other books are keys in the same map and are unaffected. **One exception:** `test/registry.test.mjs:39-43` requires at least one routable book. Retiring the **only** routable book fails the build, so the old deployment stays live and keeps serving it. This only matters while there is one book. The deploy check goes red, so it isn't silent |
| **Author's console** | `Registry.find` skips retired books (`app/registry.py:122-126`). A vault that names the slug gets `unknown_slug`, and nothing is written into it. The last-chosen book isn't restored (`server.py:573`). Picking the book by name gives "isn't a registered textbook any more" | At the next launch. The registry is loaded once per run. An offline Mac uses its cached copy until it next fetches the list | Sensible. A console that is already open keeps working on the book until it is relaunched. Entries are parsed one by one, and retiring isn't a parse failure, so other books are unaffected. **This takes away a convenience, not a capability.** The console acts with the author's own `public_repo` token on the author's own repo, and the author can still push to it with git |
| **CMS** | **Today, the registry doesn't gate anything here.** Book one's CMS config is in its own repo (`admin/config.yml`, rendered by `configure.mjs`). The relay's `ALLOWED_DOMAINS` is a Worker variable set by hand. The registry README says CI generates it, but no workflow does (`.github/workflows` has only `validate`, `deploy` and `parity`). Once the shared host exists (`DESIGN.md` step 5b), retired books aren't built, and `/<slug>/` serves the "no textbook called…" 404 (`DESIGN.md` §3c) | Now: when someone removes the book's `cms.host` from `ALLOWED_DOMAINS` by hand. After step 5b: at the next shared-host build | Sensible. The allowlist is an exact match per entry, so removing one host affects no other book. Contributors who are already signed in keep their GitHub tokens, which go straight to GitHub and not through the relay. Leave them alone. They are the contributors' own tokens, for a repo the author gave them access to. The only way to revoke them is to revoke every token of the OAuth App, which would sign out every book's contributors |
| **Portal listing** | Lists `live` books only (`DESIGN.md` §3g), so a retired book drops out. It isn't built yet (step 7 there, §2c here) | At the next portal build, which the registry merge triggers | Sensible if the build follows §3g ("a book that fails the listing rules simply doesn't appear") and a failed build leaves the previous site up. **Build requirement:** the build must never fail because one book's entry or health record is odd. Skip that book and warn |
| **Parity job** | Pinned to book one's slug (`parity/parity.mjs:33,47`). `find` doesn't skip retired books, so retiring book one wouldn't break it, and no other book is ever in it | n/a | Not a consumer for any book after the first. It is due to be deleted before a second book is added (`DESIGN.md` step 8). **It still exists**, so that gate is still open |
| **Registry CI** (`github-facts`) | Skips retired books (`check-github.mjs:71`). A removed author can make the repo private, delete it or rename it, and CI stays green | Immediate | Sensible, with one thing to know. If a **live** book's repo disappears, `github-facts` fails on every registry PR. `deploy.yml` deploys only after a green `validate`, so function deploys stop for every book as well. The retire PR fixes it, because it makes the check skip that book. That PR has to merge on a red check that it is itself fixing. Write this down, so nobody spends time trying to make CI green first |

Two things the platform should also withdraw, beyond the registry:

- **The GitHub App's reach into the repo.** Retiring stops the function **using** it,
  but the installation still gives the platform `issues: write` on the author's repo
  (`github-app.mjs:190`). Ask the author to uninstall it. If the installation covers
  only this book's repos, the platform can delete the installation itself. If it covers
  more, leave it: the function will never route to that repo again.
- **Platform-held accounts for the book**, if there are any. For example, a Plausible
  site in the platform's account (who holds it is "confirm at handover",
  `INFRASTRUCTURE.md`).

**Two gaps worth closing, both small:**

1. The relay allowlist isn't generated from the registry, although the README says it
   is. Until it is (`DESIGN.md` step 5a), withdrawing CMS sign-in is a manual step, and
   it is easy to forget.
2. The book repo's own Actions fail every week after retirement.
   `scripts/lib/registry.mjs:126` and `configure.mjs:35` throw on a retired book, which
   stops the **author's** annotation backup. That backup is the author's code and the
   author's data, so the platform shouldn't care either way. But the error should say
   how to continue: "pin `TEXTBOOK_REGISTRY` to the registry as it was before
   retirement (`https://raw.githubusercontent.com/…/<sha>/registry.json`)". That is a
   one-line change to the message.

### 7c. What the platform can't do: take the content down

State this plainly, to maintainers and to anyone who complains about a book:

- **The Publish site belongs to the author.** Only the site owner can unpublish pages,
  change the custom domain or cancel the subscription. It stays reachable through
  Publish's own addresses, and the author can bind any domain they hold.
- **The repo belongs to the author.** The platform's App can only file issues. It
  can't delete or change content, and it shouldn't be able to.
- **The vault is on the author's machine.**
- **Department editions** are coordinators' forks (`INFRASTRUCTURE.md` §5), and are
  outside the platform's reach for the same reason.

Removal means **the platform stops lending its services, its listing and its
address.** Complaints about the content itself go to the author, to Obsidian (whose
terms govern Publish sites), or to GitHub.

### 7d. The subdomain is the real lever, and own-domain books don't have one

**On `<slug>.portal.org`**, the platform holds the DNS record (§2), so it can take the
book off the portal's address without touching the content. **Park it; don't delete
it.** Repoint the CNAME to the portal's Pages project (§5d). Deleting the record would
also stop the takeover risk (§2e), because nothing would point at Publish any more.
Parking has two advantages: readers who follow old links get an explanation, and the
record visibly stays held, so it won't be reissued by accident. The author's Publish
site keeps its now-dead custom-domain setting, which harms nobody. The author can bind
another domain. Hypothes.is annotations stay attached to the portal hostname, and they
come back only if the book is reinstated (§7f).

If DNS is generated from the registry (§2d), parking happens because of the removal PR,
so it can't be done without one. **Every use of the lever, whether dark, removal or
`foreign`, then leaves a public, reviewed record.** That is what keeps DNS control from
becoming a wider power than the policy grants.

**On an own domain** (book one, on `confused4now.org`), the platform holds no address.
It can retire the book (§7b) and remove the courtesy alias redirect
`social-research-methods.portal.org` (§1c). The site keeps serving exactly as before.
The only visible change is that its suggest-edit form fails.

**This asymmetry is acceptable. Make it a documented category, but not a stored field:**

- The harm the requirement guards against is the platform appearing to host or endorse
  a book. An own-domain book never carried the platform's address. Its connection to
  the platform was the listing, the services and the alias, and all three can be
  withdrawn. Nothing about it can be "de-served", because the platform never served
  it.
- The alternative is for the platform to hold every book's domain. That would put the
  platform in charge of someone else's domain, so it couldn't be the narrowest power.
  For book one, it would mean the second cutover that §1 rejects.
- **Category: "own-domain book."** It is derived rather than stored: `site.domain` is
  not under `platform.portal.book_parent` (the registry's rule is "store facts, not
  URLs derived from them"). The portal can show it ("hosted at its own address"). The
  onboarding checklist (§5e) tells the maintainer what removal would mean for them.
- **New books go on `<slug>.portal.org` by default.** An own domain is an exception
  that the platform owner agrees to in the onboarding PR, not something a maintainer
  can choose alone.

### 7e. Dark and removed are different mechanisms

`site.dark` records a **fact about someone else's subscription**: the site stopped
working. The maintainer can undo it by paying, and it is expected to be undone.
Removal is **the platform's decision**, and only the platform can undo it. They need
separate fields, because putting removal in `dark` would get three things wrong:

- **The portal would advertise the book.** A dark book stays listed under "Currently
  unavailable", and its parked page links to the repo and its editions (§5d). For a
  book removed on policy grounds, those links are exactly what should stop.
- **It would contradict the lifecycle.** Removal has to stop the function and the
  console, and that is what `status: retired` does. `dark` is allowed only on a `live`
  book (`validate.mjs:146`). A removed book has to be retired, so it can't carry
  `dark`. The removal PR clears `dark` if it was set.
- **The signal would be wrong.** "Dark" invites the maintainer to fix their
  subscription. A reason value called `policy` in the same enum would make a
  moderation decision look like a billing problem, in both directions.

**Recommendation:** add a book-level `removal` record next to `status`, allowed only
when `status` is `retired`. It is additive and optional, like `dark`. The function,
the console and the vault scripts already ignore keys they don't read, so only the
schema and `validate.mjs` change.

```jsonc
"status": "retired",
"removal": {
  "since": "2026-11-02",
  "clause": "3",            // the section of the published hosting policy (§7g) that was breached
  "notified": "2026-10-19"  // when the maintainer was told; null if they couldn't be reached
}
```

`registry.json` is public, so the record says **which rule was breached and when**,
and nothing else. The evidence and the correspondence go in the private operator
notes. A voluntary retirement (the book is finished) has no `removal`.

**What readers see:**

| State | Portal listing | `<slug>.portal.org` |
|---|---|---|
| Observed failing (probe, §5d) | Listed, with "isn't responding, last seen <date>" and a repo link | Still pointed at Publish |
| Declared dark | "Currently unavailable" section, with maintainer and repo link | Parked: "not currently published", with links to the repo and editions |
| Retired, no `removal` | Not listed. An optional "retired books" list with repo links | Parked: "retired", with a repo link |
| **Removed** | **Not listed anywhere** | **Parked on a generic page:** "This address is no longer hosted by <portal>." No title, maintainer, link or reason. It says the book is gone rather than broken, and it points nowhere |

### 7f. The tombstone

The retired entry **is** the tombstone. What already holds, from the code:

- The slug can never be removed (`validate.mjs:215`), so it can never be reused.
- Uniqueness covers every book, retired ones included. That applies to the domain,
  aliases and legacy origins (`validate.mjs:171` and the alias checks) and to the
  content repo (`validate.mjs:167`). So the hostname can't go to another book, and the
  same repo can't come back under a new slug. A new repo is a new application, and it
  is decided on its merits.
- The DNS record stays parked for good (§5d: never reuse a dark or retired hostname).

**Reinstatement** is the reverse PR: set `status` back to `live`, remove the `removal`
record, and point the CNAME back at Publish. Because nothing was reused, everything
comes back: issues, backups and annotations. The validator doesn't block
`retired → live` today. Keep it that way.

### 7g. Process

Keep it to what a small platform can actually do:

- **The grounds are written down first.** Publish a short hosting policy of a page or
  less in the registry repo, as numbered clauses. Each maintainer accepts it in their
  onboarding PR (add it to the §5e checklist). Removal is available **only** for a
  breach of a numbered clause, or where the law requires it. There are no other
  grounds, including "we don't like it".
- **Who can remove:** the platform owner, through a registry PR. The PR description is
  public and neutral: "Remove `<slug>` under hosting policy clause N". If there is more
  than one CODEOWNER, someone other than the PR's author approves it. If there is only
  one, say so in the policy rather than claiming a check that doesn't exist. This is
  the same single-person weakness §5e records for alerts.
- **Notice comes before removal, by default.** Tell the maintainer privately, not in a
  public issue. Name the clause and what would fix it, and give **14 days**, the same
  grace period as dark (§5e). If they fix it, nothing is recorded. If they don't, open
  the removal PR, with `notified` set to the date of the notice.
- **Immediate removal** is only for a legal requirement, or for content that harms
  readers directly (malware, phishing, plainly unlawful material). Notify the
  maintainer the same day, after removal. **A `foreign` hostname (§5b) is not a policy
  removal.** It is an incident, handled by parking, and the book isn't at fault.
- **Appeal:** the maintainer replies to the notice. The decision is looked at again, by
  a different person if the platform has one, and the reinstatement PR (§7f) is the
  remedy. One round is enough.
- **The removal runbook**, in order: (1) the registry PR (retire, add `removal`, clear
  `dark`). (2) Check that `deploy.yml` went green, meaning the function refuses the
  origin. (3) Park the DNS record, and remove any alias. (4) Remove the book's
  `cms.host` from `ALLOWED_DOMAINS` until step 5a automates it. (5) Withdraw the App
  installation and any platform-held accounts (§7b). (6) Confirm the portal rebuild
  dropped the book. (7) Send the maintainer a closing note: what was withdrawn, and
  that the content, repo and Publish site are theirs and untouched.

---

## 8. Order of work

1. Decide the domain question (§1). If A, buy the portal domain in the platform's
   Cloudflare account, after confirming which account that is.
2. Registry schema: `platform.portal`, `site.aliases`, `site.host.paid_by`, `site.dark`,
   the `static` kind, nullable `editions`, plus the §4c validation. Update book one's
   entry (`paid_by`, `aliases`).
3. Registry CI: the deploy hook, and the `X-Registry-Version` staleness alarm from
   `DESIGN.md` §2c. **Production is five registry commits behind today.**
4. Function: step 2b, the per-owner installation lookup, and refusing dark books. Plus
   the shared rate limit (already a step 8 gate).
5. The interim Quartz book (§6). Isolation test, then retire it.
6. The probe and the health branch (§5b-c). Run it against book one for a few weeks
   before anything depends on it.
7. The portal Pages site with the parked page. Then the courtesy alias for book one.
8. `configure.mjs` writes the registry-SHA marker into rendered `publish.js`.
9. The first real maintainer-owned Publish book, on `<slug>.portal.org`. Unbind it once
   on purpose, to record what the probe sees.
10. Before that book goes live: publish the hosting policy (§7g), add the `removal`
    field and its validation (§7e), generate `ALLOWED_DOMAINS` from the registry
    (`DESIGN.md` step 5a), and fix the vault scripts' message for a retired book (§7b).

---

## Open questions

1. **Is another move of book one's domain planned?** `INFRASTRUCTURE.md` still says
   "Production moves to an Erasmus address at launch", which was written before the
   14 Sep cutover to `confused4now.org`. If an institutional domain is still coming,
   the answer to §1 changes: do that move once, onto the portal, instead of twice.
   **Still open, and now more expensive (20 Sep).** The move to
   `social-research-methods.confused4now.org` went ahead without this being answered, so
   it was move #2. A third would be the first one to strand real annotations, because the
   zero count that made #2 free (§1b) lasts only until someone annotates the new address.
2. **Who holds the portal zone and pays for the domain,** and is that the same Cloudflare
   account as the relay and `textbook-admin`? (`INFRASTRUCTURE.md`: "confirm at
   handover", plus an unexplained second account.) **Sharper since 20 Sep:** no domain
   was bought — the portal zone *is* `confused4now.org`, book one's former domain, so
   this is no longer "who will pay for a new domain" but "who already holds the one the
   whole platform now depends on, and what happens at handover if it lapses".
3. **Will book repos stay under `textbookproject2026-alt`,** or will each maintainer own
   their repo? That decides whether the per-owner installation lookup (§3b) is needed.
4. **Does Obsidian Publish verify custom-domain ownership?** It decides how urgent
   parking is (§2e). Ask support, or test it with a second account.
5. **What does a lapsed Publish site return?** Is it `siteInfo.status` other than
   `active`, a 404, or something else? That can only be recorded when it first happens.
6. **Who besides the platform owner receives `site-health` alerts?** (§5e.)
7. **Is book one's Publish subscription the maintainer's or the platform's?**
   (`INFRASTRUCTURE.md` §2: "confirm at handover".) It sets book one's `paid_by`.
8. **What does the hosting policy say, and who other than the platform owner can review
   a removal or an appeal?** (§7g.) Until both are answered, the removal power has no
   defined scope.

## Facts found while reading that differ from earlier records

- **The CMS relay allowlist is now enforced.** On 15 Sep, `site_id=evil.example` got a
  302. On 18 Sep it gets `UNSUPPORTED_DOMAIN`, and `textbook-admin.pages.dev` gets a 302.
- **The deployed function is on registry `23f1d8b`**, which is five commits behind `main`
  (`4b4d5e0`). Its bundled `automation_logins` is still `aldogo-bot`, not the corrected
  `aldogobot`. The function doesn't read that field, so nothing breaks yet, but it shows
  that no redeploy happens on a registry merge.
- **`textbook-registry/README.md` says `cms.host` is recorded as `textbook-cms.pages.dev`.**
  `registry.json` records `textbook-admin.pages.dev`, which matches `INFRASTRUCTURE.md`
  §4 and the live relay. The README paragraph is stale.
