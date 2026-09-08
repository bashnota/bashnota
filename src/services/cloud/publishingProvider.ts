import type { CloudPublishingApi, CloudStatisticsApi } from './api'
import { getSupabasePublishingApi } from './supabasePublishing'

export interface PublicationCloudApi { publishing: CloudPublishingApi, statistics: CloudStatisticsApi }
let selected: Promise<PublicationCloudApi> | undefined

export function getPublicationCloudApi(): Promise<PublicationCloudApi> {
  selected ??= select()
  return selected
}

async function select(): Promise<PublicationCloudApi> {
  return getSupabasePublishingApi()
}

export function resetPublicationCloudApiForTests() { selected = undefined }
