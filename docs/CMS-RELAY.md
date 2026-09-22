# The CMS auth relay

**Audience: the platform owner.** This covers the shared half of the browser
editor: the Cloudflare Worker that every book's editor signs in through, the
GitHub OAuth App behind it, and the allowlist that decides which editor pages
may use it.

The book's half is the editor page itself: its Pages host, `admin/config.yml`,
contributor access and branch protection. That half is in each book's
`docs/the-browser-editor.md`. It was all one file, `textbook/OAUTH-SETUP.md`,
while there was one book. It is split now because the relay is shared and the
editor page isn't.

INFRASTRUCTURE.md §3 is the inventory entry. This file is the procedure.

---

## Why Sveltia CMS

This was decided in August 2026, and the reasoning is kept here because it's
what makes the relay necessary.

Netlify Identity and Git Gateway are closed to new sites, so every Git-based CMS
now needs an external OAuth relay. Sveltia maintains its own
([sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth)). What
decided it: book chapters have **no frontmatter**, and Sveltia's `format: raw`
edits a body-only markdown file natively, where Decap would start writing `---`
blocks into files that Obsidian and Publish expect to be plain prose. Sveltia
keeps Decap's config format, so moving back would be a backend swap. The cost,
accepted knowingly: Sveltia is pre-1.0, so each book pins its version in
`admin/index.html` (`@sveltia/cms@0.193.1` for book one).

---

## What exists

| Piece | Where | Shared? |
|---|---|---|
| Worker `sveltia-cms-auth` | Cloudflare `brandonproject2026`, `https://sveltia-cms-auth.brandonproject2026.workers.dev` | yes. It is `platform.cms_auth_relay` |
| Its source | `textbookproject2026-alt/sveltia-cms-auth` | yes |
| GitHub OAuth App *Textbook CMS* | an individual GitHub account (**confirm which**) | yes, one app for every book |
| `ALLOWED_DOMAINS` | a Worker variable | yes. It is a list of every book's editor host |
| An editor page (`admin/`) | a Pages project per book, e.g. `textbook-admin.pages.dev` | no: each book's own |

The relay swaps GitHub's one-time code for an access token and posts it back to
the editor page. It holds the client secret and stores nothing.

**The scope is `repo,user`, and it isn't a setting.** This copy of the Worker
hardcodes it (`src/index.js`, the GitHub branch of `handleAuth`) and ignores any
narrower scope the CMS asks for. The registry records it as
`platform.cms_auth_relay_scope` so that nobody assumes otherwise. It means a
contributor's editor token can read and write **every** repository that
contributor can reach. Newer upstream releases honour a narrower scope. Moving to
one is the fix, and it would be a change to the relay for every book at once.

---

## The Worker's variables

Cloudflare dashboard → **Workers & Pages** → `sveltia-cms-auth` → **Settings** →
**Variables and Secrets**:

| Name | Value | Notes |
|---|---|---|
| `GITHUB_CLIENT_ID` | the *Textbook CMS* client ID | plain text |
| `GITHUB_CLIENT_SECRET` | the *Textbook CMS* client secret | **Encrypt** before saving |
| `ALLOWED_DOMAINS` | a comma-separated list of the exact hostnames editor pages run on. Today: `textbook-admin.pages.dev` | **Enforced** (verified 18 Sep: `site_id=evil.example` gets `UNSUPPORTED_DOMAIN`) |

### `ALLOWED_DOMAINS` is the per-book part, and it's manual

It should always equal the `cms.host` of every book that is `cms.enabled` and not
`retired`:

```sh
jq -r '[.books[] | select(.status != "retired" and .cms.enabled) | .cms.host] | join(",")' registry.json
```

Nothing generates or checks it (`DESIGN.md` step 5a is unbuilt). Parity prints
it as "not checkable" on every run. So:

- **Adding a book's editor:** append its host here, then record it in the
  registry (`cms.enabled: true`, `cms.host`) in a PR. The validator refuses a
  bare `pages.dev`-style suffix, and that matters here, because `pages.dev` in
  this list would let *anyone's* Pages site mint tokens through the platform's
  OAuth app.
- **Retiring a book:** remove its host. See BOOK-LIFECYCLE.md.
- **Never a wildcard.** `*.confused4now.org` would trust every book subdomain,
  including a dangling one somebody has taken over (`MULTI-BOOK-HOSTING.md` §3a).
- Exact production hostnames only. Cloudflare's per-deployment previews
  (`<hash>.<project>.pages.dev`) can't sign in, which is intended.

---

## Setting it up from nothing

You'd need this only if the Worker or the OAuth App is lost. It's all browser
work: GitHub won't issue a client secret to a script. Budget 30 minutes.

1. **Deploy the Worker.** Use the *Deploy to Cloudflare Workers* button on
   `sveltia/sveltia-cms-auth`, or `wrangler deploy` from
   `textbookproject2026-alt/sveltia-cms-auth` to keep the `repo,user` behaviour
   books were set up with. Note the `*.workers.dev` URL.
2. **Register the OAuth App.** GitHub → Settings → Developer settings → OAuth
   Apps → New:

   | Field | Value |
   | --- | --- |
   | Application name | `Textbook CMS`. Contributors see this when authorising |
   | Homepage URL | the portal, `https://confused4now.org`. The existing app still says `https://textbook-admin.pages.dev`, from when there was one book. GitHub enforces only the callback |
   | Authorization callback URL | **the Worker URL + `/callback`**. The suffix is required |

   Register it under an individual account if you don't want other org owners
   able to rotate the secret. Copy the client ID, generate a secret, and copy
   that at once, because GitHub shows it once.
3. **Set the three variables** above.
4. **If the Worker's URL changed:** set `platform.cms_auth_relay` in the registry
   by PR. Every book's `admin/config.yml` renders `base_url` from it, but only
   when that book's `configure.mjs` next runs (a config PR, or the weekly
   `apply-config`). A book without the weekly job must re-render by hand. **Keep
   the old Worker answering until every book has re-rendered.** Platform
   endpoints are permanent (`MULTI-BOOK-HOSTING.md` §5a).

Do **not** reuse this OAuth App for the author's console. The console has its own
device-flow app (AUTHORING-APP-OPERATIONS.md), so revoking one never signs out
the other.

---

## If something is wrong

| Symptom, on any book | Cause |
| --- | --- |
| Sign-in popup opens then closes, still signed out | that book's host isn't in `ALLOWED_DOMAINS`, or its `base_url` has a trailing slash or `/callback` |
| Every book's sign-in fails at once | client ID or secret wrong, or the Worker is down |
| "Server not found" after authorising | the callback URL on the OAuth App and the Worker URL disagree |
| Signs in, can't save | not a relay problem: the contributor lacks **Write** on that book's repo |

## If the client secret leaks

Delete it on the OAuth App, generate a new one, and update `GITHUB_CLIENT_SECRET`.
No repository changes. The secret alone can't grant repository access without a
contributor completing a sign-in, but rotate it anyway. Contributors' existing
tokens are unaffected. Revoking *those* means revoking every token the OAuth App
has issued, which signs out every contributor on every book.
