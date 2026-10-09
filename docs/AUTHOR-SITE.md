# The author site: how it is put together

**author.confused4now.org** is where every author works on their book, in a browser:
Word imports, the citation, concept-link and glossary questions, reader
suggestions, draft changes, and going live. It replaced the Authoring Assistant, a
Mac app, on 28 Sep 2026 (its operations guide is in
[`history/AUTHORING-APP-OPERATIONS.md`](history/AUTHORING-APP-OPERATIONS.md)). The
author's guide is the template's `docs/the-author-site.md`.

This page is the platform owner's: what runs where, who may do what, and what to do
when something is set up or moved.

---

## 1. The parts

| Part | Where | What it does |
|---|---|---|
| **The site** | repo `author-site`, Cloudflare Pages project `c4n-author-site` (account `brandonproject2026`), custom domain `author.confused4now.org` | Static pages (`site/`, plain ES modules) and, since batch 2b, its own backend: Cloudflare Pages Functions (`functions/`). Pages builds with `node scripts/fetch-converter.mjs`; `wrangler.toml` holds the bindings and plain settings. A push to `main` deploys, a PR gets `<branch>.c4n-author-site.pages.dev` |
| **Who is on each book** | Cloudflare **D1** database `c4n-author-members`, bound to the site as `DB` (schema: `author-site/migrations/`) | Members (display name, email, a GitHub login while one is linked, the suggestion-email setting), who is on which book, sessions, emailed links, one-minute request assertions, the People audit log, rate limits. **Access follows this, at once.** See §2 |
| **Sign-in** | `author-site/functions/api/auth/*`; email through Resend | Emailed links (sign-in: 15 minutes, single use; invitation and email confirmation: seven days, single use; every token stored only as its SHA-256), then an HttpOnly, Secure, SameSite=Lax session cookie for 30 days. GitHub sign-in survives only for members who haven't moved to email yet (§2) |
| **The author endpoints** | `suggest-edit-function`, `api/author-read`, `-send`, `-import`, `-act` (Vercel), reached through the site's `/fn/` proxy | Every read and write, as the GitHub App `textbook-suggest-edit`. A member's commits are authored as their display name and `m-<id>@users.noreply.confused4now.org` |
| **The public record** | this registry: `books[].members`, `authors`, `mentions_off` | Synced from D1 in the background (§2); never emails |
| **Word conversion** | private `book-requests`: workflow `import-chapter`, `scripts/import_chapter.py` | The Authoring Assistant's own `convert.py`, `contents.py`, `drafts.py`, at `CONVERTER_REF`, with pandoc at `PANDOC_VERSION` |
| **The questions** | in the author's browser: Pyodide (pinned in `author-site/converter.json`), from jsDelivr | The Authoring Assistant's own Python (`session.py`'s `DraftsSession` and the modules it uses), at the commit `converter.json` pins, copied into `site/py/` at build time |
| **The converter's source** | `authoring-assistant` (public) | Now only the converter library and its tests. Two pins point at it: book-requests' `CONVERTER_REF` and author-site's `converter.json`. Move them together, after its tests pass |

Pageviews only, to the platform's one Plausible site (`platform.analytics.plausible`,
`site/analytics.js`), from `author.confused4now.org` alone: previews load no script.
No custom events.

---

## 2. Who may do what

**Who is on a book lives in D1** (`c4n-author-members`), not in this registry. Every
member of a book is equal: anyone on it can invite (by name and email), remove, edit
and publish. Adding and removing take effect at once: removing someone deletes their
sessions and pending links, and their next request is refused; someone removed from
their last book also loses their stored email (their name stays in the credits).

**A request to the author endpoints** goes browser → the site's `/fn/<endpoint>`
(`functions/fn/[[path]].js`) → suggest-edit-function:

1. **The proxy** forwards only `author-read`, `-history` (GET), `-import` (GET, POST),
   `-send` and `-act` (POST), only to the function's production origin (hard-coded),
   only with a valid session whose member is on the book the request names, and only
   with the site's own `x-author-site` header and Origin (the CSRF check). It sends
   none of the browser's headers: just `Authorization: Member <id>`.
2. **The assertion.** For each request the proxy writes a one-minute, single-use
   assertion (stored hashed) bound to the member, the book, the method, the endpoint,
   the query and a hash of the body.
3. **The function** (`lib/member.mjs`) recomputes that binding from the request it
   received and reads the assertion back from `https://author.confused4now.org/api/internal/assertion`
   (hard-coded) over HTTPS. The author site answers once, only if the binding matches
   and the member is still on that book, and marks it used. The member may then act on
   that book alone. **There is no shared secret**: the trust is the fixed origin and TLS.

**The registry stays the public record.** After a change, the site asks the function's
`/api/author-sync` (inside `api/author.js`) to bring `books[].members` (member ids and
display names), `authors` (the GitHub logins still linked: GitHub sign-in during the
migration, and @mentions) and `mentions_off` in line. The function reads the site's
public `/api/internal/members?book=` (never emails) and keeps **one pull request per
book** (branch `people/<slug>/sync`), updated in place, which merges itself on green.
A slow or failed sync never affects access. On the People tab, only the platform
maintainer (`PLATFORM_OWNER` in `author-site/wrangler.toml`) sees whether the registry
has caught up.

**A new book** arrives from provisioning with its people as GitHub logins in `authors`.
The first time one of them signs in (GitHub) or the platform owner loads the site,
each book with **no members in D1 yet** adopts its registry authors once; from then
on D1 decides. Someone without GitHub is invited by email from People.

