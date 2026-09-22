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

The maintainer does template steps 0–3 and sends you `registry-entry.json` and
`REGISTRY-REQUEST.md`. From there:

| # | Step | Checked by |
|---|---|---|
| 1 | Read `REGISTRY-REQUEST.md`. It lists what in the entry is a guess | you |
| 2 | Confirm the repo is **public** and has **both branches**. `github-facts` fails otherwise | CI |
| 3 | Decide the hostname. The default is `<slug>.confused4now.org`. An own domain is an exception you agree to in this PR, and the maintainer must understand that an own-domain book can only ever be de-listed (§7d). `*.pages.dev` is allowed only while the book is `preview` | CI enforces the depth rule and the shared-suffix rule |
| 4 | Record `paid_by` truthfully, or leave it absent. `maintainer` requires `maintainer.github` | CI |
| 5 | Tell the maintainer the onboarding terms (below) and get their agreement in the PR thread | nobody. This is the gap |
| 6 | Open the PR with `status: preview`, get it reviewed, merge | CODEOWNERS, once branch protection is on (INFRASTRUCTURE.md §1) |
| 7 | Watch `deploy` and `portal` go green on the merge commit | SCHEDULED-JOBS.md |
| 8 | **Portal subdomain only:** create the DNS record, and **do it just before the maintainer binds it**. A CNAME waiting unbound is the takeover window (§2e). Publish: `CNAME <slug> → publish-main.obsidian.md`, proxied. Pages: `CNAME <slug> → <project>.pages.dev`, proxied, plus the custom domain on the Pages project | nobody. DNS isn't generated |
| 9 | **Publish only:** once the site answers, check `window.siteInfo`: `uid` = `site_id`, `status` = `active`, `customurl` = the hostname. Fill in `site_id` with a follow-up PR if it went in as a placeholder | you, by `curl` (template SETUP A6.3) |
| 10 | **If the book wants the browser editor:** add its `cms.host` to the relay's `ALLOWED_DOMAINS` by hand, then record `cms.enabled: true` and the host in the registry | nobody (CMS-RELAY.md) |
| 11 | The maintainer installs the App (**only select repositories**). Then confirm a honeypot POST resolves to *their* repo, and that a real suggestion is filed by `textbook-suggest-edit[bot]`, **not** `aldogobot` | you. `BOT_TOKEN` can mask a missing installation (INFRASTRUCTURE.md §2b) |
| 12 | When the site works and a real suggestion has been filed: a PR moving `status` to `live`, with `suggest_edit.counted_from` set to that day | CI |

**Onboarding terms** (`MULTI-BOOK-HOSTING.md` §5e, §7g). There's no published
page for these yet, so send them in the PR thread:

1. You pay for your own site. The platform holds the hostname.
2. If your site stops answering, you're told privately. After 14 days, your book
   is marked unavailable and your hostname is parked and kept for you.
3. Tell the platform before you change your custom domain. Your annotations
   survive only while the hostname stays the same.
4. The platform may retire your book under the hosting policy, after 14 days'
   notice, except where the law or direct harm to readers requires immediate
   action. It never touches your content, repository or site.

> **Term 4 refers to a hosting policy that doesn't exist yet.** §7g makes
> removal available *only* for a breach of a numbered clause in a published
> policy. Until that policy is written and in this repo, the platform has no
> defined removal power over any book except the legal and harm cases. Write it
> before the first maintainer-owned book goes live. It's a decision for the
> platform owner, not something a docs change can supply.

---

## Retiring a book that is finished (voluntary)

This is the ordinary case, and **book two's is next**. It has no `removal`
record.

1. **The registry PR:** set `"status": "retired"`. Clear `site.dark` if it was
   set, since `dark` is allowed only on a `live` book. Nothing else changes, and
   the slug, hostname and repo stay reserved. Title: `Retire <slug>`.
2. **If this is the last `preview`/`live` book, stop.** The function's build
   requires at least one routable book, so the deploy would fail and production
   would keep serving the book. This doesn't apply while book one is live.
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
8. **Platform-held accounts for the book:** a Plausible site in the platform's
   account, or a Pages project that the platform pays for. Close or hand them
   over.
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
