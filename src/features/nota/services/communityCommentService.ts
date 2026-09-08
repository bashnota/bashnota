import { getCommunityCloudApi, type CloudComment } from '@/services/cloud'
import type { Comment } from '@/features/nota/types/nota'

const legacyComment=(value:CloudComment):Comment=>({
  id:value.id,notaId:value.notaId,authorId:value.authorId??'',authorName:value.authorName,
  authorTag:value.authorTag??undefined,content:value.content,createdAt:value.createdAt,updatedAt:value.updatedAt,
  parentId:value.parentId,likeCount:value.likeCount,dislikeCount:value.dislikeCount,replyCount:value.replyCount,
  isOwner:value.isOwner,canDelete:value.canDelete,userVote:value.userVote,
})
const unwrap=<T>(result:{ok:true,data:T}|{ok:false,error:Error}):T=>{if(!result.ok)throw result.error;return result.data}

/** UI-compatible facade whose implementation is selected by the governed community rollout. */
export const communityCommentService={
  async getComments(notaId:string,parentId:string|null=null,maxResults=50,cursor:string|null=null){
    const result=await (await getCommunityCloudApi()).comments.listComments(notaId,{limit:maxResults,parentId,cursor})
    const page=unwrap(result)
    return {items:page.items.map(legacyComment),nextCursor:page.nextCursor,totalCount:page.totalCount}
  },
  async addComment(notaId:string,_userId:string,authorName:string,authorTag:string,content:string,parentId:string|null=null):Promise<Comment>{
    const result=await (await getCommunityCloudApi()).comments.createComment({notaId,authorName,authorTag,content,parentId})
    return legacyComment(unwrap(result))
  },
  async editComment(commentId:string,content:string):Promise<Comment>{
    return legacyComment(unwrap(await (await getCommunityCloudApi()).comments.updateComment(commentId,content)))
  },
  async deleteComment(commentId:string,_userId:string):Promise<boolean>{
    unwrap(await (await getCommunityCloudApi()).comments.deleteComment(commentId));return true
  },
  async voteOnComment(commentId:string,_userId:string,vote:'like'|'dislike'){
    return unwrap(await (await getCommunityCloudApi()).comments.vote(commentId,vote))
  },
  async getUserVote(commentId:string,_userId:string){
    return unwrap(await (await getCommunityCloudApi()).comments.getVote(commentId))
  },
}
