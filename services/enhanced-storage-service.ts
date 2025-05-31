import type { BusinessCardData } from "@/types"
import { StorageService } from "./storage-service"
import { offlineStorageService } from "./offline-storage-service"

export class EnhancedStorageService {
  // Check if online
  private static isOnline(): boolean {
    return navigator.onLine
  }

  // Save card with offline support
  static async saveCard(userId: string, cardData: BusinessCardData): Promise<BusinessCardData> {
    if (this.isOnline()) {
      try {
        // Try to save online first
        const savedCard = await StorageService.saveCard(userId, cardData)
        
        // Cache the saved card for offline access
        await offlineStorageService.cacheCard(savedCard)
        
        return savedCard
      } catch (error) {
        console.error('Online save failed, falling back to offline:', error)
        // Fall back to offline storage
        return this.saveCardOffline(userId, cardData)
      }
    } else {
      // Save offline when no connection
      return this.saveCardOffline(userId, cardData)
    }
  }

  // Save card offline and queue for sync
  private static async saveCardOffline(userId: string, cardData: BusinessCardData): Promise<BusinessCardData> {
    // Generate temporary ID for offline card
    const tempId = `offline_${crypto.randomUUID()}`
    const offlineCard: BusinessCardData = {
      ...cardData,
      id: tempId,
      timestamp: cardData.timestamp || new Date().toISOString(),
    }

    // Add to pending uploads for background sync
    await offlineStorageService.addPendingUpload(userId, cardData)
    
    // Cache the card with temp ID for immediate viewing
    await offlineStorageService.cacheCard(offlineCard)

    return offlineCard
  }

  // Get cards with offline fallback
  static async getCards(userId: string): Promise<BusinessCardData[]> {
    if (this.isOnline()) {
      try {
        // Try to get from online first
        const onlineCards = await StorageService.getCards(userId)
        
        // Cache cards for offline access
        await offlineStorageService.cacheCards(userId, onlineCards)
        
        // Merge with any offline-only cards
        const offlineCards = await offlineStorageService.getCachedCards(userId)
        const offlineOnlyCards = offlineCards.filter(card => 
          card.id?.startsWith('offline_') && 
          !onlineCards.some(onlineCard => onlineCard.id === card.id)
        )

        return [...onlineCards, ...offlineOnlyCards]
      } catch (error) {
        console.error('Online fetch failed, using cached cards:', error)
        // Fall back to cached cards
        return offlineStorageService.getCachedCards(userId)
      }
    } else {
      // Return cached cards when offline
      return offlineStorageService.getCachedCards(userId)
    }
  }

  // Delete card with offline support
  static async deleteCard(userId: string, cardId: string): Promise<void> {
    // Handle offline-only cards
    if (cardId.startsWith('offline_')) {
      await offlineStorageService.deleteCachedCard(cardId)
      return
    }

    if (this.isOnline()) {
      try {
        // Delete online
        await StorageService.deleteCard(userId, cardId)
        
        // Remove from cache
        await offlineStorageService.deleteCachedCard(cardId)
      } catch (error) {
        console.error('Online delete failed:', error)
        throw error
      }
    } else {
      // When offline, just remove from cache
      // The deletion will need to be handled when back online
      await offlineStorageService.deleteCachedCard(cardId)
      throw new Error('Cannot delete cards while offline. Please try again when connected.')
    }
  }

  // Update card with offline support
  static async updateCard(userId: string, cardData: BusinessCardData): Promise<void> {
    // Handle offline-only cards
    if (cardData.id?.startsWith('offline_')) {
      await offlineStorageService.cacheCard(cardData)
      return
    }

    if (this.isOnline()) {
      try {
        // Update online
        await StorageService.updateCard(userId, cardData)
        
        // Update cache
        await offlineStorageService.cacheCard(cardData)
      } catch (error) {
        console.error('Online update failed:', error)
        throw error
      }
    } else {
      // When offline, just update cache
      await offlineStorageService.cacheCard(cardData)
      throw new Error('Cannot sync card updates while offline. Changes saved locally.')
    }
  }

  // Search cards with offline support
  static async searchCards(userId: string, query: string): Promise<BusinessCardData[]> {
    // Get all cards (which handles online/offline automatically)
    const allCards = await this.getCards(userId)
    
    if (!query.trim()) {
      return allCards
    }
    
    const lowercaseQuery = query.toLowerCase()
    
    return allCards.filter((card) =>
      card.name?.toLowerCase().includes(lowercaseQuery) ||
      card.company?.toLowerCase().includes(lowercaseQuery) ||
      card.jobTitle?.toLowerCase().includes(lowercaseQuery) ||
      card.email?.toLowerCase().includes(lowercaseQuery) ||
      card.phone?.includes(query) ||
      card.website?.toLowerCase().includes(lowercaseQuery) ||
      card.address?.toLowerCase().includes(lowercaseQuery)
    )
  }

  // Check for duplicates with offline support
  static async checkForDuplicates(userId: string, cardData: BusinessCardData): Promise<BusinessCardData[]> {
    if (this.isOnline()) {
      try {
        return await StorageService.checkForDuplicates(userId, cardData)
      } catch (error) {
        console.error('Online duplicate check failed, using cached cards:', error)
        // Fall back to checking cached cards
        return this.checkDuplicatesOffline(userId, cardData)
      }
    } else {
      return this.checkDuplicatesOffline(userId, cardData)
    }
  }

  // Check duplicates against cached cards
  private static async checkDuplicatesOffline(userId: string, cardData: BusinessCardData): Promise<BusinessCardData[]> {
    const cachedCards = await offlineStorageService.getCachedCards(userId)
    
    return cachedCards.filter(existingCard => {
      // Check if name matches (case insensitive, ignore whitespace)
      const nameMatch = existingCard.name && cardData.name &&
        existingCard.name.toLowerCase().trim() === cardData.name.toLowerCase().trim()
      
      // Check if any phone numbers match
      const phoneNumbers = [cardData.phone, cardData.mobile].filter(Boolean)
      const existingPhoneNumbers = [existingCard.phone, existingCard.mobile].filter(Boolean)
      
      const phoneMatch = phoneNumbers.some(phone => 
        existingPhoneNumbers.some(existingPhone => 
          phone && existingPhone && 
          phone.replace(/\D/g, '') === existingPhone.replace(/\D/g, '') // Compare digits only
        )
      )
      
      // Consider it a duplicate if name matches OR phone matches
      return nameMatch || phoneMatch
    })
  }

  // Sync pending uploads (called when coming back online)
  static async syncPendingUploads(): Promise<void> {
    if (!this.isOnline()) return
    
    await offlineStorageService.syncPendingUploads()
  }

  // Get pending uploads count
  static async getPendingUploadsCount(userId: string): Promise<number> {
    const pending = await offlineStorageService.getPendingUploads(userId)
    return pending.length
  }

  // Get network status
  static getNetworkStatus(): { isOnline: boolean } {
    return { isOnline: this.isOnline() }
  }
} 