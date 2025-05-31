"use client"

import { useCallback, useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, X, Clipboard, Camera, Image } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CameraCapture } from "@/components/camera-capture"

interface FileUploadProps {
  onFileSelect: (file: File) => void
  isUploading?: boolean
  progress?: number
  error?: string
}

export interface FileUploadRef {
  clearPreview: () => void
}

export const FileUpload = forwardRef<FileUploadRef, FileUploadProps>(({ onFileSelect, isUploading, progress = 0, error }, ref) => {
  const [preview, setPreview] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle mounting and mobile detection properly
  useEffect(() => {
    setMounted(true)
    setIsMobile(window.innerWidth < 768)
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const processFile = useCallback((file: File) => {
    // Create preview
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)

    onFileSelect(file)
  }, [onFileSelect])

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (file) {
        processFile(file)
      }
    },
    [processFile],
  )

  // Handle paste events
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      
      // Check if the item is an image
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        
        if (file) {
          // Validate file size (10MB limit)
          if (file.size > 10 * 1024 * 1024) {
            // You could show an error here
            return
          }
          
          processFile(file)
        }
        break
      }
    }
  }, [processFile])

  // Add global paste event listener
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Only handle paste if the container is focused or no input is focused
      const activeElement = document.activeElement
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.hasAttribute('contenteditable')
      )
      
      if (!isInputFocused || containerRef.current?.contains(activeElement)) {
        handlePaste(e)
      }
    }

    document.addEventListener('paste', handleGlobalPaste)
    return () => document.removeEventListener('paste', handleGlobalPaste)
  }, [handlePaste])

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/gif": [".gif"],
      "image/webp": [".webp"],
      "application/pdf": [".pdf"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
    noClick: mounted && isMobile, // Disable click on mobile to use custom buttons
  })

  const clearPreview = () => {
    setPreview(null)
  }

  const handleCameraCapture = (file: File) => {
    processFile(file)
    setShowCamera(false)
  }

  const openCamera = () => {
    setShowCamera(true)
  }

  const openGallery = () => {
    fileInputRef.current?.click()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
    // Reset the input value so same file can be selected again
    e.target.value = ''
  }

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    clearPreview
  }), [])

  return (
    <div 
      ref={containerRef}
      className="w-full max-w-xl mx-auto space-y-3"
    >
      {/* Hidden file input for gallery browsing */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      {/* Camera Component */}
      <CameraCapture
        isOpen={showCamera}
        onCapture={handleCameraCapture}
        onClose={() => setShowCamera(false)}
      />

      {!preview && (
        <Card className="border-2 border-dashed transition-colors hover:border-primary/50 relative">
          <CardContent className="p-4">
            <div
              {...getRootProps()}
              className={`${!isMobile ? 'cursor-pointer' : ''} text-center space-y-2 ${
                isDragActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {/* Only include input for desktop drag & drop */}
              {!isMobile && <input {...getInputProps()} />}
              
              <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-base font-medium">
                  {isDragActive 
                    ? "Drop your business card here" 
                    : mounted && isMobile 
                      ? "Scan or upload business card"
                      : "Upload a business card"
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {mounted && isMobile 
                    ? "Take photo, upload from gallery, or paste image"
                    : "Drag and drop, click to browse, or press Ctrl+V to paste"
                  }
                </p>
              </div>
              
              {/* Enhanced Mobile Controls */}
              {mounted && isMobile && (
                <div className="flex gap-2 justify-center mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      openCamera()
                    }}
                    className="flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Camera
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      openGallery()
                    }}
                    className="flex items-center gap-2"
                  >
                    <Image className="w-4 h-4" />
                    Gallery
                  </Button>
                </div>
              )}
              
              {/* Paste hint - only show on desktop and after mounting */}
              {mounted && !isMobile && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Badge variant="outline" className="flex items-center gap-1 text-xs">
                    <Clipboard className="w-3 h-3" />
                    Ctrl+V to paste
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {preview && (
        <Card>
          <CardContent className="p-3">
            <div className="relative">
              <img
                src={preview || "/placeholder.svg"}
                alt="Business card preview"
                className="w-full h-32 object-contain rounded-lg bg-muted"
              />
              <Button
                variant="outline"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6"
                onClick={clearPreview}
                disabled={isUploading}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            <div className="mt-2 text-center">
              <Badge variant="secondary" className="flex items-center gap-1 w-fit mx-auto text-xs">
                <Clipboard className="w-3 h-3" />
                Ready to process
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Processing business card...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {fileRejections.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>{fileRejections[0].errors[0].message}</AlertDescription>
        </Alert>
      )}
    </div>
  )
})
