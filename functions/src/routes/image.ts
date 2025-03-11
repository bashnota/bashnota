import { Request, Response } from 'express'
import express from 'express'
import Validator from 'validatorjs'
import { authorizeRequest } from '../helpers'
import { ImageUploadService } from '../utils/ImageUploadService'

const router = express.Router()

// Upload an image and get back the URL
router.post('/upload', authorizeRequest, async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const user = req.user

    // Validate request body
    const validation = validateImageUpload(req.body)
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors })
    }

    const { dataUrl } = req.body

    // Check if dataUrl is actually a data URL
    if (!dataUrl.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image format. Must be a data URL.' })
    }

    // Upload image to storage
    const imageUploadService = new ImageUploadService(user.uid)
    const imageUrl = await imageUploadService.uploadImage(dataUrl)

    return res.json({
      success: true,
      imageUrl,
    })
  } catch (error) {
    console.error('Failed to upload image:', error)
    return res.status(500).json({ error: 'Failed to upload image' })
  }
})

// Validation function for image upload
const validateImageUpload = (data: any) => {
  const rules = {
    dataUrl: ['required', 'string'],
  }

  const validation = new Validator(data, rules)

  return {
    valid: validation.passes(),
    errors: validation.errors.all(),
  }
}

export default router
