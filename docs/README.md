# Platform owner's documentation

This folder is for **the platform owner**: whoever holds the registry, the
accounts, the GitHub App, the portal, the deploy hooks, and the power to retire a
book. If you look after one book, you're in the wrong place. Your guides are in
your book's own `docs/` (book one:
[`textbook/docs/`](https://github.com/textbookproject2026-alt/textbook/tree/main/docs)),
and a new book gets them from
[`textbook-template/docs/`](https://github.com/textbookproject2026-alt/textbook-template/tree/main/docs).

`../design/` next door is the architectural record: *why* each rule exists.
This folder is *what is deployed, and what to do*. Where the two disagree, this
folder and the registry's `README.md` are the newer.

## Start here

If you're inheriting the platform cold, read these in order:

1. **[INFRASTRUCTURE.md](INFRASTRUCTURE.md)**: every service, account, secret
   and deploy pipeline, and what breaks if each one goes. Resolve its
   *confirm at handover* rows first.
2. **[DOCS-AUDIT.md](DOCS-AUDIT.md)**, *Wrong in ways documentation can't fix*:
   the known defects, so you don't rediscover them.
3. **[BOOK-LIFECYCLE.md](BOOK-LIFECYCLE.md)**: the only procedures that change
   which books the platform serves.

## Everything in this folder

| File | For when |
|---|---|
| [INFRASTRUCTURE.md](INFRASTRUCTURE.md) | anything is broken and you don't know which system owns it; any handover |
| [SCHEDULED-JOBS.md](SCHEDULED-JOBS.md) | a workflow went red, a chore PR is piling up, or nothing ran. It covers the registry's workflows and book one's |
| [BOOK-LIFECYCLE.md](BOOK-LIFECYCLE.md) | adding a book, retiring one, declaring one dark, or removing one under the hosting policy |
| [CMS-RELAY.md](CMS-RELAY.md) | editor sign-in fails, a book wants the browser editor, or the relay's secret leaks |
| [AUTHORING-APP-OPERATIONS.md](AUTHORING-APP-OPERATIONS.md) | building, signing and shipping the author's app, and its sign-in |
| [DOCS-AUDIT.md](DOCS-AUDIT.md) | the 22 Sep 2026 audit: which doc lives where, and what documentation can't fix |

## Elsewhere, for the platform owner

- [`../README.md`](../README.md): the registry's fields, rules, checks and
  parity. This is where to go before editing `registry.json`.
- `suggest-edit-function/README.md`: the function's contract, environment and
  smoke tests.
- `textbook-portal/README.md`: the portal's build and the apex redirect rule.
- `authoring-assistant/BUILD.md`: the full app build procedure.
- `textbook-template/SETUP.md`: the maintainer's side of adding a book.
