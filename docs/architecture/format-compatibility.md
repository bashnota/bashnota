# `.nota` format compatibility

The portable export is JSON. Current deterministic fixtures use envelope
version `1.0` with `exportedAt`, one `nota`, and `subnotas`. A nota contains
identity/timestamps, optional hierarchy and tags, and TipTap/ProseMirror JSON in
`content`.

Compatibility rules:

- Treat unknown fields and node types as forward-compatibility data; do not
  silently discard them on read/write.
- Preserve nota/subnota IDs and hierarchy unless an explicit collision policy
  creates a mapped copy.
- Parse timestamps as ISO 8601 and emit UTC; do not rewrite authentic Git dates.
- Reject malformed or excessively large input before mutation. Imports must be
  atomic: failure cannot leave a partial hierarchy.
- Never execute imported code or active HTML as part of parsing.
- A format change requires a versioned fixture, migration/round-trip tests,
  changelog entry, and documented downgrade behavior.

The live codebase also contains normalized typed-block tables indexed through
`blockStructures`. That stranded migration is not a second portable format and
must not be presented as losslessly interchangeable until tests prove it.

`e2e/fixtures/imported-nota.nota` is synthetic release-test input recorded in
`docs/provenance/fixtures.json`. User-created `.nota` files do not belong in the
source repository or release archive.
