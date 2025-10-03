import { CustomStitchPattern, StitchGroupTemplate } from '../../types'
import { StorageStrategy, IDBCustomStitch, IDBTemplate } from './types'
import { logger } from '../../utils/logger'

const DB_NAME = 'StitchieDB'
const DB_VERSION = 1
const CUSTOM_STITCHES_STORE = 'customStitches'
const TEMPLATES_STORE = 'templates'

export class IndexedDBStorageStrategy implements StorageStrategy {
  private db: IDBDatabase | null = null

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        logger.error('IndexedDB initialization failed:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        logger.debug('IndexedDB initialized successfully')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create custom stitches store
        if (!db.objectStoreNames.contains(CUSTOM_STITCHES_STORE)) {
          const customStitchesStore = db.createObjectStore(CUSTOM_STITCHES_STORE, { keyPath: 'id' })
          customStitchesStore.createIndex('name', 'name', { unique: false })
          customStitchesStore.createIndex('useCount', 'useCount', { unique: false })
          customStitchesStore.createIndex('lastUsed', 'lastUsed', { unique: false })
          customStitchesStore.createIndex('updatedAt', 'updatedAt', { unique: false })
        }

        // Create templates store
        if (!db.objectStoreNames.contains(TEMPLATES_STORE)) {
          const templatesStore = db.createObjectStore(TEMPLATES_STORE, { keyPath: 'id' })
          templatesStore.createIndex('name', 'name', { unique: false })
          templatesStore.createIndex('category', 'category', { unique: false })
          templatesStore.createIndex('useCount', 'useCount', { unique: false })
          templatesStore.createIndex('lastUsed', 'lastUsed', { unique: false })
          templatesStore.createIndex('updatedAt', 'updatedAt', { unique: false })
        }

        logger.debug('IndexedDB stores created/upgraded')
      }
    })
  }

  async isAvailable(): Promise<boolean> {
    try {
      return 'indexedDB' in window && indexedDB !== null
    } catch {
      return false
    }
  }

  private convertCustomStitchToIDB(stitch: CustomStitchPattern): IDBCustomStitch {
    return {
      id: stitch.id,
      name: stitch.name,
      symbol: stitch.symbol,
      englishName: stitch.englishName,
      description: stitch.description,
      createdDate: stitch.createdDate.getTime(),
      lastUsed: stitch.lastUsed?.getTime(),
      useCount: stitch.useCount,
      updatedAt: Date.now(),
      version: 1
    }
  }

  private convertIDBToCustomStitch(idbStitch: IDBCustomStitch): CustomStitchPattern {
    return {
      id: idbStitch.id,
      name: idbStitch.name,
      symbol: idbStitch.symbol,
      englishName: idbStitch.englishName,
      description: idbStitch.description,
      createdDate: new Date(idbStitch.createdDate),
      lastUsed: idbStitch.lastUsed ? new Date(idbStitch.lastUsed) : undefined,
      useCount: idbStitch.useCount
    }
  }

  private convertTemplateToIDB(template: StitchGroupTemplate): IDBTemplate {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category || '一般',
      repeatCount: template.repeatCount,
      stitches: template.stitches,
      createdDate: template.createdDate.getTime(),
      lastUsed: template.lastUsed?.getTime(),
      useCount: template.useCount,
      updatedAt: Date.now(),
      version: 1
    }
  }

  private convertIDBToTemplate(idbTemplate: IDBTemplate): StitchGroupTemplate {
    return {
      id: idbTemplate.id,
      name: idbTemplate.name,
      description: idbTemplate.description,
      category: idbTemplate.category,
      repeatCount: idbTemplate.repeatCount,
      stitches: idbTemplate.stitches,
      createdDate: new Date(idbTemplate.createdDate),
      lastUsed: idbTemplate.lastUsed ? new Date(idbTemplate.lastUsed) : undefined,
      useCount: idbTemplate.useCount
    }
  }

  private getTransaction(storeNames: string[], mode: IDBTransactionMode = 'readonly'): IDBTransaction {
    if (!this.db) {
      throw new Error('IndexedDB not initialized')
    }
    return this.db.transaction(storeNames, mode)
  }

  // Custom Stitches
  async loadCustomStitches(): Promise<CustomStitchPattern[]> {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.getTransaction([CUSTOM_STITCHES_STORE])
        const store = transaction.objectStore(CUSTOM_STITCHES_STORE)
        const request = store.getAll()

        request.onsuccess = () => {
          const idbStitches = request.result as IDBCustomStitch[]
          const stitches = idbStitches.map(this.convertIDBToCustomStitch)
          resolve(stitches)
        }

        request.onerror = () => reject(request.error)
      } catch (error) {
        reject(error)
      }
    })
  }

  async saveCustomStitch(stitch: CustomStitchPattern): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.getTransaction([CUSTOM_STITCHES_STORE], 'readwrite')
        const store = transaction.objectStore(CUSTOM_STITCHES_STORE)
        const idbStitch = this.convertCustomStitchToIDB(stitch)
        const request = store.put(idbStitch)

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      } catch (error) {
        reject(error)
      }
    })
  }

  async updateCustomStitch(id: string, updates: Partial<CustomStitchPattern>): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.getTransaction([CUSTOM_STITCHES_STORE], 'readwrite')
        const store = transaction.objectStore(CUSTOM_STITCHES_STORE)
        
        const getRequest = store.get(id)
        getRequest.onsuccess = () => {
          const existing = getRequest.result as IDBCustomStitch
          if (!existing) {
            reject(new Error(`Custom stitch with id ${id} not found`))
            return
          }

          const updated: IDBCustomStitch = {
            ...existing,
            ...Object.keys(updates).reduce((acc, key) => {
              const value = updates[key as keyof CustomStitchPattern]
              if (value !== undefined) {
                if (key === 'createdDate' || key === 'lastUsed') {
                  acc[key as keyof IDBCustomStitch] = (value as Date).getTime() as any
                } else {
                  acc[key as keyof IDBCustomStitch] = value as any
                }
              }
              return acc
            }, {} as Partial<IDBCustomStitch>),
            updatedAt: Date.now()
          }

          const putRequest = store.put(updated)
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        }

        getRequest.onerror = () => reject(getRequest.error)
      } catch (error) {
        reject(error)
      }
    })
  }

  async deleteCustomStitch(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.getTransaction([CUSTOM_STITCHES_STORE], 'readwrite')
        const store = transaction.objectStore(CUSTOM_STITCHES_STORE)
        const request = store.delete(id)

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      } catch (error) {
        reject(error)
      }
    })
  }

  async clearAllCustomStitches(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.getTransaction([CUSTOM_STITCHES_STORE], 'readwrite')
        const store = transaction.objectStore(CUSTOM_STITCHES_STORE)
        const request = store.clear()

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      } catch (error) {
        reject(error)
      }
    })
  }

  // Templates
  async loadTemplates(): Promise<StitchGroupTemplate[]> {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.getTransaction([TEMPLATES_STORE])
        const store = transaction.objectStore(TEMPLATES_STORE)
        const request = store.getAll()

        request.onsuccess = () => {
          const idbTemplates = request.result as IDBTemplate[]
          const templates = idbTemplates.map(this.convertIDBToTemplate)
          resolve(templates)
        }

        request.onerror = () => reject(request.error)
      } catch (error) {
        reject(error)
      }
    })
  }

  async saveTemplate(template: StitchGroupTemplate): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.getTransaction([TEMPLATES_STORE], 'readwrite')
        const store = transaction.objectStore(TEMPLATES_STORE)
        const idbTemplate = this.convertTemplateToIDB(template)
        const request = store.put(idbTemplate)

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      } catch (error) {
        reject(error)
      }
    })
  }

  async updateTemplate(id: string, updates: Partial<StitchGroupTemplate>): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.getTransaction([TEMPLATES_STORE], 'readwrite')
        const store = transaction.objectStore(TEMPLATES_STORE)
        
        const getRequest = store.get(id)
        getRequest.onsuccess = () => {
          const existing = getRequest.result as IDBTemplate
          if (!existing) {
            reject(new Error(`Template with id ${id} not found`))
            return
          }

          const updated: IDBTemplate = {
            ...existing,
            ...Object.keys(updates).reduce((acc, key) => {
              const value = updates[key as keyof StitchGroupTemplate]
              if (value !== undefined) {
                if (key === 'createdDate' || key === 'lastUsed') {
                  acc[key as keyof IDBTemplate] = (value as Date).getTime() as any
                } else {
                  acc[key as keyof IDBTemplate] = value as any
                }
              }
              return acc
            }, {} as Partial<IDBTemplate>),
            updatedAt: Date.now()
          }

          const putRequest = store.put(updated)
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        }

        getRequest.onerror = () => reject(getRequest.error)
      } catch (error) {
        reject(error)
      }
    })
  }

  async deleteTemplate(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.getTransaction([TEMPLATES_STORE], 'readwrite')
        const store = transaction.objectStore(TEMPLATES_STORE)
        const request = store.delete(id)

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      } catch (error) {
        reject(error)
      }
    })
  }

  async clearAllTemplates(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.getTransaction([TEMPLATES_STORE], 'readwrite')
        const store = transaction.objectStore(TEMPLATES_STORE)
        const request = store.clear()

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      } catch (error) {
        reject(error)
      }
    })
  }
}