import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  Timestamp 
} from 'firebase/firestore'
import { db } from '../config/firebase'

export interface UserProfile {
  uid: string
  displayName: string | null
  email: string | null
  createdAt: Date
  lastLogin: Date
}

/**
 * FirestoreUserService handles all user profile related operations
 * Responsible for:
 * - User profile CRUD operations
 * - User authentication tracking
 * - User session management
 */
export class FirestoreUserService {
  private readonly COLLECTION_NAME = 'users'
  private readonly PROFILE_SUBCOLLECTION = 'profile'
  private readonly PROFILE_DOCUMENT = 'info'

  /**
   * Get user profile from Firestore
   * @param userId - The user's UID
   * @returns UserProfile object or null if not found
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      console.log('[FIRESTORE-USER] Getting user profile:', userId)
      
      const userRef = doc(db, this.COLLECTION_NAME, userId, this.PROFILE_SUBCOLLECTION, this.PROFILE_DOCUMENT)
      const userSnap = await getDoc(userRef)
      
      if (userSnap.exists()) {
        const data = userSnap.data()
        const profile: UserProfile = {
          uid: data.uid,
          displayName: data.displayName,
          email: data.email,
          createdAt: data.createdAt.toDate(),
          lastLogin: data.lastLogin.toDate()
        }
        
        console.log('[FIRESTORE-USER] User profile found:', profile.email)
        return profile
      }
      
      console.log('[FIRESTORE-USER] User profile not found for:', userId)
      return null
    } catch (error) {
      console.error('[FIRESTORE-USER] Error getting user profile:', error)
      throw this.createUserServiceError('Failed to get user profile', error)
    }
  }

  /**
   * Create a new user profile in Firestore
   * @param profile - UserProfile object to create
   */
  async createUserProfile(profile: UserProfile): Promise<void> {
    try {
      console.log('[FIRESTORE-USER] Creating user profile:', profile.email)
      
      this.validateUserProfile(profile)
      
      const userRef = doc(db, this.COLLECTION_NAME, profile.uid, this.PROFILE_SUBCOLLECTION, this.PROFILE_DOCUMENT)
      const profileData = {
        uid: profile.uid,
        displayName: profile.displayName,
        email: profile.email,
        createdAt: Timestamp.fromDate(profile.createdAt),
        lastLogin: Timestamp.fromDate(profile.lastLogin)
      }
      
      await setDoc(userRef, profileData)
      console.log('[FIRESTORE-USER] User profile created successfully:', profile.email)
    } catch (error) {
      console.error('[FIRESTORE-USER] Error creating user profile:', error)
      throw this.createUserServiceError('Failed to create user profile', error)
    }
  }

  /**
   * Update user's last login timestamp
   * @param userId - The user's UID
   */
  async updateUserLastLogin(userId: string): Promise<void> {
    try {
      console.log('[FIRESTORE-USER] Updating last login for user:', userId)
      
      const userRef = doc(db, this.COLLECTION_NAME, userId, this.PROFILE_SUBCOLLECTION, this.PROFILE_DOCUMENT)
      const updateData = {
        lastLogin: Timestamp.fromDate(new Date())
      }
      
      await updateDoc(userRef, updateData)
      console.log('[FIRESTORE-USER] Last login updated successfully for:', userId)
    } catch (error) {
      console.error('[FIRESTORE-USER] Error updating last login:', error)
      throw this.createUserServiceError('Failed to update last login', error)
    }
  }

  /**
   * Update user profile information
   * @param userId - The user's UID
   * @param updates - Partial UserProfile with fields to update
   */
  async updateUserProfile(userId: string, updates: Partial<Omit<UserProfile, 'uid'>>): Promise<void> {
    try {
      console.log('[FIRESTORE-USER] Updating user profile:', userId, updates)
      
      const userRef = doc(db, this.COLLECTION_NAME, userId, this.PROFILE_SUBCOLLECTION, this.PROFILE_DOCUMENT)
      const updateData: Record<string, unknown> = {}
      
      if (updates.displayName !== undefined) {
        updateData.displayName = updates.displayName
      }
      if (updates.email !== undefined) {
        updateData.email = updates.email
      }
      if (updates.lastLogin !== undefined) {
        updateData.lastLogin = Timestamp.fromDate(updates.lastLogin)
      }
      
      await updateDoc(userRef, updateData)
      console.log('[FIRESTORE-USER] User profile updated successfully:', userId)
    } catch (error) {
      console.error('[FIRESTORE-USER] Error updating user profile:', error)
      throw this.createUserServiceError('Failed to update user profile', error)
    }
  }

  /**
   * Check if user profile exists
   * @param userId - The user's UID
   * @returns boolean indicating if profile exists
   */
  async userProfileExists(userId: string): Promise<boolean> {
    try {
      const userRef = doc(db, this.COLLECTION_NAME, userId, this.PROFILE_SUBCOLLECTION, this.PROFILE_DOCUMENT)
      const userSnap = await getDoc(userRef)
      return userSnap.exists()
    } catch (error) {
      console.error('[FIRESTORE-USER] Error checking user profile existence:', error)
      return false
    }
  }

  /**
   * Validate user profile data
   * @private
   */
  private validateUserProfile(profile: UserProfile): void {
    if (!profile.uid || typeof profile.uid !== 'string') {
      throw new Error('Invalid user ID')
    }
    
    if (!profile.createdAt || !(profile.createdAt instanceof Date)) {
      throw new Error('Invalid created date')
    }
    
    if (!profile.lastLogin || !(profile.lastLogin instanceof Date)) {
      throw new Error('Invalid last login date')
    }
    
    if (profile.email && typeof profile.email !== 'string') {
      throw new Error('Invalid email format')
    }
  }

  /**
   * Create a standardized error for user service operations
   * @private
   */
  private createUserServiceError(message: string, originalError: unknown): Error {
    const errorMessage = originalError instanceof Error ? originalError.message : String(originalError)
    const error = new Error(`[FirestoreUserService] ${message}: ${errorMessage}`)
    return error
  }
}

export const firestoreUserService = new FirestoreUserService()