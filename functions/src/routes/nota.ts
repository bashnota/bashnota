import { Request, Response } from 'express'
import express from 'express'
import admin from 'firebase-admin'
import Validator from 'validatorjs'
import { PublishedNota } from '../types/nota'
import { authorizeRequest } from '../helpers'

const router = express.Router()
const db = admin.firestore()
const publishedNotasCollection = 'publishedNotas'

// Get published notas with filtering and pagination
router.get('/published', async (req: Request, res: Response) => {
  try {
    const {
      authorId,
      orderBy = 'publishedAt',
      orderDirection = 'desc',
      limit = 10,
      startAfter,
    } = req.query

    // Start building the query
    let notasQuery = db
      .collection(publishedNotasCollection)
      .where('isPublic', '==', true)
      .where('isSubPage', '==', false) // Only get main pages, not sub-pages

    // Add author filter if provided
    if (authorId) {
      notasQuery = notasQuery.where('authorId', '==', authorId)
    }

    // Add ordering
    notasQuery = notasQuery.orderBy(
      orderBy as string,
      (orderDirection as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc',
    )

    // Add pagination
    notasQuery = notasQuery.limit(Number(limit))

    // Add startAfter cursor if provided
    if (startAfter) {
      // Get the document to start after
      const startAfterDoc = await db
        .collection(publishedNotasCollection)
        .doc(startAfter as string)
        .get()
      if (startAfterDoc.exists) {
        notasQuery = notasQuery.startAfter(startAfterDoc)
      }
    }

    // Execute the query
    const querySnapshot = await notasQuery.get()

    const publishedNotas: PublishedNota[] = []
    querySnapshot.forEach((doc) => {
      const data = doc.data() as PublishedNota;

      // @ts-ignore
      delete data.content;
      delete data.votes;

      publishedNotas.push({ ...data, id: doc.id })
    })

    // Return the results with pagination info
    return res.json({
      items: publishedNotas,
      hasMore: publishedNotas.length === Number(limit),
      lastVisible: publishedNotas.length > 0 ? publishedNotas[publishedNotas.length - 1].id : null,
    })
  } catch (error) {
    console.error('Failed to fetch published notas:', error)
    return res.status(500).json({ error: 'Failed to fetch published notas' })
  }
})

// Get a specific published nota by ID (public endpoint)
router.get('/published/:id', async (req: Request, res: Response) => {
  try {
    const notaId = req.params.id

    const docRef = db.collection(publishedNotasCollection).doc(notaId)
    const docSnap = await docRef.get()

    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Published nota not found' })
    }

    const publishedNota = { ...docSnap.data(), id: docSnap.id } as PublishedNota

    // Check if the nota is public before returning it
    if (!publishedNota.isPublic) {
      return res.status(403).json({ error: 'This nota is not public' })
    }

    // Get published sub-pages of this nota if any exist
    const subPagesSnapshot = await db
      .collection(publishedNotasCollection)
      .where('parentId', '==', notaId)
      .where('isPublic', '==', true)
      .get()

    const publishedSubPages: string[] = []
    subPagesSnapshot.forEach((doc) => {
      publishedSubPages.push(doc.id)
    })

    // Add the list of published sub-pages to the response
    publishedNota.publishedSubPages = publishedSubPages

    return res.json(publishedNota)
  } catch (error) {
    console.error('Failed to fetch published nota:', error)
    return res.status(500).json({ error: 'Failed to fetch published nota' })
  }
})

// Get published notas by a specific user (public endpoint)
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId

    const querySnapshot = await db
      .collection(publishedNotasCollection)
      .where('authorId', '==', userId)
      .where('isPublic', '==', true)
      .where('isSubPage', '==', false) // Only get main pages, not sub-pages
      .get()

    const publishedNotas: PublishedNota[] = []
    querySnapshot.forEach((doc) => {
      publishedNotas.push({ ...doc.data(), id: doc.id } as PublishedNota)
    })

    return res.json(publishedNotas)
  } catch (error) {
    console.error('Failed to fetch published notas by user:', error)
    return res.status(500).json({ error: 'Failed to fetch published notas by user' })
  }
})

