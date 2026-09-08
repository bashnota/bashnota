# Supabase-only runtime decisions

## Generic browser analytics

Generic page and product-event collection was intentionally removed. No
application feature reads those events, and introducing a new behavioral event
warehouse during backend removal would expand the privacy and retention scope.
Publication views, unique viewers, referrers, votes, clones, comment counts, and
timestamps remain explicitly implemented by Supabase RPCs and Postgres tables.
`disabledBrowserAnalytics` preserves the provider-neutral call contract as a
tested no-op.

## Published images

Published data-URL images upload directly through the browser-safe Supabase
client to the public `published-images` bucket. The bucket limits files to 5 MB
and PNG, JPEG, GIF, or WebP. RLS restricts inserts and deletes to the authenticated
user's own folder; public reads support published documents. Tests cover valid
uploads, rejected MIME types, and unauthenticated callers.

## Voter identities

The legacy UI that enumerated every voter was intentionally removed. Supabase
keeps vote rows private and exposes only aggregate counts plus the current
caller's vote. This preserves the product's voting behavior without creating a
public identity-enumeration endpoint.

## Deployment state

Runtime code has no provider selector or compatibility fallback. The restricted
`runtime_deployment_state.production_cutover` flag defaults to `false` solely as
an external deployment-evidence marker; browser code cannot read it and does not
use it to select a backend.
