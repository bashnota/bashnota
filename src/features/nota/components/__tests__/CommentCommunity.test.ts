import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Comment } from '@/features/nota/types/nota'
import CommentSection from '../CommentSection.vue'
import CommentItem from '../CommentItem.vue'

const mocks=vi.hoisted(()=>({
  getComments:vi.fn(),getUserVote:vi.fn(async()=>null),deleteComment:vi.fn(async()=>true),
  user:{isAuthenticated:true,currentUser:{uid:'viewer'}},
}))
vi.mock('@/features/nota/services/communityCommentService',()=>({communityCommentService:{
  getComments:mocks.getComments,getUserVote:mocks.getUserVote,deleteComment:mocks.deleteComment,
  voteOnComment:vi.fn(),addComment:vi.fn(),editComment:vi.fn(),
}}))
vi.mock('@/features/auth/stores/auth',()=>({useAuthStore:()=>mocks.user}))
vi.mock('vue-router',()=>({useRouter:()=>({push:vi.fn()})}))
vi.mock('vue-sonner',()=>({toast:vi.fn()}))
vi.mock('@/services/logger',()=>({logger:{error:vi.fn(),info:vi.fn()}}))

const makeComment=(index:number,overrides:Partial<Comment>={}):Comment=>({
  id:`comment-${String(index).padStart(2,'0')}`,notaId:'nota',authorId:'author',authorName:'Ada',authorTag:'ada',
  content:`Comment ${index}`,createdAt:new Date(Date.UTC(2026,0,31)-index*1000).toISOString(),
  updatedAt:new Date(Date.UTC(2026,0,31)-index*1000).toISOString(),parentId:null,
  likeCount:0,dislikeCount:0,replyCount:0,...overrides,
})
const buttonStub={template:'<button v-bind="$attrs"><slot /></button>'}

