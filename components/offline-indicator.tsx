"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { WifiOff, Wifi, CloudOff, RefreshCw } from "lucide-react"
import { offlineStorageService } from "@/services/offline-storage-service"

interface OfflineIndicatorProps {
  userId?: string
  onSync?: () => void
}

export function OfflineIndicator({ userId, onSync }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingUploads, setPendingUploads] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => {
      console.log('App came online')
      setIsOnline(true)
      if (userId) {
        handleSync()
      }
    }

    const handleOffline = () => {
      console.log('App went offline')
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Listen for service worker messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'BACKGROUND_SYNC' && event.data?.action === 'SYNC_PENDING_CARDS') {
        console.log('Received background sync message')
        if (userId) {
          handleSync()
        }
      }
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage)
      }
    }
  }, [userId])

  useEffect(() => {
    // Check pending uploads count
    if (userId) {
      checkPendingUploads()
    }
  }, [userId])

  const checkPendingUploads = async () => {
    if (!userId) return
    
    try {
      const pending = await offlineStorageService.getPendingUploads(userId)
      setPendingUploads(pending.length)
    } catch (error) {
      console.error('Failed to check pending uploads:', error)
    }
  }

  const handleSync = async () => {
    if (!userId || !isOnline || isSyncing) return

    setIsSyncing(true)
    try {
      await offlineStorageService.syncPendingUploads()
      await checkPendingUploads()
      onSync?.()
    } catch (error) {
      console.error('Manual sync failed:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  // Only show if offline or has pending uploads
  if (isOnline && pendingUploads === 0) {
    return null
  }

  return (
    <div className="fixed top-16 left-4 right-4 z-40 md:left-auto md:right-4 md:max-w-sm">
      <Card className={`border ${isOnline ? 'border-yellow-500 bg-yellow-50' : 'border-red-500 bg-red-50'}`}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {isOnline ? (
                pendingUploads > 0 ? (
                  <CloudOff className="w-5 h-5 text-yellow-600" />
                ) : (
                  <Wifi className="w-5 h-5 text-green-600" />
                )
              ) : (
                <WifiOff className="w-5 h-5 text-red-600" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              {!isOnline ? (
                <div>
                  <p className="text-sm font-medium text-red-800">You're offline</p>
                  <p className="text-xs text-red-600">
                    Cards will be saved locally and synced when you're back online
                  </p>
                </div>
              ) : pendingUploads > 0 ? (
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    {pendingUploads} card{pendingUploads > 1 ? 's' : ''} pending sync
                  </p>
                  <p className="text-xs text-yellow-600">
                    Cards saved offline are being uploaded
                  </p>
                </div>
              ) : null}
            </div>

            {isOnline && pendingUploads > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSync}
                disabled={isSyncing}
                className="h-7 px-2 text-xs"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 