# ADR 0001: Preserve authentic development history

- Status: accepted
- Date: 2026-09-03

## Decision

Release archives carry a filtered Git bundle governed by
`scripts/release/history-branches.json`. The bundle contains the exact release
`HEAD`; release-line branches and tags only when their tips are ancestors of
that `HEAD`; and explicitly reviewed legacy branches bound to a pinned commit
OID. It excludes private workspace, automation, deployment, and unreviewed
unique refs only through reviewed policy: agent-namespaced product refs with
unique commits must be pinned and preserved, while an exact non-source ref may
be omitted only by a pinned disposition with a reason. Pattern exclusions can
omit only branches already merged into release `HEAD`. We preserve merge
commits, contributor names/emails, author/committer dates, relevant tags and
branches, bot identities, and dacli agent attribution. Alias reconciliation is
additive metadata under `docs/provenance/`; it never rewrites commits.

Historical ambiguity is corrected through forward commits, tests, issues, and
ADRs. We do not squash authentic development, manufacture commits, normalize
authors with history rewriting, or move published tags.

## Consequences

The archive is larger than a source snapshot and may retain imperfect commit
messages or obsolete paths. That is intentional evidence. Personal data already
present in public Git history must be handled through a separate, explicit
legal/privacy process rather than silently edited during release preparation.
