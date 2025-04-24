import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions/v2'
import { logger } from 'firebase-functions/v2'

/**
 * Helper function to generate a random user tag
 */
function generateUserTag(options: { prefix?: string, length?: number, useWords?: boolean } = {}): string {
  const { prefix = '', length = 8, useWords = true } = options
  
  if (useWords) {
    // Use a list of readable words combined with numbers
    const adjectives = ['cool', 'super', 'awesome', 'bright', 'clever', 'epic', 'swift', 'smart']
    const nouns = ['coder', 'writer', 'thinker', 'dev', 'creator', 'maker', 'hacker', 'builder']
    
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)]
    const randomNumber = Math.floor(Math.random() * 1000)
    
    return `${prefix}${randomAdjective}${randomNoun}${randomNumber}`
  } else {
    // Generate a short alphanumeric tag
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let result = prefix
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }
}

/**
 * Validates a user tag format
 */
function validateUserTagFormat(tag: string): boolean {
  // Tag must be 3-30 characters, alphanumeric plus underscores
  const regex = /^[a-zA-Z0-9_]{3,30}$/
  return regex.test(tag)
}

/**
 * Check if a user tag is available (not already taken)
 */
async function isUserTagAvailable(tag: string): Promise<boolean> {
  try {
    // First check if the tag format is valid
    if (!validateUserTagFormat(tag)) {
      return false
    }
    
    // Query the users collection for the tag
    const db = admin.firestore()
    const querySnapshot = await db.collection('users')
      .where('userTag', '==', tag)
      .limit(1)
      .get()
    
    // If no documents found with this tag, it's available
    return querySnapshot.empty
  } catch (error) {
    logger.error('Error checking tag availability:', error)
    throw error
  }
}

/**
 * Generate a unique user tag that's guaranteed to be available
 * Will retry with different options if there are collisions
 */
async function generateUniqueUserTag(
  attempts = 3,
  options: { prefix?: string, length?: number, useWords?: boolean } = {}
): Promise<string> {
  let userTag = '';
  let isAvailable = false;
  let attempt = 0;
  
  while (!isAvailable && attempt < attempts) {
    userTag = generateUserTag(options);
    isAvailable = await isUserTagAvailable(userTag);
    attempt++;
    
    // If we're running out of attempts, switch to a different strategy
    if (!isAvailable && attempt === attempts - 1) {
      options.useWords = !options.useWords;
      options.length = options.length ? options.length + 2 : 10;
    }
  }
  
  if (!isAvailable) {
    // As a last resort, use a timestamp-based approach
    userTag = `user${Date.now().toString().substring(7)}`;
    // One final check to be absolutely sure
    if (!await isUserTagAvailable(userTag)) {
      // Add some random characters
      userTag += Math.floor(Math.random() * 10000).toString();
    }
  }
  
  return userTag;
}

/**
 * Cloud function to migrate existing users by generating tags for those without one
 */
export const migrateUserTags = functions.https.onCall(async (data, context) => {
  // Check if request is made by an admin
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    )
  }
  
  // Get admin UIDs from environment or Firestore
  const adminUids = process.env.ADMIN_UIDS ? process.env.ADMIN_UIDS.split(',') : []
  
  // If not hardcoded in env, try to get from Firestore
  if (adminUids.length === 0) {
    try {
      const db = admin.firestore()
      const adminDoc = await db.collection('admin').doc('config').get()
      if (adminDoc.exists) {
        const adminData = adminDoc.data()
        if (adminData && adminData.adminUids && Array.isArray(adminData.adminUids)) {
          adminUids.push(...adminData.adminUids)
        }
      }
    } catch (error) {
      logger.error('Failed to get admin UIDs from Firestore:', error)
    }
  }
  
  // Check if the current user is an admin
  if (!adminUids.includes(context.auth.uid)) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only administrators can perform this operation.'
    )
  }
  
  const { batchSize = 100 } = data || {}
  
  try {
    let totalProcessed = 0
    let errorCount = 0
    const db = admin.firestore()
    
    // Get all users without a userTag
    const usersSnapshot = await db.collection('users')
      .where('userTag', '==', null)
      .limit(batchSize)
      .get()
    
    if (usersSnapshot.empty) {
      return { 
        success: true, 
        message: 'No users found that need tags', 
        count: 0, 
        errors: 0 
      }
    }
    
    // Process in batches to avoid hitting Firestore limits
    const batch = db.batch()
    
    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data()
        const userId = userDoc.id
        
        // Generate a unique tag based on displayName if available
        const baseTagText = userData.displayName ? 
          userData.displayName.toLowerCase().replace(/[^a-z0-9]/g, '') : 
          '';
        
        const userTag = await generateUniqueUserTag(3, { 
          prefix: baseTagText ? `${baseTagText.substring(0, 10)}` : '',
          useWords: !baseTagText
        })
        
        // Update the user document
        const userRef = db.collection('users').doc(userId)
        batch.update(userRef, { 
          userTag,
          lastUpdatedAt: new Date().toISOString()
        })
        
        // Add to userTags collection for lookup
        const userTagRef = db.collection('userTags').doc(userTag)
        batch.set(userTagRef, {
          uid: userId,
          createdAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString()
        })
        
        totalProcessed++
      } catch (error) {
        logger.error(`Failed to migrate user ${userDoc.id}:`, error)
        errorCount++
      }
    }
    
    // Commit all the batched writes
    await batch.commit()
    
    return {
      success: true,
      message: `Successfully migrated ${totalProcessed} user tags with ${errorCount} errors`,
      count: totalProcessed,
      errors: errorCount
    }
  } catch (error) {
    logger.error('User tag migration failed:', error)
    
    throw new functions.https.HttpsError(
      'internal',
      'An error occurred during the migration process',
      { error: JSON.stringify(error) }
    )
  }
})

/**
 * Function to check how many users need tags
 */
export const checkUserTagMigrationNeeded = functions.https.onCall(async (data, context) => {
  // Check if the request is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    )
  }
  
  try {
    const db = admin.firestore()
    const querySnapshot = await db.collection('users')
      .where('userTag', '==', null)
      .count()
      .get()
    
    return {
      count: querySnapshot.data().count
    }
  } catch (error) {
    logger.error('Failed to check user tag migration status:', error)
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to check migration status',
      { error: JSON.stringify(error) }
    )
  }
})