"use client"

import { useState, useEffect } from "react"
import type { BusinessCardData } from "@/types"

interface OrganizationData {
  favorites: Set<string>               // cardId set
}

export function useOrganization(userId: string) {
  const [organizationData, setOrganizationData] = useState<OrganizationData>({
    favorites: new Set()
  })

  const storageKey = `organization_data_${userId}`

  // Load organization data from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        setOrganizationData({
          favorites: new Set(parsed.favorites || [])
        })
      }
    } catch (error) {
      console.error("Failed to load organization data:", error)
    }
  }, [storageKey])

  // Save organization data to localStorage
  const saveData = (data: OrganizationData) => {
    try {
      const toSave = {
        favorites: Array.from(data.favorites)
      }
      localStorage.setItem(storageKey, JSON.stringify(toSave))
      setOrganizationData(data)
    } catch (error) {
      console.error("Failed to save organization data:", error)
    }
  }

  // Toggle favorite status
  const toggleFavorite = (cardId: string) => {
    const newData = { ...organizationData }
    newData.favorites = new Set(newData.favorites)
    
    if (newData.favorites.has(cardId)) {
      newData.favorites.delete(cardId)
    } else {
      newData.favorites.add(cardId)
    }
    saveData(newData)
  }

  // Enhance cards with organization data
  const enhanceCards = (cards: BusinessCardData[]): BusinessCardData[] => {
    return cards.map(card => ({
      ...card,
      isFavorite: card.id ? organizationData.favorites.has(card.id) : false
    }))
  }

  return {
    toggleFavorite,
    enhanceCards,
    organizationData
  }
} 