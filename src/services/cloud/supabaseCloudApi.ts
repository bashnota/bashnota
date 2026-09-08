import type { CloudApi, CloudAnalyticsApi } from './api'
import { getSupabaseAuthProfilesApi } from './supabaseAuthProfiles'
import { getSupabaseCommunityApi } from './supabaseCommunity'
import { getSupabasePublishingApi } from './supabasePublishing'

// Publication views, votes, clones, counts, and referrers are persisted by the
// Supabase statistics API. Generic browser event collection is intentionally
// disabled until the product has a documented analytics-data requirement.
export const disabledBrowserAnalytics: CloudAnalyticsApi = {
  track() {},
}

let selected: Promise<CloudApi> | undefined

export function getSupabaseCloudApi(): Promise<CloudApi> {
  selected ??= composeSupabaseCloudApi()
  return selected
}

async function composeSupabaseCloudApi(): Promise<CloudApi> {
  const [identity, publishing, community] = await Promise.all([
    getSupabaseAuthProfilesApi(),
    getSupabasePublishingApi(),
    getSupabaseCommunityApi(),
  ])
  return {
    ...identity,
    ...publishing,
    comments: community.comments,
    newsletter: community.newsletter,
    analytics: disabledBrowserAnalytics,
  }
}

export function resetSupabaseCloudApiForTests(): void {
  selected = undefined
}
