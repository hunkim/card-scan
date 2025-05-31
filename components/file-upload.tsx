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

interface QueuedFile {
  id: string
  file: File
  preview: string
  status: 'pending' | 'processing' | 'completed' | 'error'
}

interface FileUploadProps {
  onFileSelect: (file: File) => void
  isUploading?: boolean
  progress?: number
  error?: string
}

export interface FileUploadRef {
  clearPreview: () => void
  clearQueue: () => void
}

export const FileUpload = forwardRef<FileUploadRef, FileUploadProps>(({ 
  onFileSelect, 
  isUploading, 
  progress = 0, 
  error
}, ref) => {
  const [preview, setPreview] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [fileQueue, setFileQueue] = useState<QueuedFile[]>([])
  const [keepCameraOpen, setKeepCameraOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const processedFiles = useRef(new Set<string>()) // Track processed files to prevent duplicates

  // Determine if we're in batch mode based on queue length
  const isBatchMode = fileQueue.length > 0

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

  const createFilePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })
  }

  // Simple file processing without complex state management
  const processFileDirectly = useCallback(async (file: File, isBatch: boolean = false) => {
    // Create a more unique identifier for this file including current timestamp to avoid false duplicates
    const fileId = `${file.name}-${file.size}-${file.lastModified}-${Date.now()}-${Math.random()}`
    
    // Check if we've already processed this exact file (using a shorter check for real duplicates)
    const shortId = `${file.name}-${file.size}-${file.lastModified}`
    const recentProcessed = Array.from(processedFiles.current).filter(id => 
      id.startsWith(shortId) && 
      (Date.now() - parseInt(id.split('-').slice(-2, -1)[0])) < 5000 // Within 5 seconds
    )
    
    if (recentProcessed.length > 0) {
      console.log('File recently processed, skipping:', shortId)
      return
    }
    
    // Mark as processed immediately
    processedFiles.current.add(fileId)
    
    // For batch mode: Add to queue for visual feedback
    if (isBatch || fileQueue.length > 0) {
      const preview = await createFilePreview(file)
      const queuedFile: QueuedFile = {
        id: `${Date.now()}-${Math.random()}`,
        file,
        preview,
        status: 'processing'
      }
      
      setFileQueue(prev => [...prev, queuedFile])
      
      // Process the file
      onFileSelect(file)
      
      // Remove from queue after a delay
      setTimeout(() => {
        setFileQueue(prev => prev.filter(qf => qf.id !== queuedFile.id))
      }, 2000)
    } else {
      // Single mode: show preview and process
      const preview = await createFilePreview(file)
      setPreview(preview)
      onFileSelect(file)
    }
  }, [fileQueue.length, onFileSelect])

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const isBatch = acceptedFiles.length > 1
      acceptedFiles.forEach((file, index) => {
        // Add small delay between files to prevent race conditions
        setTimeout(() => {
          processFileDirectly(file, isBatch)
        }, index * 50) // 50ms delay between each file
      })
    },
    [processFileDirectly],
  )

  // Handle paste events
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    const imageFiles: File[] = []
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file && file.size <= 10 * 1024 * 1024) {
          imageFiles.push(file)
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault()
      const isBatch = imageFiles.length > 1
      imageFiles.forEach((file, index) => {
        setTimeout(() => {
          processFileDirectly(file, isBatch)
        }, index * 50)
      })
    }
  }, [processFileDirectly])

  // Add global paste event listener
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
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
    multiple: true, // Always allow multiple
    noClick: mounted && isMobile,
  })

  const clearPreview = () => {
    setPreview(null)
  }

  const clearQueue = () => {
    setFileQueue([])
  }

  const handleCameraCapture = (file: File) => {
    processFileDirectly(file, isBatchMode)
    if (isBatchMode || keepCameraOpen) {
      setKeepCameraOpen(true) // Keep camera open after first capture
    } else {
      setShowCamera(false)
    }
  }

  const openCamera = () => {
    setShowCamera(true)
  }

  const openGallery = () => {
    fileInputRef.current?.click()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const isBatch = files.length > 1
    files.forEach((file, index) => {
      setTimeout(() => {
        processFileDirectly(file, isBatch)
      }, index * 50)
    })
    
    // Reset the input value so same file can be selected again
    e.target.value = ''
  }

  const startBatchMode = () => {
    // Convert single preview to queue if it exists
    if (preview) {
      // Clear the preview and let user re-upload
      clearPreview()
    }
  }

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    clearPreview,
    clearQueue
  }), [])

  return (
    <div 
      ref={containerRef}
      className="w-full max-w-4xl mx-auto space-y-4"
    >
      {/* Batch Mode Header - only show when in batch mode */}
      {isBatchMode && (
        <div className="flex items-center justify-center">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Upload className="w-3 h-3" />
            Processing {fileQueue.length} business card{fileQueue.length > 1 ? 's' : ''}...
          </Badge>
        </div>
      )}

      {/* Hidden file input for gallery browsing */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
        multiple
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      {/* Camera Component */}
      <CameraCapture
        isOpen={showCamera}
        onCapture={handleCameraCapture}
        onClose={() => {
          setShowCamera(false)
          setKeepCameraOpen(false)
        }}
      />

      {/* Upload Area - Show when no preview (single mode) or in batch mode */}
      {(!preview || isBatchMode) && (
        <Card className="border-2 border-dashed transition-colors hover:border-primary/50 relative">
          <CardContent className="p-6">
            <div
              {...getRootProps()}
              className={`${!isMobile ? 'cursor-pointer' : ''} text-center space-y-4 ${
                isDragActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {/* Only include input for desktop drag & drop */}
              {!isMobile && <input {...getInputProps()} />}
              
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-lg font-medium">
                  {isDragActive 
                    ? "Drop your business cards here" 
                    : mounted && isMobile 
                      ? "Add business cards"
                      : "Upload business cards"
                  }
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {mounted && isMobile 
                    ? "Take photos, upload from gallery, or paste images"
                    : "Drag & drop multiple files, click to browse, or press Ctrl+V to paste"
                  }
                </p>
                {isBatchMode && (
                  <p className="text-xs text-muted-foreground mt-2">
                    📸 Camera will stay open for multiple captures • Files process automatically
                  </p>
                )}
              </div>
              
              {/* Mobile Controls */}
              {mounted && isMobile && (
                <div className="flex gap-3 justify-center mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      openCamera()
                    }}
                    className="flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    {isBatchMode ? "Add More" : "Camera"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      openGallery()
                    }}
                    className="flex items-center gap-2"
                  >
                    <Image className="w-4 h-4" />
                    {isBatchMode ? "Add More" : "Gallery"}
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

      {/* Single Mode Preview */}
      {!isBatchMode && preview && (
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <img
                src={preview || "/placeholder.svg"}
                alt="Business card preview"
                className="w-full h-40 object-contain rounded-lg bg-muted"
              />
              <Button
                variant="outline"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={clearPreview}
                disabled={isUploading}
              >
                <X className="w-4 h-4" />
              </Button>
              {/* Add to batch button */}
              <Button
                variant="outline"
                size="sm"
                className="absolute bottom-2 right-2"
                onClick={startBatchMode}
                disabled={isUploading}
              >
                Add More
              </Button>
            </div>
            <div className="mt-3 text-center">
              <Badge variant="secondary" className="flex items-center gap-1 w-fit mx-auto text-xs">
                <Clipboard className="w-3 h-3" />
                Ready to process
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch Mode Queue - show while processing */}
      {isBatchMode && fileQueue.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Processing Business Cards</h3>
              <Badge variant="outline">{fileQueue.length} items</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {fileQueue.map((queuedFile) => (
                <div key={queuedFile.id} className="relative">
                  <div className="aspect-[3/2] rounded-lg overflow-hidden bg-muted relative ring-2 ring-blue-500">
                    <img
                      src={queuedFile.preview}
                      alt="Business card"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </div>
                  <div className="mt-1 text-center">
                    <Badge variant="default" className="text-xs bg-blue-500 text-white">
                      processing...
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Indicators */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Processing business card...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* File Rejection Errors */}
      {fileRejections.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>{fileRejections[0].errors[0].message}</AlertDescription>
        </Alert>
      )}
    </div>
  )
})

FileUpload.displayName = "FileUpload"
