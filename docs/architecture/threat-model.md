# Threat model

## Assets

- Private nota text, attachments, execution code, outputs, and local file handles
- Supabase sessions, AI-provider credentials, and Jupyter credentials/cookies
- Published author identity, content integrity, and community actions
- Source history, contributor attribution, release signatures, and artifacts

## Trust boundaries and controls

| Boundary | Principal threats | Required controls |
| --- | --- | --- |
| Imported/published content -> renderer | Stored XSS, unsafe URLs, SVG/raster payloads, iframe escape | Sanitization, sandboxed output, CSP, raster decode/re-encode, browser security gates |
| Browser -> Supabase | IDOR, RLS bypass, quota spoofing, secret exposure | Publishable key only, RLS, privileged transactions, gateway-owned client identity, integration tests |
| Browser -> Jupyter | Token leakage, cross-origin channel abuse, malicious output | Loopback defaults, explicit origins, credentialed HTTP bootstrap, no tokens in WebSocket URLs, output isolation |
| Browser -> AI provider | Credential/content disclosure, prompt-driven exfiltration | User consent/configuration, minimal payloads, credential redaction, no durable raw response logs |
| Editor -> local persistence | Silent data loss, stale authority, corrupt round-trip | Atomic writes, schema validation, versioned formats, backups, mutation and workflow tests |
| Git/tag -> release archive | Secret inclusion, dependency malware, history loss, forged release | pinned actions/lockfile, audit/SBOM/licenses, signed tags, Quality-SHA binding, git bundle, reproducible checksum |

## Attacker assumptions

Treat imported and published nota content, filenames, remote AI/Jupyter output,
Supabase rows not authorized for the current user, and collaboration metadata as
untrusted. A malicious dependency or compromised maintainer credential is in
scope for release integrity. A fully compromised browser/OS, malicious
user-approved Jupyter server, and availability of third-party AI services are
outside the application's control and must be communicated to users.

## Security invariants

- Service-role/backend secrets never enter client variables or bundles.
- Sensitive reports remain private until coordinated disclosure.
- Untrusted active content never executes in the application origin.
- Authenticated mutations are authorized server-side, not merely hidden in UI.
- Tokens, notebook content, and raw provider responses do not enter URLs/logs.
- A release cannot be inferred from a version string, branch push, or unsigned
  tag; the signed tag, exact green Quality SHA, manifest, and checksums agree.

Review this model when adding a renderer, provider, persistence representation,
public API, deployment host, or release input.
