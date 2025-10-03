import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore'
import { db } from '../../config/firebase'
import { CustomStitchPattern, StitchGroupTemplate } from '../../types'
import { StorageStrategy, FirestoreCustomStitch, FirestoreTemplate } from './types'
import { logger } from '../../utils/logger'

export class FirebaseStorageStrategy implements StorageStrategy {
  constructor(private userId: string) {}

  async initialize(): Promise<void> {
    // Firebase is initialized in the firebase service
    // Just verify we have a valid userId
    if (!this.userId) {
      throw new Error('Firebase storage requires a valid user ID')
    }
    logger.debug('Firebase storage initialized for user:', this.userId)
  }

  async isAvailable(): Promise<boolean> {
    try {
      return !!db && !!this.userId
    } catch {
      return false
    }
  }

  private convertCustomStitchToFirestore(stitch: CustomStitchPattern): FirestoreCustomStitch {
    return {
      id: stitch.id,
      name: stitch.name,
      symbol: stitch.symbol,
      englishName: stitch.englishName,
      description: stitch.description,
      createdDate: Timestamp.fromDate(stitch.createdDate),
      lastUsed: stitch.lastUsed ? Timestamp.fromDate(stitch.lastUsed) : undefined,
      useCount: stitch.useCount,
      updatedAt: Timestamp.now(),
      version: 1
    }
  }

  private convertFirestoreToCustomStitch(firestoreStitch: FirestoreCustomStitch): CustomStitchPattern {
    return {
      id: firestoreStitch.id,
      name: firestoreStitch.name,
      symbol: firestoreStitch.symbol,
      englishName: firestoreStitch.englishName,
      description: firestoreStitch.description,
      createdDate: firestoreStitch.createdDate.toDate(),
      lastUsed: firestoreStitch.lastUsed?.toDate(),
      useCount: firestoreStitch.useCount
    }
  }

