import { describe,expect,it,vi } from 'vitest'

const listComments=vi.hoisted(()=>vi.fn(async(_notaId:string,page:{cursor?:string|null})=>({ok:true as const,data:{
  items:[{id:'c',notaId:'n',authorName:'Ada',authorTag:'ada',content:'hello',parentId:null,createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z',likeCount:0,dislikeCount:0,replyCount:0,canDelete:true}],
  nextCursor:page.cursor?'page-3':'page-2',
}})))
vi.mock('@/services/cloud',()=>({getCommunityCloudApi:async()=>({comments:{listComments}})}))
import { communityCommentService } from './communityCommentService'

describe('community comment UI facade',()=>{
  it('returns provider pagination metadata and forwards cursors',async()=>{
    const first=await communityCommentService.getComments('n',null,20,null)
    expect(first).toMatchObject({items:[{id:'c',canDelete:true}],nextCursor:'page-2'})
    const second=await communityCommentService.getComments('n',null,20,first.nextCursor)
    expect(second.nextCursor).toBe('page-3')
    expect(listComments).toHaveBeenLastCalledWith('n',{limit:20,parentId:null,cursor:'page-2'})
  })
})
