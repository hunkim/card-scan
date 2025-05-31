import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { BusinessCardData } from "@/types"

// Firestore collection name
const COLLECTION_NAME = 'business_cards'

// Convert Firestore document to BusinessCardData
function mapFirestoreDoc(doc: any): BusinessCardData {
  const data = doc.data()
  
  // Handle timestamp conversion with better error handling
  let timestamp: string
  
  if (data.timestamp) {
    try {
      // If it's a Firestore Timestamp, convert to ISO string
      if (data.timestamp?.toDate) {
        timestamp = data.timestamp.toDate().toISOString()
      }
      // If it's already a string, validate it's a valid date
      else if (typeof data.timestamp === 'string') {
        const date = new Date(data.timestamp)
        if (isNaN(date.getTime())) {
          // Invalid date string, use current time
          console.warn('Invalid timestamp found:', data.timestamp, 'for card:', doc.id)
          timestamp = new Date().toISOString()
        } else {
          timestamp = data.timestamp
        }
      }
      // If it's a Date object
      else if (data.timestamp instanceof Date) {
        timestamp = data.timestamp.toISOString()
      }
      // If it's a number (Unix timestamp)
      else if (typeof data.timestamp === 'number') {
        timestamp = new Date(data.timestamp).toISOString()
      }
      // Fallback
      else {
        console.warn('Unknown timestamp format:', data.timestamp, 'for card:', doc.id)
        timestamp = new Date().toISOString()
      }
    } catch (error) {
      console.error('Error converting timestamp:', error, 'for card:', doc.id)
      timestamp = new Date().toISOString()
    }
  } else {
    // No timestamp, use current time
    timestamp = new Date().toISOString()
  }
  
  return {
    ...data,
    id: doc.id,
    timestamp,
  }
}

// Clean data for Firestore - remove undefined values and convert to null if needed
function cleanDataForFirestore(data: any): any {
  const cleaned: any = {}
  
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      if (value === null) {
        // Keep null values
        cleaned[key] = null
      } else if (typeof value === 'object' && value !== null) {
        // Recursively clean nested objects
        const cleanedNested = cleanDataForFirestore(value)
        // Only add if the nested object has properties
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested
        }
      } else {
        // Keep non-undefined primitive values
        cleaned[key] = value
      }
    }
    // Skip undefined values entirely
  }
  
  return cleaned
}

export class StorageService {
  static async checkForDuplicates(userId: string, cardData: BusinessCardData): Promise<BusinessCardData[]> {
    try {
      const allCards = await this.getCards(userId)
      
      const potentialDuplicates = allCards.filter(existingCard => {
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
      
      return potentialDuplicates
    } catch (error) {
      console.error('Error checking for duplicates:', error)
      // If there's an error checking, don't block the save
      return []
    }
  }

  static async saveCard(userId: string, cardData: BusinessCardData): Promise<BusinessCardData> {
    try {
      const cardsRef = collection(db, COLLECTION_NAME)
      
      // Prepare data for Firestore
      const firestoreData = {
        ...cardData,
        userId,
        // Keep the original timestamp if it exists, otherwise use current time as ISO string
        timestamp: cardData.timestamp || new Date().toISOString(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }
      
      // Remove the id if it exists (Firestore will generate one)
      delete firestoreData.id
      
      // Clean the data to remove undefined values
      const cleanedData = cleanDataForFirestore(firestoreData)
      
      const docRef = await addDoc(cardsRef, cleanedData)
      
      return {
        ...cardData,
        id: docRef.id,
        userId,
        timestamp: firestoreData.timestamp,
      }
    } catch (error) {
      console.error('Error saving card to Firestore:', error)
      throw new Error('Failed to save business card')
    }
  }

  static async getCards(userId: string): Promise<BusinessCardData[]> {
    try {
      const cardsRef = collection(db, COLLECTION_NAME)
      const q = query(
        cardsRef, 
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      )
      
      const querySnapshot = await getDocs(q)
      const cards: BusinessCardData[] = []
      
      querySnapshot.forEach((doc) => {
        cards.push(mapFirestoreDoc(doc))
      })
      
      return cards
    } catch (error) {
      console.error('Error fetching cards from Firestore:', error)
      throw new Error('Failed to fetch business cards')
    }
  }

  static async deleteCard(userId: string, cardId: string): Promise<void> {
    try {
      const cardRef = doc(db, COLLECTION_NAME, cardId)
      await deleteDoc(cardRef)
    } catch (error) {
      console.error('Error deleting card from Firestore:', error)
      throw new Error('Failed to delete business card')
    }
  }

  static async updateCard(userId: string, cardData: BusinessCardData): Promise<void> {
    try {
      if (!cardData.id) {
        throw new Error('Card ID is required for update')
      }
      
      const cardRef = doc(db, COLLECTION_NAME, cardData.id)
      const updateData = {
        ...cardData,
        userId,
        updatedAt: Timestamp.now(),
      }
      
      // Remove the id from the update data (it's part of the document reference)
      delete updateData.id
      
      // Clean the data to remove undefined values
      const cleanedData = cleanDataForFirestore(updateData)
      
      await updateDoc(cardRef, cleanedData)
    } catch (error) {
      console.error('Error updating card in Firestore:', error)
      throw new Error('Failed to update business card')
    }
  }

  static async searchCards(userId: string, query: string): Promise<BusinessCardData[]> {
    try {
      // Get all cards for the user first (Firestore doesn't support full-text search natively)
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
    } catch (error) {
      console.error('Error searching cards in Firestore:', error)
      throw new Error('Failed to search business cards')
    }
  }
}