// Publish or update a nota
router.post('/publish/:id', authorizeRequest, async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const user = req.user
    const notaId = req.params.id

    // Get the nota data from the request body
    const notaData = req.body
    const validation = validatePublishNota(notaData)

    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors })
    }

    // Parse the content properly (content must be a string)
    let processedContent
    try {
      processedContent = JSON.parse(notaData.content)
    } catch (error) {
      console.error('Error parsing content:', error)
      return res
        .status(400)
        .json({ error: 'Invalid content format. Content must be a JSON string.' })
    }

    // Check if the nota already exists
    const docRef = db.collection(publishedNotasCollection).doc(notaId)
    const docSnap = await docRef.get()

    // If nota exists, verify ownership
    if (docSnap.exists) {
      const existingNota = docSnap.data() as PublishedNota

      if (existingNota.authorId !== user.uid) {
        return res.status(403).json({
          error: "You don't have permission to modify this nota. It belongs to another user.",
        })
      }

      // Update existing nota with processed content
      const updatedNota: Partial<PublishedNota> = {
        title: notaData.title,
        content: JSON.stringify(processedContent),
        updatedAt: new Date().toISOString(),
      }

      // Update sub-pages list if provided
      if (Array.isArray(notaData.publishedSubPages)) {
        updatedNota.publishedSubPages = notaData.publishedSubPages
      }

      // Use set with merge option to update only specified fields
      await docRef.set(updatedNota, { merge: true })

      return res.json({
        ...existingNota,
        ...updatedNota,
        id: notaId,
      })
    } else {
      // Create new published nota with processed content
      const publishedNota: PublishedNota = {
        id: notaId,
        title: notaData.title,
        content: JSON.stringify(processedContent),
        updatedAt: notaData.updatedAt || new Date().toISOString(),
        publishedAt: new Date().toISOString(),
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        isPublic: true,
        isSubPage: notaData.isSubPage || false, // Flag to indicate sub-page status
        parentId: notaData.parentId || null, // Store parent ID for sub-pages
        publishedSubPages: Array.isArray(notaData.publishedSubPages)
          ? notaData.publishedSubPages
          : [], // Published sub-pages
        citations: Array.isArray(notaData.citations) ? notaData.citations : [], // Include citations
      }

      // Use set with merge:false to create a new document
      await docRef.set(publishedNota)

      return res.json(publishedNota)
    }
  } catch (error) {
    console.error('Failed to publish or update nota:', error)
    return res.status(500).json({ error: 'Failed to publish or update nota' })
  }
})

// Unpublish a nota
router.delete('/publish/:id', authorizeRequest, async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const user = req.user
    const notaId = req.params.id

    // Check if the nota exists and belongs to this user
    const docRef = db.collection(publishedNotasCollection).doc(notaId)
    const docSnap = await docRef.get()

    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Published nota not found' })
    }

    const existingNota = docSnap.data() as PublishedNota

    if (existingNota.authorId !== user.uid) {
      return res.status(403).json({ error: "You don't have permission to unpublish this nota" })
    }

    // Get sub-pages information
    let publishedSubPageIds: string[] = []

    // Get sub-pages from the publishedSubPages array if it exists
    if (existingNota.publishedSubPages && existingNota.publishedSubPages.length > 0) {
      publishedSubPageIds = existingNota.publishedSubPages
    }

    // Also look for any sub-pages by parentId for backward compatibility
    const subPagesSnapshot = await db
      .collection(publishedNotasCollection)
      .where('parentId', '==', notaId)
      .where('authorId', '==', user.uid) // Ensure user owns these too
      .get()

    // Add these IDs to the list (avoid duplicates)
    subPagesSnapshot.forEach((doc) => {
      if (!publishedSubPageIds.includes(doc.id)) {
        publishedSubPageIds.push(doc.id)
      }
    })

    // Now unpublish the nota and its sub-pages
    if (publishedSubPageIds.length > 0) {
      // Use a batch write to delete all sub-pages
      const batch = db.batch()

      // Add the main nota to the batch
      batch.delete(docRef)

      // Add all sub-pages to the batch
      for (const subPageId of publishedSubPageIds) {
        try {
          const subPageRef = db.collection(publishedNotasCollection).doc(subPageId)
          const subPageSnap = await subPageRef.get()

          // Only delete if it exists and belongs to the same user
          if (subPageSnap.exists && subPageSnap.data()?.authorId === user.uid) {
            batch.delete(subPageRef)
          }
        } catch (err) {
          console.error(`Error processing sub-page ${subPageId}:`, err)
          // Continue with other sub-pages even if one fails
        }
      }

      // Commit the batch
      await batch.commit()
    } else {
      // Just delete the main nota
      await docRef.delete()
    }

    return res.json({
      success: true,
      id: notaId,
      message: 'Nota unpublished successfully',
      unpublishedSubPages: publishedSubPageIds,
    })
  } catch (error) {
    console.error('Failed to unpublish nota:', error)
    return res.status(500).json({ error: 'Failed to unpublish nota' })
  }
})

