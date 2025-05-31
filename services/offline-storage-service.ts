import type { BusinessCardData } from "@/types"

// IndexedDB configuration
const DB_NAME = 'CardScanDB'
const DB_VERSION = 1
const CARDS_STORE = 'cards'
const PENDING_UPLOADS_STORE = 'pendingUploads'

interface PendingUpload {
  id: string
  cardData: BusinessCardData
  userId: string
  timestamp: string
  retryCount: number
}

class OfflineStorageService {
  private db: IDBDatabase | null = null

  async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Cards store for offline viewing
        if (!db.objectStoreNames.contains(CARDS_STORE)) {
          const cardsStore = db.createObjectStore(CARDS_STORE, { keyPath: 'id' })
          cardsStore.createIndex('userId', 'userId', { unique: false })
          cardsStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Pending uploads store for background sync
        if (!db.objectStoreNames.contains(PENDING_UPLOADS_STORE)) {
          const pendingStore = db.createObjectStore(PENDING_UPLOADS_STORE, { keyPath: 'id' })
          pendingStore.createIndex('userId', 'userId', { unique: false })
          pendingStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  // Cache cards for offline viewing
  async cacheCards(userId: string, cards: BusinessCardData[]): Promise<void> {
    const db = await this.initDB()
    const transaction = db.transaction([CARDS_STORE], 'readwrite')
    const store = transaction.objectStore(CARDS_STORE)

    // Clear existing cards for this user
    const userIndex = store.index('userId')
    const userCards = userIndex.getAllKeys(userId)
    
    userCards.onsuccess = () => {
      userCards.result.forEach(key => store.delete(key))
    }

    // Add new cards
    cards.forEach(card => {
      if (card.id) {
        store.put({ ...card, userId })
      }
    })

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  // Get cached cards for offline viewing
  async getCachedCards(userId: string): Promise<BusinessCardData[]> {
    const db = await this.initDB()
    const transaction = db.transaction([CARDS_STORE], 'readonly')
    const store = transaction.objectStore(CARDS_STORE)
    const index = store.index('userId')

    return new Promise((resolve, reject) => {
      const request = index.getAll(userId)
      
      request.onsuccess = () => {
        const cards = request.result
          .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
        resolve(cards)
      }
      
      request.onerror = () => reject(request.error)
    })
  }

  // Add card to pending uploads (for background sync)
  async addPendingUpload(userId: string, cardData: BusinessCardData): Promise<string> {
    const db = await this.initDB()
    const transaction = db.transaction([PENDING_UPLOADS_STORE], 'readwrite')
    const store = transaction.objectStore(PENDING_UPLOADS_STORE)

    const pendingUpload: PendingUpload = {
      id: crypto.randomUUID(),
      cardData: { ...cardData, id: undefined }, // Remove ID so Firebase generates new one
      userId,
      timestamp: new Date().toISOString(),
      retryCount: 0
    }

    return new Promise((resolve, reject) => {
      const request = store.add(pendingUpload)
      
      request.onsuccess = () => {
        resolve(pendingUpload.id)
        // Register background sync if available
        this.registerBackgroundSync()
      }
      
      request.onerror = () => reject(request.error)
    })
  }

  // Get pending uploads for background sync
  async getPendingUploads(userId?: string): Promise<PendingUpload[]> {
    const db = await this.initDB()
    const transaction = db.transaction([PENDING_UPLOADS_STORE], 'readonly')
    const store = transaction.objectStore(PENDING_UPLOADS_STORE)

    return new Promise((resolve, reject) => {
      let request: IDBRequest
      
      if (userId) {
        const index = store.index('userId')
        request = index.getAll(userId)
      } else {
        request = store.getAll()
      }
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Remove successful upload from pending
  async removePendingUpload(pendingId: string): Promise<void> {
    const db = await this.initDB()
    const transaction = db.transaction([PENDING_UPLOADS_STORE], 'readwrite')
    const store = transaction.objectStore(PENDING_UPLOADS_STORE)

    return new Promise((resolve, reject) => {
      const request = store.delete(pendingId)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Update retry count for failed upload
  async updateRetryCount(pendingId: string): Promise<void> {
    const db = await this.initDB()
    const transaction = db.transaction([PENDING_UPLOADS_STORE], 'readwrite')
    const store = transaction.objectStore(PENDING_UPLOADS_STORE)

    return new Promise((resolve, reject) => {
      const getRequest = store.get(pendingId)
      
      getRequest.onsuccess = () => {
        const pendingUpload = getRequest.result
        if (pendingUpload) {
          pendingUpload.retryCount += 1
          const putRequest = store.put(pendingUpload)
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        } else {
          resolve()
        }
      }
      
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  // Cache a single card (after successful upload)
  async cacheCard(card: BusinessCardData): Promise<void> {
    if (!card.id) return

    const db = await this.initDB()
    const transaction = db.transaction([CARDS_STORE], 'readwrite')
    const store = transaction.objectStore(CARDS_STORE)

    return new Promise((resolve, reject) => {
      const request = store.put(card)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Delete cached card
  async deleteCachedCard(cardId: string): Promise<void> {
    const db = await this.initDB()
    const transaction = db.transaction([CARDS_STORE], 'readwrite')
    const store = transaction.objectStore(CARDS_STORE)

    return new Promise((resolve, reject) => {
      const request = store.delete(cardId)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Check if online
  isOnline(): boolean {
    return navigator.onLine
  }

  // Register background sync
  private async registerBackgroundSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready
        await registration.sync.register('background-sync-cards')
        console.log('Background sync registered')
      } catch (error) {
        console.error('Background sync registration failed:', error)
      }
    }
  }

  // Trigger sync manually when coming back online
  async syncPendingUploads(): Promise<void> {
    if (!this.isOnline()) return

    try {
      const { StorageService } = await import('./storage-service')
      const pendingUploads = await this.getPendingUploads()

      for (const pending of pendingUploads) {
        try {
          // Attempt upload
          const savedCard = await StorageService.saveCard(pending.userId, pending.cardData)
          
          // Cache the successfully uploaded card
          await this.cacheCard(savedCard)
          
          // Remove from pending
          await this.removePendingUpload(pending.id)
          
          console.log('Successfully synced card:', savedCard.id)
        } catch (error) {
          console.error('Failed to sync card:', error)
          
          // Update retry count
          await this.updateRetryCount(pending.id)
          
          // Remove if too many retries
          if (pending.retryCount >= 3) {
            await this.removePendingUpload(pending.id)
            console.log('Removed card after max retries:', pending.id)
          }
        }
      }
    } catch (error) {
      console.error('Sync process failed:', error)
    }
  }
}

export const offlineStorageService = new OfflineStorageService() 