# Release readiness and archive contract

No BashNota release exists merely because `package.json` has a version. A
release begins as a pre-tag candidate on the exact `master` commit. Only after
that candidate passes every gate may a maintainer create a signed annotated tag
that names the successful candidate workflow run.

## Required evidence

- The GitHub `Quality` workflow succeeded for the exact tag target, including
  static/supply-chain, unit/coverage, browser/security, local Jupyter, Supabase,
  build, and container jobs.
- `npm audit --omit=dev --audit-level=high` is green.
- `npm run release:check` is green in a clean checkout.
- The release archive is produced twice from the same commit and both archives
  have the same SHA-256 digest.
- `release-manifest.json`, `sbom.cdx.json`, `dependency-licenses.json`, test
  evidence, `CHANGELOG.md`, `LICENSE`, `NOTICE`, security policy, provenance
  records, and known limitations are present.
- Every human contributor and fixture has a reviewed rights/provenance entry.
- Every installed dependency has a declared license or a documented legal
  disposition; an `UNKNOWN` entry is evidence to resolve, not permission.
- A maintainer verifies the signed tag with `git verify-tag <tag>` and checks
  that its commit equals the successful Quality workflow SHA.

The pre-tag workflow has read-only repository permissions and cannot create or
push tags. The release workflow refuses an unsigned tag, a tag target without a
successful Quality run, or a tag that does not name matching, unexpired pre-tag
evidence for the exact version and commit. It packages but does not silently
repair or rewrite history.

The candidate rechecks the remote `master` tip immediately before uploading
evidence. The signed-tag workflow checks equality both before its long-running
verification and again immediately before artifact upload, so a candidate
superseded before either evidence boundary cannot become a release merely
because it is still an ancestor of `master`.

## Archive contents

`npm run release:package` writes exactly one `.tar.gz` plus its adjacent
`.sha256` verification file to `release/`. Inside the archive are:

- a clean `git archive` snapshot of the selected commit;
- `history/bashnota.bundle`, containing the exact release commit's complete
  ancestry (including merged branches and merge commits) plus canonical tags;
- generated CycloneDX SBOM and resolved dependency-license JSON;
- `test-evidence.json`, linking the exact successful Quality and release workflow
  runs for publishable candidates (local packages are explicitly marked
  unattested);
- a manifest with commit, source date, file digests, commands, and tool versions.

The bundle preserves deleted files as part of authentic history. Historical
`.nota` blobs have therefore been privacy- and rights-reviewed separately in
`docs/provenance/fixtures.json`; the working-tree snapshot contains only the
purpose-built fixture under `e2e/fixtures/`.

The executable discovery scope is `refs/remotes/*` and `refs/tags/*`; release
`HEAD` is added explicitly, while local `refs/heads/*`, stashes, worktree refs,
and internal `refs/codex/*` namespaces are not release inputs. Published remote
refs are then preserved, rejected, or excluded only through the reviewed rules
below. The `dacli-record` and generated `gh-pages` remote refs have exact
OID-pinned, reasoned exclusions because they are not distributable product
source.

Package manifests that omit a license field are resolved only through the
version-pinned, evidence-linked dispositions in
`docs/provenance/dependency-license-overrides.json`. The report generator fails
after writing its diagnostic report if any dependency remains unresolved. Each
override must reference locally archived license text under
`docs/provenance/license-evidence/`, match its recorded SHA-256 digest, and link
to the upstream file at an immutable 40-character Git commit.

Dependencies, `dist/`, coverage, test output, local `.env*`, provider state,
forbidden paths or secret shapes anywhere in released Git history,
emulator data, user data, and GitHub credentials are excluded. The packaging
script rejects a dirty checkout, a shallow clone, sensitive tracked filenames,
secret-shaped content in every current and historical blob (including binary
and large files) and released commit/tag metadata, oversized entries, and an
archive that fails its own integrity inspection. The scanner recognizes common
provider formats and contextual high-entropy assignments, but it is a release
backstop rather than a substitute for repository secret-scanning controls and
credential rotation.

An intentional scanner regression fixture that resembles a credential may be
excluded from the historical scan only through
`scripts/release/secret-scan-exceptions.json`. Exceptions are bound to the exact
Git blob ID, repository path, detected shape, content SHA-256, and a human-readable
review reason; any mismatch restores the blocking finding. This ledger exists
only to preserve authentic history without treating known synthetic test data
as a live credential.

The branch-classification ledger at `scripts/release/history-branches.json`
allowlists the exact release `HEAD`, `master`, `release/*` branches, their
`origin` tracking refs, and signed tags only when their tips are ancestors of
the release `HEAD`; later mainline or tag commits can never enter an older
release archive. The ledger separately names reviewed legacy development refs,
each bound to its exact reviewed commit OID, whose unique history is
intentionally preserved. A moved or force-pushed legacy ref therefore blocks
packaging until the ledger is explicitly reviewed and updated. Published
agent-namespaced product branches with unique commits receive the same pinned
preservation; their namespace alone never discards their history. Exact
non-source operational or generated refs require a pinned, reasoned exclusion.
Wildcard agent/dependency exclusions and all unclassified remote branches are
omitted only when fully merged into `HEAD`; unique commits block packaging
until individually reviewed. Local-only worktree refs are not remote release
inputs. Merged feature work remains preserved through `HEAD` ancestry even
after its short-lived branch ref is deleted.

Clone archived history with:

```bash
git clone history/bashnota.bundle restored-bashnota
```

## Optional collaboration metadata

If the receiving program permits GitHub collaboration metadata, an authorized
operator may run `npm run release:github-metadata -- --repo mlnomadpy/bashnota`.
The exporter records issues, pull requests, reviews, and comments as JSON using
GitHub's API. It never includes the token. Review the export for private data
before placing it beside—not inside—the canonical source archive.

## Release sequence

1. Update `CHANGELOG.md`, including the exact dated version heading required by
   the candidate gate, known limitations, and `SECURITY.md` support status.
2. Obtain independent provenance/legal and security review.
3. Land the candidate on `master`; wait for Quality on that exact SHA.
4. Run **Pre-tag release candidate** on `master` with the exact package version.
   Wait for it to pass, then record its numeric GitHub Actions run ID.
5. Create and verify a signed annotated tag whose annotation contains the exact
   trailer `Release-candidate-run: <run-id>`.
6. Push only the tag. The release workflow rechecks tag signature, candidate
   evidence, Quality SHA,
   dependency audit, tooling self-tests, and archive reproducibility.
7. A maintainer compares checksums and publishes the generated artifacts.

Failed gates leave the release unpublished. Fix through new commits; never
move a published tag or rewrite authentic dates/authors to make a gate pass.
