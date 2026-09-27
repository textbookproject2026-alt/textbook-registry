# Adding and retiring a book

**Audience: the platform owner.** This is the runbook for the four things that
change which books the platform serves: **adding** a book, **retiring** one
because it is finished, **declaring** one dark, and **removing** one under the
hosting policy.

The reasons behind every rule here are in
[`design/MULTI-BOOK-HOSTING.md`](../design/MULTI-BOOK-HOSTING.md), §5 (dark) and
§7 (governance). This file is the procedure. Where the procedure depends on
something that hasn't been built, it says so and gives the manual stand-in.

The maintainer's half of adding a book is
[`textbook-template/SETUP.md`](https://github.com/textbookproject2026-alt/textbook-template/blob/main/SETUP.md).
This file covers only the steps a maintainer can't do.

---

## The rules every procedure here keeps

- **A slug is never deleted, renamed or reused.** CI refuses a PR that drops a
  slug present on `main`, on the PR base or in the previous commit. Retirement is
  `status: retired`. The entry that stays behind is the tombstone.
- **`status` is `preview`, `live` or `retired`, and never anything else.** The
  function and the console reject an unknown status for the **whole registry**,
  so a fourth value would stop suggestions for every book.
- **A hostname belongs to one book, once, forever,** retired books included.
  Never give a retired or dark book's hostname to anything else: annotations
  come back only if the same hostname is served again.
- **Every change is a public registry PR.** That includes removal. The PR is how
  the platform's power over a book leaves a record.
- **Retiring stops the platform lending its services, listing and address. It
  never takes content down.** The Publish site, the repo and the vault are the
  maintainer's (`MULTI-BOOK-HOSTING.md` §7c).

---

## Adding a book

> **Rewritten 27 Sep 2026 for the builder (BOOK-ONE-TO-QUARTZ §8 step 24).** Every book
> is built by `quartz-book` and served from a Direct Upload Pages project in the
> platform's Cloudflare account. The maintainer no longer pays, binds a domain or
> installs the App. The Publish-era table is in this file's history.

The maintainer does template steps 0–3 and sends you `registry-entry.json` and
`REGISTRY-REQUEST.md`. From there:

| # | Step | Checked by |
|---|---|---|
| 1 | Read `REGISTRY-REQUEST.md`. It lists what in the entry is a guess | you |
| 2 | Confirm the repo is **public** and has **both branches**. `github-facts` fails otherwise | CI |
| 3 | Decide the hostname. The default is `<slug>.confused4now.org`. An own domain is an exception you agree to in this PR. `*.pages.dev` is allowed only while the book is `preview` | CI enforces the depth rule and the shared-suffix rule |
| 4 | Create the **Direct Upload** Pages project named in `site.host.project`, in `brandonproject2026`, and check Cloudflare gave it exactly `<project>.pages.dev`: the builder derives that name | you (template SETUP step 6) |
| 5 | Tell the maintainer the onboarding terms (below) and get their agreement in the PR thread | nobody. This is the gap |
| 6 | Open the PR with `status: preview`. It merges once `registry` and `github-facts` are green. No review is required until a second maintainer exists | branch protection (INFRASTRUCTURE.md §1) |
| 7 | Watch `deploy` and `portal` go green on the merge commit. At the next `*/15` tick, `reconcile` builds the book's `main` and `drafts`: `https://<project>.pages.dev/.well-known/textbook.json` then names `main`'s head | SCHEDULED-JOBS.md |
| 8 | **Portal subdomain:** add the hostname as a custom domain on the Pages project, then **straight after** create `CNAME <slug> → <project>.pages.dev`, proxied. A record waiting unbound is the takeover window (MULTI-BOOK-HOSTING §2e) | nobody. DNS isn't generated |
| 9 | On the book repo: protect `main` (a pull request); turn on **Allow auto-merge** and **Allow GitHub Actions to create and approve pull requests**, for the Sunday community pages | you (template SETUP step 2) |
| 10 | **If the book wants the browser editor:** add its `cms.host` to the relay's `ALLOWED_DOMAINS` by hand, then record `cms.enabled: true` and the host in the registry | nobody (CMS-RELAY.md) |
| 11 | Add the repo to the suggest-edit App's installation: <https://github.com/settings/installations> → **Configure** beside *textbook-suggest-edit* → **Only select repositories** → add it → **Save**. Then confirm a honeypot POST from the book's origin resolves to *its* repo | you |
| 12 | When the site answers on its hostname and a real suggestion has been filed: a PR moving `status` to `live`, with `suggest_edit.counted_from` set to that day. Only a `live` book is counted in Plausible (D19) | CI |

**Onboarding terms** (`MULTI-BOOK-HOSTING.md` §5e and §7, amended 27 Sep). There's
no published page for these yet, so send them in the PR thread:

1. The platform hosts your book and pays for it, at the hostname above. It builds
   the site from your repository's `main` (and previews `drafts`) with the platform's
   builder. You need no hosting account.
2. The design is shared by every book on the platform, and you can't restyle yours.
   Platform changes reach your book at its next build, after a preview of every book.
3. Tell the platform before you want a different address. Reader annotations stay on
   the address they were made on, so a move starts the margin again.
4. The platform may retire your book under the hosting policy, after 14 days'
   notice, except where the law or direct harm to readers requires immediate
   action. It never touches your content or repository. Your builder is public, so
   you can build the same site anywhere.

> **Term 4 refers to a hosting policy that doesn't exist yet.** §7g makes
> removal available *only* for a breach of a numbered clause in a published
> policy. Until that policy is written and in this repo, the platform has no
> defined removal power over any book except the legal and harm cases. Write it
> before the first maintainer-owned book goes live. It's a decision for the
> platform owner, not something a docs change can supply.

---

## Adding a book from a request (automated)

Since 24 Sep 2026 the portal carries a **Publish your textbook here** form. It
files a request in the private `textbookproject2026-alt/book-requests` repo (the
requester's email and manuscript stay there, never here). Approving the request,
by adding the `approved` label, runs that repo's `provision` workflow, which does
every step in the table above itself, in dependency order: the content repo
(platform-held, public, `main` + `drafts`), the App installation, the Pages
project, the custom domain and DNS for `<slug>.confused4now.org`, then this
registry's pull request, merged once `validate` is green, then a `reconcile` of
the book. The entry goes in as `live` unless the request says otherwise, because
only `live` books feed the portal's key-word graph, recent changes and topics.
The procedure and its secrets are in `book-requests/README.md`.

The approval is the review. The pull request is still opened, so the record the
rules above ask for still exists.

### Sandbox books

An entry with `"sandbox": true` is a throwaway test. It is the one exception to
slug permanence: `validate.mjs` lets a slug leave the registry when the base entry
had `sandbox: true`. book-requests' `remove` workflow takes one out completely:
registry entry, Pages project, DNS record, App installation and repository. Never
set it on a book readers use.

---

## Retiring a book that is finished (voluntary)

This is the ordinary case, and **book two's is next**. It has no `removal`
record.

1. **The registry PR:** set `"status": "retired"`. Clear `site.dark` if it was
   set, since `dark` is allowed only on a `live` book. Nothing else changes, and
   the slug, hostname and repo stay reserved. Title: `Retire <slug>`.
2. **If this is the last `preview`/`live` book, stop.** The function's build
   requires at least one routable book, so the deploy would fail and production
   would keep serving the book. Two books are live (the request-made ones), so it
   doesn't apply today.
3. **Watch `deploy` go green.** The function now answers the book's origin with
   403 and no CORS headers. The book's form shows its generic failure copy and
   points readers at *Edit on GitHub*, which still works. Check it:

   ```sh
   curl -s -o /dev/null -w '%{http_code}\n' -X OPTIONS \
     https://suggest-edit-function.vercel.app/api/suggest-edit \
     -H 'Origin: https://<site.domain>'          # -> 403
   ```

4. **Watch `portal` go green.** The book disappears from the listing. Check
   <https://confused4now.org>.
5. **The hostname:**
   - **`<slug>.confused4now.org`:** park it. Repoint the record at the portal's
     Pages project (add it as a custom domain on `textbook-portal`). Don't
     delete it, because the record has to stay visibly held. *There's no parked
     page yet* (§5d's `/<slug>/unavailable` isn't built), so a parked hostname
     serves the portal. **Check what it serves after you repoint it; this hasn't
     been done before.**
   - **An own domain:** nothing to do. The platform doesn't hold it. Remove any
     courtesy alias (`site.aliases`) instead.
   - **`*.pages.dev`:** can't be parked. If `paid_by` is `platform`, you may
     delete the Pages project. Otherwise leave it with the maintainer.
6. **The CMS:** if the book had `cms.enabled`, remove its `cms.host` from
   `ALLOWED_DOMAINS` by hand. Nothing does this for you. Leave contributors'
   existing tokens alone, because revoking them would sign out every book.
7. **The App:** ask the maintainer to uninstall `textbook-suggest-edit` from
   their repo. Retiring stops the function *using* the installation, but the
   installation still grants `issues: write`. If the installation is on a
   platform-held account and covers only this book, uninstall it yourself.
8. **Platform-held accounts for the book:** a Pages project that the platform
   pays for. Close or hand it over. Analytics need nothing: the platform's one
   Plausible site stops counting the book once it isn't `live` (§8 step 17a of
   BOOK-ONE-TO-QUARTZ), and its history stays under the book's hostname.
9. **Tell the maintainer what to expect in their own repo.** Their book's
   workflows fail from the next run: `configure.mjs` and `scripts/lib/registry.mjs`
   throw on a retired book, so the annotation backup, dashboard and weekly
   `apply-config` go red. To keep backing up, they set `TEXTBOOK_REGISTRY` to the
   registry *as it was before retirement*:
   `https://raw.githubusercontent.com/textbookproject2026-alt/textbook-registry/<sha-before>/registry.json`.
   The scripts' error message doesn't say this yet (§7b gap 2), so you have to.
10. **The console** stops offering the book at each author's next launch. A
    vault for the book is then refused with "isn't a registered textbook any
    more". The maintainer can still push to their own repo with git.

**Reinstating** is the reverse PR (`status` back to `live`, with the record, DNS
and `ALLOWED_DOMAINS` entry restored). The validator allows `retired → live`.
Nothing was reused, so issues, backups and annotations all come back.

### Book one, retired 27 Sep 2026

Retired at the platform owner's request (registry #54). What was done, in order:

1. **Before the registry PR:** quartz-book #23 moved the builder's CI off book one,
   because the builder refuses a retired book. CI builds the first `live` book instead.
2. **Registry #54:** `status: retired`, and nothing else.
   - Its `deploy` first failed: the function's Vercel build runs its tests, and two
     assumed book one was routable. suggest-edit-function #3 fixed them.
   - The function then answered book one's origin with 403 (registry `65cb4e9`).
   - `portal` dropped the listing.
3. **The hostname (step 5), done differently from the procedure.** Only DNS *read*
   was available, and parking at the portal had never been tried. So:
   - the custom domain and the CNAME stay on the book's own Pages project;
   - a one-page **retirement notice** (`noindex`, every path rewritten to it) was
     uploaded with wrangler to `main`, `drafts` and `design-16`…`design-23`.

   The hostname stays held, and nothing serves the book. `reconcile` and the design
   previews skip retired books, so nothing overwrites the notice. Older deployments
   keep their own hash URLs (`<hash>.social-research-methods.pages.dev`) until
   they're deleted.
4. **Weekly jobs:** the book's seven workflows other than `lint` are disabled
   (SCHEDULED-JOBS, Part 2).
5. **Left for the platform owner:**
   - Step 6: remove `textbook-admin.pages.dev` from the relay's `ALLOWED_DOMAINS`, a
     Worker secret.
   - Step 7: take `textbook` out of the `textbook-suggest-edit` installation.
   - §8 step 20 of BOOK-ONE-TO-QUARTZ: cancel Obsidian Publish.
   - Whether to delete the Pages projects `social-research-methods` and
     `textbook-admin`, the old deployments, or the repo.

**Reinstating** is registry `status: live` plus a `reconcile` of the book. The notice
is replaced at the first build, and the workflows are re-enabled.

### Book two, specifically

`platform-test-book` is `preview` on `platform-test-book.pages.dev` with
`paid_by: platform`. Retiring it means steps 1, 3 and 4. Step 5's `*.pages.dev`
case applies: delete the Pages project or keep it. Step 7 means uninstalling the
App from `dept-coordinator-test`. It has no CMS, no Plausible site and no
workflows, so steps 6, 8 and 9 don't apply. Book one stays routable, so step 2
doesn't apply either.

---

## Declaring a book dark

A dark book's **site** has gone away: the subscription lapsed, the domain was
removed, or the maintainer asked. The maintainer can fix it, and it's expected to
be undone. **It isn't retirement:** the book stays `live`.

**Detection isn't built.** No probe and no `health.json` exist (§5b). Today you
find out when someone reports it. To check by hand:

```sh
curl -s -o /dev/null -w '%{http_code}\n' https://<site.domain>/
curl -s https://<site.domain>/ | grep -o 'window.siteInfo={[^}]*}'   # Publish books
```

A hostname that answers with a **different** `uid` from the registry's
`site_id` is a **takeover, not dark**. Park it the same day, with no grace
period.

Procedure (§5e):

1. Tell the maintainer privately, and note the date.
2. After **14 days** with no fix, open a PR adding
   `"dark": { "since": "<today>", "reason": "<subscription-lapsed | domain-removed | maintainer-request | unknown>", "notified": "<date of step 1>" }`
   under `site`.
3. Park the hostname as in retirement step 5.
4. **What `dark` does today, and what it doesn't:** the schema and validator
   accept it, but **no consumer reads it yet**. The portal doesn't move the book to
   "Currently unavailable", and the function doesn't refuse the origin (§5d's
   refusal isn't built). Parking the hostname is the part that does the work.

**Coming back:** a PR setting `dark: null`, the record pointed back at the host,
and the maintainer re-binding the custom domain. Check `siteInfo` before merging.

---

## Removing a book under the hosting policy

This is removal as the platform's decision: `MULTI-BOOK-HOSTING.md` §7. **Read
the two blockers first.**

> **Blocker 1 — there's no hosting policy.** Removal is available only for a
> breach of a numbered clause in a published policy, or where the law requires
> it (§7g). No policy exists. So today the only grounds are legal requirement
> and direct harm to readers (malware, phishing, plainly unlawful material).
>
> **Blocker 2 — the `removal` record isn't in the schema.**
> `registry.schema.json` rejects unknown keys, so a PR that adds
> `"removal": {…}` as §7e describes **fails `validate`**. Until the schema and
> `validate.mjs` gain the field (§8 step 10), put the clause, the notice date and
> "removal, not voluntary retirement" in the PR **description**, and retire the
> book with `status: retired` alone. Add the record by follow-up PR once the
> field exists.

**Process** (§7g):

1. **Notice first, by default.** Tell the maintainer privately (not in a public
   issue): which clause, what would fix it, and 14 days to fix it. If they fix
   it, nothing is recorded.
2. **Immediate removal** is only for the legal and harm cases. Notify the
   maintainer the same day, after removal. A `foreign` hostname isn't a removal;
   it's an incident (park it, see above).
3. **The PR:** titled neutrally, `Remove <slug> under hosting policy clause N`.
   Retire, clear `dark`, and add the `removal` record once it exists. **Only one
   CODEOWNER exists, so nobody independent approves it.** Say so rather than
   claim a check that doesn't happen.
4. Then run **retirement steps 3–8**. For step 5 on a portal subdomain, park it
   on a page that names nothing: no title, maintainer, link or reason. Until a
   parked page exists, the portal page is the nearest thing, and the book is no
   longer listed on it.
5. **The closing note to the maintainer:** what was withdrawn (the listing, the
   address, suggestions, CMS sign-in, the App), and that their content, repo and
   site are theirs and untouched.
6. **Appeal:** the maintainer replies to the notice. Someone other than the
   person who removed the book reviews it, if the platform has such a person.
   The remedy is the reinstatement PR. One round.

**Evidence and correspondence stay out of the registry.** `registry.json` is
public. It records which rule was breached and when, and nothing else.

---

## What CI can't catch in any of this

- the DNS record set not matching the set of books;
- `ALLOWED_DOMAINS` not matching the `cms.host` values;
- an App installation left behind on a retired book's repo;
- `BOT_TOKEN` filing a new book's suggestions when the App isn't installed;
- a Publish site's `uid` differing from `site_id`.

Check each of these by hand after any change to the book list.