// Vote on a nota (like or dislike)
router.post('/vote/:id', authorizeRequest, async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const user = req.user
    const notaId = req.params.id
    const { voteType } = req.body

    // Validate vote type
    if (!voteType || (voteType !== 'like' && voteType !== 'dislike')) {
      return res.status(400).json({ error: 'Invalid vote type. Must be "like" or "dislike".' })
    }

    // Reference to the nota document
    const notaRef = db.collection(publishedNotasCollection).doc(notaId)
    const notaDoc = await notaRef.get()

    // Check if the nota exists
    if (!notaDoc.exists) {
      return res.status(404).json({ error: 'Published nota not found' })
    }

    // Get the current nota data
    const notaData = notaDoc.data() as PublishedNota
    let likeCount = notaData.likeCount || 0
    let dislikeCount = notaData.dislikeCount || 0
    
    // Get the current votes map (or initialize it)
    const votes = notaData.votes || {}
    const userCurrentVote = votes[user.uid] || null
    
    // Prepare the update data
    const updateData: Record<string, any> = {}
    
    // Determine the action based on the current vote
    if (userCurrentVote === voteType) {
      // User is removing their vote
      updateData[`votes.${user.uid}`] = admin.firestore.FieldValue.delete()
      
      // Decrement the appropriate counter
      if (voteType === 'like') {
        updateData.likeCount = admin.firestore.FieldValue.increment(-1)
        likeCount--
      } else {
        updateData.dislikeCount = admin.firestore.FieldValue.increment(-1)
        dislikeCount--
      }
    } else if (userCurrentVote) {
      // User is changing their vote
      updateData[`votes.${user.uid}`] = voteType
      
      // Update counters: decrement the old vote type, increment the new one
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
    } else {
      // User is voting for the first time
      updateData[`votes.${user.uid}`] = voteType
      
      // Check if likeCount and dislikeCount exist, initialize them if not
      if (typeof notaData.likeCount !== 'number') {
        updateData.likeCount = voteType === 'like' ? 1 : 0
        likeCount = voteType === 'like' ? 1 : 0
      } else if (voteType === 'like') {
        updateData.likeCount = admin.firestore.FieldValue.increment(1)
        likeCount++
      }
      
      if (typeof notaData.dislikeCount !== 'number') {
        updateData.dislikeCount = voteType === 'dislike' ? 1 : 0
        dislikeCount = voteType === 'dislike' ? 1 : 0
      } else if (voteType === 'dislike') {
        updateData.dislikeCount = admin.firestore.FieldValue.increment(1)
        dislikeCount++
      }
    }

    // Update the nota document
    await notaRef.update(updateData)

    // Return the updated counts and the user's current vote
    return res.json({
      likeCount,
      dislikeCount,
      userVote: userCurrentVote === voteType ? null : voteType
    })
  } catch (error) {
    console.error('Failed to record vote:', error)
    return res.status(500).json({ 
      error: 'Failed to record vote',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Validation function for publishing a nota
const validatePublishNota = (data: any) => {
  const rules = {
    title: ['required', 'string'],
    content: ['required', 'string'],
    updatedAt: ['string'],
    isSubPage: ['boolean'],
    parentId: ['string'],
    publishedSubPages: ['array'],
    citations: ['array'],
  }

  const validation = new Validator(data, rules)

  return {
    valid: validation.passes(),
    errors: validation.errors.all(),
  }
}

export default router