**The migration flag.** `GITHUB_SIGNIN` in `author-site/wrangler.toml` (`"on"`) keeps
the GitHub button for members who joined before email sign-in: they sign in with
GitHub once and confirm an email address (a link to that inbox). Once a member has an
address, GitHub no longer signs them in. People shows any member without one as **needs
an email address**; only the platform maintainer can send them a confirmation link from
there (whoever reads that inbox becomes them, on every book). When every member has an
email, set `GITHUB_SIGNIN = "off"` and deploy: the button and `/api/auth/github` go.

**Copied invitations.** An invitation copied from People (rather than emailed) never adds
or signs in anyone by itself: opening it sends the same invitation to the invited address,
and joining happens from that inbox.

**Setting it up again** (a new account, say): create the D1 database, put its id in
`wrangler.toml`, apply `migrations/` (`npx wrangler d1 migrations apply
c4n-author-members --remote`), and run book-requests' `author-site-mail` workflow to
give the site the Resend key. Reading the members: `npx wrangler d1 execute
c4n-author-members --remote --command "SELECT …"`.

**A new platform page** (one that should sign people in, or call the author
endpoints) is a `platform.pages` entry, not a code change. Its hostname must be the
platform's own, and validate.mjs keeps it apart from every book's.

---

## 3. What the GitHub App does, and how it signs it

The endpoints act as the App, never with anyone's own token (the `BOT_TOKEN`
fallback that the reader endpoints still accept is refused here). Every request logs
`credential=app for <repo>`. Tokens are downscoped to the one repository and the
permissions each endpoint needs; the App needs **Contents**, **Issues** and **Pull
requests** read and write on every book's repository and on `book-requests`, which it
already has for the in-site editor and the request form.

- **Commits** on drafts: author = the signed-in author's noreply address, committer =
  `textbook-suggest-edit[bot]`, message ending `Sent by @login via the author site.`
- **Replies, decline notes, squash messages, the publish description and its merge
  commit** all say `by @login via the author site`. Accepting a draft change adds
  `Co-authored-by:` for its (non-bot) commit authors, so a reader's credit survives
  the squash.
- **Publishing** merges drafts into the live branch with a merge commit, only after a
  tick box and only if GitHub says it merges cleanly. **No book's live branch is
  protected** (checked 28 Sep 2026). If one ever is, the App must be allowed to merge
  there, or publishing that book fails.

**Paths.** The author endpoints read and write only `chapters/…`, `assets/…`, and
exactly `index.md`, `glossary.md` and `chapter-sources.json`.

**Concurrency.** A send is one commit whose parent is the drafts commit the author
worked from, moved without force. If drafts has moved, nothing is written and the
author is shown what moved.

---

## 4. Word imports, privately

1. `api/author-import` takes the `.docx` in 2.5 MB parts (the request form's
   mechanism, 20 MB in all), stored as blobs in `book-requests`, each answered with a
   receipt signed for that login: a part is only accepted back with its receipt, so
   nobody can name another manuscript's blob.
2. It makes a branch **`author-imports/<id>` from `book-requests`' `main`**, adding
   `import/request.json` and `import/source.docx`. (From `main`, because a push runs
   the pushed commit's own workflow file.)
3. `import-chapter` converts it against the book's drafts at the recorded commit and
   commits `import/result.json`, `import/chapter.md` and `import/out/<path>` to the
   same branch. The site previews them; `api/author-send` copies them into the book
   as one commit. The manuscript never touches a public repo until the author sends
   the result.
4. `import-chapter` deletes import branches older than `IMPORT_KEEP_DAYS` (7) daily.

The layout is `suggest-edit-function/lib/author-import.mjs`; the workflow is
book-requests' README, *Imports from the author site*.

---

## 5. Settings, and where they live

| Name | Where | What |
|---|---|---|
| `IDENTITY_SECRET`, `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET` | Vercel, `suggest-edit-function` | as for the in-site editor: nothing new |
| `REQUESTS_REPO` (optional) | Vercel | as for request-book |
| `AUTHOR_BOT_LOGIN`, `AUTHOR_BOT_ID` (optional) | Vercel | the committer; default `textbook-suggest-edit[bot]`, `329478423` |
| `PANDOC_VERSION` | book-requests variable | the platform's one pandoc pin (`3.11`), for `provision`, `import-chapter` and `test` |
| `CONVERTER_REF` | book-requests variable | the authoring-assistant commit for Word imports |
| `IMPORT_KEEP_DAYS` (optional) | book-requests variable | default 7 |
| `AUTHOR_SITE_URL` (optional) | book-requests variable | where the welcome email sends authors |
| `converter.json` | `author-site` repo | the authoring-assistant commit and files for the questions, and the Pyodide version |

Nothing on the author's computer: the sign-in lives in the browser tab.

---

## 6. When it goes wrong

| Symptom | Look at |
|---|---|
| Nobody can sign in | `github-auth` (Vercel logs), the *Textbook sign-in* OAuth App, `IDENTITY_SECRET`; `platform.pages` still lists the site with `github-auth` |
| One author sees no books | their login in the book's `authors`, in the right case |
| *"The author site isn't switched on for this book yet"* | the App isn't installed on that book's repository |
| Imports never finish | `book-requests` Actions, `import-chapter`: its token step (the platform App reads `authoring-assistant` while it is private), pandoc download, the registry check |
| *"The checker couldn't be started"* | the Pages build copied `site/py/` (`py/manifest.json` exists); jsDelivr reachable; the CSP in `author-site/site/_headers` |
| Publishing refuses | the publish PR's mergeability on GitHub; branch protection (§3) |

The function's logs name the login and book on every line (`login=… book=…`).
