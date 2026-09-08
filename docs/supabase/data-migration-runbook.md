# Provider-neutral legacy migration runbook

This offline operator workflow imports a versioned JSON envelope into Supabase. It does not import or execute any retired-backend SDK, Admin library, CLI, emulator, or runtime code. Source extraction is an upstream operational responsibility: the accepted handoff is JSON only.

## Restricted input contract

Run the tools only in a restricted operator environment. Source files, identity maps, checkpoints, audit chains, approvals, and reports contain migration-sensitive data and must be encrypted at rest, mode `0600`, excluded from source control, and destroyed according to the migration retention policy.

Capture one write-consistent watermark and provide:

- `authUsers.json` with stable UID, verified email, provider, provider UID, disabled state, and display name;
- one JSON array for each collection: `users`, `publicProfiles`, `userTags`, `notas`, `publishedNotas`, `publishedNotaViewers`, `publishedNotaViewerDocuments`, `notaVotes`, `comments`, and `newsletterSubscriptions`;
- `storageManifest.json` with object path, SHA-256, media type, and optional owner UID.

Assemble the canonical envelope:

```sh
npm run migration:legacy:export -- \
  --input-dir "$RESTRICTED_EXPORT_DIR" \
  --watermark "$SOURCE_WATERMARK" \
  --output "$RESTRICTED_ARTIFACT_DIR/legacy-export.json"
```

The output schema is `{version, watermark, authUsers, collections, storageManifest}`. The assembler rejects lossy numeric tokens, sorts record keys deterministically, and preserves array order and typed nested JSON. The transform normalizes UTC timestamps to microseconds while retaining their raw source representations in provenance hashes.

## Dry run and identity boundary

```sh
npm run migration:legacy -- \
  --mode dry-run --environment staging --run-id "$RUN_ID" \
  --source "$RESTRICTED_ARTIFACT_DIR/legacy-export.json" \
  --audit "$RESTRICTED_ARTIFACT_DIR/$RUN_ID.audit.ndjson" \
  --checkpoint "$RESTRICTED_ARTIFACT_DIR/$RUN_ID.checkpoint.json" \
  --report "$RESTRICTED_ARTIFACT_DIR/$RUN_ID.dry-run.json" \
  --batch-size 100 --requests-per-second 20 --max-retries 3
```

Any missing identity/profile/tag link, owner mismatch, hierarchy cycle, orphan, ambiguous vote, malformed tag/referrer, counter disagreement, lossy content, or quarantine is a no-go. Dry-run performs no Auth, domain, run, journal, or audit database mutation.

Email identities may be provisioned by the restricted Supabase Admin API after an immutable source-UID-to-Supabase-UUID plan is recorded. Existing accounts are never linked by email alone. Google identities must already exist and be provider-linked by an independently approved OAuth harness; pass their exact restricted mapping with `--identity-map`. The local stack cannot prove the Google callback and this tool does not simulate it.

## Apply, retry, and reconciliation

Set `SUPABASE_URL` and a server-side secret key only in the restricted process environment. Never expose it to a browser or `VITE_*` variable.

```sh
npm run migration:legacy -- \
  --mode apply --environment staging --run-id "$RUN_ID" \
  --source "$RESTRICTED_ARTIFACT_DIR/legacy-export.json" \
  --identity-map "$RESTRICTED_ARTIFACT_DIR/identity-map.json" \
  --audit "$RESTRICTED_ARTIFACT_DIR/$RUN_ID.audit.ndjson" \
  --checkpoint "$RESTRICTED_ARTIFACT_DIR/$RUN_ID.checkpoint.json" \
  --report "$RESTRICTED_ARTIFACT_DIR/$RUN_ID.apply.json"
```

`--mode resume` uses the same arguments and requires the same run, manifest, watermark, and identity-plan hashes. A database lease fences concurrent writers. Each journal reservation binds source and target hashes; each mutation and its `created` or `preexisting` provenance commit atomically. Changed source, changed target, a live competing lease, or a permanent error fails closed. Only bounded transient errors retry. Local and database audit logs are append-only, idempotent hash chains containing allowlisted non-PII fields.

Successful reconciliation requires exact entity counts and hashes; identity, owner, public URL, publication hierarchy, citation order, comment reply order, counter, vote, viewer, metric, newsletter, and orphan parity; and valid storage-manifest hashes. A valid manifest proves metadata only. Storage bytes are not copied by this engine and require a separate byte-for-byte copy and hash report.

## Rollback and restore rehearsal

```sh
npm run migration:legacy -- --mode rollback --environment staging --run-id "$RUN_ID"
npm run migration:legacy -- \
  --mode resume --environment staging --run-id "$RUN_ID" \
  --source "$RESTRICTED_ARTIFACT_DIR/legacy-export.json" \
  --identity-map "$RESTRICTED_ARTIFACT_DIR/identity-map.json" \
  --audit "$RESTRICTED_ARTIFACT_DIR/$RUN_ID.restore.audit.ndjson" \
  --checkpoint "$RESTRICTED_ARTIFACT_DIR/$RUN_ID.restore.checkpoint.json" \
  --report "$RESTRICTED_ARTIFACT_DIR/$RUN_ID.restore.json"
```

Rollback acquires its own fenced lease and reverses journal entries in dependency order. Rows created by the run are deleted; exactly matching pre-existing rows are retained. Identity translations and provisioned Auth accounts are deliberately retained. A crash may resume after the last committed rollback record, and final `rolled-back` state is refused while any non-identity record remains nonterminal. Restore replays the identical manifest and verifies the original canonical snapshot.

## Local proof and external gates

```sh
npx --yes supabase@2.114.0 db reset
npx --yes supabase@2.114.0 test db
npm run test:migration-engine
npm run test:supabase:migration
```

The fixture covers Auth, profiles/tags, notas and publications, hierarchy/order, views and aggregate metrics, comments/replies/votes, newsletter subscriptions, and storage metadata. It proves idempotent rerun, retry after lost responses, lease fencing/takeover, checkpoint binding, audit integrity, rollback, and restore against a fresh local Docker stack.

`productionCutover` remains `false`. The local rehearsal is not evidence for external production-shaped volume, Google provider callbacks, storage-byte copy, production credentials/configuration, operational approvals, or canary/error/latency windows. Those remain mandatory deployment gates, along with an independently restricted database cutover marker and an explicit non-secret approval artifact. The application runtime is Supabase-only; these unproven gates do not authorize reintroducing a retired backend fallback.
