import { Request, Response } from 'express'
import { onRequest } from 'firebase-functions/v2/https'

import express from 'express'
import admin from 'firebase-admin'
import cors from 'cors'

// Initialize the Firebase Admin SDK
admin.initializeApp({
  projectId: process.env.GCLOUD_PROJECT,
  credential: admin.credential.applicationDefault(),
  storageBucket: `${process.env.GCLOUD_PROJECT}.firebasestorage.app`,
})

import notaRouter from './routes/nota'
import imageRouter from './routes/image'
import commentsRouter from './routes/comments'
import authorsRouter from './routes/authors'
import { migrateUserTags, checkUserTagMigrationNeeded } from './routes/userTags'

// Create an Express app
const app = express()
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? ['https://offline.bashnota.com', 'https://bashnota.web.app']
        : '*',
  }),
)
app.use(express.json({ limit: '5mb' }))

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Welcome to the Bashnota API',
    version: '1.0.0',
    description: 'A RESTful API for the Bashnota',
    url: 'https://bashnota.com',
  })
})

app.use('/nota', notaRouter)
app.use('/image', imageRouter)
app.use('/comments', commentsRouter)
app.use('/authors', authorsRouter)

// Export the cloud functions
export const api = onRequest(app)
export { migrateUserTags, checkUserTagMigrationNeeded }
