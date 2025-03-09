import { NextFunction, Request, Response } from 'express'
import * as admin from 'firebase-admin'

export const authorizeRequest = async (req: Request, res: Response, next: NextFunction) => {
  // Check if the request has an Authorization header
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    res.status(401).send('Unauthorized')
    return
  }

  // Get the ID token from the Authorization header
  const idToken = req.headers.authorization.split('Bearer ')[1]

  // Extract user data from the ID token
  try {
    const decodedIdToken = await admin.auth().verifyIdToken(idToken)
    const userId = decodedIdToken.uid

    // Get the user data from the Firestore database
    const user = await admin.auth().getUser(userId)
    if (!user) {
      res.status(401).send('Unauthorized')
      return
    }

    // @ts-ignore
    req.user = user
    next()
    return
  } catch (error) {
    console.error('Failed to verify ID token:', error)
    res.status(401).send('Unauthorized')
    return
  }
}
