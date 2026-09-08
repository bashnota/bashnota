import type { CloudAuthApi, CloudProfilesApi } from './api'
import { getSupabaseAuthProfilesApi } from './supabaseAuthProfiles'

export interface IdentityCloudApi {
  auth: CloudAuthApi
  profiles: CloudProfilesApi
}

let selected: Promise<IdentityCloudApi> | undefined

export function getIdentityCloudApi(): Promise<IdentityCloudApi> {
  selected ??= selectIdentityCloudApi()
  return selected
}

async function selectIdentityCloudApi(): Promise<IdentityCloudApi> {
  return getSupabaseAuthProfilesApi()
}

export function resetIdentityCloudApiForTests(): void {
  selected = undefined
}
