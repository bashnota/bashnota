import { describe,expect,it,vi } from 'vitest'
import { createSupabaseCommunityApi } from '../supabaseCommunity'

describe('Supabase community adapter',()=>{
  it('maps public comment rows and routes every mutation through RPCs',async()=>{
    const rpc=vi.fn(async(name:string,_args?:unknown)=>{
      if(name==='query_comments'||name==='create_comment'||name==='edit_comment')return{data:[{id:'c',nota_id:'n',author_name:'Ada',author_tag:'ada',content:'hello',parent_id:null,like_count:1,dislike_count:0,reply_count:2,created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:00:00Z',is_owner:false,can_delete:true,user_vote:'like'}],error:null}
      if(name==='toggle_comment_vote'||name==='toggle_nota_vote')return{data:{like_count:0,dislike_count:1,user_vote:'dislike'},error:null}
      if(name==='get_comment_vote'||name==='get_nota_vote')return{data:'like',error:null}
      if(name==='count_comments')return{data:25,error:null}
      return{data:null,error:null}
    })
    const api=createSupabaseCommunityApi({rpc} as never)
    const page=await api.comments.listComments('n',{limit:20,parentId:null})
    expect(page).toMatchObject({ok:true,data:{items:[{id:'c',isOwner:false,canDelete:true,userVote:'like',replyCount:2}],totalCount:25}})
    const firstCursorPage=await api.comments.listComments('n',{limit:1,parentId:null})
    if(!firstCursorPage.ok)throw firstCursorPage.error
    expect(firstCursorPage.data.nextCursor).toBeTruthy()
    await api.comments.listComments('n',{limit:1,parentId:null,cursor:firstCursorPage.data.nextCursor})
    const cursorCall=rpc.mock.calls.filter(call=>call[0]==='query_comments').at(-1)
    expect(cursorCall?.[1]).toMatchObject({p_before_created_at:'2026-01-01T00:00:00Z',p_before_id:'c'})
    expect((await api.comments.createComment({notaId:'n',authorName:'Ada',authorTag:'ada',content:'hello',parentId:null})).ok).toBe(true)
    expect((await api.comments.updateComment('c','edited')).ok).toBe(true)
    expect(await api.comments.getVote('c')).toEqual({ok:true,data:'like'})
    expect(await api.comments.vote('c','dislike')).toEqual({ok:true,data:{likeCount:0,dislikeCount:1,userVote:'dislike'}})
    expect(await api.notaVotes.getVote('n')).toEqual({ok:true,data:'like'})
    expect(await api.notaVotes.vote('n','dislike')).toEqual({ok:true,data:{likeCount:0,dislikeCount:1,userVote:'dislike'}})
    expect((await api.comments.deleteComment('c')).ok).toBe(true)
    expect((await api.newsletter.subscribe('a@example.test','Ada')).ok).toBe(true)
    expect((await api.newsletter.unsubscribe()).ok).toBe(true)
    expect(rpc.mock.calls.map(call=>call[0])).toEqual(expect.arrayContaining(['query_comments','count_comments','create_comment','edit_comment','get_comment_vote','get_nota_vote','toggle_comment_vote','toggle_nota_vote','delete_comment','upsert_newsletter_subscription','unsubscribe_newsletter']))
  })
})
