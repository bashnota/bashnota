import { Request, Response } from 'express'
import express from 'express'
import admin from 'firebase-admin'
import Validator from 'validatorjs'
import { PublishedNota } from '../types/nota'
import { authorizeRequest } from '../helpers'

const router = express.Router()
const db = admin.firestore()
const publishedNotasCollection = 'publishedNotas'

// Get all published notas for the current user
router.get('/published', authorizeRequest, async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const user = req.user

    const querySnapshot = await db
      .collection(publishedNotasCollection)
      .where('authorId', '==', user.uid)
      .where('isPublic', '==', true)
      .get()

    const publishedNotas: PublishedNota[] = []
    querySnapshot.forEach((doc) => {
      publishedNotas.push({ ...doc.data(), id: doc.id } as PublishedNota)
    })

    return res.json(publishedNotas)
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

    // Use the simplified content processor to sanitize content
    // const contentProcessor = new NotaContentProcessor()
    // const processedContent = contentProcessor.process(notaData.content)

    // TODO: Activate content processor
    const processedContent = JSON.parse(notaData.content)

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

    // Delete from Firestore
    await docRef.delete()

    return res.json({
      success: true,
      id: notaId,
      message: 'Nota unpublished successfully',
    })
  } catch (error) {
    console.error('Failed to unpublish nota:', error)
    return res.status(500).json({ error: 'Failed to unpublish nota' })
  }
})

// Validation function for publishing a nota
const validatePublishNota = (data: any) => {
  const rules = {
    title: ['required', 'string'],
    content: ['string'],
    updatedAt: ['string'],
  }

  const validation = new Validator(data, rules)

  return {
    valid: validation.passes(),
    errors: validation.errors.all(),
  }
}

export default router