describe('mounted community comments',()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.user.isAuthenticated=true;mocks.user.currentUser={uid:'viewer'}})

  it('passes the cursor and appends 20+ comments without duplicates in stable order',async()=>{
    const first=Array.from({length:20},(_,index)=>makeComment(index))
    const second=[makeComment(19),...Array.from({length:5},(_,index)=>makeComment(index+20))]
    mocks.getComments.mockResolvedValueOnce({items:first,nextCursor:'page-2',totalCount:25})
      .mockResolvedValueOnce({items:second,nextCursor:null,totalCount:25})
    const wrapper=mount(CommentSection,{props:{notaId:'nota'},global:{stubs:{
      Button:buttonStub,CommentItem:{props:['comment'],template:'<div class="comment-stub">{{ comment.id }}</div>'},
      CommentForm:true,MessageSquare:true,RefreshCw:true,Shield:true,
    }}})
    await flushPromises()
    expect(wrapper.findAll('.comment-stub')).toHaveLength(20)
    expect(wrapper.get('h2').text().replace(/\s+/g,' ')).toBe('Comments (25)')
    const loadMore=wrapper.findAll('button').find(button=>button.text().includes('Load More'))
    expect(loadMore).toBeTruthy()
    await loadMore!.trigger('click');await flushPromises()
    expect(mocks.getComments).toHaveBeenNthCalledWith(2,'nota',null,20,'page-2')
    const ids=wrapper.findAll('.comment-stub').map(node=>node.text())
    expect(ids).toHaveLength(25)
    expect(new Set(ids).size).toBe(25)
    expect(ids).toEqual(Array.from({length:25},(_,index)=>`comment-${String(index).padStart(2,'0')}`))
    expect(wrapper.get('h2').text().replace(/\s+/g,' ')).toBe('Comments (25)')
    expect(wrapper.text()).not.toContain('Load More')
    wrapper.unmount()
  })

  it('ignores a stale comment response after navigating to another nota',async()=>{
    let resolveFirst:(value:{items:Comment[],nextCursor:null,totalCount:number})=>void=()=>undefined
    mocks.getComments.mockImplementationOnce(()=>new Promise(resolve=>{resolveFirst=resolve}))
      .mockResolvedValueOnce({items:[makeComment(2,{notaId:'nota-b',content:'Current B'})],nextCursor:null,totalCount:1})
    const wrapper=mount(CommentSection,{props:{notaId:'nota-a'},global:{stubs:{
      Button:buttonStub,CommentItem:{props:['comment'],template:'<div class="comment-stub">{{ comment.content }}</div>'},
      CommentForm:true,MessageSquare:true,RefreshCw:true,Shield:true,
    }}})
    await wrapper.setProps({notaId:'nota-b'})
    await flushPromises()
    expect(wrapper.text()).toContain('Current B')
    resolveFirst({items:[makeComment(1,{notaId:'nota-a',content:'Stale A'})],nextCursor:null,totalCount:1})
    await flushPromises()
    expect(wrapper.text()).toContain('Current B')
    expect(wrapper.text()).not.toContain('Stale A')
    wrapper.unmount()
  })

  it('shows delete to a nota moderator but not an unrelated authenticated caller',async()=>{
    const stubs={
      Button:buttonStub,Badge:true,MessageSquare:true,ThumbsUp:true,ThumbsDown:true,MoreVertical:true,Trash2:true,
      DropdownMenu:{template:'<div><slot /></div>'},DropdownMenuTrigger:{template:'<div><slot /></div>'},
      DropdownMenuContent:{template:'<div><slot /></div>'},DropdownMenuItem:{template:'<div v-bind="$attrs"><slot /></div>'},
      Dialog:{template:'<div />'},DialogContent:true,DialogHeader:true,DialogTitle:true,DialogFooter:true,CommentForm:true,
    }
    const moderator=mount(CommentItem,{props:{notaId:'nota',comment:makeComment(1,{canDelete:true,isOwner:false})},global:{stubs}})
    await flushPromises()
    expect(moderator.find('[data-testid="delete-comment-action"]').exists()).toBe(true)
    moderator.unmount()

    const unrelated=mount(CommentItem,{props:{notaId:'nota',comment:makeComment(1,{canDelete:false,isOwner:false})},global:{stubs}})
    await flushPromises()
    expect(unrelated.find('[data-testid="delete-comment-action"]').exists()).toBe(false)
    unrelated.unmount()
  })

  it('synchronizes vote and reply state when a keyed comment prop refreshes',async()=>{
    const stubs={
      Button:buttonStub,Badge:true,MessageSquare:true,ThumbsUp:true,ThumbsDown:true,MoreVertical:true,Trash2:true,
      DropdownMenu:true,Dialog:true,CommentForm:true,
    }
    const wrapper=mount(CommentItem,{props:{notaId:'nota',comment:makeComment(1,{likeCount:1,dislikeCount:2,replyCount:2,userVote:null})},global:{stubs}})
    await flushPromises()
    expect(wrapper.text()).toContain('Show 2 replies')
    await wrapper.setProps({comment:makeComment(1,{likeCount:5,dislikeCount:4,replyCount:1,userVote:'like'})})
    await flushPromises()
    expect(wrapper.text()).toContain('Show 1 reply')
    expect(wrapper.findAll('button').some(button=>button.text().includes('5')&&button.classes().includes('text-primary'))).toBe(true)
    wrapper.unmount()
  })

  it('decrements reply count immediately when a loaded reply is deleted',async()=>{
    const reply=makeComment(2,{parentId:'comment-01'})
    mocks.getComments.mockResolvedValueOnce({items:[reply],nextCursor:null,totalCount:1})
    const stubs={Button:buttonStub,Badge:true,MessageSquare:true,ThumbsUp:true,ThumbsDown:true,MoreVertical:true,Trash2:true,
      DropdownMenu:true,Dialog:true,CommentForm:true}
    const wrapper=mount(CommentItem,{props:{notaId:'nota',comment:makeComment(1,{replyCount:1})},global:{stubs}})
    await wrapper.findAll('button').find(button=>button.text().includes('Show 1 reply'))!.trigger('click')
    await flushPromises()
    const replyItem=wrapper.findAllComponents(CommentItem).find(item=>item.props('comment')?.id===reply.id)
    expect(replyItem).toBeTruthy()
    replyItem!.vm.$emit('comment-deleted')
    await flushPromises()
    expect(wrapper.text()).not.toContain('Show 1 reply')
    expect(wrapper.text()).toContain('No replies yet')
    wrapper.unmount()
  })
})