  private convertTemplateToFirestore(template: StitchGroupTemplate): FirestoreTemplate {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category || '一般',
      repeatCount: template.repeatCount,
      stitches: template.stitches,
      createdDate: Timestamp.fromDate(template.createdDate),
      lastUsed: template.lastUsed ? Timestamp.fromDate(template.lastUsed) : undefined,
      useCount: template.useCount,
      updatedAt: Timestamp.now(),
      version: 1
    }
  }

  private convertFirestoreToTemplate(firestoreTemplate: FirestoreTemplate): StitchGroupTemplate {
    return {
      id: firestoreTemplate.id,
      name: firestoreTemplate.name,
      description: firestoreTemplate.description,
      category: firestoreTemplate.category,
      repeatCount: firestoreTemplate.repeatCount,
      stitches: firestoreTemplate.stitches,
      createdDate: firestoreTemplate.createdDate.toDate(),
      lastUsed: firestoreTemplate.lastUsed?.toDate(),
      useCount: firestoreTemplate.useCount
    }
  }

  private getCustomStitchesCollection() {
    return collection(db, 'users', this.userId, 'customStitches')
  }

  private getTemplatesCollection() {
    return collection(db, 'users', this.userId, 'templates')
  }

  private getCustomStitchDoc(id: string) {
    return doc(db, 'users', this.userId, 'customStitches', id)
  }

  private getTemplateDoc(id: string) {
    return doc(db, 'users', this.userId, 'templates', id)
  }

  // Custom Stitches
  async loadCustomStitches(): Promise<CustomStitchPattern[]> {
    try {
      const customStitchesQuery = query(
        this.getCustomStitchesCollection(),
        orderBy('createdDate', 'desc')
      )
      const snapshot = await getDocs(customStitchesQuery)
      
      const stitches: CustomStitchPattern[] = []
      snapshot.forEach((doc) => {
        const data = doc.data() as FirestoreCustomStitch
        stitches.push(this.convertFirestoreToCustomStitch(data))
      })

      logger.debug(`Loaded ${stitches.length} custom stitches from Firebase`)
      return stitches
    } catch (error) {
      logger.error('Failed to load custom stitches from Firebase:', error)
      throw error
    }
  }

  async saveCustomStitch(stitch: CustomStitchPattern): Promise<void> {
    try {
      const firestoreStitch = this.convertCustomStitchToFirestore(stitch)
      const docRef = this.getCustomStitchDoc(stitch.id)
      await setDoc(docRef, firestoreStitch)
      logger.debug('Saved custom stitch to Firebase:', stitch.id)
    } catch (error) {
      logger.error('Failed to save custom stitch to Firebase:', error)
      throw error
    }
  }

  async updateCustomStitch(id: string, updates: Partial<CustomStitchPattern>): Promise<void> {
    try {
      const docRef = this.getCustomStitchDoc(id)
      
      // Convert updates to Firestore format
      const firestoreUpdates: Partial<FirestoreCustomStitch> = {
        ...Object.keys(updates).reduce((acc, key) => {
          const value = updates[key as keyof CustomStitchPattern]
          if (value !== undefined) {
            if (key === 'createdDate' || key === 'lastUsed') {
              acc[key as keyof FirestoreCustomStitch] = Timestamp.fromDate(value as Date) as any
            } else {
              acc[key as keyof FirestoreCustomStitch] = value as any
            }
          }
          return acc
        }, {} as Partial<FirestoreCustomStitch>),
        updatedAt: Timestamp.now()
      }

      await updateDoc(docRef, firestoreUpdates)
      logger.debug('Updated custom stitch in Firebase:', id)
    } catch (error) {
      logger.error('Failed to update custom stitch in Firebase:', error)
      throw error
    }
  }

  async deleteCustomStitch(id: string): Promise<void> {
    try {
      const docRef = this.getCustomStitchDoc(id)
      await deleteDoc(docRef)
      logger.debug('Deleted custom stitch from Firebase:', id)
    } catch (error) {
      logger.error('Failed to delete custom stitch from Firebase:', error)
      throw error
    }
  }

  async clearAllCustomStitches(): Promise<void> {
    try {
      const snapshot = await getDocs(this.getCustomStitchesCollection())
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref))
      await Promise.all(deletePromises)
      logger.debug('Cleared all custom stitches from Firebase')
    } catch (error) {
      logger.error('Failed to clear custom stitches from Firebase:', error)
      throw error
    }
  }

  // Templates
  async loadTemplates(): Promise<StitchGroupTemplate[]> {
    try {
      const templatesQuery = query(
        this.getTemplatesCollection(),
        orderBy('createdDate', 'desc')
      )
      const snapshot = await getDocs(templatesQuery)
      
      const templates: StitchGroupTemplate[] = []
      snapshot.forEach((doc) => {
        const data = doc.data() as FirestoreTemplate
        templates.push(this.convertFirestoreToTemplate(data))
      })

      logger.debug(`Loaded ${templates.length} templates from Firebase`)
      return templates
    } catch (error) {
      logger.error('Failed to load templates from Firebase:', error)
      throw error
    }
  }

  async saveTemplate(template: StitchGroupTemplate): Promise<void> {
    try {
      const firestoreTemplate = this.convertTemplateToFirestore(template)
      const docRef = this.getTemplateDoc(template.id)
      await setDoc(docRef, firestoreTemplate)
      logger.debug('Saved template to Firebase:', template.id)
    } catch (error) {
      logger.error('Failed to save template to Firebase:', error)
      throw error
    }
  }

  async updateTemplate(id: string, updates: Partial<StitchGroupTemplate>): Promise<void> {
    try {
      const docRef = this.getTemplateDoc(id)
      
      // Convert updates to Firestore format
      const firestoreUpdates: Partial<FirestoreTemplate> = {
        ...Object.keys(updates).reduce((acc, key) => {
          const value = updates[key as keyof StitchGroupTemplate]
          if (value !== undefined) {
            if (key === 'createdDate' || key === 'lastUsed') {
              acc[key as keyof FirestoreTemplate] = Timestamp.fromDate(value as Date) as any
            } else {
              acc[key as keyof FirestoreTemplate] = value as any
            }
          }
          return acc
        }, {} as Partial<FirestoreTemplate>),
        updatedAt: Timestamp.now()
      }

      await updateDoc(docRef, firestoreUpdates)
      logger.debug('Updated template in Firebase:', id)
    } catch (error) {
      logger.error('Failed to update template in Firebase:', error)
      throw error
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    try {
      const docRef = this.getTemplateDoc(id)
      await deleteDoc(docRef)
      logger.debug('Deleted template from Firebase:', id)
    } catch (error) {
      logger.error('Failed to delete template from Firebase:', error)
      throw error
    }
  }

  async clearAllTemplates(): Promise<void> {
    try {
      const snapshot = await getDocs(this.getTemplatesCollection())
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref))
      await Promise.all(deletePromises)
      logger.debug('Cleared all templates from Firebase')
    } catch (error) {
      logger.error('Failed to clear templates from Firebase:', error)
      throw error
    }
  }
}