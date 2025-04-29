// commentService.ts - Service for managing nota comments
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  increment,
  writeBatch,
  deleteField,
  Timestamp,
  limit 
} from 'firebase/firestore'
import { firestore } from './firebase'
import { logger } from './logger'
import { logAnalyticsEvent } from './firebase'
import type { Comment, CommentVote } from '@/types/nota'
import { v4 as uuidv4 } from 'uuid'

/**
 * Service for managing comments on published notas
 */
export const commentService = {
  /**
   * Add a new comment to a published nota
   * @param notaId - The ID of the published nota
   * @param userId - The ID of the user adding the comment
   * @param userName - The name of the user adding the comment
   * @param userTag - The user tag (handle) of the user adding the comment
   * @param content - The text content of the comment
   * @param parentId - Optional ID of the parent comment if this is a reply
   * @returns The newly created comment
   */
  async addComment(
    notaId: string,
    userId: string,
    userName: string,
    userTag: string,
    content: string,
    parentId: string | null = null
  ): Promise<Comment> {
    try {
      if (!notaId || !userId || !content) {
        throw new Error('Nota ID, user ID, and content are required to add a comment');
      }

      logger.info(`Adding comment to nota ${notaId} by user ${userId}`);

      // Check if the nota exists
      const notaRef = doc(firestore, 'publishedNotas', notaId);
      const notaDoc = await getDoc(notaRef);
      
      if (!notaDoc.exists()) {
        throw new Error(`Published nota ${notaId} not found when adding comment`);
      }

      // Create a batch for the operations
      const batch = writeBatch(firestore);
      
      // Generate a unique ID for the comment
      const commentId = uuidv4();
      const commentRef = doc(firestore, 'comments', commentId);
      
      // Timestamp for the comment
      const now = new Date().toISOString();
      
      // Create the comment object
      const comment: Comment = {
        id: commentId,
        notaId,
        content,
        authorId: userId,
        authorName: userName,
        authorTag: userTag,
        createdAt: now,
        updatedAt: now,
        parentId,
        likeCount: 0,
        dislikeCount: 0,
        replyCount: 0,
        votes: {}
      };
      
      // Set the comment document
      batch.set(commentRef, comment);
      
      // Update the comment count on the nota document
      batch.update(notaRef, {
        commentCount: increment(1)
      });
      
      // If this is a reply to another comment, increment the reply count of the parent
      if (parentId) {
        const parentCommentRef = doc(firestore, 'comments', parentId);
        batch.update(parentCommentRef, {
          replyCount: increment(1)
        });
      }
      
      // Commit all the changes
      await batch.commit();
      
      // Log the comment event
      logAnalyticsEvent('nota_commented', {
        nota_id: notaId,
        user_id: userId,
        is_reply: !!parentId
      });
      
      logger.info(`Comment added to nota ${notaId}`);
      
      return comment;
    } catch (error) {
      logger.error('Failed to add comment:', error);
      throw error;
    }
  },
  
  /**
   * Get comments for a published nota
   * @param notaId - The ID of the published nota
   * @param parentId - Optional ID of the parent comment to get replies for
   * @param maxResults - Maximum number of comments to return (default 50)
   * @returns Array of comments
   */
  async getComments(notaId: string, parentId: string | null = null, maxResults = 50): Promise<Comment[]> {
    try {
      if (!notaId) {
        throw new Error('Nota ID is required to get comments');
      }

      logger.info(`Getting comments for nota ${notaId}`);
      
      // Query for comments with the specified notaId and optional parentId
      const commentsQuery = query(
        collection(firestore, 'comments'),
        where('notaId', '==', notaId),
        where('parentId', '==', parentId),
        orderBy('createdAt', 'desc'),
        limit(maxResults)
      );
      
      const commentsSnapshot = await getDocs(commentsQuery);
      
      // Convert the documents to Comment objects
      const comments: Comment[] = [];
      commentsSnapshot.forEach((doc) => {
        comments.push(doc.data() as Comment);
      });
      
      logger.info(`Found ${comments.length} comments for nota ${notaId}`);
      
      return comments;
    } catch (error) {
      logger.error('Failed to get comments:', error);
      throw error;
    }
  },
  
  /**
   * Get a specific comment by ID
   * @param commentId - The ID of the comment
   * @returns The comment or null if not found
   */
  async getComment(commentId: string): Promise<Comment | null> {
    try {
      if (!commentId) {
        throw new Error('Comment ID is required');
      }
      
      const commentRef = doc(firestore, 'comments', commentId);
      const commentDoc = await getDoc(commentRef);
      
      if (!commentDoc.exists()) {
        return null;
      }
      
      return commentDoc.data() as Comment;
    } catch (error) {
      logger.error('Failed to get comment:', error);
      throw error;
    }
  },
  
  /**
   * Delete a comment
   * @param commentId - The ID of the comment to delete
   * @param userId - The ID of the user attempting to delete the comment
   * @returns True if deleted successfully
   */
  async deleteComment(commentId: string, userId: string): Promise<boolean> {
    try {
      if (!commentId || !userId) {
        throw new Error('Comment ID and user ID are required');
      }
      
      const commentRef = doc(firestore, 'comments', commentId);
      const commentDoc = await getDoc(commentRef);
      
      if (!commentDoc.exists()) {
        throw new Error(`Comment ${commentId} not found`);
      }
      
      const comment = commentDoc.data() as Comment;
      
      // Only allow the author or the nota author to delete
      if (comment.authorId !== userId) {
        const notaRef = doc(firestore, 'publishedNotas', comment.notaId);
        const notaDoc = await getDoc(notaRef);
        
        if (!notaDoc.exists() || notaDoc.data().authorId !== userId) {
          throw new Error('You do not have permission to delete this comment');
        }
      }
      
      // Create a batch for the operations
      const batch = writeBatch(firestore);
      
      // Delete the comment
      batch.delete(commentRef);
      
      // Update the comment count on the nota document
      const notaRef = doc(firestore, 'publishedNotas', comment.notaId);
      batch.update(notaRef, {
        commentCount: increment(-1)
      });
      
      // If this is a reply, decrement the reply count of the parent
      if (comment.parentId) {
        const parentCommentRef = doc(firestore, 'comments', comment.parentId);
        batch.update(parentCommentRef, {
          replyCount: increment(-1)
        });
      }
      
      // Commit all the changes
      await batch.commit();
      
      logger.info(`Comment ${commentId} deleted by user ${userId}`);
      
      return true;
    } catch (error) {
      logger.error('Failed to delete comment:', error);
      throw error;
    }
  },
  
  /**
   * Record a vote on a comment
   * @param commentId - The ID of the comment
   * @param userId - The ID of the user voting
   * @param voteType - The type of vote ('like' or 'dislike')
   * @returns The updated vote counts
   */
  async voteOnComment(
    commentId: string,
    userId: string,
    voteType: 'like' | 'dislike'
  ): Promise<{ likeCount: number, dislikeCount: number, userVote: 'like' | 'dislike' | null }> {
    try {
      if (!commentId || !userId) {
        throw new Error('Comment ID and user ID are required to vote');
      }

      logger.info(`Recording vote: ${voteType} for comment ${commentId} by user ${userId}`);

      // Get the comment document
      const commentRef = doc(firestore, 'comments', commentId);
      const commentDoc = await getDoc(commentRef);
      
      if (!commentDoc.exists()) {
        throw new Error(`Comment ${commentId} not found`);
      }
      
      // Get the current comment data
      const commentData = commentDoc.data() as Comment;
      let likeCount = commentData.likeCount || 0;
      let dislikeCount = commentData.dislikeCount || 0;
      
      // Get the current votes map (or initialize it)
      const votes = commentData.votes || {};
      const userCurrentVote = votes[userId] || null;
      
      // Create a batch for the operations
      const batch = writeBatch(firestore);
      
      // Determine the action based on the current vote
      if (userCurrentVote === voteType) {
        // User is removing their vote
        const updateData: Record<string, any> = {};
        updateData[`votes.${userId}`] = deleteField();
        
        // Decrement the appropriate counter
        if (voteType === 'like') {
          updateData.likeCount = increment(-1);
          likeCount--;
        } else {
          updateData.dislikeCount = increment(-1);
          dislikeCount--;
        }
        
        batch.update(commentRef, updateData);
      } else if (userCurrentVote) {
        // User is changing their vote
        const updateData: Record<string, any> = {};
        updateData[`votes.${userId}`] = voteType;
        
        // Update counters: decrement the old vote type, increment the new one
        if (voteType === 'like') {
          updateData.likeCount = increment(1);
          updateData.dislikeCount = increment(-1);
          likeCount++;
          dislikeCount--;
        } else {
          updateData.likeCount = increment(-1);
          updateData.dislikeCount = increment(1);
          likeCount--;
          dislikeCount++;
        }
        
        batch.update(commentRef, updateData);
      } else {
        // User is voting for the first time
        const updateData: Record<string, any> = {};
        updateData[`votes.${userId}`] = voteType;
        
        // Increment the appropriate counter
        if (voteType === 'like') {
          updateData.likeCount = increment(1);
          likeCount++;
        } else {
          updateData.dislikeCount = increment(1);
          dislikeCount++;
        }
        
        batch.update(commentRef, updateData);
      }
      
      // Commit the changes
      await batch.commit();
      
      // Log the vote event
      logAnalyticsEvent('comment_voted', {
        comment_id: commentId,
        nota_id: commentData.notaId,
        vote_type: voteType,
        is_vote_change: !!userCurrentVote
      });
      
      // Return the updated counts and the user's current vote
      return {
        likeCount,
        dislikeCount,
        userVote: userCurrentVote === voteType ? null : voteType
      };
    } catch (error) {
      logger.error('Failed to vote on comment:', error);
      throw error;
    }
  },
  
  /**
   * Get a user's vote on a specific comment
   * @param commentId - The ID of the comment
   * @param userId - The ID of the user
   * @returns The user's vote type or null if they haven't voted
   */
  async getUserVote(commentId: string, userId: string): Promise<'like' | 'dislike' | null> {
    try {
      if (!commentId || !userId) return null;
      
      const commentRef = doc(firestore, 'comments', commentId);
      const commentDoc = await getDoc(commentRef);
      
      if (!commentDoc.exists()) {
        return null;
      }
      
      const commentData = commentDoc.data() as Comment;
      const votes = commentData.votes || {};
      const userVote = votes[userId] || null;
      
      return userVote as 'like' | 'dislike' | null;
    } catch (error) {
      logger.error('Failed to get user vote on comment:', error);
      return null;
    }
  }
};