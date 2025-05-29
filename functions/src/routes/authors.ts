import { Request, Response } from 'express'
import express from 'express'
import admin from 'firebase-admin'

const router = express.Router()
const db = admin.firestore()
const userTagsCollection = 'userTags'

// Get user by tag
router.get('/:tag', async (req: Request, res: Response) => {
  const tag = req.params.tag.startsWith('@') ? req.params.tag.slice(1) : req.params.tag
  try {
    const userTagDoc = await db.collection(userTagsCollection).doc(tag).get()
    if (!userTagDoc.exists) {
      return res.status(404).json({ error: 'User tag not found' })
    }

    const userTagData = userTagDoc.data()
    if (!userTagData) {
      return res.status(404).json({ error: 'User tag data not found' })
    }

    const userId = userTagData.uid
    const userDoc = await db.collection('users').doc(userId).get()
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' })
    }
    const userData = userDoc.data()
    return res.json({
      id: userDoc.id,
      tag: userTagData.tag,
      displayName: userData?.displayName || '',
    })
  } catch (error) {
    console.error('Error fetching user by tag:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
