"use client"

import { useState, useEffect, forwardRef, useImperativeHandle } from "react"
import { Search, Download, Trash2, Edit3, Calendar, Building, User, Phone, Mail, ChevronDown, ChevronRight, ExternalLink, ChevronUp, ArrowUpDown, UserPlus, Star, CreditCard, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { BusinessCardDisplay } from "@/components/business-card-display"
import { BusinessCardIcon } from "@/components/icons/business-card-icon"
import { BusinessCardIconPng } from "@/components/icons/business-card-icon-png"
import { SimpleBusinessCardIcon } from "@/components/icons/simple-business-card-icon"
import type { BusinessCardData } from "@/types"
import { EnhancedStorageService } from "@/services/enhanced-storage-service"
import { 
  exportContactAsVCard, 
  exportAsCSV, 
  smartExport, 
  isMobileDevice, 
  getExportButtonText 
} from "@/services/contact-export-service"
import { useToast } from "@/hooks/use-toast"
import { useOrganization } from "@/hooks/use-organization"
import { InteractiveContactField } from "@/components/interactive-contact-field"

interface CardBrowserProps {
  userId: string
  onCardSelect?: (card: BusinessCardData) => void
  onExportAll?: (cards: BusinessCardData[]) => void
}

export interface CardBrowserRef {
  markCardAsNew: (cardId: string) => void
  expandCard: (cardId: string) => void
  refreshCards: () => Promise<void>
}

export const CardBrowser = forwardRef<CardBrowserRef, CardBrowserProps>(({ userId, onCardSelect, onExportAll }, ref) => {
  const [cards, setCards] = useState<BusinessCardData[]>([])
  const [filteredCards, setFilteredCards] = useState<BusinessCardData[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"date" | "name" | "company" | "favorite">("date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [loading, setLoading] = useState(true)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [newCards, setNewCards] = useState<Set<string>>(new Set())
  const [deleteConfirmCard, setDeleteConfirmCard] = useState<BusinessCardData | null>(null)
  const { toast } = useToast()
  
  // Organization features
  const {
    toggleFavorite,
    enhanceCards
  } = useOrganization(userId)

  // Helper function to safely format dates
  const formatDate = (timestamp?: string) => {
    if (!timestamp) return "—"
    
    try {
      const date = new Date(timestamp)
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp for formatting:', timestamp)
        return "—"
      }
      return date.toLocaleDateString()
    } catch (error) {
      console.error('Error formatting date:', error, timestamp)
      return "—"
    }
  }

  useEffect(() => {
    loadCards()
  }, [userId])

  useEffect(() => {
    filterAndSortCards()
  }, [cards, searchQuery, sortBy, sortDirection, newCards])

  useEffect(() => {
    if (newCards.size > 0) {
      const timer = setTimeout(() => {
        setNewCards(new Set())
      }, 10000)

      return () => clearTimeout(timer)
    }
  }, [newCards])

  const loadCards = async () => {
    try {
      const userCards = await EnhancedStorageService.getCards(userId)
      const enhancedUserCards = enhanceCards(userCards)
      setCards(enhancedUserCards)
    } catch (error) {
      console.error("Failed to load cards:", error)
    } finally {
      setLoading(false)
    }
  }

  const markCardAsNew = (cardId: string) => {
    setNewCards(prev => new Set(prev).add(cardId))
    setExpandedCard(cardId)
  }

  const expandCard = (cardId: string) => {
    setExpandedCard(cardId)
  }

  const refreshCards = async () => {
    await loadCards()
  }

  useImperativeHandle(ref, () => ({
    markCardAsNew,
    expandCard,
    refreshCards
  }), [])

  const handleSort = (field: "date" | "name" | "company" | "favorite") => {
    if (sortBy === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      // New field, default to ascending except for date which defaults to descending
      setSortBy(field)
      setSortDirection(field === "date" ? "desc" : "asc")
    }
  }

  const filterAndSortCards = () => {
    let filtered = cards

    if (searchQuery) {
      filtered = cards.filter(
        (card) =>
          card.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          card.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          card.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          card.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          card.phone?.includes(searchQuery) ||
          card.mobile?.includes(searchQuery),
      )
    }

    filtered.sort((a, b) => {
      const aIsNew = newCards.has(a.id!)
      const bIsNew = newCards.has(b.id!)
      
      // New cards always at top regardless of sort
      if (aIsNew && !bIsNew) return -1
      if (!aIsNew && bIsNew) return 1
      
      let comparison = 0
      switch (sortBy) {
        case "name":
          comparison = (a.name || "").localeCompare(b.name || "")
          break
        case "company":
          comparison = (a.company || "").localeCompare(b.company || "")
          break
        case "favorite":
          // Sort by favorite status, then by name
          const aFav = a.isFavorite ? 1 : 0
          const bFav = b.isFavorite ? 1 : 0
          comparison = bFav - aFav // Favorites first
          if (comparison === 0) {
            // If same favorite status, sort by name
            comparison = (a.name || "").localeCompare(b.name || "")
          }
          break
        case "date":
        default:
          const aTime = new Date(a.timestamp || 0).getTime()
          const bTime = new Date(b.timestamp || 0).getTime()
          
          // Simple comparison: newer dates should come first by default
          comparison = bTime - aTime
          break
      }
      
      return sortDirection === "asc" ? -comparison : comparison
    })

    setFilteredCards(filtered)
  }

  const handleDeleteCard = async (cardId: string) => {
    try {
      await EnhancedStorageService.deleteCard(userId, cardId)
      await loadCards()
      setDeleteConfirmCard(null)
      // No toast notification - just silently delete
    } catch (error) {
      console.error("Failed to delete card:", error)
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete the business card. Please try again.",
        variant: "destructive",
      })
    }
  }

  const confirmDelete = (card: BusinessCardData) => {
    setDeleteConfirmCard(card)
  }

  const handleSaveCard = async (data: BusinessCardData) => {
    try {
      await EnhancedStorageService.updateCard(userId, data)
      await loadCards()
      // No toast notification - just silently update
    } catch (error) {
      console.error("Failed to save card:", error)
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save the business card. Please try again.",
        variant: "destructive",
      })
    }
  }

  const exportToCSV = (cardsToExport: BusinessCardData[]) => {
    exportAsCSV(cardsToExport)
  }

  const handleSmartExport = async (cardsToExport: BusinessCardData[]) => {
    try {
      await smartExport(cardsToExport)
    } catch (error) {
      console.error('Export failed:', error)
      toast({
        title: "Export failed",
        description: "Failed to export contacts. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSingleCardExport = async (card: BusinessCardData) => {
    try {
      await smartExport([card])
    } catch (error) {
      console.error('Contact export failed:', error)
      toast({
        title: "Export failed",
        description: "Failed to export contact. Please try again.",
        variant: "destructive",
      })
    }
  }

  const toggleCardExpansion = (cardId: string) => {
    setExpandedCard(expandedCard === cardId ? null : cardId)
  }

  const handleFavoriteToggle = (cardId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    console.log('Toggling favorite for card ID:', cardId)
    toggleFavorite(cardId)
    
    // Update local state immediately to avoid race condition
    setCards(prevCards => {
      const updatedCards = prevCards.map(card => 
        card.id === cardId 
          ? { ...card, isFavorite: !card.isFavorite }
          : card
      )
      console.log('Updated cards:', updatedCards.find(c => c.id === cardId))
      return updatedCards
    })
  }

  const handleContactSelect = (contact: BusinessCardData) => {
    if (contact.id) {
      setExpandedCard(contact.id)
    }
    onCardSelect?.(contact)
  }

  const SortableHeader = ({ field, children, className = "" }: { 
    field: "date" | "name" | "company" | "favorite", 
    children: React.ReactNode,
    className?: string 
  }) => {
    const isActive = sortBy === field
    const isAsc = sortDirection === "asc"
    
    return (
      <button
        onClick={() => handleSort(field)}
        className={`flex items-center gap-1 hover:text-foreground transition-colors text-left ${
          isActive ? "text-foreground" : "text-muted-foreground"
        } ${className}`}
      >
        {children}
        <div className="flex flex-col">
          {isActive ? (
            isAsc ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-50" />
          )}
        </div>
      </button>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading your cards...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {/* Mobile Sort Dropdown - Only visible on mobile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="md:hidden">
                <Filter className="w-4 h-4 mr-2" />
                Sort
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleSort("date")}>
                <Calendar className="w-4 h-4 mr-2" />
                Date Added
                {sortBy === "date" && (
                  <span className="ml-auto text-xs">
                    {sortDirection === "desc" ? "↓" : "↑"}
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("name")}>
                <User className="w-4 h-4 mr-2" />
                Name
                {sortBy === "name" && (
                  <span className="ml-auto text-xs">
                    {sortDirection === "asc" ? "↓" : "↑"}
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("company")}>
                <Building className="w-4 h-4 mr-2" />
                Company
                {sortBy === "company" && (
                  <span className="ml-auto text-xs">
                    {sortDirection === "asc" ? "↓" : "↑"}
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("favorite")}>
                <Star className="w-4 h-4 mr-2" />
                Favorites
                {sortBy === "favorite" && (
                  <span className="ml-auto text-xs">
                    {sortDirection === "asc" ? "↓" : "↑"}
                  </span>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            variant="outline" 
            onClick={() => handleSmartExport(filteredCards)} 
            disabled={filteredCards.length === 0}
            className="shrink-0"
          >
            {isMobileDevice() && filteredCards.length === 1 ? (
              <UserPlus className="w-4 h-4 sm:mr-2" />
            ) : (
              <Download className="w-4 h-4 sm:mr-2" />
            )}
            <span className="hidden sm:inline">{getExportButtonText(filteredCards.length)}</span>
          </Button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredCards.length} of {cards.length} cards
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      </div>

      {/* Cards List */}
      {filteredCards.length === 0 ? (
        <div className="text-center py-12">
          <SimpleBusinessCardIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">{cards.length === 0 ? "No cards yet" : "No cards found"}</h3>
          <p className="text-muted-foreground">
            {cards.length === 0 ? "Upload your first business card to get started" : "Try adjusting your search terms"}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {/* Desktop Table Header - Hidden on mobile */}
          <div className="hidden md:block bg-muted/50 px-6 py-3 border-b">
            <div className="grid grid-cols-12 gap-4 items-center text-sm font-medium">
              <div className="col-span-1"></div>
              <div className="col-span-1 text-muted-foreground">Image</div>
              <div className="col-span-1">
                <SortableHeader field="favorite">★</SortableHeader>
              </div>
              <div className="col-span-2">
                <SortableHeader field="name">Name</SortableHeader>
              </div>
              <div className="col-span-3">
                <SortableHeader field="company">Company</SortableHeader>
              </div>
              <div className="col-span-2 text-muted-foreground">Contact</div>
              <div className="col-span-1">
                <SortableHeader field="date">Date</SortableHeader>
              </div>
              <div className="col-span-1 text-muted-foreground">Actions</div>
            </div>
          </div>

          {/* Table Rows */}
          {filteredCards.map((card) => (
            <div key={card.id} className="border-b last:border-b-0">
              {/* Mobile Layout */}
              <div 
                className="md:hidden p-4 hover:bg-muted/20 cursor-pointer transition-colors"
                onClick={() => toggleCardExpansion(card.id!)}
              >
                <div className="flex items-start space-x-3">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                    {card.thumbnailBase64 ? (
                      <img 
                        src={card.thumbnailBase64} 
                        alt="Card thumbnail"
                        className="w-16 h-10 object-cover rounded border"
                      />
                    ) : (
                      <div className="w-16 h-10 bg-muted rounded border flex items-center justify-center">
                        <SimpleBusinessCardIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleFavoriteToggle(card.id!, e)}
                          className="h-6 w-6 p-0"
                        >
                          <Star 
                            className={`w-4 h-4 ${card.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} 
                          />
                        </Button>
                        <h3 className="font-medium truncate">{card.name || "Unknown Name"}</h3>
                        {newCards.has(card.id!) && (
                          <Badge variant="default" className="text-xs bg-green-500 hover:bg-green-600 text-white animate-pulse">
                            NEW
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        {expandedCard === card.id ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    
                    {card.company && (
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {card.company}
                      </p>
                    )}
                    
                    {card.jobTitle && (
                      <p className="text-sm text-muted-foreground truncate">
                        {card.jobTitle}
                      </p>
                    )}
                    
                    {/* Contact Info for Mobile */}
                    {(card.phone || card.email) && (
                      <div className="flex items-center gap-2 mt-2">
                        {card.phone && (
                          <InteractiveContactField
                            type="phone"
                            value={card.phone}
                            className="text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 px-2 py-1 rounded-full"
                            iconClassName="w-3 h-3"
                            truncate={true}
                          />
                        )}
                        {card.email && (
                          <InteractiveContactField
                            type="email"
                            value={card.email}
                            className="text-xs bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900 px-2 py-1 rounded-full"
                            iconClassName="w-3 h-3"
                            truncate={true}
                          />
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-muted-foreground">
                        {formatDate(card.timestamp)}
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSingleCardExport(card)
                          }}
                        >
                          {isMobileDevice() ? (
                            <UserPlus className="w-3 h-3" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            confirmDelete(card)
                          }}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Layout */}
              <div 
                className="hidden md:block px-6 py-4 hover:bg-muted/20 cursor-pointer transition-colors"
                onClick={() => toggleCardExpansion(card.id!)}
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Expand/Collapse Icon */}
                  <div className="col-span-1">
                    {expandedCard === card.id ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>

                  {/* Thumbnail */}
                  <div className="col-span-1">
                    {card.thumbnailBase64 ? (
                      <img 
                        src={card.thumbnailBase64} 
                        alt="Card thumbnail"
                        className="w-12 h-8 object-cover rounded border"
                      />
                    ) : (
                      <div className="w-12 h-8 bg-muted rounded border flex items-center justify-center">
                        <SimpleBusinessCardIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Star */}
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleFavoriteToggle(card.id!, e)}
                      className="h-6 w-6 p-0"
                    >
                      <Star 
                        className={`w-4 h-4 ${card.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} 
                      />
                    </Button>
                  </div>

                  {/* Name & Title */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{card.name || "Unknown Name"}</div>
                      {newCards.has(card.id!) && (
                        <Badge variant="default" className="text-xs bg-green-500 hover:bg-green-600 text-white animate-pulse">
                          NEW
                        </Badge>
                      )}
                    </div>
                    {card.jobTitle && (
                      <div className="text-sm text-muted-foreground">{card.jobTitle}</div>
                    )}
                  </div>

                  {/* Company */}
                  <div className="col-span-3">
                    <div className="flex items-center">
                      <Building className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span>{card.company || "—"}</span>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="col-span-2 text-sm">
                    {card.phone && (
                      <div className="flex items-center mb-1">
                        <InteractiveContactField
                          type="phone"
                          value={card.phone}
                          iconClassName="w-3 h-3 mr-1 text-muted-foreground"
                          className="text-sm"
                          truncate={true}
                        />
                      </div>
                    )}
                    {card.mobile && card.mobile !== card.phone && (
                      <div className="flex items-center mb-1">
                        <span className="text-muted-foreground text-xs mr-1">M:</span>
                        <InteractiveContactField
                          type="phone"
                          value={card.mobile}
                          showIcon={false}
                          className="text-xs"
                          truncate={true}
                        />
                      </div>
                    )}
                    {card.email && (
                      <div className="flex items-center">
                        <InteractiveContactField
                          type="email"
                          value={card.email}
                          iconClassName="w-3 h-3 mr-1 text-muted-foreground"
                          className="text-sm"
                          truncate={true}
                        />
                      </div>
                    )}
                  </div>

                  {/* Date */}
                  <div className="col-span-1 text-sm text-muted-foreground">
                    {formatDate(card.timestamp)}
                  </div>

                  {/* Actions */}
                  <div className="col-span-1">
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSingleCardExport(card)
                        }}
                      >
                        {isMobileDevice() ? (
                          <UserPlus className="w-3 h-3" />
                        ) : (
                          <Download className="w-3 h-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          confirmDelete(card)
                        }}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedCard === card.id && (
                <div className="px-4 md:px-6 py-6 bg-muted/10 border-t">
                  <BusinessCardDisplay
                    data={card}
                    onSave={handleSaveCard}
                    isEditable={true}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmCard} onOpenChange={() => setDeleteConfirmCard(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Business Card</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteConfirmCard?.name ? `${deleteConfirmCard.name}'s` : "this"} business card?
              {deleteConfirmCard?.company && ` (${deleteConfirmCard.company})`}
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmCard && handleDeleteCard(deleteConfirmCard.id!)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
})
