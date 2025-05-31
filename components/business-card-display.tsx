"use client"

import { useState, useEffect } from "react"
import { Download, RefreshCw, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import type { BusinessCardData } from "@/types"
import { 
  exportContactAsVCard, 
  exportAsCSV, 
  isMobileDevice, 
  getExportButtonText 
} from "@/services/contact-export-service"

interface BusinessCardDisplayProps {
  data: BusinessCardData
  onSave?: (data: BusinessCardData) => void
  onReprocess?: () => void
  onExport?: () => void
  isEditable?: boolean
}

export function BusinessCardDisplay({
  data,
  onSave,
  onReprocess,
  onExport,
  isEditable = true,
}: BusinessCardDisplayProps) {
  const [editedData, setEditedData] = useState(data)
  const [lastSavedData, setLastSavedData] = useState(data)
  const [isExporting, setIsExporting] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Check if mobile on client side only
  useEffect(() => {
    setIsMobile(isMobileDevice())
  }, [])

  // Update local state when data prop changes
  useEffect(() => {
    setEditedData(data)
    setLastSavedData(data)
  }, [data])

  // Auto-save function with debouncing
  useEffect(() => {
    // Only auto-save if data has actually changed and onSave is available
    if (!onSave || !isEditable) return
    
    const hasChanges = JSON.stringify(editedData) !== JSON.stringify(lastSavedData)
    if (!hasChanges) return

    const saveTimer = setTimeout(() => {
      onSave(editedData)
      setLastSavedData(editedData)
    }, 1000) // 1 second debounce

    return () => clearTimeout(saveTimer)
  }, [editedData, lastSavedData, onSave, isEditable])

  const handleFieldChange = (field: keyof BusinessCardData, value: string) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value || null
    }))
  }

  const handleExport = async () => {
    if (isExporting) return
    
    setIsExporting(true)
    try {
      // Use custom export function if provided (for backward compatibility)
      if (onExport) {
        onExport()
      } else {
        // Smart export based on device
        if (isMobile) {
          await exportContactAsVCard(editedData)
        } else {
          exportAsCSV([editedData])
        }
      }
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return "secondary"
    if (confidence >= 90) return "default"
    if (confidence >= 70) return "secondary"
    return "destructive"
  }

  const exportButtonText = isMobile ? "Add to Contacts" : "Export Contact"
  const ExportIcon = isMobile ? UserPlus : Download

  const fields = [
    { key: "name", label: "Name", type: "text" },
    { key: "company", label: "Company", type: "text" },
    { key: "jobTitle", label: "Job Title", type: "text" },
    { key: "phone", label: "Phone", type: "tel" },
    { key: "mobile", label: "Mobile", type: "tel" },
    { key: "email", label: "Email", type: "email" },
    { key: "address", label: "Address", type: "text" },
    { key: "website", label: "Website", type: "url" },
    { key: "linkedin", label: "LinkedIn", type: "url" },
    { key: "twitter", label: "Twitter", type: "text" },
  ] as const

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-4">
        <CardTitle className="text-lg sm:text-xl">Contact Information</CardTitle>
        <div className="flex flex-wrap gap-2">
          {onReprocess && (
            <Button variant="outline" size="sm" onClick={onReprocess} className="text-xs sm:text-sm">
              <RefreshCw className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Reprocess</span>
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport} 
            disabled={isExporting}
            className="text-xs sm:text-sm"
          >
            <ExportIcon className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">{exportButtonText}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Card Image */}
        {data.imageBase64 && (
          <div className="flex justify-center mb-6">
            <div className="border rounded-lg overflow-hidden shadow-sm max-w-full">
              <img 
                src={data.imageBase64} 
                alt="Business card image"
                className="max-w-full h-auto max-h-48 sm:max-h-64 object-contain"
              />
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(({ key, label, type }) => {
            const value = editedData[key as keyof BusinessCardData] as string
            const confidence = data.confidence?.[key]

            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={key} className="text-sm font-medium">{label}</Label>
                  {confidence && (
                    <Badge variant={getConfidenceColor(confidence)} className="text-xs">
                      {confidence}%
                    </Badge>
                  )}
                </div>
                {isEditable ? (
                  <Input
                    id={key}
                    type={type}
                    value={value || ""}
                    onChange={(e) => handleFieldChange(key as keyof BusinessCardData, e.target.value)}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    className="text-sm"
                  />
                ) : (
                  <div className="min-h-[40px] px-3 py-2 border rounded-md bg-muted/50 flex items-center text-sm">
                    {value || <span className="text-muted-foreground italic">Not detected</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {data.timestamp && (
          <div className="pt-4 border-t text-sm text-muted-foreground">
            {isEditable && editedData !== lastSavedData && (
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="text-orange-600">Auto-saving changes...</span>
              </div>
            )}
            Processed on {new Date(data.timestamp).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
