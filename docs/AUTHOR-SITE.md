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
| **The site** | repo `author-site`, Cloudflare Pages project `author-site` (account `brandonproject2026`), custom domain `author.confused4now.org` | Static: plain ES modules, no framework. Pages builds with `node scripts/fetch-converter.mjs` (output `site/`); a push to `main` deploys, a PR gets `<branch>.author-site.pages.dev` |
| **The author endpoints** | `suggest-edit-function`, `api/author-read`, `-send`, `-import`, `-act` (Vercel) | Every read and write, as the GitHub App `textbook-suggest-edit` |
| **Sign-in** | `suggest-edit-function`, `api/github-auth` | The same no-scope OAuth App (*Textbook sign-in*) as the in-site editor. The GitHub token is revoked at once; the page gets an 8-hour identity token bound to its own origin |
| **Who may** | this registry: `books[].authors`, `platform.pages` | See §2 |
| **Word conversion** | private `book-requests`: workflow `import-chapter`, `scripts/import_chapter.py` | The Authoring Assistant's own `convert.py`, `contents.py`, `drafts.py`, at `CONVERTER_REF`, with pandoc at `PANDOC_VERSION` |
| **The questions** | in the author's browser: Pyodide (pinned in `author-site/converter.json`), from jsDelivr | The Authoring Assistant's own Python (`session.py`'s `DraftsSession` and the modules it uses), at the commit `converter.json` pins, copied into `site/py/` at build time |
| **The converter's source** | `authoring-assistant` (public) | Now only the converter library and its tests. Two pins point at it: book-requests' `CONVERTER_REF` and author-site's `converter.json`. Move them together, after its tests pass |

Pageviews only, to the platform's one Plausible site (`platform.analytics.plausible`,
`site/analytics.js`), from `author.confused4now.org` alone: previews load no script.
No custom events.

---

## 2. Who may do what

Every author request is checked, afresh, by suggest-edit-function (`lib/author.mjs`):

1. **The page.** The `Origin` must be a platform page whose `platform.pages` entry
   lists `author-api`: `https://author.confused4now.org`, or a preview of the
   `author-site` Pages project. Anything else: 403, no CORS headers.
2. **The person.** An identity token that `github-auth` issued **to that origin**.
   `github-auth` signs people in only for books' origins and for platform pages
   listing `github-auth`. A token from a book's in-site editor is useless here.
3. **The book.** The login must be in that book's `authors` (case-insensitive), and
   the book not retired. Repository collaborator status plays no part: nobody is
   invited to a book's repository any more.

A book's `authors` is set by provisioning (the form's GitHub username, plus the
platform owner) or by `new-book.mjs` (the maintainer, plus the platform owner); the
platform owner is an author of every book. **To add or remove an author**, edit the
book's `authors` here by pull request; it takes effect when `deploy.yml` has
redeployed the function (minutes). `check-github.mjs` fails a login that isn't a real
personal account in its own case.

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
