# Provenance ledger

Git remains the authoritative record of who authored and committed each change.
This directory adds release-review metadata without rewriting that evidence.

- `contributors.json` maps known aliases to a stable person or automation class
  and records the inbound rights basis.
- `fixtures.json` records every bundled `.nota` fixture, its origin, privacy
  review, license, and digest.

The release self-test compares author identities in the exact release `HEAD`
ancestry and canonical tags, including every historical `.nota` reachable from
them, with this ledger. A new unmatched author blocks packaging until a reviewed
entry is added. Private workspace, stash, remote, and agent bookkeeping refs are
excluded from both the archive and this ledger. Pattern entries cover per-run
dacli identities while the exact commit identity and role remain in Git trailers
and author fields.

Rights basis means the evidence on which the project relies for distribution;
it is not a claim that aliases erase separate legal identities. Contributors
must correct inaccuracies through a new commit or private maintainer contact.
