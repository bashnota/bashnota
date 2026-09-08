# Version history storage

Versions written before `normalized-blocks-v1` contain only a `nota` metadata
object. Restoring one of those versions restores that metadata but deliberately
leaves the current document body and block order unchanged.

New versions continue to live in `Nota.versions`. Each entry adds one
`canonicalContent` object:

```text
canonicalContent.format = "normalized-blocks-v1"
canonicalContent.blockOrder = ["text:12", "executableCodeBlock:4", ...]
canonicalContent.blocks = [the corresponding normalized typed-table rows]
```

This is a historical copy of the canonical normalized records, not TipTap or
ProseMirror JSON and not a second editable content model. Snapshot and restore
include the nota row, all typed block tables, and `blockStructures` in one Dexie
transaction. The stored metadata excludes `versions` and `blockStructure`, so
history cannot recursively contain itself and order has a single snapshot home.
