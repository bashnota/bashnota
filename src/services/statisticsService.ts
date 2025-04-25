// statistics service for tracking published nota metrics
import { doc, updateDoc, increment, arrayUnion, getDoc, writeBatch, serverTimestamp, setDoc, deleteDoc, deleteField, collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { firestore } from './firebase'
import { logger } from './logger'
import { logAnalyticsEvent } from './firebase'

/**
 * Service to track and manage statistics for published notas
 */
export const statisticsService = {
  /**
   * Record a view for a published nota
   * @param notaId - The ID of the published nota
   * @param userId - Optional user ID of the viewer (for unique viewers count)
   * @param referrer - Optional referrer information
   */
  async recordView(notaId: string, userId?: string | null, referrer?: string | null): Promise<void> {
    try {
      if (!notaId) return;

      const notaRef = doc(firestore, 'publishedNotas', notaId);
      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const currentWeek = this.getWeekIdentifier(new Date());
      const currentMonth = this.getMonthIdentifier(new Date());
      
      // Get the nota document to check if it exists and get current data
      const notaDoc = await getDoc(notaRef);
      
      if (!notaDoc.exists()) {
        logger.error(`Published nota ${notaId} not found when recording view`);
        return;
      }

      // Prepare batch updates to minimize network calls and ensure atomicity
      const batch = writeBatch(firestore);
      
      // Basic view count increment
      const updateData: Record<string, any> = {
        viewCount: increment(1),
        lastViewedAt: serverTimestamp(),
      };
      
      // Add to daily, weekly, and monthly stats
      updateData[`stats.dailyViews.${today}`] = increment(1);
      updateData[`stats.weeklyViews.${currentWeek}`] = increment(1);
      updateData[`stats.monthlyViews.${currentMonth}`] = increment(1);
      
      // If we have referrer information, update referrer counts
      if (referrer) {
        updateData[`referrers.${this.normalizeReferrer(referrer)}`] = increment(1);
      }
      
      // If we have a user ID, track unique viewers
      if (userId) {
        // Create a separate document for tracking unique viewers to avoid array limits
        const viewersRef = doc(firestore, 'publishedNotaViewers', notaId);
        const viewersDoc = await getDoc(viewersRef);
        
        if (!viewersDoc.exists()) {
          // Initialize the viewers document if it doesn't exist
          batch.set(viewersRef, {
            notaId,
            viewers: [userId],
            lastUpdated: serverTimestamp()
          });
          
          // Increment unique viewers count in the main nota doc
          updateData.uniqueViewers = increment(1);
        } else {
          // Check if this user has already viewed
          const viewersData = viewersDoc.data();
          if (!viewersData.viewers.includes(userId)) {
            batch.update(viewersRef, {
              viewers: arrayUnion(userId),
              lastUpdated: serverTimestamp()
            });
            
            // Increment unique viewers count in the main nota doc
            updateData.uniqueViewers = increment(1);
          }
        }
      }
      
      // Update the nota document
      batch.update(notaRef, updateData);
      
      // Commit all changes
      await batch.commit();
      
      // Log the view event to analytics
      logAnalyticsEvent('nota_viewed', {
        nota_id: notaId,
        has_user_id: !!userId,
        has_referrer: !!referrer
      });
    } catch (error) {
      // Use non-blocking error handling for statistics - don't break the app if stats fail
      logger.error('Failed to record nota view:', error);
      // We don't rethrow the error to prevent breaking user experience
    }
  },
  
  /**
   * Records a user's vote (like or dislike) for a published nota
   * @param notaId - The ID of the published nota
   * @param userId - The ID of the user who is voting
   * @param voteType - The type of vote ('like' or 'dislike')
   * @returns A promise that resolves with the updated vote counts
   */
  async recordVote(notaId: string, userId: string, voteType: 'like' | 'dislike'): Promise<{ likeCount: number, dislikeCount: number, userVote: 'like' | 'dislike' | null }> {
    try {
      if (!notaId || !userId) {
        throw new Error('Nota ID and user ID are required to record a vote');
      }

      logger.info(`Recording vote: ${voteType} for nota ${notaId} by user ${userId}`);

      // References to the documents we'll be working with
      const notaRef = doc(firestore, 'publishedNotas', notaId);

      // Check if the nota exists
      const notaDoc = await getDoc(notaRef);
      if (!notaDoc.exists()) {
        throw new Error(`Published nota ${notaId} not found when recording vote`);
      }

      // Get the current nota data
      const notaData = notaDoc.data();
      let likeCount = notaData.likeCount || 0;
      let dislikeCount = notaData.dislikeCount || 0;
      
      // Get the current votes map (or initialize it)
      const votes = notaData.votes || {};
      const userCurrentVote = votes[userId] || null;
      
      // Create a batch for the operations
      const batch = writeBatch(firestore);
      
      // Determine the action based on the current vote
      if (userCurrentVote === voteType) {
        // User is removing their vote
        const updateData: Record<string, any> = {};
        updateData[`votes.${userId}`] = deleteField();
        
        // Decrement the appropriate counter
        if (voteType === 'like') {
          updateData.likeCount = increment(-1);
          likeCount--;
        } else {
          updateData.dislikeCount = increment(-1);
          dislikeCount--;
        }
        
        batch.update(notaRef, updateData);
        logger.info(`Removing ${voteType} vote from nota ${notaId} for user ${userId}`);
      } else if (userCurrentVote) {
        // User is changing their vote
        const updateData: Record<string, any> = {};
        updateData[`votes.${userId}`] = voteType;
        
        // Update counters: decrement the old vote type, increment the new one
        if (voteType === 'like') {
          updateData.likeCount = increment(1);
          updateData.dislikeCount = increment(-1);
          likeCount++;
          dislikeCount--;
        } else {
          updateData.likeCount = increment(-1);
          updateData.dislikeCount = increment(1);
          likeCount--;
          dislikeCount++;
        }
        
        batch.update(notaRef, updateData);
        logger.info(`Changing vote from ${userCurrentVote} to ${voteType} for nota ${notaId} for user ${userId}`);
      } else {
        // User is voting for the first time
        const updateData: Record<string, any> = {};
        updateData[`votes.${userId}`] = voteType;
        
        // Check if likeCount and dislikeCount exist, initialize them if not
        if (typeof notaData.likeCount !== 'number') {
          updateData.likeCount = voteType === 'like' ? 1 : 0;
          likeCount = voteType === 'like' ? 1 : 0;
        } else if (voteType === 'like') {
          updateData.likeCount = increment(1);
          likeCount++;
        }
        
        if (typeof notaData.dislikeCount !== 'number') {
          updateData.dislikeCount = voteType === 'dislike' ? 1 : 0;
          dislikeCount = voteType === 'dislike' ? 1 : 0;
        } else if (voteType === 'dislike') {
          updateData.dislikeCount = increment(1);
          dislikeCount++;
        }
        
        batch.update(notaRef, updateData);
        logger.info(`Adding new ${voteType} vote to nota ${notaId} for user ${userId}`);
      }

      // Commit all the changes
      await batch.commit();
      logger.info(`Successfully recorded vote and updated counts for ${notaId}`);

      // Log the vote event
      logAnalyticsEvent('nota_voted', {
        nota_id: notaId,
        vote_type: voteType,
        is_vote_change: !!userCurrentVote
      });

      // Return the updated counts and the user's current vote
      return {
        likeCount,
        dislikeCount,
        userVote: userCurrentVote === voteType ? null : voteType
      };
    } catch (error) {
      logger.error('Failed to record vote:', error);
      throw new Error(`Failed to record vote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Checks if a user has already voted on a nota and returns their vote type
   * @param notaId - The ID of the published nota
   * @param userId - The ID of the user
   * @returns The user's vote type ('like', 'dislike', or null if they haven't voted)
   */
  async getUserVote(notaId: string, userId: string): Promise<'like' | 'dislike' | null> {
    try {
      if (!notaId || !userId) return null;

      logger.info(`Checking vote status for nota ${notaId} by user ${userId}`);
      
      const notaRef = doc(firestore, 'publishedNotas', notaId);
      
      try {
        const notaDoc = await getDoc(notaRef);
        
        if (notaDoc.exists()) {
          const notaData = notaDoc.data();
          const votes = notaData.votes || {};
          const userVote = votes[userId] || null;
          
          logger.info(`Found existing vote for user ${userId}: ${userVote}`);
          return userVote as 'like' | 'dislike' | null;
        }
        
        logger.info(`No nota found with ID ${notaId}`);
        return null;
      } catch (readError) {
        // If we get a permission error reading the vote, log it and return null
        logger.error(`Error reading vote: ${readError instanceof Error ? readError.message : 'Unknown error'}`);
        return null;
      }
    } catch (error) {
      logger.error('Failed to get user vote:', error);
      return null;
    }
  },

  /**
   * Get users who voted on a nota
   * @param notaId - The ID of the published nota
   * @returns Promise with an array of voter information
   */
  async getVoters(notaId: string): Promise<{ userId: string, userTag: string, voteType: 'like' | 'dislike' }[]> {
    try {
      if (!notaId) return [];
      
      logger.info(`Getting voters for nota ${notaId}`);
      
      // Get the nota document
      const notaRef = doc(firestore, 'publishedNotas', notaId);
      const notaDoc = await getDoc(notaRef);
      
      if (!notaDoc.exists()) {
        logger.error(`Published nota ${notaId} not found when getting voters`);
        return [];
      }
      
      const notaData = notaDoc.data();
      const votes = notaData.votes || {};
      
      // If no votes, return empty array
      if (Object.keys(votes).length === 0) {
        return [];
      }
      
      // Get user information for each voter
      const voters = [];
      
      for (const [userId, voteType] of Object.entries(votes)) {
        try {
          // Get the user document to retrieve the user tag
          const userRef = doc(firestore, 'users', userId);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            voters.push({
              userId,
              userTag: userData.userTag || 'unknown',
              voteType: voteType as 'like' | 'dislike'
            });
          }
        } catch (error) {
          logger.error(`Error getting user info for voter ${userId}:`, error);
        }
      }
      
      return voters;
    } catch (error) {
      logger.error('Failed to get voters:', error);
      return [];
    }
  },

  /**
   * Get statistics for a published nota
   * @param notaId - The ID of the published nota
   * @returns Statistics data for the nota
   */
  async getStatistics(notaId: string) {
    try {
      const notaRef = doc(firestore, 'publishedNotas', notaId);
      const notaDoc = await getDoc(notaRef);
      
      if (!notaDoc.exists()) {
        throw new Error(`Published nota ${notaId} not found`);
      }
      
      const data = notaDoc.data();
      
      // Handle timestamp conversions properly
      let lastViewedAt = null;
      if (data.lastViewedAt) {
        try {
          // Check if it's a Firestore Timestamp
          if (typeof data.lastViewedAt.toDate === 'function') {
            lastViewedAt = new Date(data.lastViewedAt.toDate());
          } else {
            // It might be a serialized date string
            lastViewedAt = new Date(data.lastViewedAt);
          }
        } catch (e) {
          logger.error('Error converting lastViewedAt timestamp:', e);
        }
      }
      
      return {
        viewCount: data.viewCount || 0,
        uniqueViewers: data.uniqueViewers || 0,
        lastViewedAt,
        referrers: data.referrers || {},
        stats: data.stats || {
          dailyViews: {},
          weeklyViews: {},
          monthlyViews: {}
        },
        likeCount: data.likeCount || 0,
        dislikeCount: data.dislikeCount || 0
      };
    } catch (error) {
      logger.error('Failed to get nota statistics:', error);
      throw error;
    }
  },
  
  /**
   * Get statistics for all published notas by a user
   * @param userId - The ID of the user
   * @returns Array of nota statistics
   */
  async getUserNotasStatistics(userId: string) {
    // This would be implemented as a Cloud Function to aggregate data efficiently
    // For now, return a placeholder with a proper implementation note
    logger.info(`Getting statistics for user ${userId} - to be implemented as a Cloud Function`);
    return [];
  },
  
  /**
   * Helper function to get a standardized week identifier (YYYY-WW)
   */
  getWeekIdentifier(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay()); // Set to Sunday
    const year = d.getFullYear();
    
    // Calculate the week number
    const firstDayOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay()) / 7);
    
    // Format as YYYY-WW
    return `${year}-${weekNumber.toString().padStart(2, '0')}`;
  },
  
  /**
   * Helper function to get a standardized month identifier (YYYY-MM)
   */
  getMonthIdentifier(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // JavaScript months are 0-based
    return `${year}-${month.toString().padStart(2, '0')}`;
  },
  
  /**
   * Helper function to normalize referrer values
   */
  normalizeReferrer(referrer: string): string {
    try {
      // Extract domain from URL if present
      if (referrer.startsWith('http')) {
        const url = new URL(referrer);
        return url.hostname;
      }
      // Remove any unusual characters
      return referrer.replace(/[^a-zA-Z0-9.-]/g, '').substring(0, 50);
    } catch (error) {
      return 'unknown';
    }
  }
};