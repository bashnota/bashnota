import { v4 as uuidv4 } from 'uuid'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { firestore as db } from '@/services/firebase'
import { logger } from '@/services/logger'
import type { UserTagValidation } from '@/types/user'

/**
 * Options for user tag generation
 */
export interface UserTagOptions {
  prefix?: string
  length?: number
  useWords?: boolean
}

/**
 * Generates a random user tag with specified options
 */
export function generateUserTag(options: UserTagOptions = {}): string {
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
    const uuid = uuidv4().replace(/-/g, '')
    return `${prefix}${uuid.substring(0, length)}`
  }
}

/**
 * Validates a user tag format
 */
export function validateUserTagFormat(tag: string): boolean {
  // Tag must be 3-30 characters, alphanumeric plus underscores
  const regex = /^[a-zA-Z0-9_]{3,30}$/
  return regex.test(tag)
}

/**
 * Check if a user tag is available (not already taken)
 */
export async function isUserTagAvailable(tag: string): Promise<boolean> {
  try {
    // First check if the tag format is valid
    if (!validateUserTagFormat(tag)) {
      return false
    }
    
    // Query the userTags collection for the tag
    const tagDoc = doc(db, 'userTags', tag)
    const tagSnapshot = await getDoc(tagDoc)
    
    // If no document found with this tag, it's available
    return !tagSnapshot.exists()
  } catch (error) {
    logger.error('Error checking tag availability:', error)
    throw error
  }
}

/**
 * Validates a user tag and checks its availability
 */
export async function validateUserTag(tag: string): Promise<UserTagValidation> {
  try {
    const isValid = validateUserTagFormat(tag)
    
    if (!isValid) {
      return { 
        isValid: false, 
        isAvailable: false,
        error: 'User tag must be 3-30 characters, containing only letters, numbers, and underscores'
      }
    }
    
    const isAvailable = await isUserTagAvailable(tag)
    
    if (!isAvailable) {
      return {
        isValid: true,
        isAvailable: false,
        error: 'This user tag is already taken'
      }
    }
    
    return {
      isValid: true,
      isAvailable: true
    }
  } catch (error) {
    logger.error('Error validating user tag:', error)
    return {
      isValid: false,
      isAvailable: false,
      error: 'An error occurred while validating the user tag'
    }
  }
}

/**
 * Generate a unique user tag that's guaranteed to be available
 * Will retry with different options if there are collisions
 */
export async function generateUniqueUserTag(
  attempts = 3,
  options: UserTagOptions = {}
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