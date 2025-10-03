import { CustomStitchPattern, StitchGroupTemplate, StitchType } from '../../types'

// Storage interface for both custom stitches and templates
export interface StorageStrategy {
  // Custom Stitches
  loadCustomStitches(): Promise<CustomStitchPattern[]>
  saveCustomStitch(stitch: CustomStitchPattern): Promise<void>
  updateCustomStitch(id: string, updates: Partial<CustomStitchPattern>): Promise<void>
  deleteCustomStitch(id: string): Promise<void>
  clearAllCustomStitches(): Promise<void>
  
  // Templates  
  loadTemplates(): Promise<StitchGroupTemplate[]>
  saveTemplate(template: StitchGroupTemplate): Promise<void>
  updateTemplate(id: string, updates: Partial<StitchGroupTemplate>): Promise<void>
  deleteTemplate(id: string): Promise<void>
  clearAllTemplates(): Promise<void>
  
  // General
  initialize(): Promise<void>
  isAvailable(): Promise<boolean>
}

// Firebase Firestore types
export interface FirestoreCustomStitch {
  id: string
  name: string
  symbol: string
  englishName: string
  description?: string
  createdDate: any // Firestore Timestamp
  lastUsed?: any // Firestore Timestamp
  useCount: number
  updatedAt: any // Firestore Timestamp
  version: number
}

export interface FirestoreTemplate {
  id: string
  name: string
  description?: string
  category: string
  repeatCount: number
  stitches: Array<{
    id: string
    type: StitchType
    yarnId: string
    count: number
    customName?: string
    customSymbol?: string
  }>
  createdDate: any // Firestore Timestamp
  lastUsed?: any // Firestore Timestamp
  useCount: number
  updatedAt: any // Firestore Timestamp
  version: number
}

// IndexedDB types
export interface IDBCustomStitch {
  id: string
  name: string
  symbol: string
  englishName: string
  description?: string
  createdDate: number
  lastUsed?: number
  useCount: number
  updatedAt: number
  version: number
}

export interface IDBTemplate {
  id: string
  name: string
  description?: string
  category: string
  repeatCount: number
  stitches: Array<{
    id: string
    type: StitchType
    yarnId: string
    count: number
    customName?: string
    customSymbol?: string
  }>
  createdDate: number
  lastUsed?: number
  useCount: number
  updatedAt: number
  version: number
}

// Storage configuration
export interface StorageConfig {
  userType: 'authenticated' | 'guest' | 'uninitialized'
  userId?: string
}

// Migration types
export interface MigrationResult {
  success: boolean
  migratedCustomStitches: number
  migratedTemplates: number
  errors: string[]
}