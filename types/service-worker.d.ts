// Service Worker types for background sync
interface SyncManager {
  register(tag: string): Promise<void>
  getTags(): Promise<string[]>
}

interface ServiceWorkerRegistration {
  sync: SyncManager
}

interface SyncEvent extends ExtendableEvent {
  tag: string
  lastChance: boolean
}

interface ServiceWorkerGlobalScope extends WorkerGlobalScope {
  registration: ServiceWorkerRegistration
  skipWaiting(): Promise<void>
  clients: Clients
  addEventListener(type: 'sync', listener: (event: SyncEvent) => void): void
  addEventListener(type: 'message', listener: (event: ExtendableMessageEvent) => void): void
}

declare const self: ServiceWorkerGlobalScope 