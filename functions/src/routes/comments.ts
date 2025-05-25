import { Request, Response } from 'express'
import express from 'express'
import admin from 'firebase-admin'
import { v4 as uuidv4 } from 'uuid'
import { Comment } from '../types/nota'
import { authorizeRequest } from '../helpers'

const router = express.Router()
const db = admin.firestore()
const commentsCollection = 'comments'
const publishedNotasCollection = 'publishedNotas'

// Helper function to get user tag from user ID
const getUserTagFromId = async (userId: string): Promise<string | null> => {
  try {
    // Try the userTags collection first, which has public read access
    const userTagsRef = db.collection('userTags')
    const q = userTagsRef.where('uid', '==', userId).limit(1)
    const querySnapshot = await q.get()

    if (!querySnapshot.empty) {
      // The document ID is the user tag
      return querySnapshot.docs[0].id
    }

    // If no tag is found, return null
    return null
  } catch (err) {
    console.error('Error fetching user tag from ID:', err)
    return null
  }
}

// Get comments for a nota
router.get('/:notaId', async (req: Request, res: Response) => {
  try {
    const { notaId } = req.params
    const { parentId, maxResults = '50' } = req.query

    // Validate input
    if (!notaId) {
      return res.status(400).json({ error: 'Nota ID is required' })
    }

    // Build query for comments
    let commentsQuery = db
      .collection(commentsCollection)
      .where('notaId', '==', notaId)
      .orderBy('createdAt', 'desc')
      .limit(parseInt(maxResults as string, 10))

    // Filter by parentId if provided
    if (parentId !== undefined) {
      commentsQuery = commentsQuery.where('parentId', '==', parentId === 'null' ? null : parentId)
    } else {
      // If no parentId is provided, get top-level comments only
      commentsQuery = commentsQuery.where('parentId', '==', null)
    }

    const commentsSnapshot = await commentsQuery.get()

    // Convert documents to Comment objects
    const comments: Comment[] = []
    commentsSnapshot.forEach((doc) => {
      comments.push(doc.data() as Comment)
    })

    return res.status(200).json(comments)
  } catch (err) {
    console.error('Error fetching comments:', err)
    return res.status(500).json({ error: 'Failed to fetch comments' })
  }
})

// Add a new comment
router.post('/', authorizeRequest, async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const authUser = req.user

    const { notaId, content, parentId = null } = req.body

    // Validate input
    if (!notaId || !content?.trim()) {
      return res.status(400).json({ error: 'Nota ID and content are required' })
    }

    // Generate a unique ID for the comment
    const commentId = uuidv4()
    const commentRef = db.collection(commentsCollection).doc(commentId)

    // Get current timestamp
    const now = new Date().toISOString()

    // Get user tag
    const userTag = (await getUserTagFromId(authUser.uid)) || authUser.uid

    // Create the comment object
    const comment: Comment = {
      id: commentId,
      notaId,
      content: content.trim(),
      authorId: authUser.uid,
      authorName: authUser.displayName || 'Anonymous',
      authorTag: userTag,
      createdAt: now,
      updatedAt: now,
      parentId,
      likeCount: 0,
      dislikeCount: 0,
      replyCount: 0,
      votes: {},
    }

    // Create a batch for multiple operations
    const batch = db.batch()

    // Set the comment document
    batch.set(commentRef, comment)

    // Update the comment count on the nota
    const notaRef = db.collection(publishedNotasCollection).doc(notaId)
    batch.update(notaRef, {
      commentCount: admin.firestore.FieldValue.increment(1),
    })

    // If replying to another comment, update its reply count
    if (parentId) {
      const parentCommentRef = db.collection(commentsCollection).doc(parentId)
      batch.update(parentCommentRef, {
        replyCount: admin.firestore.FieldValue.increment(1),
      })
    }

    // Commit all changes
    await batch.commit()

    return res.status(201).json(comment)
  } catch (err) {
    console.error('Error adding comment:', err)
    return res.status(500).json({ error: 'Failed to add comment' })
  }
})

