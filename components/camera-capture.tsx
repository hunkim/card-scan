"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Camera, X, RotateCcw, CheckCircle, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface CameraCaptureProps {
  onCapture: (file: File) => void
  onClose: () => void
  isOpen: boolean
}

interface CropBounds {
  x: number
  y: number
  width: number
  height: number
}

export function CameraCapture({ onCapture, onClose, isOpen }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detectedBounds, setDetectedBounds] = useState<CropBounds | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const animationFrameRef = useRef<number | undefined>(undefined)

  // Initialize camera stream
  const startCamera = useCallback(async () => {
    try {
      setError(null)
      
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          setIsStreaming(true)
          // Start detection after a short delay to ensure video is ready
          setTimeout(() => {
            setIsAnalyzing(true)
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current)
            }
            // Will start the analysis loop
          }, 100)
        }
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError('Unable to access camera. Please check permissions.')
    }
  }, [facingMode])

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsStreaming(false)
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  // Simple rectangle detection for business cards
  const detectBusinessCardBounds = useCallback((
    imageData: ImageData,
    width: number,
    height: number
  ): CropBounds | null => {
    const data = imageData.data
    const threshold = 40 // Edge detection threshold
    
    // Find potential edges using simple gradient detection
    const edges: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false))
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4
        const current = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
        
        // Check horizontal and vertical gradients
        const right = ((data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3)
        const down = ((data[(y + 1) * width * 4 + x * 4] + data[(y + 1) * width * 4 + x * 4 + 1] + data[(y + 1) * width * 4 + x * 4 + 2]) / 3)
        
        const gradientX = Math.abs(current - right)
        const gradientY = Math.abs(current - down)
        
        if (gradientX > threshold || gradientY > threshold) {
          edges[y][x] = true
        }
      }
    }
    
    // Find the largest rectangular region with edges
    let bestBounds: CropBounds | null = null
    let bestScore = 0
    
    // Sample potential rectangles
    const step = Math.max(1, Math.floor(Math.min(width, height) / 50))
    
    for (let y1 = 0; y1 < height - 100; y1 += step) {
      for (let x1 = 0; x1 < width - 100; x1 += step) {
        for (let y2 = y1 + 100; y2 < height; y2 += step) {
          for (let x2 = x1 + 100; x2 < width; x2 += step) {
            const w = x2 - x1
            const h = y2 - y1
            
            // Check aspect ratio (business cards are typically 3.5:2 or similar)
            const aspectRatio = w / h
            if (aspectRatio < 1.3 || aspectRatio > 2.2) continue
            
            // Count edges along the perimeter
            let edgeCount = 0
            let totalPerimeter = 0
            
            // Top and bottom edges
            for (let x = x1; x < x2; x++) {
              totalPerimeter += 2
              if (y1 < height && edges[y1][x]) edgeCount++
              if (y2 < height && edges[y2][x]) edgeCount++
            }
            
            // Left and right edges
            for (let y = y1; y < y2; y++) {
              totalPerimeter += 2
              if (x1 < width && edges[y][x1]) edgeCount++
              if (x2 < width && edges[y][x2]) edgeCount++
            }
            
            const edgeRatio = edgeCount / totalPerimeter
            const area = w * h
            const score = edgeRatio * area * 0.000001 // Normalize area
            
            if (score > bestScore && edgeRatio > 0.3) {
              bestScore = score
              bestBounds = { x: x1, y: y1, width: w, height: h }
            }
          }
        }
      }
    }
    
    return bestBounds
  }, [])

  // Analyze frame for business card detection
  const analyzeFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return

    // Set canvas size to match video
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // Get image data for analysis
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
    // Detect business card bounds
    const bounds = detectBusinessCardBounds(imageData, canvas.width, canvas.height)
    setDetectedBounds(bounds)
    
    // Continue analysis if still analyzing
    if (isAnalyzing) {
      animationFrameRef.current = requestAnimationFrame(analyzeFrame)
    }
  }, [isStreaming, detectBusinessCardBounds, isAnalyzing])

  // Start analysis loop when isAnalyzing changes to true
  useEffect(() => {
    if (isAnalyzing && isStreaming) {
      analyzeFrame()
    }
  }, [isAnalyzing, isStreaming, analyzeFrame])

  // Start boundary detection
  const startBoundDetection = useCallback(() => {
    setIsAnalyzing(true)
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  // Draw overlay with detected bounds
  useEffect(() => {
    if (!overlayCanvasRef.current || !videoRef.current) return

    const canvas = overlayCanvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return

    // Match canvas size to video display size
    const rect = video.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    if (detectedBounds && video.videoWidth && video.videoHeight) {
      // Scale bounds to display size
      const scaleX = rect.width / video.videoWidth
      const scaleY = rect.height / video.videoHeight
      
      const scaledBounds = {
        x: detectedBounds.x * scaleX,
        y: detectedBounds.y * scaleY,
        width: detectedBounds.width * scaleX,
        height: detectedBounds.height * scaleY
      }
      
      // Draw detection rectangle
      ctx.strokeStyle = detectedBounds ? '#10b981' : '#ef4444'
      ctx.lineWidth = 3
      ctx.setLineDash(detectedBounds ? [] : [10, 5])
      ctx.strokeRect(scaledBounds.x, scaledBounds.y, scaledBounds.width, scaledBounds.height)
      
      // Draw corner indicators
      const cornerSize = 20
      ctx.fillStyle = detectedBounds ? '#10b981' : '#ef4444'
      
      // Top-left
      ctx.fillRect(scaledBounds.x - 2, scaledBounds.y - 2, cornerSize, 4)
      ctx.fillRect(scaledBounds.x - 2, scaledBounds.y - 2, 4, cornerSize)
      
      // Top-right
      ctx.fillRect(scaledBounds.x + scaledBounds.width - cornerSize + 2, scaledBounds.y - 2, cornerSize, 4)
      ctx.fillRect(scaledBounds.x + scaledBounds.width - 2, scaledBounds.y - 2, 4, cornerSize)
      
      // Bottom-left
      ctx.fillRect(scaledBounds.x - 2, scaledBounds.y + scaledBounds.height - 2, cornerSize, 4)
      ctx.fillRect(scaledBounds.x - 2, scaledBounds.y + scaledBounds.height - cornerSize + 2, 4, cornerSize)
      
      // Bottom-right
      ctx.fillRect(scaledBounds.x + scaledBounds.width - cornerSize + 2, scaledBounds.y + scaledBounds.height - 2, cornerSize, 4)
      ctx.fillRect(scaledBounds.x + scaledBounds.width - 2, scaledBounds.y + scaledBounds.height - cornerSize + 2, 4, cornerSize)
    }
  }, [detectedBounds])

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return

    // Set canvas size
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    
    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // If we have detected bounds, crop to that area
    let finalCanvas = canvas
    if (detectedBounds) {
      const cropCanvas = document.createElement('canvas')
      const cropCtx = cropCanvas.getContext('2d')
      
      if (cropCtx) {
        cropCanvas.width = detectedBounds.width
        cropCanvas.height = detectedBounds.height
        
        cropCtx.drawImage(
          canvas,
          detectedBounds.x, detectedBounds.y, detectedBounds.width, detectedBounds.height,
          0, 0, detectedBounds.width, detectedBounds.height
        )
        
        finalCanvas = cropCanvas
      }
    }
    
    // Convert to blob and create file
    finalCanvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `business-card-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        })
        onCapture(file)
        onClose()
      }
    }, 'image/jpeg', 0.9)
  }, [detectedBounds, onCapture, onClose])

  // Switch camera
  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }, [])

  // Start camera when component opens
  useEffect(() => {
    if (isOpen) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [isOpen, startCamera, stopCamera])

  // Update camera when facing mode changes
  useEffect(() => {
    if (isOpen && isStreaming) {
      startCamera()
    }
  }, [facingMode, isOpen, isStreaming, startCamera])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-black/50 text-white relative z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20"
        >
          <X className="h-6 w-6" />
        </Button>
        
        <div className="flex items-center gap-2">
          {detectedBounds && (
            <div className="flex items-center gap-1 text-green-400 text-sm">
              <CheckCircle className="h-4 w-4" />
              Card detected
            </div>
          )}
          {isAnalyzing && !detectedBounds && (
            <div className="flex items-center gap-1 text-yellow-400 text-sm">
              <Square className="h-4 w-4" />
              Scanning...
            </div>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={switchCamera}
          className="text-white hover:bg-white/20"
        >
          <RotateCcw className="h-6 w-6" />
        </Button>
      </div>

      {/* Camera view */}
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="flex items-center justify-center h-full">
            <Card className="max-w-sm mx-4">
              <CardContent className="p-6 text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={startCamera}>Try Again</Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Overlay canvas for detection visualization */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 pointer-events-none"
            />
            
            {/* Hidden canvas for processing */}
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Guide overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top overlay */}
              <div className="absolute top-0 left-0 right-0 h-20 bg-black/30" />
              {/* Bottom overlay */}
              <div className="absolute bottom-20 left-0 right-0 h-20 bg-black/30" />
              
              {/* Center guide */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-80 h-48 border-2 border-white/50 rounded-lg relative">
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-white text-sm">
                    Align business card here
                  </div>
                  
                  {/* Corner markers */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-white" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-white" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-white" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-white" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Capture button */}
      <div className="p-6 bg-black/50 flex justify-center relative z-10">
        <Button
          onClick={capturePhoto}
          disabled={!isStreaming}
          className={`w-16 h-16 rounded-full ${
            detectedBounds 
              ? 'bg-green-600 hover:bg-green-700 ring-4 ring-green-400/50' 
              : 'bg-white hover:bg-gray-200'
          } text-black flex items-center justify-center`}
        >
          <Camera className="h-8 w-8" />
        </Button>
      </div>
    </div>
  )
} 