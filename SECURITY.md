# Security policy

## Supported versions

BashNota is pre-1.0 software. Security fixes are applied to the current
`master` branch only; no released version is presently supported. The first
supported version will be listed here when a signed release passes every gate
in `docs/release-readiness.md`.

## Report a vulnerability privately

Do not open a public issue, discussion, pull request, or nota containing exploit
details, credentials, private data, or an unpatched vulnerability. Use GitHub's
[private vulnerability report](https://github.com/mlnomadpy/bashnota/security/advisories/new).
If that channel is unavailable, email `contact@tahabouhsine.com` with the
subject `BashNota security report` and request an encrypted follow-up before
sending sensitive material.

Include the affected commit/version, impact, reproduction preconditions, and a
minimal proof of concept using synthetic data. Do not test against production,
access another user's data, degrade service, or retain data beyond what is
needed to report the issue.

The maintainers aim to acknowledge a report within 7 days, provide a triage
decision within 14 days, and coordinate disclosure after a fix is available.
Timelines may change with severity and maintainer availability. Good-faith
reports following this policy will not be intentionally pursued merely for the
act of testing.

## Scope and trust boundaries

High-risk surfaces include imported/published nota content, rendered HTML and
diagrams, AI-provider credentials, Jupyter HTTP/WebSocket transport, IndexedDB
and filesystem persistence, Supabase Auth/RLS/Storage/Edge Functions, and
generated exports. See `docs/architecture/threat-model.md`.
