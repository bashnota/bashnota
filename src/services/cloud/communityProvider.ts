import type { CloudCommentsApi, CloudNewsletterApi, CloudStatisticsApi } from './api'
import { getSupabaseCommunityApi } from './supabaseCommunity'

export interface CommunityCloudApi {
  comments: CloudCommentsApi
  newsletter: CloudNewsletterApi
  notaVotes: Pick<CloudStatisticsApi,'getVote'|'vote'>
}
let selected: Promise<CommunityCloudApi>|undefined
export function getCommunityCloudApi(): Promise<CommunityCloudApi> { selected ??= select(); return selected }
async function select(): Promise<CommunityCloudApi> {
  return getSupabaseCommunityApi()
}
export function resetCommunityCloudApiForTests(){ selected=undefined }
