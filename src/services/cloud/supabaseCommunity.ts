import type { SupabaseClient } from '@supabase/supabase-js'
import type { CommunityCloudApi } from './communityProvider'
import { CloudError, type CloudComment, type CloudJson, type CloudResult, type CloudVoteResult } from './types'
import { mapSupabaseError } from './supabaseAuthProfiles'

const ok=<T>(data:T):CloudResult<T>=>({ok:true,data})
const fail=<T>(error:unknown):CloudResult<T>=>({ok:false,error:mapSupabaseError(error)})
type Row=Record<string,unknown>
const comment=(row:Row):CloudComment=>({
  id:String(row.id),notaId:String(row.nota_id),authorName:String(row.author_name??''),
  authorTag:typeof row.author_tag==='string'?row.author_tag:null,content:row.content as CloudJson,
  parentId:typeof row.parent_id==='string'?row.parent_id:null,createdAt:String(row.created_at??''),updatedAt:String(row.updated_at??''),
  likeCount:Number(row.like_count??0),dislikeCount:Number(row.dislike_count??0),replyCount:Number(row.reply_count??0),
  isOwner:row.is_owner===true,canDelete:row.can_delete===true,
  userVote:row.user_vote==='like'||row.user_vote==='dislike'?row.user_vote:null,
})
const voteResult=(row:Row|undefined):CloudVoteResult=>({likeCount:Number(row?.like_count??0),dislikeCount:Number(row?.dislike_count??0),
  userVote:row?.user_vote==='like'||row?.user_vote==='dislike'?row.user_vote:null})
function cursor(value?:string|null):{at:string|null,id:string|null}{
  if(!value)return{at:null,id:null}
  try{const parsed=JSON.parse(atob(value));return{at:String(parsed.at),id:String(parsed.id)}}
  catch{throw new CloudError('invalid','Invalid comment cursor.')}
}

export function createSupabaseCommunityApi(client:SupabaseClient):CommunityCloudApi{
  const comments:CommunityCloudApi['comments']={
    async listComments(notaId,page){
      try{const before=cursor(page.cursor);const [rowsResult,countResult]=await Promise.all([
        client.rpc('query_comments',{
          p_nota_id:notaId,p_parent_id:page.parentId??null,p_limit:page.limit,
          p_before_created_at:before.at,p_before_id:before.id,
        }),
        client.rpc('count_comments',{p_nota_id:notaId,p_parent_id:page.parentId??null}),
      ]);if(rowsResult.error)return fail(rowsResult.error);if(countResult.error)return fail(countResult.error)
        const items=(rowsResult.data??[]).map((row:Row)=>comment(row));const last=items.at(-1)
        return ok({items,totalCount:Number(countResult.data??0),nextCursor:items.length===page.limit&&last?btoa(JSON.stringify({at:last.createdAt,id:last.id})):null})
      }catch(error){return fail(error)}
    },
    async createComment(value){
      try{const {data,error}=await client.rpc('create_comment',{p_id:crypto.randomUUID(),p_nota_id:value.notaId,
        p_content:value.content,p_author_name:value.authorName,p_parent_id:value.parentId})
        return error?fail(error):data?.[0]?ok(comment(data[0] as Row)):fail(new CloudError('unknown','Comment create returned no row.'))
      }catch(error){return fail(error)}
    },
    async updateComment(id,content){
      try{const {data,error}=await client.rpc('edit_comment',{p_id:id,p_content:content})
        return error?fail(error):data?.[0]?ok(comment(data[0] as Row)):fail(new CloudError('unknown','Comment edit returned no row.'))
      }catch(error){return fail(error)}
    },
    async deleteComment(id){try{const{error}=await client.rpc('delete_comment',{p_id:id});return error?fail(error):ok(undefined)}catch(error){return fail(error)}},
    async getVote(id){try{const{data,error}=await client.rpc('get_comment_vote',{p_comment_id:id});return error?fail(error):ok(data==='like'||data==='dislike'?data:null)}catch(error){return fail(error)}},
    async vote(id,vote){try{const{data,error}=await client.rpc('toggle_comment_vote',{p_comment_id:id,p_vote:vote});return error?fail(error):ok(voteResult(data as Row))}catch(error){return fail(error)}},
  }
  const newsletter:CommunityCloudApi['newsletter']={
    async subscribe(email,displayName){try{const{error}=await client.rpc('upsert_newsletter_subscription',{p_email:email,p_display_name:displayName??null});return error?fail(error):ok(undefined)}catch(error){return fail(error)}},
    async unsubscribe(){try{const{error}=await client.rpc('unsubscribe_newsletter');return error?fail(error):ok(undefined)}catch(error){return fail(error)}},
  }
  return {comments,newsletter,notaVotes:{
    async getVote(id){try{const{data,error}=await client.rpc('get_nota_vote',{p_nota_id:id});return error?fail(error):ok(data==='like'||data==='dislike'?data:null)}catch(error){return fail(error)}},
    async vote(id,vote){try{const{data,error}=await client.rpc('toggle_nota_vote',{p_nota_id:id,p_vote:vote});return error?fail(error):ok(voteResult(data as Row))}catch(error){return fail(error)}},
  }}
}

export async function getSupabaseCommunityApi(): Promise<CommunityCloudApi> {
  return createSupabaseCommunityApi(await (await import('./supabaseBrowser')).getSupabaseBrowserClient())
}