// Delete a comment
router.delete('/:commentId', authorizeRequest, async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const authUser = req.user

    const { commentId } = req.params

    // Validate input
    if (!commentId) {
      return res.status(400).json({ error: 'Comment ID is required' })
    }

    const commentRef = db.collection(commentsCollection).doc(commentId)
    const commentDoc = await commentRef.get()

    if (!commentDoc.exists) {
      return res.status(404).json({ error: 'Comment not found' })
    }

    const comment = commentDoc.data() as Comment

    // Verify the user is the author of the comment
    if (comment.authorId !== authUser.uid) {
      return res.status(403).json({ error: 'You do not have permission to delete this comment' })
    }

    // Create a batch for multiple operations
    const batch = db.batch()

    // Delete the comment
    batch.delete(commentRef)

    // Update the nota comment count
    const notaRef = db.collection(publishedNotasCollection).doc(comment.notaId)
    batch.update(notaRef, {
      commentCount: admin.firestore.FieldValue.increment(-1),
    })

    // If this is a reply, update the parent's reply count
    if (comment.parentId) {
      const parentCommentRef = db.collection(commentsCollection).doc(comment.parentId)
      batch.update(parentCommentRef, {
        replyCount: admin.firestore.FieldValue.increment(-1),
      })
    }

    // Commit all changes
    await batch.commit()

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('Error deleting comment:', err)
    return res.status(500).json({ error: 'Failed to delete comment' })
  }
})

// Vote on a comment
router.post('/:commentId/vote', authorizeRequest, async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const authUser = req.user

    const { commentId } = req.params
    const { voteType } = req.body

    // Validate input
    if (!commentId || !voteType || !['like', 'dislike'].includes(voteType)) {
      return res.status(400).json({ error: 'Comment ID and valid vote type are required' })
    }

    const userId = authUser.uid
    const commentRef = db.collection(commentsCollection).doc(commentId)
    const commentDoc = await commentRef.get()

    if (!commentDoc.exists) {
      return res.status(404).json({ error: 'Comment not found' })
    }

    // Get current comment data
    const commentData = commentDoc.data() as Comment
    let likeCount = commentData.likeCount || 0
    let dislikeCount = commentData.dislikeCount || 0

    // Get current user vote
    const votes = commentData.votes || {}
    const userCurrentVote = votes[userId] || null

    // Create batch for operations
    const batch = db.batch()

    // Determine action based on current vote
    if (userCurrentVote === voteType) {
      // User is removing their vote
      const updateData: Record<string, any> = {}
      updateData[`votes.${userId}`] = admin.firestore.FieldValue.delete()

      // Decrement the appropriate counter
      if (voteType === 'like') {
        updateData.likeCount = admin.firestore.FieldValue.increment(-1)
        likeCount--
      } else {
        updateData.dislikeCount = admin.firestore.FieldValue.increment(-1)
        dislikeCount--
      }

      batch.update(commentRef, updateData)
    } else if (userCurrentVote) {
      // User is changing their vote
      const updateData: Record<string, any> = {}
      updateData[`votes.${userId}`] = voteType

      // Update counters
      if (voteType === 'like') {
        updateData.likeCount = admin.firestore.FieldValue.increment(1)
        updateData.dislikeCount = admin.firestore.FieldValue.increment(-1)
        likeCount++
        dislikeCount--
      } else {
        updateData.likeCount = admin.firestore.FieldValue.increment(-1)
        updateData.dislikeCount = admin.firestore.FieldValue.increment(1)
        likeCount--
        dislikeCount++
      }

      batch.update(commentRef, updateData)
    } else {
      // User is voting for the first time
      const updateData: Record<string, any> = {}
      updateData[`votes.${userId}`] = voteType

      // Increment the appropriate counter
      if (voteType === 'like') {
        updateData.likeCount = admin.firestore.FieldValue.increment(1)
        likeCount++
      } else {
        updateData.dislikeCount = admin.firestore.FieldValue.increment(1)
        dislikeCount++
      }

      batch.update(commentRef, updateData)
    }

    // Commit changes
    await batch.commit()

    // Return updated counts and user's current vote
    return res.status(200).json({
      likeCount,
      dislikeCount,
      userVote: userCurrentVote === voteType ? null : voteType,
    })
  } catch (err) {
    console.error('Error voting on comment:', err)
    return res.status(500).json({ error: 'Failed to vote on comment' })
  }
})

// Get user's vote on a comment
router.get('/:commentId/vote', authorizeRequest, async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const authUser = req.user

    const { commentId } = req.params

    // Validate input
    if (!commentId) {
      return res.status(400).json({ error: 'Comment ID is required' })
    }

    const userId = authUser.uid
    const commentRef = db.collection(commentsCollection).doc(commentId)
    const commentDoc = await commentRef.get()

    if (!commentDoc.exists) {
      return res.status(404).json({ error: 'Comment not found' })
    }

    const commentData = commentDoc.data() as Comment
    const votes = commentData.votes || {}

    return res.status(200).json({
      voteType: (votes[userId] as 'like' | 'dislike' | null) || null,
    })
  } catch (err) {
    console.error('Error getting user vote:', err)
    return res.status(500).json({ error: 'Failed to get user vote' })
  }
})

export default router
