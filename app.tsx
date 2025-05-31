"use client"

import { useState, useRef, useEffect } from "react"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
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
import { AuthProvider, useAuth } from "@/contexts/auth-context"
import { Header } from "@/components/header"
import { FileUpload, FileUploadRef } from "@/components/file-upload"
import { BusinessCardDisplay } from "@/components/business-card-display"
import { CardBrowser, CardBrowserRef } from "@/components/card-browser"
import type { BusinessCardData, UploadState } from "@/types"
import { extractBusinessCardData, uploadImageWithThumbnail } from "@/services/ocr-service"
import { StorageService } from "@/services/storage-service"
import { getUpstageApiKey } from "@/lib/config"

function AppContent() {
  const { user } = useAuth()
  const { toast } = useToast()
  const cardBrowserRef = useRef<CardBrowserRef>(null)
  const fileUploadRef = useRef<FileUploadRef>(null)
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    isProcessing: false,
    progress: 0,
  })
  const [extractedData, setExtractedData] = useState<BusinessCardData | null>(null)
  const [duplicateConfirmation, setDuplicateConfirmation] = useState<{
    newCard: BusinessCardData
    duplicates: BusinessCardData[]
  } | null>(null)

  const handleFileSelect = async (file: File) => {
    setUploadState({
      isUploading: true,
      isProcessing: true,
      progress: 0,
      error: undefined,
    })

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadState((prev) => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90),
        }))
      }, 200)

      // Upload image and generate thumbnail
      const { imageBase64, thumbnailBase64 } = await uploadImageWithThumbnail(file)

      // Extract data
      const data = await extractBusinessCardData(file, getUpstageApiKey())
      data.imageBase64 = imageBase64
      data.thumbnailBase64 = thumbnailBase64

      clearInterval(progressInterval)
      setUploadState((prev) => ({ ...prev, progress: 100 }))

      // Auto-save for authenticated users and add to list
      if (user) {
        // Check for duplicates before saving
        const duplicates = await StorageService.checkForDuplicates(user.uid, data)
        
        if (duplicates.length > 0) {
          // Show duplicate confirmation dialog
          setDuplicateConfirmation({ newCard: data, duplicates })
          
          // Clear the file upload preview
          fileUploadRef.current?.clearPreview()
        } else {
          // No duplicates, save directly
          await saveCardDirectly(data)
        }
      } else {
        // For non-authenticated users, still show extracted data separately
        setExtractedData(data)
      }

      setTimeout(() => {
        setUploadState({
          isUploading: false,
          isProcessing: false,
          progress: 0,
        })
      }, 500)
    } catch (error) {
      setUploadState({
        isUploading: false,
        isProcessing: false,
        progress: 0,
        error: "Failed to process the image. Please try again.",
      })
      toast({
        title: "Processing failed",
        description: "Failed to extract data from the image. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSaveCard = async (data: BusinessCardData) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save business cards.",
        variant: "destructive",
      })
      return
    }

    try {
      // Save new card and add to list (for non-authenticated users who sign in)
      const savedCard = await StorageService.saveCard(user.uid, data)
      
      // Clear the extracted data and show in list instead
      setExtractedData(null)
      
      // Refresh the list and show the new card expanded
      await cardBrowserRef.current?.refreshCards()
      cardBrowserRef.current?.markCardAsNew(savedCard.id!)
      
    } catch (error) {
      console.error('Error saving card:', error)
      toast({
        title: "Save failed",
        description: "Failed to save the business card. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleExportCard = (data: BusinessCardData) => {
    const csvContent = [
      "Name,Company,Job Title,Phone,Mobile,Email,Address,Website,LinkedIn,Twitter",
      [
        data.name || "",
        data.company || "",
        data.jobTitle || "",
        data.phone || "",
        data.mobile || "",
        data.email || "",
        data.address || "",
        data.website || "",
        data.linkedin || "",
        data.twitter || "",
      ]
        .map((field) => `"${field}"`)
        .join(","),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `business-card-${data.name || "unknown"}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleReprocess = () => {
    setExtractedData(null)
    toast({
      title: "Ready to reprocess",
      description: "Upload a new image to extract data again.",
    })
  }

  // Helper function to save card without duplicate check
  const saveCardDirectly = async (data: BusinessCardData) => {
    if (!user) return
    
    const savedCard = await StorageService.saveCard(user.uid, data)
    
    // Clear any previous extracted data since card will show in list
    setExtractedData(null)
    
    // Clear the file upload preview
    fileUploadRef.current?.clearPreview()
    
    // Refresh the list and show the new card expanded
    await cardBrowserRef.current?.refreshCards()
    cardBrowserRef.current?.markCardAsNew(savedCard.id!)
  }

  // Auto-save extracted data when user signs in
  useEffect(() => {
    const autoSaveOnLogin = async () => {
      if (user && extractedData && !extractedData.id) {
        try {
          // Check for duplicates before saving
          const duplicates = await StorageService.checkForDuplicates(user.uid, extractedData)
          
          if (duplicates.length > 0) {
            // Show duplicate confirmation dialog
            setDuplicateConfirmation({ newCard: extractedData, duplicates })
          } else {
            // No duplicates, save directly
            await saveCardDirectly(extractedData)
          }
        } catch (error) {
          console.error('Error auto-saving card after login:', error)
          toast({
            title: "Save failed",
            description: "Failed to save your business card. Please try again.",
            variant: "destructive",
          })
        }
      }
    }

    autoSaveOnLogin()
  }, [user, extractedData, toast])

  // Handle user confirming to add duplicate
  const handleConfirmDuplicate = async () => {
    if (!duplicateConfirmation) return
    
    try {
      await saveCardDirectly(duplicateConfirmation.newCard)
      setDuplicateConfirmation(null)
    } catch (error) {
      console.error('Error saving duplicate card:', error)
      toast({
        title: "Save failed",
        description: "Failed to save the business card. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle user canceling duplicate addition
  const handleCancelDuplicate = () => {
    setDuplicateConfirmation(null)
    // Reset upload state
    setUploadState({
      isUploading: false,
      isProcessing: false,
      progress: 0,
    })
  }

  const renderContent = () => {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Business Card Scanner</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powered by{" "}
            <a 
              href="https://console.upstage.ai/docs/capabilities/information-extraction/universal-information-extraction" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline font-semibold"
            >
              Upstage Information Extractor
            </a>
          </p>
        </div>

        <FileUpload
          ref={fileUploadRef}
          onFileSelect={handleFileSelect}
          isUploading={uploadState.isUploading}
          progress={uploadState.progress}
          error={uploadState.error}
        />

        {extractedData && (
          <BusinessCardDisplay
            data={extractedData}
            onSave={user ? handleSaveCard : undefined}
            onExport={() => handleExportCard(extractedData)}
            onReprocess={handleReprocess}
            isEditable={true}
          />
        )}

        {/* Show saved cards for authenticated users */}
        {user && (
          <div className="border-t pt-8">
            <h2 className="text-2xl font-bold mb-6">Your Saved Cards</h2>
            <CardBrowser ref={cardBrowserRef} userId={user.uid} />
          </div>
        )}

        {/* Unauthenticated user CTA */}
        {!user && extractedData && (
          <div className="border-t pt-8">
            <div className="text-center space-y-6 py-12 bg-muted/30 rounded-lg">
              <div className="space-y-3">
                <h3 className="text-2xl font-semibold">Sign in to save this card</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Your business card has been processed! Sign in to save it to your collection and access it from anywhere.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">✓ Unlimited card storage</p>
                <p className="text-sm font-medium">✓ Search and organize contacts</p>
                <p className="text-sm font-medium">✓ Export to CSV</p>
                <p className="text-sm font-medium">✓ Auto-save on sign in</p>
              </div>
            </div>
          </div>
        )}

        {/* Features section for unauthenticated users when no card is processed */}
        {!user && !extractedData && (
          <div className="border-t pt-8">
            <div className="text-center space-y-8">
              <h2 className="text-2xl font-bold">How It Works</h2>
              <div className="grid md:grid-cols-4 gap-8">
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                    <span className="text-xl font-bold text-primary">1</span>
                  </div>
                  <h3 className="font-semibold">Upload Image</h3>
                  <p className="text-sm text-muted-foreground">
                    Drop your business card image or paste from clipboard
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                    <span className="text-xl font-bold text-primary">2</span>
                  </div>
                  <h3 className="font-semibold">Upstage Information Extractor</h3>
                  <p className="text-sm text-muted-foreground">
                    Advanced AI instantly extracts all contact information with high accuracy
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                    <span className="text-xl font-bold text-primary">3</span>
                  </div>
                  <h3 className="font-semibold">Save & Export</h3>
                  <p className="text-sm text-muted-foreground">
                    Edit, save to your library, or export to CSV
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                    <span className="text-xl font-bold text-primary">4</span>
                  </div>
                  <h3 className="font-semibold">Sign In Benefits</h3>
                  <p className="text-sm text-muted-foreground">
                    Secure cloud storage, search all cards, and access from anywhere
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer with technology info */}
        <div className="border-t pt-8 mt-12">
          <div className="text-center space-y-4 py-8 text-muted-foreground">
            <p className="text-sm max-w-2xl mx-auto">
              Extract contact information from business cards instantly using Upstage Information Extractor.
            </p>
            <p className="text-xs">
              Powered by{" "}
              <a 
                href="https://console.upstage.ai/docs/capabilities/information-extraction/universal-information-extraction" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Upstage Information Extractor
              </a>
              {" "}• Advanced AI for document understanding and data extraction
            </p>
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs">
                Open Source Project •{" "}
                <a 
                  href="https://github.com/hunkim/card-scan" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  View on GitHub
                </a>
                {" "}• ⭐ Star if you find it useful
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">{renderContent()}</main>
      
      {/* Duplicate Confirmation Dialog */}
      <AlertDialog open={!!duplicateConfirmation} onOpenChange={() => handleCancelDuplicate()}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Potential Duplicate Detected</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                We found {duplicateConfirmation?.duplicates.length === 1 ? 'a similar business card' : `${duplicateConfirmation?.duplicates.length} similar business cards`} that might be the same contact:
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border">
                  <strong className="text-blue-900">New card:</strong>
                  <div className="mt-1 text-sm">
                    <div className="font-medium">{duplicateConfirmation?.newCard.name || 'Unknown Name'}</div>
                    {duplicateConfirmation?.newCard.company && (
                      <div className="text-gray-600">{duplicateConfirmation.newCard.company}</div>
                    )}
                    {duplicateConfirmation?.newCard.jobTitle && (
                      <div className="text-gray-600">{duplicateConfirmation.newCard.jobTitle}</div>
                    )}
                    {duplicateConfirmation?.newCard.email && (
                      <div className="text-gray-600">📧 {duplicateConfirmation.newCard.email}</div>
                    )}
                    {duplicateConfirmation?.newCard.phone && (
                      <div className="text-gray-600">📞 {duplicateConfirmation.newCard.phone}</div>
                    )}
                    {duplicateConfirmation?.newCard.mobile && duplicateConfirmation.newCard.mobile !== duplicateConfirmation.newCard.phone && (
                      <div className="text-gray-600">📱 {duplicateConfirmation.newCard.mobile}</div>
                    )}
                  </div>
                </div>
                
                <div className="mt-4">
                  <strong>Existing card{duplicateConfirmation?.duplicates.length === 1 ? '' : 's'}:</strong>
                  <div className="mt-2 space-y-3">
                    {duplicateConfirmation?.duplicates.map((duplicate, index) => (
                      <div key={duplicate.id} className="p-3 bg-gray-50 rounded-lg border">
                        <div className="font-medium text-sm">
                          {index + 1}. {duplicate.name || 'Unknown Name'}
                        </div>
                        {duplicate.company && (
                          <div className="text-gray-600 text-sm">{duplicate.company}</div>
                        )}
                        {duplicate.jobTitle && (
                          <div className="text-gray-600 text-sm">{duplicate.jobTitle}</div>
                        )}
                        {duplicate.email && (
                          <div className="text-gray-600 text-sm">📧 {duplicate.email}</div>
                        )}
                        {duplicate.phone && (
                          <div className="text-gray-600 text-sm">📞 {duplicate.phone}</div>
                        )}
                        {duplicate.mobile && duplicate.mobile !== duplicate.phone && (
                          <div className="text-gray-600 text-sm">📱 {duplicate.mobile}</div>
                        )}
                        {duplicate.timestamp && (
                          <div className="text-gray-500 text-xs mt-1">
                            Added: {new Date(duplicate.timestamp).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="mt-4 text-sm">
                  Do you want to add this card anyway?
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDuplicate}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDuplicate}>
              Add Card Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Toaster />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
