import { Request, Response } from 'express'
import { onRequest } from 'firebase-functions/v2/https'

import express from 'express'
import admin from 'firebase-admin'
import cors from 'cors'

// Initialize the Firebase Admin SDK
admin.initializeApp({
  projectId: process.env.GCLOUD_PROJECT,
  credential: admin.credential.applicationDefault(),
  storageBucket: `${process.env.GCLOUD_PROJECT}.appspot.com`,
})

import notaRouter from './routes/nota'

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

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Welcome to the Bahsnota API',
    version: '1.0.0',
    description: 'A RESTful API for the Bashnota',
    url: 'https://bashnota.com',
  })
})

app.use('/nota', notaRouter)

export const api = onRequest(app)
